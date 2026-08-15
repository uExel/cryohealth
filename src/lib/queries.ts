import { getDb } from "@/lib/db";
import type postgres from "postgres";

/** Server-only data-access helpers. Import only inside `server.handlers` route
 *  functions — postgres.js needs Node's `net`/`tls` and must never reach the client bundle. */

export async function listDistricts() {
  const sql = await getDb();
  return sql`SELECT id, name, province FROM districts ORDER BY name`;
}

export async function listGlaciers() {
  const sql = await getDb();
  return sql`
    SELECT g.id, g.name, g.rgi_id, g.district_id, g.lat, g.lng, g.area_km2, g.length_km,
           g.elevation_min_m, g.elevation_max_m, g.status, g.source, g.last_observed, g.notes,
           d.name AS district_name
    FROM glaciers g
    LEFT JOIN districts d ON d.id = g.district_id
    ORDER BY g.area_km2 DESC NULLS LAST
  `;
}

export async function getGlacier(id: string) {
  const sql = await getDb();
  const rows = await sql`
    SELECT g.*, d.id AS district_id, d.name AS district_name, d.province AS district_province
    FROM glaciers g
    LEFT JOIN districts d ON d.id = g.district_id
    WHERE g.id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listGlacierObservations(glacierId: string) {
  const sql = await getDb();
  return sql`
    SELECT observed_at, area_km2, length_km, terminus_change_m, status, source, notes
    FROM glacier_observations
    WHERE glacier_id = ${glacierId}
    ORDER BY observed_at ASC
  `;
}

export async function listDisasterCasesForDistrict(districtId: string) {
  const sql = await getDb();
  return sql`
    SELECT id, symptoms, diagnosis, outcome, is_disaster_related, created_at
    FROM cases
    WHERE district_id = ${districtId} AND is_disaster_related = true
    ORDER BY created_at DESC
    LIMIT 10
  `;
}

export async function listLakesForAssoc() {
  const sql = await getDb();
  return sql`
    SELECT l.id, l.name, upper(l."currentTier"::text) AS current_tier, l.current_risk_score,
           l.downstream_population, ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng,
           d.name AS district_name
    FROM lakes l
    LEFT JOIN districts d ON d.id = l.district_id
  `;
}

export async function listLakesAdmin() {
  const sql = await getDb();
  return sql`
    SELECT l.id, l.name, ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng,
           upper(l."currentTier"::text) AS current_tier, l.current_risk_score, l.downstream_population,
           l."updatedAt" AS last_updated, l.district_id
    FROM lakes l
    ORDER BY l.current_risk_score DESC NULLS LAST
  `;
}

export async function getLakeDetail(id: string) {
  const sql = await getDb();
  const rows = await sql`
    SELECT l.*, ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng,
           upper(l."currentTier"::text) AS current_tier, l."elevationM" AS elevation_m,
           d.name AS district_name
    FROM lakes l
    LEFT JOIN districts d ON d.id = l.district_id
    WHERE l.id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listLakeRiskScores(lakeId: string) {
  const sql = await getDb();
  return sql`
    SELECT score, upper(tier) AS tier, confidence, observed_at
    FROM lake_risk_scores
    WHERE lake_id = ${lakeId}
    ORDER BY observed_at ASC
    LIMIT 120
  `;
}

export async function listHazardScores(lakeId: string) {
  const sql = await getDb();
  return sql`
    SELECT "runId" AS run_id, score, upper(tier::text) AS tier,
           components, "computedAt" AS computed_at
    FROM hazard_scores
    WHERE "lakeId" = ${lakeId}
    ORDER BY "computedAt" DESC
    LIMIT 120
  `;
}

export async function listAlertsForLake(lakeId: string) {
  const sql = await getDb();
  return sql`
    SELECT id, title, upper(tier::text) AS tier, "createdAt" AS created_at, estimated_window
    FROM alerts
    WHERE "lakeId" = ${lakeId}
    ORDER BY "createdAt" DESC
    LIMIT 10
  `;
}

export async function listAllAlerts(limit = 200) {
  const sql = await getDb();
  return sql`
    SELECT a.id, a."lakeId" AS lake_id, a.district_id, upper(a.tier::text) AS tier, a.title, a.body_en, a.body_ur,
           a.estimated_window, a.affected_population, a."createdAt" AS created_at,
           a.status::text AS status, a."clearedAt" AS cleared_at,
           l.name AS lake_name, d.name AS district_name
    FROM alerts a
    LEFT JOIN lakes l ON l.id = a."lakeId"
    LEFT JOIN districts d ON d.id = a.district_id
    ORDER BY a."createdAt" DESC
    LIMIT ${limit}
  `;
}

export async function listOpenAlerts(limit = 5) {
  const sql = await getDb();
  return sql`
    SELECT id, title, upper(tier::text) AS tier, "createdAt" AS created_at, estimated_window
    FROM alerts
    WHERE tier IN ('high', 'critical')
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `;
}

export async function insertAlert(input: {
  title: string;
  bodyEn: string;
  bodyUr: string | null;
  tier: string;
  lakeId: string | null;
  districtId: string | null;
  estimatedWindow: string | null;
  affectedPopulation: number;
  issuedById: string;
}) {
  const sql = await getDb();
  await sql`
    INSERT INTO alerts (title, body, body_en, body_ur, tier, "lakeId", district_id, estimated_window, affected_population, "issuedById")
    VALUES (${input.title}, ${input.bodyEn}, ${input.bodyEn}, ${input.bodyUr}, ${input.tier.toLowerCase()}, ${input.lakeId}, ${input.districtId}, ${input.estimatedWindow}, ${input.affectedPopulation}, ${input.issuedById})
  `;
}

export async function listFacilities() {
  const sql = await getDb();
  return sql`
    SELECT id, name, ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng, type, vulnerability
    FROM facilities
    WHERE geom IS NOT NULL
  `;
}

export async function listFacilitiesAdmin() {
  const sql = await getDb();
  return sql`
    SELECT id, name, type, district, vulnerability, contact,
           ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng,
           (geom IS NOT NULL) AS has_geom,
           "lakeId" AS lake_id, "createdAt" AS created_at
    FROM facilities
    ORDER BY name
  `;
}

export async function listCasesAdmin(limit = 200) {
  const sql = await getDb();
  return sql`
    SELECT c.id, c.chw_id, c.district_id, c.patient_age, c.patient_sex,
           c.symptoms, c.diagnosis, c.treatment, c.outcome,
           c.is_disaster_related, c.created_at,
           u.name AS chw_name, u."lhwId" AS chw_lhw_id,
           d.name AS district_name
    FROM cases c
    LEFT JOIN users u     ON u.id = c.chw_id
    LEFT JOIN districts d ON d.id = c.district_id
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `;
}

export async function listChwProfiles() {
  const sql = await getDb();
  return sql`
    SELECT p.id, p.user_id, p.full_name, p.district_id, p.phone, p.language, p.created_at,
           d.name AS district_name, u.name AS user_name, u."lhwId" AS user_lhw_id, u.active
    FROM chw_profiles p
    LEFT JOIN districts d ON d.id = p.district_id
    LEFT JOIN users u     ON u.id = p.user_id
    ORDER BY p.full_name
  `;
}

export async function listProtocols() {
  const sql = await getDb();
  return sql`SELECT * FROM protocols ORDER BY is_disaster DESC`;
}

export async function listAlertAcks() {
  const sql = await getDb();
  return sql`SELECT alert_id, chw_id, acknowledged_at FROM alert_acknowledgements`;
}

export async function insertAlertAck(alertId: string, chwId: string) {
  const sql = await getDb();
  await sql`
    INSERT INTO alert_acknowledgements (alert_id, chw_id)
    VALUES (${alertId}, ${chwId})
    ON CONFLICT (alert_id, chw_id) DO NOTHING
  `;
}

export async function insertCase(input: {
  chwId: string;
  districtId: string | null;
  patientAge: number | null;
  patientSex: string | null;
  symptoms: string;
  diagnosis: string | null;
  treatment: string | null;
  outcome: string | null;
  isDisasterRelated: boolean;
}) {
  const sql = await getDb();
  await sql`
    INSERT INTO cases (chw_id, district_id, patient_age, patient_sex, symptoms, diagnosis, treatment, outcome, is_disaster_related)
    VALUES (${input.chwId}, ${input.districtId}, ${input.patientAge}, ${input.patientSex}, ${input.symptoms}, ${input.diagnosis}, ${input.treatment}, ${input.outcome}, ${input.isDisasterRelated})
  `;
}

export async function getKpis() {
  const sql = await getDb();
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const [[{ count: highLakes }], [{ count: alerts30d }], [{ count: cases7d }], [{ count: chws }]] =
    await Promise.all([
      sql`SELECT count(*)::int FROM lakes WHERE "currentTier" IN ('high', 'critical')`,
      sql`SELECT count(*)::int FROM alerts WHERE "createdAt" >= ${since30}`,
      sql`SELECT count(*)::int FROM cases WHERE created_at >= ${since7}`,
      sql`SELECT count(*)::int FROM users WHERE role = 'chw' AND active = true`,
    ]);
  return { highLakes, alerts30d, cases7d, chws };
}

export async function listHotLakes() {
  const sql = await getDb();
  return sql`
    SELECT id, name, upper("currentTier"::text) AS current_tier, current_risk_score, downstream_population, "updatedAt" AS last_updated
    FROM lakes
    WHERE "currentTier" IN ('high', 'critical')
    ORDER BY current_risk_score DESC NULLS LAST
  `;
}

/** Thrown by delete*() functions when dependent rows exist — the DB itself never
 *  refuses (districts' FKs are ON DELETE SET NULL, glaciers' is ON DELETE CASCADE),
 *  so this is the only thing standing between a click and silent data loss. */
export class HasDependentsError extends Error {
  constructor(public dependents: Record<string, number>) {
    super("Cannot delete: dependent rows exist");
  }
}

/** Inserts one `audit` row. Takes an existing sql handle (top-level or a `sql.begin`
 *  transaction handle) rather than calling getDb() itself, so every write function
 *  below can enroll the audit insert in the same transaction as its mutation —
 *  never mutate-then-audit as two separate statements. */
async function writeAudit(
  sql: postgres.ISql,
  input: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    reason?: string | null;
    meta?: postgres.JSONValue | null;
  },
) {
  await sql`
    INSERT INTO audit ("actorId", action, "entityType", "entityId", reason, meta)
    VALUES (${input.actorId}, ${input.action}, ${input.entityType}, ${input.entityId}, ${input.reason ?? null}, ${input.meta ? sql.json(input.meta) : null})
  `;
}

