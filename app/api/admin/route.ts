import { z } from "zod";

import { sanitizeUploadedPhoto } from "@/lib/photo-security";
import {
  assertAdmin,
  assertSameOrigin,
  enforceRateLimit,
  errorResponse,
  HttpError,
  publicCode,
  randomToken,
  runtimeEnv,
} from "@/lib/server-security";

const bloomStatusSchema = z.enum(["blooming", "flower_stalk", "likely", "normal", "pups", "dead", "unknown"]);
const observationDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["approve", "hide", "reject", "delete", "undo_latest_observation"]),
    pinId: z.string().trim(),
  }),
  z.object({
    action: z.enum(["resolve_request", "hide_and_resolve", "restore_and_resolve", "delete_and_resolve"]),
    requestId: z.string().trim(),
  }),
  z.object({
    action: z.literal("create_observation"),
    pinId: z.string().trim(),
    bloomStatus: bloomStatusSchema,
    observedAt: observationDateSchema,
    description: z.string().trim().max(1200),
  }),
  z.object({
    action: z.literal("update_observation"),
    pinId: z.string().trim(),
    observationId: z.string().trim(),
    bloomStatus: bloomStatusSchema,
    observedAt: observationDateSchema,
    description: z.string().trim().max(1200),
    photoAlt: z.string().trim().max(160),
  }),
  z.object({
    action: z.literal("delete_observation_photo"),
    pinId: z.string().trim(),
    observationId: z.string().trim(),
  }),
  z.object({
    action: z.literal("delete_observation"),
    pinId: z.string().trim(),
    observationId: z.string().trim(),
  }),
]);

const adminPhotoSchema = z.object({
  action: z.literal("attach_observation_photo"),
  pinId: z.string().trim().min(1),
  observationId: z.string().trim().min(1),
  photoAlt: z.string().trim().max(160),
});

const filterSchema = z.object({
  q: z.string().trim().max(80).default(""),
  requestStatus: z.enum(["all", "pending", "resolved"]).default("pending"),
  reason: z.enum(["all", "private_property", "no_permission", "dangerous", "wrong_info", "duplicate", "other"]).default("all"),
  pinVisibility: z.enum(["all", "approved", "pending", "hidden", "rejected"]).default("all"),
});

async function permanentlyDeletePin(
  db: D1Database,
  bucket: R2Bucket | undefined,
  pinId: string,
  restrictionSourceId?: string,
) {
  const pin = await db
    .prepare("SELECT photo_key, latitude, longitude FROM agaves WHERE public_id = ? LIMIT 1")
    .bind(pinId)
    .first<{ photo_key: string | null; latitude: number; longitude: number }>();
  if (!pin) throw new HttpError(404, "対象のピンが見つかりません。");

  const observations = await db
    .prepare("SELECT photo_key FROM observations WHERE agave_public_id = ? AND photo_key IS NOT NULL")
    .bind(pinId)
    .all<{ photo_key: string }>();
  const photoKeys = Array.from(new Set([
    ...(pin.photo_key ? [pin.photo_key] : []),
    ...observations.results.map((item) => item.photo_key).filter(Boolean),
  ]));
  if (photoKeys.length) {
    if (!bucket) throw new HttpError(503, "写真ストレージを利用できないため削除を中止しました。");
    await Promise.all(photoKeys.map((key) => bucket.delete(key)));
  }

  const statements = [
    db.prepare("DELETE FROM observations WHERE agave_public_id = ?").bind(pinId),
    db.prepare("DELETE FROM agaves WHERE public_id = ?").bind(pinId),
  ];
  if (restrictionSourceId) {
    const restriction = await db
      .prepare("SELECT id FROM location_restrictions WHERE agave_public_id = ? AND status = 'active' LIMIT 1")
      .bind(pinId)
      .first<{ id: string }>();
    if (!restriction) {
      statements.push(
        db.prepare(
          `INSERT INTO location_restrictions (
            id, source_request_public_id, agave_public_id, latitude, longitude,
            radius_meters, reason, status
          ) VALUES (?, ?, ?, ?, ?, 75, 'deleted', 'active')`,
        ).bind(crypto.randomUUID(), restrictionSourceId, pinId, pin.latitude, pin.longitude),
      );
    }
  }
  await db.batch(statements);
}

