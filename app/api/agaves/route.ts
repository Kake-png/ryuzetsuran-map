import { z } from "zod";

import { DEMO_PINS } from "@/lib/agave";
import { sanitizeWebp } from "@/lib/photo-security";
import {
  assertHumanTiming,
  assertSameOrigin,
  enforceGlobalRateLimit,
  enforceRateLimit,
  errorResponse,
  HttpError,
  notifyModerator,
  publicCode,
  randomToken,
  runtimeEnv,
  sha256,
} from "@/lib/server-security";

const submissionSchema = z
  .object({
    bloomStatus: z.enum(["blooming", "flower_stalk", "likely", "normal", "pups", "dead", "unknown"]),
    observedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`))),
    previousBloomYear: z.union([z.literal(""), z.coerce.number().int().min(1900).max(new Date().getUTCFullYear())]),
    plantCount: z.union([z.literal(""), z.coerce.number().int().min(1).max(1000)]),
    latitude: z.coerce.number().min(-85).max(85),
    longitude: z.coerce.number().min(-180).max(180),
    municipality: z.string().trim().min(2).max(80),
    locationType: z.enum(["public_space", "visitor_facility", "private_authorized"]),
    accessNote: z.string().trim().max(500),
    description: z.string().trim().max(1200),
    photoAlt: z.string().trim().max(160),
    submitterRelation: z.enum(["observer", "owner", "authorized"]),
    permissionConfirmed: z.literal("true"),
    rulesAccepted: z.literal("true"),
    startedAt: z.string(),
    website: z.string().max(0),
  })
  .superRefine((value, context) => {
    if (
      value.locationType === "private_authorized" &&
      !["owner", "authorized"].includes(value.submitterRelation)
    ) {
      context.addIssue({
        code: "custom",
        path: ["submitterRelation"],
        message: "私有地は所有者本人または掲載許可を得た方のみ投稿できます。",
      });
    }
    const observation = Date.parse(`${value.observedAt}T00:00:00Z`);
    if (observation > Date.now() + 86_400_000) {
      context.addIssue({
        code: "custom",
        path: ["observedAt"],
        message: "観察日は未来の日付にできません。",
      });
    }
  });

type AgaveRow = {
  public_id: string;
  title: string;
  species: string;
  bloom_status: "blooming" | "flower_stalk" | "likely" | "normal" | "pups" | "dead" | "unknown";
  observed_at: string;
  previous_bloom_year: number | null;
  plant_count: number | null;
  latitude: number;
  longitude: number;
  municipality: string;
  location_name: string;
  location_type: "public_space" | "visitor_facility" | "private_authorized";
  access_note: string;
  description: string;
  photo_key: string | null;
  photo_alt: string | null;
};

function photoUrl(key: string | null) {
  if (!key) return null;
  return `/api/photos/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function distanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const radians = Math.PI / 180;
  const dLat = (latitudeB - latitudeA) * radians;
  const dLon = (longitudeB - longitudeA) * radians;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(latitudeA * radians) * Math.cos(latitudeB * radians) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET() {
  try {
    const db = runtimeEnv().DB;
    if (!db) {
      return Response.json({ pins: DEMO_PINS, demoMode: true, unavailable: true });
    }

    const result = await db
      .prepare(
        `SELECT public_id, title, species, bloom_status, observed_at,
                previous_bloom_year, plant_count, latitude, longitude,
                municipality, location_name, location_type, access_note,
                description, photo_key, photo_alt
         FROM agaves
         WHERE visibility = 'approved'
         ORDER BY observed_at DESC, created_at DESC
         LIMIT 500`,
      )
      .all<AgaveRow>();

    const history = await db.prepare(
      `SELECT public_id, agave_public_id, bloom_status, observed_at, description,
              photo_key, photo_alt, verified_submitter
       FROM observations
       WHERE visibility = 'approved'
       ORDER BY observed_at DESC, created_at DESC
       LIMIT 3000`,
    ).all<Record<string, unknown>>();
    const grouped = new Map<string, Record<string, unknown>[]>();
    for (const item of history.results) {
      const key = String(item.agave_public_id);
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }

    const pins = result.results.map((row: AgaveRow) => ({
      id: row.public_id,
      title: row.title,
      species: row.species,
      status: row.bloom_status,
      observedAt: row.observed_at,
      previousBloomYear: row.previous_bloom_year,
      plantCount: row.plant_count,
      latitude: row.latitude,
      longitude: row.longitude,
      municipality: row.municipality,
      locationName: row.location_name,
      locationType: row.location_type,
      accessNote: row.access_note,
      description: row.description,
      photoUrl: photoUrl(row.photo_key),
      photoAlt: row.photo_alt,
      observations: (grouped.get(row.public_id) ?? []).slice(0, 20).map((item) => ({
        id: String(item.public_id),
        status: item.bloom_status,
        observedAt: String(item.observed_at),
        description: String(item.description ?? ""),
        photoUrl: photoUrl(typeof item.photo_key === "string" ? item.photo_key : null),
        photoAlt: typeof item.photo_alt === "string" ? item.photo_alt : null,
        verifiedSubmitter: Boolean(item.verified_submitter),
      })),
    }));

    return Response.json(
      pins.length > 0
        ? { pins, demoMode: false }
        : { pins: DEMO_PINS, demoMode: true },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { pins: DEMO_PINS, demoMode: true, unavailable: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  let uploadedKey: string | null = null;
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "pin-submission", 5);
    await enforceGlobalRateLimit("pin-submission", 80);

    const form = await request.formData();
    const raw = Object.fromEntries(
      Array.from(form.entries())
        .filter(([key]) => key !== "photo")
        .map(([key, value]) => [key, String(value)]),
    );
    const parsed = submissionSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
      );
    }
    assertHumanTiming(parsed.data.startedAt);

    const db = runtimeEnv().DB;
    const bucket = runtimeEnv().BUCKET;
    if (!db) throw new HttpError(503, "保存機能を一時的に利用できません。");

    const latitude = Number(parsed.data.latitude.toFixed(6));
    const longitude = Number(parsed.data.longitude.toFixed(6));
    const latitudeWindow = 0.0012;
    const longitudeWindow = 0.0015;
    const nearbyPins = await db.prepare(
      `SELECT public_id, latitude, longitude
       FROM agaves
       WHERE visibility = 'approved'
         AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
       LIMIT 20`,
    ).bind(latitude - latitudeWindow, latitude + latitudeWindow, longitude - longitudeWindow, longitude + longitudeWindow).all<{ public_id: string; latitude: number; longitude: number }>();
    const duplicate = nearbyPins.results.find((pin) => distanceMeters(latitude, longitude, pin.latitude, pin.longitude) <= 20);
    if (duplicate) throw new HttpError(409, `この場所の近くにはすでにピンがあります（${duplicate.public_id}）。新規登録ではなく観察履歴を追加してください。`);

    const recentNearby = await db.prepare(
      `SELECT COUNT(*) AS count FROM agaves
       WHERE created_at >= datetime('now', '-1 hour')
         AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?`,
    ).bind(latitude - latitudeWindow, latitude + latitudeWindow, longitude - longitudeWindow, longitude + longitudeWindow).first<{ count: number }>();
    if ((recentNearby?.count ?? 0) >= 3) throw new HttpError(429, "この周辺では短時間に複数の投稿がありました。時間をおいてください。");

    const restrictions = await db.prepare(
      `SELECT id, latitude, longitude, radius_meters
       FROM location_restrictions
       WHERE status = 'active'
         AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
       LIMIT 30`,
    ).bind(latitude - latitudeWindow, latitude + latitudeWindow, longitude - longitudeWindow, longitude + longitudeWindow).all<{ id: string; latitude: number; longitude: number; radius_meters: number }>();
    const matchedRestriction = restrictions.results.find((item) => distanceMeters(latitude, longitude, item.latitude, item.longitude) <= item.radius_meters);
    const visibility = matchedRestriction ? "pending" : "approved";

    const id = crypto.randomUUID();
    const pinId = publicCode("AGV");
    const observationId = publicCode("OBS");
    const managementKey = randomToken(32);
    const managementKeyHash = await sha256(managementKey);
    const photo = form.get("photo");

    if (photo && typeof photo !== "string" && photo.size > 0) {
      if (!bucket) throw new HttpError(503, "写真の保存機能を一時的に利用できません。");
      if (photo.type !== "image/webp" || photo.size > 3_000_000) {
        throw new HttpError(400, "写真は変換後3MB以下のWebP画像にしてください。");
      }
      const bytes = sanitizeWebp(new Uint8Array(await photo.arrayBuffer()));

      uploadedKey = `agaves/${id}/${randomToken(18)}.webp`;
      await bucket.put(uploadedKey, bytes, {
        httpMetadata: { contentType: "image/webp" },
        customMetadata: { pinId },
      });
    }

    const value = parsed.data;
    const title = `${value.municipality}のアオノリュウゼツラン`;
    await db.batch([
      db.prepare(
        `INSERT INTO agaves (
          id, public_id, title, species, bloom_status, observed_at,
          previous_bloom_year, plant_count, latitude, longitude,
          municipality, location_name, location_type, access_note, description,
          photo_key, photo_alt, submitter_relation, permission_confirmed,
          visibility, management_key_hash
        ) VALUES (?, ?, ?, 'アオノリュウゼツラン', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .bind(
        id,
        pinId,
        title,
        value.bloomStatus,
        value.observedAt,
        value.previousBloomYear === "" ? null : value.previousBloomYear,
        value.plantCount === "" ? null : value.plantCount,
        latitude,
        longitude,
        value.municipality,
        value.municipality,
        value.locationType,
        value.accessNote,
        value.description,
        uploadedKey,
        value.photoAlt || null,
        value.submitterRelation,
        visibility,
        managementKeyHash,
      ),
      db.prepare(
        `INSERT INTO observations (
          id, public_id, agave_public_id, bloom_status, observed_at,
          description, photo_key, photo_alt, verified_submitter, visibility
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      ).bind(
        crypto.randomUUID(),
        observationId,
        pinId,
        value.bloomStatus,
        value.observedAt,
        value.description,
        uploadedKey,
        value.photoAlt || null,
        visibility,
      ),
      ...(matchedRestriction
        ? [db.prepare("UPDATE location_restrictions SET match_count = match_count + 1, last_matched_at = CURRENT_TIMESTAMP WHERE id = ?").bind(matchedRestriction.id)]
        : []),
    ]);

    if (value.locationType === "private_authorized") {
      await notifyModerator(`私有地として申告された新規投稿があります: ${pinId}`);
    }

    return Response.json(
      {
        pinId,
        managementKey,
        published: visibility === "approved",
        message: visibility === "approved"
          ? "投稿を公開しました。管理キーは修正や取り下げのために保管してください。"
          : "過去に掲載停止となった地点の近くであるため、公開せず運営確認待ちとして保存しました。管理キーは保管してください。",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (uploadedKey) {
      try {
        await runtimeEnv().BUCKET?.delete(uploadedKey);
      } catch (cleanupError) {
        console.error(cleanupError);
      }
    }
    return errorResponse(error);
  }
}