export async function createDistrict(input: {
  name: string;
  province: string;
  population: number | null;
  centroidLat: number | null;
  centroidLng: number | null;
  actorId: string;
}) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const rows = await sql`
      INSERT INTO districts (name, province, population, centroid_lat, centroid_lng)
      VALUES (${input.name}, ${input.province}, ${input.population}, ${input.centroidLat}, ${input.centroidLng})
      RETURNING id, name, province, population, centroid_lat, centroid_lng
    `;
    const district = rows[0];
    await writeAudit(sql, {
      actorId: input.actorId,
      action: "district.create",
      entityType: "District",
      entityId: district.id,
      meta: { created: { name: input.name, province: input.province } },
    });
    return district;
  });
}

export async function updateDistrict(
  id: string,
  patch: Partial<{
    name: string;
    province: string;
    population: number | null;
    centroid_lat: number | null;
    centroid_lng: number | null;
  }>,
  actorId: string,
) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const before = (
      await sql`
        SELECT name, province, population, centroid_lat, centroid_lng
        FROM districts WHERE id = ${id}
      `
    )[0];
    if (!before) return null;

    const rows = await sql`
      UPDATE districts SET ${sql(patch)}
      WHERE id = ${id}
      RETURNING id, name, province, population, centroid_lat, centroid_lng
    `;
    const after = rows[0];

    const changed: Record<string, { from: postgres.JSONValue; to: postgres.JSONValue }> = {};
    for (const key of Object.keys(patch)) {
      if (before[key] !== after[key]) changed[key] = { from: before[key], to: after[key] };
    }
    await writeAudit(sql, {
      actorId,
      action: "district.update",
      entityType: "District",
      entityId: id,
      meta: Object.keys(changed).length ? { changed } : null,
    });
    return after;
  });
}

