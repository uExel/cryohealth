// This file has been deprecated. All database queries are now handled by the
// NestJS backend (CryoHealth-api). This file is kept as a stub to avoid
// breaking any remaining type imports.
//
// TODO: Remove this file once all consumers have been migrated.

export type AuditFilters = { actorId?: string; entityType?: string; from?: string; to?: string };

export class HasDependentsError extends Error {
  constructor(public dependents: Record<string, number>) {
    super("Cannot delete: dependent rows exist");
  }
}

export class InvalidDistrictError extends Error {
  constructor() {
    super("district_id does not reference an existing district");
  }
}

export class LastAdminError extends Error {
  constructor() {
    super("Cannot remove the last active cryohealth_admin");
  }
}
