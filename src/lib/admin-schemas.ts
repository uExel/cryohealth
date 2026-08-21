import { z } from "zod";

/**
 * Per-resource zod schemas for the admin CRUD API (tasks #10-#19). Empty `.strict()`
 * stubs for now — `.strict()` rejects any payload until a CRUD task fills in real
 * fields, which is the safe failure direction for a schema nobody's supposed to call
 * yet (a bare `z.object({})` would silently accept anything).
 */

export const districtCreateSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    province: z.string().min(1, "Province is required"),
    // Plain z.number(), not .coerce: population is `integer` and centroid_lat/lng are
    // `double precision` -- postgres.js returns both as real JS numbers, never strings,
    // so there's no round-trip case to coerce for. (.coerce would also accept "", null,
    // [] etc. as 0 -- see glacierCreateSchema.lat/lng's comment for why that matters.)
    population: z.number().int().positive().nullable().optional(),
    centroid_lat: z.number().min(-90).max(90).nullable().optional(),
    centroid_lng: z.number().min(-180).max(180).nullable().optional(),
  })
  .strict();
export type DistrictCreate = z.infer<typeof districtCreateSchema>;

export const districtUpdateSchema = districtCreateSchema.partial();
export type DistrictUpdate = z.infer<typeof districtUpdateSchema>;

const GLACIER_STATUSES = ["stable", "retreating", "advancing", "surging", "unknown"] as const;

export const glacierCreateSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    rgi_id: z.string().min(1).nullable().optional(),
    glims_id: z.string().min(1).nullable().optional(),
    district_id: z.string().uuid().nullable().optional(),
    // Plain z.number(): lat/lng are `double precision`, NOT NULL, always real JS
    // numbers from postgres.js. Do NOT switch these to .coerce -- caught in verify
    // (#10 fix loop, finding N1): Number(null)/Number("")/Number([]) are all 0, which
    // is a valid latitude, so a client PUTting an explicit null to "clear" a required
    // field would silently relocate the glacier to 0,0 instead of getting a 400.
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    // .coerce ONLY here: area_km2/length_km are Postgres `numeric`, which postgres.js
    // returns as strings (avoids float precision loss), and the edit dialog's
    // defaultValues come straight from that GET payload. A plain z.number() rejects the
    // round-tripped string the instant a glacier has a recorded area, blocking every
    // edit on it -- caught in verify (#10 fix loop, finding F1). elevation_min/max_m are
    // plain `integer` (never returned as strings), so they don't need this and stay
    // z.number() to avoid the same null/""/[]-coerce-to-0 hazard as lat/lng above.
    area_km2: z.coerce.number().positive().nullable().optional(),
    length_km: z.coerce.number().positive().nullable().optional(),
    elevation_min_m: z.number().int().nullable().optional(),
    elevation_max_m: z.number().int().nullable().optional(),
    status: z.enum(GLACIER_STATUSES),
    terminus_type: z.string().min(1).nullable().optional(),
    // Required despite the DB column being nullable: the glaciers page header advertises
    // RGI v7 / GLIMS provenance, so a hand-entered row must cite where it came from.
    source: z
      .string()
      .min(1, "Source is required — cite the inventory or publication this entry comes from"),
    last_observed: z.string().min(1).nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();
export type GlacierCreate = z.infer<typeof glacierCreateSchema>;

export const glacierUpdateSchema = glacierCreateSchema.partial();
export type GlacierUpdate = z.infer<typeof glacierUpdateSchema>;

/** Shared by every DELETE handler in api/admin/* — per GATE decision 1, destroying
 *  reference data other tables point at always requires a human-supplied reason. */
export const deleteReasonSchema = z
  .object({ reason: z.string().trim().min(1, "Reason is required") })
  .strict();
export type DeleteReason = z.infer<typeof deleteReasonSchema>;

const DAM_TYPES = ["moraine", "bedrock", "ice", "unknown"] as const;