export async function deleteDistrict(id: string, reason: string, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const [[alerts], [cases], [chwProfiles], [glaciers], [lakes]] = await Promise.all([
      sql`SELECT count(*)::int AS n FROM alerts WHERE district_id = ${id}`,
      sql`SELECT count(*)::int AS n FROM cases WHERE district_id = ${id}`,
      sql`SELECT count(*)::int AS n FROM chw_profiles WHERE district_id = ${id}`,
      sql`SELECT count(*)::int AS n FROM glaciers WHERE district_id = ${id}`,
      sql`SELECT count(*)::int AS n FROM lakes WHERE district_id = ${id}`,
    ]);
    const dependents = {
      alerts: alerts.n,
      cases: cases.n,
      chw_profiles: chwProfiles.n,
      glaciers: glaciers.n,
      lakes: lakes.n,
    };
    if (Object.values(dependents).some((n) => n > 0)) {
      throw new HasDependentsError(dependents);
    }

    const rows = await sql`DELETE FROM districts WHERE id = ${id} RETURNING id`;
    if (!rows[0]) return null;
    await writeAudit(sql, {
      actorId,
      action: "district.delete",
      entityType: "District",
      entityId: id,
      reason,
    });
    return rows[0].id;
  });
}

export async function createGlacier(input: {
  name: string;
  rgiId: string | null;
  glimsId: string | null;
  districtId: string | null;
  lat: number;
  lng: number;
  areaKm2: number | null;
  lengthKm: number | null;
  elevationMinM: number | null;
  elevationMaxM: number | null;
  status: string;
  terminusType: string | null;
  source: string;
  lastObserved: string | null;
  notes: string | null;
  actorId: string;
}) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const rows = await sql`
      INSERT INTO glaciers (
        name, rgi_id, glims_id, district_id, lat, lng, area_km2, length_km,
        elevation_min_m, elevation_max_m, status, terminus_type, source, last_observed, notes
      )
      VALUES (
        ${input.name}, ${input.rgiId}, ${input.glimsId}, ${input.districtId}, ${input.lat}, ${input.lng},
        ${input.areaKm2}, ${input.lengthKm}, ${input.elevationMinM}, ${input.elevationMaxM},
        ${input.status}, ${input.terminusType}, ${input.source}, ${input.lastObserved}, ${input.notes}
      )
      RETURNING id
    `;
    const glacier = rows[0];
    await writeAudit(sql, {
      actorId: input.actorId,
      action: "glacier.create",
      entityType: "Glacier",
      entityId: glacier.id,
      meta: { created: { name: input.name, status: input.status, source: input.source } },
    });
    return glacier;
  });
}

