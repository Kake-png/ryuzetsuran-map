import { z } from "zod";

import { sanitizeWebp } from "@/lib/photo-security";
import {
  assertHumanTiming,
  assertSameOrigin,
  enforceGlobalRateLimit,
  enforceRateLimit,
  errorResponse,
  HttpError,
  publicCode,
  randomToken,
  runtimeEnv,
  sha256,
} from "@/lib/server-security";

const observationSchema = z.object({
  pinId: z.string().trim().toUpperCase().regex(/^AGV-[A-Z0-9_-]{6,20}$/),
  bloomStatus: z.enum(["blooming", "flower_stalk", "likely", "normal", "pups", "dead", "unknown"]),
  observedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`))),
  description: z.string().trim().max(1200),
  photoAlt: z.string().trim().max(160),
  managementKey: z.string().trim().max(200),
  rulesAccepted: z.literal("true"),
  startedAt: z.string(),
  website: z.string().max(0),
}).superRefine((value, context) => {
  if (Date.parse(`${value.observedAt}T00:00:00Z`) > Date.now() + 86_400_000) {
    context.addIssue({ code: "custom", path: ["observedAt"], message: "観察日は未来の日付にできません。" });
  }
});

export async function POST(request: Request) {
  let uploadedKey: string | null = null;
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "observation-submission", 10);
    await enforceGlobalRateLimit("observation-submission", 200);
    const form = await request.formData();
    const raw = Object.fromEntries(Array.from(form.entries()).filter(([key]) => key !== "photo").map(([key, value]) => [key, String(value)]));
    const parsed = observationSchema.safeParse(raw);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "入力内容を確認してください。");
    assertHumanTiming(parsed.data.startedAt);

    const db = runtimeEnv().DB;
    const bucket = runtimeEnv().BUCKET;
    if (!db) throw new HttpError(503, "保存機能を一時的に利用できません。");
    const pin = await db.prepare(
      "SELECT management_key_hash, observed_at FROM agaves WHERE public_id = ? AND visibility = 'approved' LIMIT 1",
    ).bind(parsed.data.pinId).first<{ management_key_hash: string; observed_at: string }>();
    if (!pin) throw new HttpError(404, "対象のピンが見つかりません。");
    const recentForPin = await db.prepare(
      `SELECT COUNT(*) AS count FROM observations
       WHERE agave_public_id = ? AND created_at >= datetime('now', '-1 hour')`,
    ).bind(parsed.data.pinId).first<{ count: number }>();
    if ((recentForPin?.count ?? 0) >= 15) throw new HttpError(429, "この地点への観察投稿が集中しています。時間をおいてください。");

    const verified = parsed.data.managementKey
      ? (await sha256(parsed.data.managementKey)) === pin.management_key_hash
      : false;
    const photo = form.get("photo");
    const hasPhoto = Boolean(photo && typeof photo !== "string" && photo.size > 0);
    if (!verified && !hasPhoto) {
      throw new HttpError(400, "管理キーがない場合は、現地で撮影した写真を添えてください。");
    }

    const observationId = publicCode("OBS");
    if (hasPhoto && photo && typeof photo !== "string") {
      if (!bucket) throw new HttpError(503, "写真の保存機能を一時的に利用できません。");
      if (photo.type !== "image/webp" || photo.size > 3_000_000) throw new HttpError(400, "写真は変換後3MB以下のWebP画像にしてください。");
      const bytes = sanitizeWebp(new Uint8Array(await photo.arrayBuffer()));
      uploadedKey = `observations/${parsed.data.pinId}/${randomToken(18)}.webp`;
      await bucket.put(uploadedKey, bytes, { httpMetadata: { contentType: "image/webp" }, customMetadata: { pinId: parsed.data.pinId, observationId } });
    }

    const value = parsed.data;
    const statements = [
      db.prepare(
        `INSERT INTO observations (
          id, public_id, agave_public_id, bloom_status, observed_at,
          description, photo_key, photo_alt, verified_submitter, visibility
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
      ).bind(crypto.randomUUID(), observationId, value.pinId, value.bloomStatus, value.observedAt, value.description, uploadedKey, value.photoAlt || null, verified ? 1 : 0),
    ];
    if (value.observedAt >= pin.observed_at) {
      statements.push(
        db.prepare(
          `UPDATE agaves SET bloom_status = ?, observed_at = ?, description = ?,
             photo_key = COALESCE(?, photo_key),
             photo_alt = CASE WHEN ? IS NOT NULL THEN ? ELSE photo_alt END,
             photo_author = CASE WHEN ? IS NOT NULL THEN NULL ELSE photo_author END,
             photo_license = CASE WHEN ? IS NOT NULL THEN NULL ELSE photo_license END,
             photo_license_url = CASE WHEN ? IS NOT NULL THEN NULL ELSE photo_license_url END,
             photo_source_url = CASE WHEN ? IS NOT NULL THEN NULL ELSE photo_source_url END,
             photo_changes = CASE WHEN ? IS NOT NULL THEN NULL ELSE photo_changes END,
             updated_at = CURRENT_TIMESTAMP
           WHERE public_id = ?`,
        ).bind(
          value.bloomStatus,
          value.observedAt,
          value.description,
          uploadedKey,
          uploadedKey,
          value.photoAlt || null,
          uploadedKey,
          uploadedKey,
          uploadedKey,
          uploadedKey,
          uploadedKey,
          value.pinId,
        ),
      );
    }
    await db.batch(statements);
    return Response.json({ observationId, message: "観察記録を追加しました。" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (uploadedKey) {
      try { await runtimeEnv().BUCKET?.delete(uploadedKey); } catch (cleanupError) { console.error(cleanupError); }
    }
    return errorResponse(error);
  }
}