export const lakeCreateSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    nameUr: z.string().min(1).nullable().optional(),
    valley: z.string().min(1, "Valley is required"),
    // Required (task #11 GATE decision 2), though the DB column is nullable: the
    // legacy `district` text column is derived from this FK inside the same
    // transaction and is never its own form field, so an admin can't desync the
    // admin table from the public hazard map (which reads `district` over HTTP).
    district_id: z.string().uuid("A district must be selected"),
    damType: z.enum(DAM_TYPES).optional(),
    glacierContact: z.boolean().optional(),
    icimodId: z.string().min(1).nullable().optional(),
    elevationM: z.number().int().nullable().optional(),
    historicalGlof: z.boolean().optional(),
    // Required despite the DB column allowing no rows without it (NOT NULL, no
    // default) — same no-fabricated-hazard-data rationale as glacierCreateSchema.source.
    source: z.string().min(1, "Source is required — cite where this lake's data comes from"),
    sourceUrl: z.string().min(1).nullable().optional(),
    downstream_population: z.number().int().nonnegative().optional(),
    // .coerce ONLY here: area_km2 is Postgres `numeric`, which postgres.js returns as
    // a string, and the edit dialog's defaultValues come straight from that GET
    // payload (see glacierCreateSchema.area_km2's comment — same finding, F1).
    area_km2: z.coerce.number().positive().nullable().optional(),
    // Plain z.number(), never .coerce: lakes.geom is NOT NULL with no default, so
    // lat/lng are required on create. Coercing a required field lets
    // null/""/[] silently become 0 instead of a 400 (finding N1) — this is the
    // no-fabricated-coordinates system, so that failure mode is not acceptable here.
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    // Curated short handle (e.g. "shishper"), not derived from `name`. UNIQUE, and
    // create-only — CryoHealth-api's seed scripts upsert/resolve lakes by slug, so a
    // rename here would desync them. Absent from lakeUpdateSchema entirely, below.
    slug: z.string().min(1, "Slug is required"),
  })
  .strict();
export type LakeCreate = z.infer<typeof lakeCreateSchema>;

/** currentTier and current_risk_score must never appear here — that's tier-policy
 *  output owned by CryoHealth-api's alert service (alerts.service.ts:103,141,183 are
 *  the only writers of currentTier in the system; current_risk_score has no writer
 *  anywhere yet), not an admin-editable field. `.strict()` gives a 400
 *  (unrecognized_keys) on either key rather than a silent drop — task #11 GATE
 *  decision 1. `LAKE_WRITABLE_COLUMNS` in queries.ts is the second, schema-independent
 *  layer of the same lock, so a `.strict()` removed later can't reopen it alone.
 *  `slug` is also absent here — create-only, see lakeCreateSchema.slug's comment. */
export const lakeUpdateSchema = lakeCreateSchema.omit({ slug: true }).partial();
export type LakeUpdate = z.infer<typeof lakeUpdateSchema>;

/** Mirrors tier.tsx's Tier union, lowercased -- that's the DB representation
 *  (insertAlert lowercases `tier` on write; listAllAlerts/listOpenAlerts read it
 *  back with `upper(tier::text)` for display). Not imported from tier.tsx directly
 *  since that file is UI-only (exports a component) and this schema must stay
 *  importable from server route handlers. */
const ALERT_TIERS = ["normal", "watch", "high", "critical"] as const;

/** Issue #12: PUT only edits body/tier/window -- title, lakeId, districtId,
 *  affected_population, status, and clearedAt are all absent by design. status/
 *  clearedAt are the clear-action's job (see updateAlert/clearAlert in queries.ts),
 *  not a field an edit form should be able to set directly; `.strict()` 400s
 *  instead of silently dropping them if a client ever sends them. */
export const alertUpdateSchema = z
  .object({
    body: z.string().trim().min(1, "Body is required").optional(),
    tier: z.enum(ALERT_TIERS).optional(),
    estimated_window: z.string().trim().min(1).nullable().optional(),
  })
  .strict();
export type AlertUpdate = z.infer<typeof alertUpdateSchema>;

