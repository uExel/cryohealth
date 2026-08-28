// This file has been deprecated. Database connections are now managed by
// the NestJS backend (CryoHealth-api).
//
// TODO: Remove this file and the postgres.js dependency once fully verified.

export async function getDb(): Promise<never> {
  throw new Error(
    "Direct database access has been removed. Use the CryoHealth-api backend.",
  );
}
