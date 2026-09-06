import { env } from "cloudflare:workers";

type RuntimeEnv = {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  RATE_LIMIT_SALT?: string;
  ADMIN_TOKEN?: string;
  MODERATION_WEBHOOK_URL?: string;
};

export function runtimeEnv() {
  return env as unknown as RuntimeEnv;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new HttpError(403, "この送信元からの操作は受け付けられません。ページを再読み込みしてください。");
  }
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function randomToken(bytes = 24) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...values))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function publicCode(prefix: "AGV" | "REQ" | "OBS") {
  return `${prefix}-${randomToken(7).toUpperCase()}`;
}

function safeEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference === 0;
}

export function assertAdmin(request: Request) {
  const configured = runtimeEnv().ADMIN_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configured) {
    throw new HttpError(503, "管理機能はまだ有効化されていません。");
  }
  if (!supplied || !safeEqual(configured, supplied)) {
    throw new HttpError(401, "管理キーが正しくありません。");
  }
}

function clientIdentity(request: Request) {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const agent = request.headers.get("user-agent")?.slice(0, 160) ?? "unknown";
  return { ip, agent };
}

function rateLimitSalt(request: Request) {
  const configured = runtimeEnv().RATE_LIMIT_SALT;
  if (configured && configured.length >= 24) return configured;
  const hostname = new URL(request.url).hostname;
  if (["localhost", "127.0.0.1", "terminal.local"].includes(hostname)) {
    return "local-development";
  }
  throw new HttpError(503, "投稿保護機能の設定が完了していません。");
}

export async function moderationFingerprint(request: Request) {
  const { ip, agent } = clientIdentity(request);
  const salt = rateLimitSalt(request);
  const month = new Date().toISOString().slice(0, 7);
  return sha256(`${salt}:moderation:${month}:${ip}:${agent}`);
}

export async function enforceRateLimit(
  request: Request,
  action: string,
  maximum: number,
) {
  const db = runtimeEnv().DB;
  if (!db) throw new HttpError(503, "保存機能を一時的に利用できません。");

  const { ip, agent } = clientIdentity(request);
  const salt = rateLimitSalt(request);
  const windowStart = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const key = await sha256(`${salt}:${action}:${windowStart}:${ip}:${agent}`);

  await db
    .prepare(
      `INSERT INTO abuse_buckets (key, action, window_start, count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(key) DO UPDATE SET count = count + 1`,
    )
    .bind(key, action, windowStart)
    .run();

  const bucket = await db
    .prepare("SELECT count FROM abuse_buckets WHERE key = ?")
    .bind(key)
    .first<{ count: number }>();

  if ((bucket?.count ?? maximum + 1) > maximum) {
    throw new HttpError(429, "短時間の送信回数が上限に達しました。時間をおいてお試しください。");
  }

  if (Math.random() < 0.02) {
    await db
      .prepare("DELETE FROM abuse_buckets WHERE window_start < ?")
      .bind(windowStart - 172_800_000)
      .run();
  }
}

export async function enforceGlobalRateLimit(
  action: string,
  maximum: number,
  windowMilliseconds = 3_600_000,
) {
  const db = runtimeEnv().DB;
  if (!db) throw new HttpError(503, "保存機能を一時的に利用できません。");
  const windowStart = Math.floor(Date.now() / windowMilliseconds) * windowMilliseconds;
  const key = `global:${action}:${windowStart}`;
  await db.prepare(
    `INSERT INTO abuse_buckets (key, action, window_start, count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET count = count + 1`,
  ).bind(key, action, windowStart).run();
  const bucket = await db.prepare("SELECT count FROM abuse_buckets WHERE key = ?").bind(key).first<{ count: number }>();
  if ((bucket?.count ?? maximum + 1) > maximum) {
    throw new HttpError(429, "現在投稿が集中しています。時間をおいてお試しください。");
  }
}

export function assertHumanTiming(startedAt: unknown) {
  const started = Number(startedAt);
  const elapsed = Date.now() - started;
  if (!Number.isFinite(started) || elapsed < 1_800 || elapsed > 7_200_000) {
    throw new HttpError(400, "送信画面を開き直して、もう一度お試しください。");
  }
}

export async function notifyModerator(message: string) {
  const configured = runtimeEnv().MODERATION_WEBHOOK_URL;
  if (!configured) return;
  try {
    const target = new URL(configured);
    if (target.protocol !== "https:") return;
    const body = target.hostname.includes("discord")
      ? { content: message }
      : { text: message };
    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) console.error(`Moderation webhook returned ${response.status}`);
  } catch (error) {
    console.error("Moderation webhook failed", error);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json(
    { error: "処理中に問題が起きました。入力内容を控えて、少し時間をおいてお試しください。" },
    { status: 500 },
  );
}