/** Mandatory `reason` on clear/delete (human-auditable reason per CLAUDE.md's
 *  alert-policy rule) is enforced via the shared `deleteReasonSchema` above --
 *  both actions take exactly `{ reason: string }`, so a second schema would just
 *  duplicate it. */

/** Issue #13: dosing/diagnosis text is transcribed from a cited source, never
 *  generated (CLAUDE.md's protocol rule) -- `source` is required here even though
 *  it's already NOT NULL in the DB, so a missing citation 400s with a clear message
 *  instead of a raw NOT NULL violation. `slug` is create-only, same rationale as
 *  lakeCreateSchema.slug -- the public CHW app almost certainly looks protocols up
 *  by slug, so renaming it here would desync that lookup. */
export const protocolCreateSchema = z
  .object({
    slug: z.string().min(1, "Slug is required"),
    title: z.string().min(1, "Title is required"),
    category: z.string().min(1, "Category is required"),
    body: z.string().trim().min(1, "Body is required"),
    source: z
      .string()
      .trim()
      .min(1, "Source is required — cite where this protocol's text comes from"),
    is_disaster: z.boolean().optional(),
  })
  .strict();
export type ProtocolCreate = z.infer<typeof protocolCreateSchema>;

/** slug is absent here — create-only, see protocolCreateSchema.slug's comment. */
export const protocolUpdateSchema = protocolCreateSchema.omit({ slug: true }).partial();
export type ProtocolUpdate = z.infer<typeof protocolUpdateSchema>;

/** `type`/`vulnerability` are free text, not a DB enum -- data.tsx's own documented
 *  payload example uses lowercase strings ("hospital", "medium") with no enum
 *  constraint visible anywhere else in this repo, so this stays a non-empty string
 *  rather than guessing at a closed list and rejecting a legitimate value. */
export const facilityCreateSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    type: z.string().min(1, "Type is required"),
    district: z.string().min(1, "District is required"),
    vulnerability: z.string().min(1, "Vulnerability is required"),
    contact: z.string().min(1).nullable().optional(),
    // Plain z.number(), not .coerce -- same rationale as glacierCreateSchema.lat/lng:
    // ST_Y/ST_X always return real JS numbers from postgres.js, never strings, so
    // there's no round-trip case to coerce for, and .coerce would silently turn an
    // explicit-clear null/""/[] into 0 instead of a 400. Both optional (facilities.geom
    // is nullable, unlike lakes) -- provide neither to leave the facility unmapped.
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    lakeId: z.string().uuid().nullable().optional(),
  })
  .strict();
export type FacilityCreate = z.infer<typeof facilityCreateSchema>;

export const facilityUpdateSchema = facilityCreateSchema.partial();
export type FacilityUpdate = z.infer<typeof facilityUpdateSchema>;

/** Issue #14 scope: `user_id` is deliberately absent from both schemas. There is no
 *  admin/users listing endpoint yet (Users & roles is still an `AdminPlaceholder`,
 *  see admin.users.tsx) to populate a "link to an existing user" picker from, and the
 *  chw_profiles roster has lived independently of `users` since #9 (see the comment on
 *  GET /api/public/chw-profiles). Wiring `user_id` is a follow-up once a users-listing
 *  endpoint exists, not a silent scope cut -- named here so it isn't mistaken for an
 *  oversight. */
export const chwProfileCreateSchema = z
  .object({
    full_name: z.string().min(1, "Name is required"),
    district_id: z.string().uuid().nullable().optional(),
    phone: z.string().min(1).nullable().optional(),
    language: z.string().min(1, "Language is required"),
  })
  .strict();
export type ChwProfileCreate = z.infer<typeof chwProfileCreateSchema>;

export const chwProfileUpdateSchema = chwProfileCreateSchema.partial();
export type ChwProfileUpdate = z.infer<typeof chwProfileUpdateSchema>;

export const caseSchema = z.object({}).strict();
export type Case = z.infer<typeof caseSchema>;

export const userSchema = z.object({}).strict();
export type User = z.infer<typeof userSchema>;