async function syncPinFromLatestObservation(db: D1Database, pinId: string) {
  const latest = await db.prepare(
    `SELECT bloom_status, observed_at, description, photo_key, photo_alt,
            photo_author, photo_license, photo_license_url, photo_source_url,
            photo_changes
     FROM observations
     WHERE agave_public_id = ? AND visibility = 'approved'
     ORDER BY observed_at DESC, created_at DESC
     LIMIT 1`,
  ).bind(pinId).first<Record<string, unknown>>();
  if (!latest) return;

  await db.prepare(
    `UPDATE agaves
     SET bloom_status = ?, observed_at = ?, description = ?, photo_key = ?,
         photo_alt = ?, photo_author = ?, photo_license = ?,
         photo_license_url = ?, photo_source_url = ?, photo_changes = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE public_id = ?`,
  ).bind(
    latest.bloom_status,
    latest.observed_at,
    latest.description,
    latest.photo_key,
    latest.photo_alt,
    latest.photo_author,
    latest.photo_license,
    latest.photo_license_url,
    latest.photo_source_url,
    latest.photo_changes,
    pinId,
  ).run();
}

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

    const [pins, requests, observations] = await Promise.all([
      db
        .prepare(
          `SELECT public_id, title, species, bloom_status, observed_at,
                  previous_bloom_year, plant_count, latitude, longitude,
                  municipality, location_name, location_type, access_note,
                  description, photo_key, photo_alt, submitter_relation,
                  permission_confirmed, visibility, created_at,
                  (SELECT COUNT(*) FROM observations o WHERE o.agave_public_id = agaves.public_id AND o.visibility = 'approved') AS observation_count
           FROM agaves
           WHERE (? = 'all' OR visibility = ?)
             AND (? = '' OR public_id LIKE ? OR title LIKE ? OR municipality LIKE ?)
           ORDER BY created_at DESC
           LIMIT 200`,
        )
        .bind(filters.pinVisibility, filters.pinVisibility, filters.q, like, like, like)
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
      db
        .prepare(
          `SELECT public_id, agave_public_id, bloom_status, observed_at,
                  description, photo_key, photo_alt, visibility, created_at
           FROM observations
           ORDER BY observed_at DESC, created_at DESC
           LIMIT 3000`,
        )
        .all(),
    ]);

    const observationsByPin = new Map<string, Record<string, unknown>[]>();
    for (const row of observations.results as Record<string, unknown>[]) {
      const pinId = String(row.agave_public_id);
      const photoKey = typeof row.photo_key === "string" ? row.photo_key : null;
      const item = {
        ...row,
        photo_key: undefined,
        photo_url: photoKey
          ? `/api/photos/${photoKey.split("/").map(encodeURIComponent).join("/")}`
          : null,
      };
      observationsByPin.set(pinId, [...(observationsByPin.get(pinId) ?? []), item]);
    }

    const pendingPins = pins.results.map((row: Record<string, unknown>) => {
      const pin = row;
      const key = typeof pin.photo_key === "string" ? pin.photo_key : null;
      return {
        ...pin,
        photo_key: undefined,
        photo_url: key
          ? `/api/photos/${key.split("/").map(encodeURIComponent).join("/")}`
          : null,
        observations: observationsByPin.get(String(pin.public_id)) ?? [],
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
  let uploadedKey: string | null = null;
  let uploadedPhotoTarget: { pinId: string; observationId: string } | null = null;
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "admin-access", 80);
    assertAdmin(request);
    const db = runtimeEnv().DB;
    if (!db) throw new HttpError(503, "データベースを利用できません。");

    if (request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      const contentLength = Number(request.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > 4_000_000) {
        throw new HttpError(413, "写真データが大きすぎます。もう一度写真を選び直してください。");
      }
      const form = await request.formData();
      const parsedPhoto = adminPhotoSchema.safeParse({
        action: form.get("action"),
        pinId: form.get("pinId"),
        observationId: form.get("observationId"),
        photoAlt: form.get("photoAlt") ?? "",
      });
      if (!parsedPhoto.success) throw new HttpError(400, "写真を追加する対象が不正です。");

      const existing = await db.prepare(
        "SELECT photo_key FROM observations WHERE public_id = ? AND agave_public_id = ? LIMIT 1",
      ).bind(parsedPhoto.data.observationId, parsedPhoto.data.pinId).first<{ photo_key: string | null }>();
      if (!existing) throw new HttpError(404, "対象の観察記録が見つかりません。");
      if (existing.photo_key) {
        throw new HttpError(409, "この観察記録にはすでに写真があります。差し替える場合は先に現在の写真を削除してください。");
      }

      const photo = form.get("photo");
      if (!photo || typeof photo === "string" || photo.size === 0) {
        throw new HttpError(400, "追加する写真を選んでください。");
      }
      if (!["image/webp", "image/jpeg"].includes(photo.type) || photo.size > 3_000_000) {
        throw new HttpError(400, "写真は変換後3MB以下のWebPまたはJPEG画像にしてください。");
      }
      const bucket = runtimeEnv().BUCKET;
      if (!bucket) throw new HttpError(503, "写真の保存機能を一時的に利用できません。");
      const sanitized = sanitizeUploadedPhoto(new Uint8Array(await photo.arrayBuffer()), photo.type);
      uploadedKey = `observations/${parsedPhoto.data.pinId}/${randomToken(18)}.${sanitized.extension}`;
      uploadedPhotoTarget = {
        pinId: parsedPhoto.data.pinId,
        observationId: parsedPhoto.data.observationId,
      };
      await bucket.put(uploadedKey, sanitized.bytes, {
        httpMetadata: { contentType: sanitized.contentType },
        customMetadata: {
          pinId: parsedPhoto.data.pinId,
          observationId: parsedPhoto.data.observationId,
        },
      });

      const updated = await db.prepare(
        `UPDATE observations
         SET photo_key = ?, photo_alt = ?, photo_author = NULL,
             photo_license = NULL, photo_license_url = NULL,
             photo_source_url = NULL, photo_changes = NULL
         WHERE public_id = ? AND agave_public_id = ? AND photo_key IS NULL`,
      ).bind(
        uploadedKey,
        parsedPhoto.data.photoAlt || null,
        parsedPhoto.data.observationId,
        parsedPhoto.data.pinId,
      ).run();
      if (!updated.meta.changes) {
        throw new HttpError(409, "写真の追加中に記録が更新されました。管理画面を読み直してください。");
      }
      await syncPinFromLatestObservation(db, parsedPhoto.data.pinId);
      uploadedKey = null;
      uploadedPhotoTarget = null;
      return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }

    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) throw new HttpError(400, "管理操作の内容が不正です。");

    if (parsed.data.action === "create_observation") {
      const pin = await db.prepare("SELECT public_id FROM agaves WHERE public_id = ? LIMIT 1")
        .bind(parsed.data.pinId).first<{ public_id: string }>();
      if (!pin) throw new HttpError(404, "対象のピンが見つかりません。");
      await db.prepare(
        `INSERT INTO observations (
          id, public_id, agave_public_id, bloom_status, observed_at,
          description, verified_submitter, visibility
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 'approved')`,
      ).bind(
        crypto.randomUUID(),
        publicCode("OBS"),
        parsed.data.pinId,
        parsed.data.bloomStatus,
        parsed.data.observedAt,
        parsed.data.description,
      ).run();
      await syncPinFromLatestObservation(db, parsed.data.pinId);
    } else if (parsed.data.action === "update_observation") {
      const updated = await db.prepare(
        `UPDATE observations
         SET bloom_status = ?, observed_at = ?, description = ?, photo_alt = ?
         WHERE public_id = ? AND agave_public_id = ?`,
      ).bind(
        parsed.data.bloomStatus,
        parsed.data.observedAt,
        parsed.data.description,
        parsed.data.photoAlt || null,
        parsed.data.observationId,
        parsed.data.pinId,
      ).run();
      if (!updated.meta.changes) throw new HttpError(404, "対象の観察記録が見つかりません。");
      await syncPinFromLatestObservation(db, parsed.data.pinId);
    } else if (parsed.data.action === "delete_observation") {
      const observation = await db.prepare(
        `SELECT photo_key, visibility,
                (SELECT COUNT(*) FROM observations
                 WHERE agave_public_id = ? AND visibility = 'approved' AND public_id <> ?) AS remaining_approved
         FROM observations
         WHERE public_id = ? AND agave_public_id = ? LIMIT 1`,
      ).bind(
        parsed.data.pinId,
        parsed.data.observationId,
        parsed.data.observationId,
        parsed.data.pinId,
      ).first<{ photo_key: string | null; visibility: string; remaining_approved: number }>();
      if (!observation) throw new HttpError(404, "対象の観察記録が見つかりません。");
      if (observation.visibility === "approved" && observation.remaining_approved < 1) {
        throw new HttpError(400, "唯一の公開観察記録は削除できません。地点自体の完全削除を利用してください。");
      }
      const deleted = await db.prepare(
        "DELETE FROM observations WHERE public_id = ? AND agave_public_id = ?",
      ).bind(parsed.data.observationId, parsed.data.pinId).run();
      if (!deleted.meta.changes) throw new HttpError(404, "対象の観察記録が見つかりません。");
      await syncPinFromLatestObservation(db, parsed.data.pinId);
      if (observation.photo_key) {
        try {
          await runtimeEnv().BUCKET?.delete(observation.photo_key);
        } catch (cleanupError) {
          console.error("Deleted observation photo cleanup failed", cleanupError);
        }
      }
    } else if (parsed.data.action === "delete_observation_photo") {
      const observation = await db.prepare(
        "SELECT photo_key FROM observations WHERE public_id = ? AND agave_public_id = ? LIMIT 1",
      ).bind(parsed.data.observationId, parsed.data.pinId).first<{ photo_key: string | null }>();
      if (!observation) throw new HttpError(404, "対象の観察記録が見つかりません。");
      if (!observation.photo_key) throw new HttpError(400, "この観察記録には削除できる写真がありません。");
      const bucket = runtimeEnv().BUCKET;
      if (!bucket) throw new HttpError(503, "写真ストレージを利用できないため削除を中止しました。");
      await db.prepare(
        `UPDATE observations
         SET photo_key = NULL, photo_alt = NULL, photo_author = NULL,
             photo_license = NULL, photo_license_url = NULL,
             photo_source_url = NULL, photo_changes = NULL
         WHERE public_id = ? AND agave_public_id = ?`,
      ).bind(parsed.data.observationId, parsed.data.pinId).run();
      await syncPinFromLatestObservation(db, parsed.data.pinId);
      try {
        await bucket.delete(observation.photo_key);
      } catch (cleanupError) {
        console.error("Observation photo cleanup failed", cleanupError);
      }
    } else if ("pinId" in parsed.data) {
      if (parsed.data.action === "delete") {
        await permanentlyDeletePin(db, runtimeEnv().BUCKET, parsed.data.pinId);
        return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
      }
      if (parsed.data.action === "undo_latest_observation") {
        const observations = await db.prepare(
          `SELECT public_id, bloom_status, observed_at, description, photo_key, photo_alt,
                  photo_author, photo_license, photo_license_url, photo_source_url, photo_changes
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
               photo_key = ?, photo_alt = ?, photo_author = ?, photo_license = ?,
               photo_license_url = ?, photo_source_url = ?, photo_changes = ?,
               updated_at = CURRENT_TIMESTAMP
             WHERE public_id = ?`,
          ).bind(
            previous.bloom_status,
            previous.observed_at,
            previous.description,
            previous.photo_key,
            previous.photo_alt,
            previous.photo_author,
            previous.photo_license,
            previous.photo_license_url,
            previous.photo_source_url,
            previous.photo_changes,
            parsed.data.pinId,
          ),
        ]);
        return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
      }
      const visibility =
        parsed.data.action === "approve" ? "approved" : parsed.data.action === "hide" ? "hidden" : "rejected";
      const result = await db.prepare(
        "UPDATE agaves SET visibility = ?, updated_at = CURRENT_TIMESTAMP WHERE public_id = ?",
      ).bind(visibility, parsed.data.pinId).run();
      if (!result.meta.changes) throw new HttpError(404, "対象のピンが見つかりません。");
      if (parsed.data.action === "approve") {
        await db.prepare("UPDATE observations SET visibility = 'approved' WHERE agave_public_id = ? AND visibility IN ('pending', 'rejected')").bind(parsed.data.pinId).run();
      } else if (parsed.data.action === "reject") {
        await db.prepare("UPDATE observations SET visibility = 'rejected' WHERE agave_public_id = ? AND visibility = 'pending'").bind(parsed.data.pinId).run();
      }
    } else if (parsed.data.action === "delete_and_resolve") {
      const change = await db
        .prepare("SELECT agave_public_id FROM change_requests WHERE public_id = ? LIMIT 1")
        .bind(parsed.data.requestId)
        .first<{ agave_public_id: string }>();
      if (!change) throw new HttpError(404, "対象の依頼が見つかりません。");
      await permanentlyDeletePin(db, runtimeEnv().BUCKET, change.agave_public_id, parsed.data.requestId);
      await db.prepare(
        `UPDATE change_requests
         SET status = 'resolved', outcome = 'deleted', restrict_location = 1,
             resolved_at = CURRENT_TIMESTAMP
         WHERE public_id = ?`,
      ).bind(parsed.data.requestId).run();
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
    if (uploadedKey) {
      try {
        if (uploadedPhotoTarget) {
          const db = runtimeEnv().DB;
          if (db) {
            await db.prepare(
              `UPDATE observations
               SET photo_key = NULL, photo_alt = NULL, photo_author = NULL,
                   photo_license = NULL, photo_license_url = NULL,
                   photo_source_url = NULL, photo_changes = NULL
               WHERE public_id = ? AND agave_public_id = ? AND photo_key = ?`,
            ).bind(
              uploadedPhotoTarget.observationId,
              uploadedPhotoTarget.pinId,
              uploadedKey,
            ).run();
            await syncPinFromLatestObservation(db, uploadedPhotoTarget.pinId);
          }
        }
      } catch (cleanupError) {
        console.error("Failed admin photo database cleanup", cleanupError);
      }
      try {
        await runtimeEnv().BUCKET?.delete(uploadedKey);
      } catch (cleanupError) {
        console.error("Failed admin photo object cleanup", cleanupError);
      }
    }
    return errorResponse(error);
  }
}