export async function updateGlacier(
  id: string,
  patch: Partial<{
    name: string;
    rgi_id: string | null;
    glims_id: string | null;
    district_id: string | null;
    lat: number;
    lng: number;
    area_km2: number | null;
    length_km: number | null;
    elevation_min_m: number | null;
    elevation_max_m: number | null;
    status: string;
    terminus_type: string | null;
    source: string;
    last_observed: string | null;
    notes: string | null;
  }>,
  actorId: string,
) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const before = (
      await sql`
        SELECT name, rgi_id, glims_id, district_id, lat, lng, area_km2, length_km,
               elevation_min_m, elevation_max_m, status, terminus_type, source, last_observed, notes
        FROM glaciers WHERE id = ${id}
      `
    )[0];
    if (!before) return null;

    const rows = await sql`
      UPDATE glaciers SET ${sql(patch)}
      WHERE id = ${id}
      RETURNING id, name, rgi_id, glims_id, district_id, lat, lng, area_km2, length_km,
                elevation_min_m, elevation_max_m, status, terminus_type, source, last_observed, notes
    `;
    const after = rows[0];

    const changed: Record<string, { from: postgres.JSONValue; to: postgres.JSONValue }> = {};
    for (const key of Object.keys(patch)) {
      if (before[key] !== after[key]) changed[key] = { from: before[key], to: after[key] };
    }
    await writeAudit(sql, {
      actorId,
      action: "glacier.update",
      entityType: "Glacier",
      entityId: id,
      meta: Object.keys(changed).length ? { changed } : null,
    });
    return after;
  });
}

export async function deleteGlacier(id: string, reason: string, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const [[observations]] = await Promise.all([
      sql`SELECT count(*)::int AS n FROM glacier_observations WHERE glacier_id = ${id}`,
    ]);
    const dependents = { glacier_observations: observations.n };
    if (Object.values(dependents).some((n) => n > 0)) {
      throw new HasDependentsError(dependents);
    }

    const rows = await sql`DELETE FROM glaciers WHERE id = ${id} RETURNING id`;
    if (!rows[0]) return null;
    await writeAudit(sql, {
      actorId,
      action: "glacier.delete",
      entityType: "Glacier",
      entityId: id,
      reason,
    });
    return rows[0].id;
  });
}
