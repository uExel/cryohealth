import { z } from "zod";

/**
 * Per-resource zod schemas for the admin CRUD API (tasks #10-#19). Empty `.strict()`
 * stubs for now — `.strict()` rejects any payload until a CRUD task fills in real
 * fields, which is the safe failure direction for a schema nobody's supposed to call
 * yet (a bare `z.object({})` would silently accept anything).
 */

export const districtSchema = z.object({}).strict();
export type District = z.infer<typeof districtSchema>;

export const glacierSchema = z.object({}).strict();
export type Glacier = z.infer<typeof glacierSchema>;

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
