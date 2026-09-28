// Schema design reference for /documentation/schema.
//
// Hand-transcribed from CryoHealth-api/src/database/migrations — the only schema
// authority. This file is documentation, not a schema: it never drives a migration.
// When a new migration lands in CryoHealth-api, replay its up() here and bump
// SCHEMA_AS_OF so the page stays auditable against the migration history.

export const SCHEMA_AS_OF = {
  migration: "1790097238238-BackfillProtocolSteps",
  count: 11,
};

export type ColumnFlag = "PK" | "FK" | "UQ" | "NN";

export interface Column {
  name: string;
  type: string;
  flags?: ColumnFlag[];
  default?: string;
  /** Target table for FK columns, with the ON DELETE rule. */
  ref?: { table: string; onDelete: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION" };
  note?: string;
}

export interface Table {
  name: string;
  domain: DomainId;
  purpose: string;
  columns: Column[];
  indexes?: string[];
  notes?: string[];
}

export type DomainId = "hazard" | "alerts" | "health" | "identity" | "reference";

export const DOMAINS: { id: DomainId; label: string; blurb: string }[] = [
  {
    id: "hazard",
    label: "Hazard monitoring",
    blurb: "Glacial lakes, glaciers, and the satellite observations and scores computed for them.",
  },
  {
    id: "alerts",
    label: "Alerts",
    blurb: "Human-issued GLOF alerts, their acknowledgements, and the audit trail behind them.",
  },
  {
    id: "health",
    label: "Community health",
    blurb: "CHW case records, IMCI protocols, and the offline sync ledger.",
  },
  {
    id: "identity",
    label: "Identity & facilities",
    blurb: "Users, roles, CHW profiles, and the health facilities they belong to.",
  },
  {
    id: "reference",
    label: "Reference geography",
    blurb: "Administrative districts that lakes, glaciers, alerts, and cases are grouped by.",
  },
];

export const ENUMS: { name: string; values: string[]; usedBy: string[] }[] = [
  {
    name: "tier",
    values: ["normal", "watch", "high", "critical"],
    usedBy: ["lakes.currentTier", "hazard_scores.tier", "alerts.tier"],
  },
  { name: "dam_type", values: ["moraine", "bedrock", "ice", "unknown"], usedBy: ["lakes.damType"] },
  {
    name: "role",
    values: ["cryohealth_admin", "facility_admin", "chw", "viewer"],
    usedBy: ["users.role"],
  },
  { name: "alert_status", values: ["active", "cleared"], usedBy: ["alerts.status"] },
  { name: "sync_state", values: ["queued", "synced"], usedBy: ["chw_cases.syncState"] },
];

const id: Column = { name: "id", type: "uuid", flags: ["PK"], default: "uuid_generate_v4()" };
const createdAt = (name = "createdAt"): Column => ({
  name,
  type: "timestamptz",
  flags: ["NN"],
  default: "now()",
});

export const TABLES: Table[] = [
  // ── Hazard monitoring ───────────────────────────────────────────────────
  {
    name: "lakes",
    domain: "hazard",
    purpose: "Monitored glacial lakes and their current hazard tier.",
    columns: [
      id,
      { name: "name", type: "varchar", flags: ["NN"] },
      { name: "nameUr", type: "varchar", note: "Urdu name" },
      { name: "slug", type: "varchar", flags: ["NN", "UQ"] },
      { name: "valley", type: "varchar", flags: ["NN"] },
      { name: "district", type: "varchar", flags: ["NN"], note: "Free-text district name" },
      {
        name: "district_id",
        type: "uuid",
        flags: ["FK"],
        ref: { table: "districts", onDelete: "SET NULL" },
      },
      { name: "damType", type: "dam_type", flags: ["NN"], default: "'unknown'" },
      { name: "glacierContact", type: "boolean", flags: ["NN"], default: "false" },
      { name: "icimodId", type: "varchar", flags: ["UQ"], note: "ICIMOD inventory ID" },
      { name: "geom", type: "geometry(Point, 4326)", flags: ["NN"] },
      { name: "boundary", type: "geometry(Polygon, 4326)" },
      { name: "elevationM", type: "integer" },
      { name: "area_km2", type: "numeric" },
      { name: "historicalGlof", type: "boolean", flags: ["NN"], default: "false" },
      { name: "currentTier", type: "tier", flags: ["NN"], default: "'normal'" },
      { name: "current_risk_score", type: "numeric", flags: ["NN"], default: "0" },
      { name: "downstream_population", type: "integer", flags: ["NN"], default: "0" },
      {
        name: "stale",
        type: "boolean",
        flags: ["NN"],
        default: "false",
        note: "No recent usable observation",
      },
      { name: "source", type: "text", flags: ["NN"], note: "Provenance of the lake record" },
      { name: "sourceUrl", type: "varchar" },
      createdAt(),
      { name: "updatedAt", type: "timestamptz", flags: ["NN"], default: "now()" },
    ],
    notes: [
      "`district` (text) and `district_id` (FK) coexist: the text column predates the districts table.",
    ],
  },
  {
    name: "observations",
    domain: "hazard",
    purpose: "Lake water-extent measurements from Sentinel-2 scenes, written by the EO pipeline.",
    columns: [
      id,
      {
        name: "lakeId",
        type: "uuid",
        flags: ["NN", "FK"],
        ref: { table: "lakes", onDelete: "CASCADE" },
      },
      { name: "capturedAt", type: "timestamptz", flags: ["NN"] },
      { name: "source", type: "varchar", flags: ["NN"], default: "'sentinel2'" },
      { name: "areaKm2", type: "numeric(12,6)", flags: ["NN"] },
      { name: "cloudFraction", type: "numeric(5,4)" },
      { name: "sceneId", type: "varchar" },
      { name: "runId", type: "varchar", flags: ["NN"], note: "Pipeline run that produced it" },
      createdAt(),
    ],
    indexes: ["(lakeId, capturedAt)", "UNIQUE (lakeId, capturedAt, source) — dedupe re-runs"],
  },
  {
    name: "hazard_scores",
    domain: "hazard",
    purpose: "Per-run hazard score and tier for a lake, with the inputs that produced it.",
    columns: [
      id,
      {
        name: "lakeId",
        type: "uuid",
        flags: ["NN", "FK"],
        ref: { table: "lakes", onDelete: "CASCADE" },
      },
      { name: "runId", type: "varchar", flags: ["NN"] },
      { name: "score", type: "numeric(8,4)", flags: ["NN"] },
      { name: "tier", type: "tier", flags: ["NN"] },
      {
        name: "components",
        type: "jsonb",
        flags: ["NN"],
        note: "Score inputs, kept so any tier can be recomputed",
      },
      { name: "computedAt", type: "timestamptz", flags: ["NN"] },
      createdAt(),
    ],
    indexes: ["(lakeId, computedAt)"],
  },
  {
    name: "lake_risk_scores",
    domain: "hazard",
    purpose: "Time series of lake risk scores with a confidence value and data source.",
    columns: [
      id,
      {
        name: "lake_id",
        type: "uuid",
        flags: ["NN", "FK"],
        ref: { table: "lakes", onDelete: "CASCADE" },
      },
      { name: "score", type: "numeric", flags: ["NN"] },
      { name: "tier", type: "text", flags: ["NN"], note: "Plain text, not the tier enum" },
      { name: "confidence", type: "numeric", flags: ["NN"], default: "0.8" },
      { name: "source", type: "text", flags: ["NN"], default: "'sentinel-1'" },
      { name: "observed_at", type: "timestamptz", flags: ["NN"], default: "now()" },
    ],
    indexes: ["(lake_id, observed_at DESC)"],
    notes: ["Parallel to `hazard_scores`; both tables exist in the current schema."],
  },
  {
    name: "glaciers",
    domain: "hazard",
    purpose: "Glacier inventory (RGI / GLIMS) for the monitored region.",
    columns: [
      id,
      { name: "name", type: "text", flags: ["NN"] },
      { name: "rgi_id", type: "text", note: "Randolph Glacier Inventory ID" },
      { name: "glims_id", type: "text" },
      {
        name: "district_id",
        type: "uuid",
        flags: ["FK"],
        ref: { table: "districts", onDelete: "SET NULL" },
      },
      { name: "lat", type: "double precision", flags: ["NN"] },
      { name: "lng", type: "double precision", flags: ["NN"] },
      { name: "area_km2", type: "numeric" },
      { name: "length_km", type: "numeric" },
      { name: "elevation_min_m", type: "integer" },
      { name: "elevation_max_m", type: "integer" },
      { name: "status", type: "text", flags: ["NN"], default: "'unknown'" },
      { name: "terminus_type", type: "text" },
      { name: "source", type: "text" },
      { name: "last_observed", type: "timestamptz" },
      { name: "notes", type: "text" },
      createdAt("created_at"),
    ],
    indexes: ["(district_id)"],
  },
  {
    name: "glacier_observations",
    domain: "hazard",
    purpose: "Dated glacier measurements: area, length, and terminus change.",
    columns: [
      id,
      {
        name: "glacier_id",
        type: "uuid",
        flags: ["NN", "FK"],
        ref: { table: "glaciers", onDelete: "CASCADE" },
      },
      { name: "observed_at", type: "timestamptz", flags: ["NN"] },
      { name: "area_km2", type: "numeric" },
      { name: "length_km", type: "numeric" },
      { name: "terminus_change_m", type: "numeric" },
      { name: "status", type: "text" },
      { name: "source", type: "text" },
      { name: "notes", type: "text" },
      createdAt("created_at"),
    ],
    indexes: ["(glacier_id, observed_at DESC)"],
  },

  // ── Alerts ──────────────────────────────────────────────────────────────
  {
    name: "alerts",
    domain: "alerts",
    purpose: "GLOF alerts issued by a person, with bilingual body text and action items.",
    columns: [
      id,
      {
        name: "lakeId",
        type: "uuid",
        flags: ["FK"],
        ref: { table: "lakes", onDelete: "SET NULL" },
      },
      {
        name: "district_id",
        type: "uuid",
        flags: ["FK"],
        ref: { table: "districts", onDelete: "SET NULL" },
      },
      { name: "tier", type: "tier", flags: ["NN"] },
      { name: "title", type: "varchar", flags: ["NN"] },
      { name: "body", type: "text", flags: ["NN"] },
      { name: "body_en", type: "text", note: "Backfilled from `body`" },
      { name: "body_ur", type: "text" },
      { name: "chips", type: "jsonb", note: "Short action tags" },
      { name: "checklist", type: "jsonb", note: "Numbered action items" },
      { name: "windowStart", type: "timestamptz" },
      { name: "windowEnd", type: "timestamptz" },
      { name: "estimated_window", type: "text" },
      { name: "downstreamSummary", type: "text" },
      { name: "affected_population", type: "integer", flags: ["NN"], default: "0" },
      { name: "status", type: "alert_status", flags: ["NN"], default: "'active'" },
      {
        name: "issuedById",
        type: "uuid",
        flags: ["FK"],
        ref: { table: "users", onDelete: "NO ACTION" },
      },
      createdAt(),
      { name: "clearedAt", type: "timestamptz" },
    ],
    indexes: ["UNIQUE (lakeId, tier) WHERE status = 'active' — one active alert per lake and tier"],
    notes: [
      "`chips` and `checklist` are nullable and never backfilled: older alerts carry none rather than invented ones.",
    ],
  },
  {
    name: "alert_acknowledgements",
    domain: "alerts",
    purpose: "Records that a CHW has seen and acknowledged an alert.",
    columns: [
      id,
      {
        name: "alert_id",
        type: "uuid",
        flags: ["NN", "FK"],
        ref: { table: "alerts", onDelete: "CASCADE" },
      },
      {
        name: "chw_id",
        type: "uuid",
        flags: ["NN", "FK"],
        ref: { table: "users", onDelete: "CASCADE" },
      },
      { name: "acknowledged_at", type: "timestamptz", flags: ["NN"], default: "now()" },
    ],
    indexes: ["UNIQUE (alert_id, chw_id)"],
  },
  {
    name: "audit",
    domain: "alerts",
    purpose:
      "Append-only audit trail. Every alert creation or tier override records a human-readable reason.",
    columns: [
      id,
      {
        name: "actorId",
        type: "uuid",
        flags: ["FK"],
        ref: { table: "users", onDelete: "NO ACTION" },
      },
      { name: "action", type: "varchar", flags: ["NN"] },
      { name: "entityType", type: "varchar", flags: ["NN"] },
      { name: "entityId", type: "varchar" },
      { name: "reason", type: "text" },
      { name: "meta", type: "jsonb" },
      createdAt(),
    ],
  },

  // ── Community health ────────────────────────────────────────────────────
  {
    name: "chw_cases",
    domain: "health",
    purpose: "Triage cases captured offline on the field app and synced to the server.",
    columns: [
      id,
      {
        name: "chwId",
        type: "uuid",
        flags: ["NN", "FK"],
        ref: { table: "users", onDelete: "NO ACTION" },
      },
      { name: "capturedAt", type: "timestamptz", flags: ["NN"] },
      { name: "payload", type: "jsonb", flags: ["NN"] },
      { name: "outcome", type: "varchar" },
      { name: "syncState", type: "sync_state", flags: ["NN"], default: "'synced'" },
      { name: "deviceId", type: "varchar", flags: ["NN"] },
      {
        name: "clientCaseId",
        type: "varchar",
        flags: ["NN", "UQ"],
        note: "Idempotency key for offline upsert",
      },
      createdAt(),
    ],
    indexes: ["(chwId, capturedAt)"],
  },
  {
    name: "cases",
    domain: "health",
    purpose: "Structured case records used by the web dashboard's CHW and admin views.",
    columns: [
      id,
      {
        name: "chw_id",
        type: "uuid",
        flags: ["NN", "FK"],
        ref: { table: "users", onDelete: "RESTRICT" },
      },
      {
        name: "district_id",
        type: "uuid",
        flags: ["FK"],
        ref: { table: "districts", onDelete: "SET NULL" },
      },
      { name: "patient_age", type: "integer" },
      { name: "patient_sex", type: "text" },
      { name: "symptoms", type: "text", flags: ["NN"] },
      { name: "diagnosis", type: "text" },
      { name: "treatment", type: "text" },
      { name: "outcome", type: "text" },
      { name: "is_disaster_related", type: "boolean", flags: ["NN"], default: "false" },
      createdAt("created_at"),
      { name: "deleted_at", type: "timestamptz", note: "Soft delete" },
    ],
    indexes: ["(chw_id, created_at DESC)", "(district_id, created_at DESC)"],
    notes: [
      "Parallel to `chw_cases`: `cases` holds structured columns, `chw_cases` holds the device payload as jsonb.",
    ],
  },
  {
    name: "protocols",
    domain: "health",
    purpose:
      "IMCI and disaster-response protocols. All dosing and diagnosis text shown to CHWs comes from here.",
    columns: [
      id,
      { name: "slug", type: "text", flags: ["NN", "UQ"] },
      { name: "title", type: "text", flags: ["NN"] },
      { name: "category", type: "text", flags: ["NN"] },
      { name: "body", type: "text", flags: ["NN"] },
      { name: "steps", type: "jsonb", note: "Ordered protocol steps" },
      { name: "source", type: "text", flags: ["NN"], default: "'WHO IMNCI'" },
      { name: "is_disaster", type: "boolean", flags: ["NN"], default: "false" },
      createdAt("created_at"),
      { name: "updated_at", type: "timestamptz", flags: ["NN"], default: "now()" },
    ],
  },
  {
    name: "sync_log",
    domain: "health",
    purpose: "One row per device sync, for tracing offline data back to its upload.",
    columns: [
      id,
      {
        name: "userId",
        type: "uuid",
        flags: ["NN", "FK"],
        ref: { table: "users", onDelete: "NO ACTION" },
      },
      { name: "deviceId", type: "varchar", flags: ["NN"] },
      { name: "startedAt", type: "timestamptz", flags: ["NN"] },
      { name: "finishedAt", type: "timestamptz" },
      { name: "itemCount", type: "integer", flags: ["NN"], default: "0" },
      { name: "status", type: "varchar", flags: ["NN"], default: "'ok'" },
      { name: "detail", type: "jsonb" },
      createdAt(),
    ],
  },

  // ── Identity & facilities ───────────────────────────────────────────────
  {
    name: "users",
    domain: "identity",
    purpose: "Everyone who can sign in: admins, facility staff, CHWs, and viewers.",
    columns: [
      id,
      { name: "role", type: "role", flags: ["NN"] },
      { name: "name", type: "varchar", flags: ["NN"] },
      { name: "phone", type: "varchar", flags: ["UQ"] },
      { name: "lhwId", type: "varchar", flags: ["UQ"], note: "Lady Health Worker ID" },
      { name: "passwordHash", type: "varchar", flags: ["NN"] },
      {
        name: "facilityId",
        type: "uuid",
        flags: ["FK"],
        ref: { table: "facilities", onDelete: "NO ACTION" },
      },
      { name: "active", type: "boolean", flags: ["NN"], default: "true" },
      createdAt(),
    ],
  },
  {
    name: "chw_profiles",
    domain: "identity",
    purpose: "Extra profile data for community health workers.",
    columns: [
      id,
      {
        name: "user_id",
        type: "uuid",
        flags: ["FK"],
        ref: { table: "users", onDelete: "CASCADE" },
      },
      { name: "full_name", type: "text", flags: ["NN"], default: "'Community Health Worker'" },
      {
        name: "district_id",
        type: "uuid",
        flags: ["FK"],
        ref: { table: "districts", onDelete: "SET NULL" },
      },
      { name: "phone", type: "text" },
      { name: "language", type: "text", flags: ["NN"], default: "'ur'" },
      createdAt("created_at"),
    ],
  },
  {
    name: "facilities",
    domain: "identity",
    purpose: "Health facilities (BHUs and others) and the lake that threatens them.",
    columns: [
      id,
      { name: "name", type: "varchar", flags: ["NN"] },
      { name: "type", type: "varchar", flags: ["NN"], default: "'bhu'" },
      { name: "district", type: "varchar", flags: ["NN"] },
      { name: "geom", type: "geometry(Point, 4326)" },
      { name: "contact", type: "varchar" },
      {
        name: "lakeId",
        type: "uuid",
        flags: ["FK"],
        ref: { table: "lakes", onDelete: "NO ACTION" },
      },
      { name: "vulnerability", type: "text", flags: ["NN"], default: "'low'" },
      createdAt(),
    ],
  },

  // ── Reference geography ─────────────────────────────────────────────────
  {
    name: "districts",
    domain: "reference",
    purpose: "Administrative districts of Gilgit Baltistan.",
    columns: [
      id,
      { name: "name", type: "text", flags: ["NN", "UQ"] },
      { name: "province", type: "text", flags: ["NN"], default: "'Gilgit Baltistan'" },
      { name: "population", type: "integer" },
      { name: "centroid_lat", type: "double precision" },
      { name: "centroid_lng", type: "double precision" },
      createdAt("created_at"),
    ],
  },
];

/** Every FK edge, derived from TABLES so the relationship list can't drift from the columns. */
export const RELATIONSHIPS = TABLES.flatMap((t) =>
  t.columns
    .filter((c) => c.ref)
    .map((c) => ({ from: t.name, column: c.name, to: c.ref!.table, onDelete: c.ref!.onDelete })),
);
