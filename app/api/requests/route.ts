import { z } from "zod";

import {
  assertHumanTiming,
  assertSameOrigin,
  enforceGlobalRateLimit,
  enforceRateLimit,
  errorResponse,
  HttpError,
  moderationFingerprint,
  notifyModerator,
  publicCode,
  runtimeEnv,
  sha256,
} from "@/lib/server-security";

const requestSchema = z.object({
  pinId: z.string().trim().toUpperCase().regex(/^AGV-[A-Z0-9_-]{6,20}$/),
  kind: z.enum(["correction", "removal", "safety"]),
  reason: z.enum(["private_property", "no_permission", "dangerous", "wrong_info", "duplicate", "other"]),
  details: z.string().trim().min(10).max(1600),
  contactEmail: z.union([z.literal(""), z.string().email().max(200)]),
  managementKey: z.string().trim().max(200),
  startedAt: z.number(),
  website: z.string().max(0),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "change-request", 8);
    await enforceGlobalRateLimit("change-request", 160);
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
      );
    }
    assertHumanTiming(parsed.data.startedAt);

    const db = runtimeEnv().DB;
    if (!db) throw new HttpError(503, "受付機能を一時的に利用できません。");

    const pin = await db
      .prepare("SELECT management_key_hash, latitude, longitude, visibility FROM agaves WHERE public_id = ? LIMIT 1")
      .bind(parsed.data.pinId)
      .first<{ management_key_hash: string; latitude: number; longitude: number; visibility: string }>();
    if (!pin) throw new HttpError(404, "指定されたピンIDが見つかりません。");

    const verifiedSubmitter = parsed.data.managementKey
      ? (await sha256(parsed.data.managementKey)) === pin.management_key_hash
      : false;
    const withdrawImmediately = parsed.data.kind === "removal" && verifiedSubmitter;
    const temporarilyHide =
      withdrawImmediately ||
      parsed.data.kind === "safety" ||
      ["private_property", "no_permission"].includes(parsed.data.reason);
    const id = crypto.randomUUID();
    const requestId = publicCode("REQ");
    const reporterHash = await moderationFingerprint(request);
    const now = new Date().toISOString();
    const repeatReports = await db.prepare(
      `SELECT COUNT(*) AS count FROM change_requests
       WHERE agave_public_id = ? AND reporter_hash = ?
         AND created_at >= datetime('now', '-1 day')`,
    ).bind(parsed.data.pinId, reporterHash).first<{ count: number }>();
    if ((repeatReports?.count ?? 0) >= 2) throw new HttpError(429, "同じ地点への申告をすでに受け付けています。運営の確認をお待ちください。");
    const pinReports = await db.prepare(
      `SELECT COUNT(*) AS count FROM change_requests
       WHERE agave_public_id = ? AND created_at >= datetime('now', '-1 hour')`,
    ).bind(parsed.data.pinId).first<{ count: number }>();
    if ((pinReports?.count ?? 0) >= 10) throw new HttpError(429, "この地点への申告が集中しています。時間をおいてください。");

    const insert = db
      .prepare(
        `INSERT INTO change_requests (
          id, public_id, agave_public_id, kind, reason, details,
          contact_email, reporter_hash, verified_submitter, status, outcome,
          restrict_location, hidden_at, resolved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        requestId,
        parsed.data.pinId,
        parsed.data.kind,
        parsed.data.reason,
        parsed.data.details,
        parsed.data.contactEmail || null,
        reporterHash,
        verifiedSubmitter ? 1 : 0,
        withdrawImmediately ? "resolved" : "pending",
        withdrawImmediately ? "submitter_withdrawal" : null,
        temporarilyHide ? 1 : 0,
        temporarilyHide ? now : null,
        withdrawImmediately ? now : null,
      );

    if (temporarilyHide) {
      const hide = db
        .prepare(
          "UPDATE agaves SET visibility = 'hidden', updated_at = CURRENT_TIMESTAMP WHERE public_id = ?",
        )
        .bind(parsed.data.pinId);
      const existingRestriction = await db.prepare(
        "SELECT id FROM location_restrictions WHERE agave_public_id = ? AND status = 'active' LIMIT 1",
      ).bind(parsed.data.pinId).first<{ id: string }>();
      const statements = [insert, hide];
      if (!existingRestriction) {
        statements.push(
          db.prepare(
            `INSERT INTO location_restrictions (
              id, source_request_public_id, agave_public_id, latitude, longitude,
              radius_meters, reason, status
            ) VALUES (?, ?, ?, ?, ?, 75, ?, 'active')`,
          ).bind(crypto.randomUUID(), requestId, parsed.data.pinId, pin.latitude, pin.longitude, parsed.data.reason),
        );
      }
      await db.batch(statements);
    } else {
      await insert.run();
    }

    await notifyModerator(
      `${temporarilyHide ? "ピンを一時非公開にしました。" : "修正・削除依頼があります。"} ${requestId} / ${parsed.data.pinId}`,
    );

    return Response.json(
      {
        requestId,
        withdrawn: withdrawImmediately,
        temporarilyHidden: temporarilyHide && !withdrawImmediately,
        message: withdrawImmediately
          ? "管理キーを確認し、ピンを非公開にしました。"
          : temporarilyHide
            ? "安全を優先してピン全体を一時非公開にし、確認依頼を受け付けました。"
            : "依頼を受け付けました。内容を確認します。",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
