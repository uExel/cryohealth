import { getDb } from "@/lib/db";

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
