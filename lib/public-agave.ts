import {
  type AgaveObservation,
  type AgavePin,
  type BloomStatus,
  type LocationType,
  type PhotoAttribution,
} from "@/lib/agave";
import { runtimeEnv } from "@/lib/server-security";

type AgaveRow = {
  public_id: string;
  title: string;
  species: string;
  bloom_status: BloomStatus;
  observed_at: string;
  previous_bloom_year: number | null;
  plant_count: number | null;
  latitude: number;
  longitude: number;
  municipality: string;
  location_name: string;
  location_type: LocationType;
  access_note: string;
  description: string;
  photo_key: string | null;
  photo_alt: string | null;
  photo_author: string | null;
  photo_license: string | null;
  photo_license_url: string | null;
  photo_source_url: string | null;
  photo_changes: string | null;
};

type ObservationRow = {
  public_id: string;
  bloom_status: BloomStatus;
  observed_at: string;
  description: string;
  photo_key: string | null;
  photo_alt: string | null;
  photo_author: string | null;
  photo_license: string | null;
  photo_license_url: string | null;
  photo_source_url: string | null;
  photo_changes: string | null;
  verified_submitter: number | boolean;
};

function photoUrl(key: string | null) {
  if (!key) return null;
  return `/api/photos/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function photoAttribution(row: AgaveRow | ObservationRow): PhotoAttribution | null {
  if (!row.photo_author || !row.photo_license) return null;
  return {
    author: row.photo_author,
    license: row.photo_license,
    licenseUrl: row.photo_license_url,
    sourceUrl: row.photo_source_url,
    changes: row.photo_changes,
  };
}

export type PublicAgaveResult =
  | { state: "ready"; pin: AgavePin }
  | { state: "not-found" }
  | { state: "unavailable" };

export async function getPublicAgave(publicId: string): Promise<PublicAgaveResult> {
  const normalizedId = publicId.trim().toUpperCase();
  if (!/^AGV-[A-Z0-9_-]{6,20}$/.test(normalizedId)) {
    return { state: "not-found" };
  }

  const db = runtimeEnv().DB;
  if (!db) return { state: "unavailable" };

  try {
    const row = await db
      .prepare(
        `SELECT public_id, title, species, bloom_status, observed_at,
                previous_bloom_year, plant_count, latitude, longitude,
                municipality, location_name, location_type, access_note,
                description, photo_key, photo_alt, photo_author, photo_license,
                photo_license_url, photo_source_url, photo_changes
         FROM agaves
         WHERE public_id = ? AND visibility = 'approved'
         LIMIT 1`,
      )
      .bind(normalizedId)
      .first<AgaveRow>();

    if (!row) return { state: "not-found" };

    const history = await db
      .prepare(
        `SELECT public_id, bloom_status, observed_at, description,
                photo_key, photo_alt, photo_author, photo_license,
                photo_license_url, photo_source_url, photo_changes,
                verified_submitter
         FROM observations
         WHERE agave_public_id = ? AND visibility = 'approved'
         ORDER BY observed_at DESC, created_at DESC
         LIMIT 50`,
      )
      .bind(normalizedId)
      .all<ObservationRow>();

    const observations: AgaveObservation[] = history.results.map((item) => ({
      id: item.public_id,
      status: item.bloom_status,
      observedAt: item.observed_at,
      description: item.description,
      photoUrl: photoUrl(item.photo_key),
      photoAlt: item.photo_alt,
      photoAttribution: photoAttribution(item),
      verifiedSubmitter: Boolean(item.verified_submitter),
    }));

    return {
      state: "ready",
      pin: {
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
        photoAttribution: photoAttribution(row),
        observations,
      },
    };
  } catch (error) {
    console.error("Public agave page query failed", error);
    return { state: "unavailable" };
  }
}
