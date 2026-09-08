import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const agaves = sqliteTable(
  "agaves",
  {
    id: text("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    title: text("title").notNull(),
    species: text("species").notNull().default("不明"),
    bloomStatus: text("bloom_status").notNull(),
    observedAt: text("observed_at").notNull(),
    previousBloomYear: integer("previous_bloom_year"),
    plantCount: integer("plant_count"),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    municipality: text("municipality").notNull(),
    locationName: text("location_name").notNull(),
    locationType: text("location_type").notNull(),
    accessNote: text("access_note").notNull().default(""),
    description: text("description").notNull().default(""),
    photoKey: text("photo_key"),
    photoAlt: text("photo_alt"),
    submitterRelation: text("submitter_relation").notNull(),
    permissionConfirmed: integer("permission_confirmed", { mode: "boolean" })
      .notNull()
      .default(false),
    visibility: text("visibility").notNull().default("approved"),
    managementKeyHash: text("management_key_hash").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_agaves_visibility_status_observed").on(
      table.visibility,
      table.bloomStatus,
      table.observedAt,
    ),
  ],
);

export const changeRequests = sqliteTable(
  "change_requests",
  {
    id: text("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    agavePublicId: text("agave_public_id").notNull(),
    kind: text("kind").notNull(),
    reason: text("reason").notNull(),
    details: text("details").notNull(),
    contactEmail: text("contact_email"),
    reporterHash: text("reporter_hash"),
    verifiedSubmitter: integer("verified_submitter", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status").notNull().default("pending"),
    outcome: text("outcome"),
    resolutionNote: text("resolution_note").notNull().default(""),
    restrictLocation: integer("restrict_location", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    hiddenAt: text("hidden_at"),
    resolvedAt: text("resolved_at"),
    contactErasedAt: text("contact_erased_at"),
  },
  (table) => [
    index("idx_change_requests_status_created").on(
      table.status,
      table.createdAt,
    ),
    index("idx_change_requests_agave").on(table.agavePublicId),
  ],
);

export const locationRestrictions = sqliteTable(
  "location_restrictions",
  {
    id: text("id").primaryKey(),
    sourceRequestPublicId: text("source_request_public_id").notNull().unique(),
    agavePublicId: text("agave_public_id").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    radiusMeters: integer("radius_meters").notNull().default(75),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("active"),
    matchCount: integer("match_count").notNull().default(0),
    lastMatchedAt: text("last_matched_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    index("idx_location_restrictions_status_latitude_longitude").on(
      table.status,
      table.latitude,
      table.longitude,
    ),
    index("idx_location_restrictions_agave").on(table.agavePublicId),
  ],
);

export const observations = sqliteTable(
  "observations",
  {
    id: text("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    agavePublicId: text("agave_public_id").notNull(),
    bloomStatus: text("bloom_status").notNull(),
    observedAt: text("observed_at").notNull(),
    description: text("description").notNull().default(""),
    photoKey: text("photo_key"),
    photoAlt: text("photo_alt"),
    verifiedSubmitter: integer("verified_submitter", { mode: "boolean" })
      .notNull()
      .default(false),
    visibility: text("visibility").notNull().default("approved"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_observations_agave_visibility_date").on(
      table.agavePublicId,
      table.visibility,
      table.observedAt,
    ),
  ],
);

export const abuseBuckets = sqliteTable("abuse_buckets", {
  key: text("key").primaryKey(),
  action: text("action").notNull(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull().default(1),
});
