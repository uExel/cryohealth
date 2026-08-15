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
    // .coerce because postgres.js returns some numeric-typed columns (e.g. lakes'
    // area_km2 elsewhere in this schema file) as strings to avoid float precision
    // loss -- these forms round-trip DB values back through this same schema on edit.
    population: z.coerce.number().int().positive().nullable().optional(),
    centroid_lat: z.coerce.number().min(-90).max(90).nullable().optional(),
    centroid_lng: z.coerce.number().min(-180).max(180).nullable().optional(),
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
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    // .coerce: area_km2/length_km are Postgres `numeric` -- postgres.js returns numeric
    // columns as strings (avoids float precision loss), and the edit dialog's
    // defaultValues come straight from that GET payload. A plain z.number() rejects the
    // round-tripped string the instant a glacier has a recorded area, blocking every
    // edit on it -- caught in verify (#10 fix loop, finding F1).
    area_km2: z.coerce.number().positive().nullable().optional(),
    length_km: z.coerce.number().positive().nullable().optional(),
    elevation_min_m: z.coerce.number().int().nullable().optional(),
    elevation_max_m: z.coerce.number().int().nullable().optional(),
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
  .object({ reason: z.string().min(1, "Reason is required") })
  .strict();
export type DeleteReason = z.infer<typeof deleteReasonSchema>;

/** currentTier and current_risk_score must never appear here — that's tier-policy
 *  output owned by CryoHealth-api's alert service, not an admin-editable field. */
export const lakeSchema = z.object({}).strict();
export type Lake = z.infer<typeof lakeSchema>;

/** Issue #12 requires a mandatory `reason` field on clear/delete (human-auditable
 *  reason per the workspace's alert-policy rule) — enforce it here once this is
 *  filled in, not just at the call site. */
export const alertSchema = z.object({}).strict();
export type Alert = z.infer<typeof alertSchema>;

export const protocolSchema = z.object({}).strict();
export type Protocol = z.infer<typeof protocolSchema>;

export const facilitySchema = z.object({}).strict();
export type Facility = z.infer<typeof facilitySchema>;

export const chwProfileSchema = z.object({}).strict();
export type ChwProfile = z.infer<typeof chwProfileSchema>;

export const caseSchema = z.object({}).strict();
export type Case = z.infer<typeof caseSchema>;

export const userSchema = z.object({}).strict();
export type User = z.infer<typeof userSchema>;
