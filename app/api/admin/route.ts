import { z } from "zod";

import {
  assertAdmin,
  assertSameOrigin,
  enforceRateLimit,
  errorResponse,
  HttpError,
  runtimeEnv,
} from "@/lib/server-security";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["approve", "hide", "delete", "undo_latest_observation"]),
    pinId: z.string().trim(),
  }),
  z.object({
    action: z.enum(["resolve_request", "hide_and_resolve", "restore_and_resolve"]),
    requestId: z.string().trim(),
  }),
]);

const filterSchema = z.object({
  q: z.string().trim().max(80).default(""),
  requestStatus: z.enum(["all", "pending", "resolved"]).default("pending"),
  reason: z.enum(["all", "private_property", "no_permission", "dangerous", "wrong_info", "duplicate", "other"]).default("all"),
  pinVisibility: z.enum(["all", "approved", "pending", "hidden"]).default("all"),
});

export async function GET(request: Request) {
  try {
    await enforceRateLimit(request, "admin-access", 80);
    assertAdmin(request);
    const db = runtimeEnv().DB;
    if (!db) throw new HttpError(503, "データベースを利用できません。");

    const url = new URL(request.url);
    const filters = filterSchema.parse({
      q: url.searchParams.get("q") ?? "",
      requestStatus: url.searchParams.get("requestStatus") ?? "pending",
      reason: url.searchParams.get("reason") ?? "all",
      pinVisibility: url.searchParams.get("pinVisibility") ?? "all",
    });
    await db.prepare(
      `UPDATE change_requests
       SET contact_email = NULL, reporter_hash = NULL, contact_erased_at = CURRENT_TIMESTAMP
       WHERE status = 'resolved' AND resolved_at < datetime('now', '-90 days')
         AND (contact_email IS NOT NULL OR reporter_hash IS NOT NULL)`,
    ).run();
    const like = `%${filters.q}%`;

    const [pins, requests] = await Promise.all([
      db
        .prepare(
          `SELECT public_id, title, species, bloom_status, observed_at,
                  previous_bloom_year, plant_count, latitude, longitude,
                  municipality, location_name, location_type, access_note,
                  description, photo_key, photo_alt, submitter_relation,
                  permission_confirmed, visibility, created_at,
                  (SELECT COUNT(*) FROM observations o WHERE o.agave_public_id = agaves.public_id AND o.visibility = 'approved') AS observation_count
           FROM agaves
           WHERE (? = 'all' OR visibility = ? OR (? = 'hidden' AND visibility = 'rejected'))
             AND (? = '' OR public_id LIKE ? OR title LIKE ? OR municipality LIKE ?)
           ORDER BY created_at DESC
           LIMIT 200`,
        )
        .bind(filters.pinVisibility, filters.pinVisibility, filters.pinVisibility, filters.q, like, like, like)
        .all(),
      db
        .prepare(
          `SELECT public_id, agave_public_id, kind, reason, details,
                  contact_email, verified_submitter, status, outcome,
                  resolution_note, restrict_location, created_at, hidden_at,
                  resolved_at, contact_erased_at
           FROM change_requests
           WHERE (? = 'all' OR status = ?)
             AND (? = 'all' OR reason = ?)
             AND (? = '' OR public_id LIKE ? OR agave_public_id LIKE ? OR details LIKE ?)
           ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC
           LIMIT 200`,
        )
        .bind(filters.requestStatus, filters.requestStatus, filters.reason, filters.reason, filters.q, like, like, like)
        .all(),
    ]);

    const pendingPins = pins.results.map((row: Record<string, unknown>) => {
      const pin = row;
      const key = typeof pin.photo_key === "string" ? pin.photo_key : null;
      return {
        ...pin,
        visibility: pin.visibility === "rejected" ? "hidden" : pin.visibility,
        photo_key: undefined,
        photo_url: key
          ? `/api/photos/${key.split("/").map(encodeURIComponent).join("/")}`
          : null,
      };
    });

    return Response.json(
      { pins: pendingPins, requests: requests.results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "admin-access", 80);
    assertAdmin(request);
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, "管理操作の内容が不正です。");
    const db = runtimeEnv().DB;
    if (!db) throw new HttpError(503, "データベースを利用できません。");

    if ("pinId" in parsed.data) {
      if (parsed.data.action === "undo_latest_observation") {
        const observations = await db.prepare(
          `SELECT public_id, bloom_status, observed_at, description, photo_key, photo_alt
           FROM observations
           WHERE agave_public_id = ? AND visibility = 'approved'
           ORDER BY observed_at DESC, created_at DESC
           LIMIT 2`,
        ).bind(parsed.data.pinId).all<Record<string, unknown>>();
        if (observations.results.length < 2) throw new HttpError(400, "取り消せる追加履歴がありません。");
        const [latest, previous] = observations.results;
        await db.batch([
          db.prepare("UPDATE observations SET visibility = 'hidden' WHERE public_id = ?").bind(latest.public_id),
          db.prepare(
            `UPDATE agaves SET bloom_status = ?, observed_at = ?, description = ?,
               photo_key = ?, photo_alt = ?, updated_at = CURRENT_TIMESTAMP
             WHERE public_id = ?`,
          ).bind(previous.bloom_status, previous.observed_at, previous.description, previous.photo_key, previous.photo_alt, parsed.data.pinId),
        ]);
        return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
      }
      if (parsed.data.action === "delete") {
        const [pin, observations] = await Promise.all([
          db.prepare("SELECT photo_key FROM agaves WHERE public_id = ? LIMIT 1")
            .bind(parsed.data.pinId)
            .first<{ photo_key: string | null }>(),
          db.prepare("SELECT photo_key FROM observations WHERE agave_public_id = ? AND photo_key IS NOT NULL")
            .bind(parsed.data.pinId)
            .all<{ photo_key: string }>(),
        ]);
        if (!pin) throw new HttpError(404, "対象のピンが見つかりません。");

        const photoKeys = new Set<string>();
        if (pin.photo_key) photoKeys.add(pin.photo_key);
        for (const observation of observations.results) {
          if (observation.photo_key) photoKeys.add(observation.photo_key);
        }

        await db.batch([
          db.prepare("DELETE FROM observations WHERE agave_public_id = ?").bind(parsed.data.pinId),
          db.prepare("DELETE FROM change_requests WHERE agave_public_id = ?").bind(parsed.data.pinId),
          db.prepare("DELETE FROM location_restrictions WHERE agave_public_id = ?").bind(parsed.data.pinId),
          db.prepare("DELETE FROM agaves WHERE public_id = ?").bind(parsed.data.pinId),
        ]);

        const bucket = runtimeEnv().BUCKET;
        if (bucket) {
          await Promise.all(
            [...photoKeys].map(async (key) => {
              try {
                await bucket.delete(key);
              } catch (error) {
                console.error(`Failed to delete R2 object: ${key}`, error);
              }
            }),
          );
        }
      } else {
        const visibility = parsed.data.action === "approve" ? "approved" : "hidden";
        const result = await db.prepare(
          "UPDATE agaves SET visibility = ?, updated_at = CURRENT_TIMESTAMP WHERE public_id = ?",
        ).bind(visibility, parsed.data.pinId).run();
        if (!result.meta.changes) throw new HttpError(404, "対象のピンが見つかりません。");
        if (parsed.data.action === "approve") {
          await db.prepare("UPDATE observations SET visibility = 'approved' WHERE agave_public_id = ? AND visibility = 'pending'").bind(parsed.data.pinId).run();
        }
      }
    } else if (
      parsed.data.action === "hide_and_resolve" ||
      parsed.data.action === "restore_and_resolve"
    ) {
      const change = await db
        .prepare("SELECT agave_public_id FROM change_requests WHERE public_id = ? LIMIT 1")
        .bind(parsed.data.requestId)
        .first<{ agave_public_id: string }>();
      if (!change) throw new HttpError(404, "対象の依頼が見つかりません。");
      const restoring = parsed.data.action === "restore_and_resolve";
      const visibility = restoring ? "approved" : "hidden";
      const statements = [
        db
          .prepare(
            "UPDATE agaves SET visibility = ?, updated_at = CURRENT_TIMESTAMP WHERE public_id = ?",
          )
          .bind(visibility, change.agave_public_id),
        db
          .prepare(
            "UPDATE change_requests SET status = 'resolved', outcome = ?, resolved_at = CURRENT_TIMESTAMP WHERE public_id = ?",
          )
          .bind(restoring ? "restored" : "kept_hidden", parsed.data.requestId),
      ];
      if (restoring) {
        statements.push(
          db.prepare("UPDATE location_restrictions SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP WHERE agave_public_id = ? AND status = 'active'").bind(change.agave_public_id),
        );
      }
      await db.batch(statements);
    } else {
      const result = await db
        .prepare(
          "UPDATE change_requests SET status = 'resolved', outcome = 'no_change', resolved_at = CURRENT_TIMESTAMP WHERE public_id = ?",
        )
        .bind(parsed.data.requestId)
        .run();
      if (!result.meta.changes) throw new HttpError(404, "対象の依頼が見つかりません。");
    }

    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
