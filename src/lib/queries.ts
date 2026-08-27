import { hash } from "bcryptjs";
import { getDb } from "@/lib/db";
import type {
  LakeCreate,
  LakeUpdate,
  AlertUpdate,
  ProtocolCreate,
  ProtocolUpdate,
  FacilityCreate,
  FacilityUpdate,
  ChwProfileCreate,
  ChwProfileUpdate,
  CaseUpdate,
  UserCreate,
  UserUpdate,
} from "@/lib/admin-schemas";
import type postgres from "postgres";

/** Server-only data-access helpers. Import only inside `server.handlers` route
 *  functions — postgres.js needs Node's `net`/`tls` and must never reach the client bundle. */

export async function listDistricts() {
  const sql = await getDb();
  return sql`SELECT id, name, province, population FROM districts ORDER BY name`;
}

export async function listGlaciers() {
  const sql = await getDb();
  return sql`
    SELECT g.id, g.name, g.rgi_id, g.glims_id, g.district_id, g.lat, g.lng, g.area_km2, g.length_km,
           g.elevation_min_m, g.elevation_max_m, g.status, g.terminus_type, g.source,
           g.last_observed, g.notes,
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

/** `deleted_at IS NULL` (issue #15): soft-deleted cases must not reach the public
 *  district page either -- filtering only the admin list would leave a case an admin
 *  believes they removed still visible to every CHW reading a district. */
export async function listDisasterCasesForDistrict(districtId: string) {
  const sql = await getDb();
  return sql`
    SELECT id, symptoms, diagnosis, outcome, is_disaster_related, created_at
    FROM cases
    WHERE district_id = ${districtId} AND is_disaster_related = true AND deleted_at IS NULL
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

/** Hard cap on the hazard-score rows the lake detail page will render in one go (issue #27). */
const HAZARD_SCORES_LIMIT = 120;

/** Hazard scores for one lake, newest first, capped at HAZARD_SCORES_LIMIT. CryoHealth-geo
 *  writes one row per lake per pipeline run, so this table grows without bound while the
 *  admin page's Hazard scores tab is an *auditability* view (PRD §5) — a view that silently
 *  stops at 120 rows is wrong, not merely partial, because 120 rows reads as "every run".
 *  So the total comes back alongside the page and the UI says what it is not showing.
 *  Counted with a second parallel query rather than `count(*) OVER ()`, matching listAudit()
 *  — the window-function form would force every matching row to be materialised before the
 *  LIMIT could apply, trading a cheap indexed count for a scan that grows with pipeline
 *  history. Deliberately NOT cursor-paginated: nothing consumes a cursor today and the table
 *  is empty by design, so a paging API would be unexercised guesswork. Adding one later is a
 *  purely additive change to this envelope. */
export async function listHazardScores(lakeId: string) {
  const sql = await getDb();
  const [rows, [{ count }]] = await Promise.all([
    sql`
      SELECT "runId" AS run_id, score, upper(tier::text) AS tier,
             components, "computedAt" AS computed_at
      FROM hazard_scores
      WHERE "lakeId" = ${lakeId}
      ORDER BY "computedAt" DESC
      LIMIT ${HAZARD_SCORES_LIMIT}
    `,
    sql`SELECT count(*)::int AS count FROM hazard_scores WHERE "lakeId" = ${lakeId}`,
  ]);
  const total = count as number;
  return { rows, total, hasMore: total > rows.length };
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

/** Alerts, newest first, capped at `limit` (default 200). The admin view is an auditability
 *  view (PRD §5), so silent truncation is wrong — total and hasMore come back alongside the
 *  rows so the UI can say what it is not showing. Counted with a second parallel query
 *  rather than `count(*) OVER ()`, matching listHazardScores — the window-function form
 *  would force every matching row to be materialised before the LIMIT could apply.
 *  Deliberately NOT cursor-paginated: nothing consumes a cursor today, so a paging API
 *  would be unexercised guesswork. Adding one later is a purely additive change. */
export async function listAllAlerts(limit = 200) {
  const sql = await getDb();
  const [rows, [{ count }]] = await Promise.all([
    sql`
      SELECT a.id, a."lakeId" AS lake_id, a.district_id, upper(a.tier::text) AS tier, a.title, a.body, a.body_en, a.body_ur,
             a.estimated_window, a.affected_population, a."createdAt" AS created_at,
             a.status::text AS status, a."clearedAt" AS cleared_at,
             l.name AS lake_name, d.name AS district_name
      FROM alerts a
      LEFT JOIN lakes l ON l.id = a."lakeId"
      LEFT JOIN districts d ON d.id = a.district_id
      ORDER BY a."createdAt" DESC
      LIMIT ${limit}
    `,
    sql`SELECT count(*)::int AS count FROM alerts`,
  ]);
  const total = count as number;
  return { rows, total, hasMore: total > rows.length };
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

/** The ONLY columns an admin PUT may touch on `alerts` -- per issue #12, edit is
 *  scoped to body/tier/window only. title/lakeId/districtId/affected_population are
 *  create-only; status/clearedAt are the clear action's job, not a field edit
 *  (see clearAlert below). Independent of whatever alertUpdateSchema currently
 *  allows, same second-layer-lock rationale as LAKE_WRITABLE_COLUMNS. */
const ALERT_WRITABLE_COLUMNS = ["body", "body_en", "tier", "estimated_window"] as const;

const ALERT_ROW_COLUMNS = `
  id, title, body, body_en, body_ur, upper(tier::text) AS tier, "lakeId" AS lake_id,
  district_id, estimated_window, affected_population, "createdAt" AS created_at,
  status::text AS status, "clearedAt" AS cleared_at
`;

export async function updateAlert(id: string, patch: AlertUpdate, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const before = (
      await sql`SELECT ${sql.unsafe(ALERT_ROW_COLUMNS)} FROM alerts WHERE id = ${id}`
    )[0];
    if (!before) return null;

    const writable: Record<string, unknown> = {};
    for (const key of ALERT_WRITABLE_COLUMNS) {
      if (key in patch) writable[key] = (patch as Record<string, unknown>)[key];
    }
    // body_en mirrors body, same as insertAlert -- keep them in lockstep on edit.
    // body_ur is untouched: this issue's PUT doesn't expose it.
    if (typeof (patch as Record<string, unknown>).body === "string") {
      writable.body_en = (patch as Record<string, unknown>).body;
    }
    if (typeof writable.tier === "string") {
      writable.tier = (writable.tier as string).toLowerCase();
    }

    const rows = await sql`
      UPDATE alerts SET ${sql(writable)}
      WHERE id = ${id}
      RETURNING ${sql.unsafe(ALERT_ROW_COLUMNS)}
    `;
    const after = rows[0];

    const changed: Record<string, { from: postgres.JSONValue; to: postgres.JSONValue }> = {};
    for (const key of Object.keys(writable)) {
      if (before[key] !== after[key]) changed[key] = { from: before[key], to: after[key] };
    }
    await writeAudit(sql, {
      actorId,
      action: "alert.update",
      entityType: "Alert",
      entityId: id,
      meta: Object.keys(changed).length ? { changed } : null,
    });
    return after;
  });
}

/** Sets status='cleared' and stamps clearedAt -- distinct from delete: the row
 *  stays, it just stops occupying the (lakeId, tier) active slot, so a new active
 *  alert can be raised for that lake/tier again. Only affects rows currently
 *  'active' (WHERE clause), so clearing an already-cleared or missing alert both
 *  come back as null -- the route treats that as 404 rather than guessing which,
 *  to avoid leaking state via error text. reason is mandatory (CLAUDE.md
 *  alert-policy rule). */
export async function clearAlert(id: string, reason: string, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const rows = await sql`
      UPDATE alerts
      SET status = 'cleared', "clearedAt" = now()
      WHERE id = ${id} AND status = 'active'
      RETURNING ${sql.unsafe(ALERT_ROW_COLUMNS)}
    `;
    if (!rows[0]) return null;
    await writeAudit(sql, {
      actorId,
      action: "alert.clear",
      entityType: "Alert",
      entityId: id,
      reason,
    });
    return rows[0];
  });
}

export async function deleteAlert(id: string, reason: string, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const [[acks]] = await Promise.all([
      sql`SELECT count(*)::int AS n FROM alert_acknowledgements WHERE alert_id = ${id}`,
    ]);
    const dependents = { alert_acknowledgements: acks.n };
    if (Object.values(dependents).some((n) => n > 0)) {
      throw new HasDependentsError(dependents);
    }

    const rows = await sql`DELETE FROM alerts WHERE id = ${id} RETURNING id`;
    if (!rows[0]) return null;
    await writeAudit(sql, {
      actorId,
      action: "alert.delete",
      entityType: "Alert",
      entityId: id,
      reason,
    });
    return rows[0].id;
  });
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

const FACILITY_ROW_COLUMNS = `
  id, name, type, district, vulnerability, contact,
  ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng,
  "lakeId" AS lake_id, "createdAt" AS created_at
`;

export async function createFacility(input: FacilityCreate & { actorId: string }) {
  const db = await getDb();
  const { lat, lng } = input;
  return db.begin(async (sql) => {
    const rows = await sql`
      INSERT INTO facilities (name, type, district, vulnerability, contact, "lakeId", geom)
      VALUES (
        ${input.name}, ${input.type}, ${input.district}, ${input.vulnerability},
        ${input.contact ?? null}, ${input.lakeId ?? null},
        ${lat !== undefined && lng !== undefined ? sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)` : null}
      )
      RETURNING ${sql.unsafe(FACILITY_ROW_COLUMNS)}
    `;
    const facility = rows[0];
    await writeAudit(sql, {
      actorId: input.actorId,
      action: "facility.create",
      entityType: "Facility",
      entityId: facility.id,
      meta: { created: { name: input.name, type: input.type, district: input.district } },
    });
    return facility;
  });
}

/** The ONLY columns an admin PUT may touch on `facilities`, independent of whatever
 *  the zod schema currently allows -- same second-layer-lock rationale as
 *  LAKE_WRITABLE_COLUMNS. `lat`/`lng` aren't real columns (geom is) -- handled
 *  separately below, same shape as updateLake's geomFrag. */
const FACILITY_WRITABLE_COLUMNS = [
  "name",
  "type",
  "district",
  "vulnerability",
  "contact",
  "lakeId",
] as const;

export async function updateFacility(id: string, patch: FacilityUpdate, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const before = (
      await sql`SELECT ${sql.unsafe(FACILITY_ROW_COLUMNS)} FROM facilities WHERE id = ${id}`
    )[0];
    if (!before) return null;

    const { lat, lng, ...rest } = patch;
    const writable: Record<string, unknown> = {};
    for (const key of FACILITY_WRITABLE_COLUMNS) {
      if (key in rest) writable[key] = (rest as Record<string, unknown>)[key];
    }

    // Unlike lakes.geom (NOT NULL), facilities.geom is nullable -- a patch touching
    // lat/lng always sets both together from the patch (falling back to the existing
    // value for whichever one wasn't sent), same shape as updateLake's geomFrag.
    // Explicitly clearing a mapped location back to "no location" isn't exposed by
    // this patch shape -- a deliberate scope cut, not an oversight (see Not done in
    // this task's handoff).
    const geomFrag =
      lat !== undefined || lng !== undefined
        ? sql`, geom = ST_SetSRID(ST_MakePoint(${lng ?? before.lng}, ${lat ?? before.lat}), 4326)`
        : sql``;

    const rows =
      Object.keys(writable).length > 0
        ? await sql`
            UPDATE facilities SET ${sql(writable)}${geomFrag}
            WHERE id = ${id}
            RETURNING ${sql.unsafe(FACILITY_ROW_COLUMNS)}
          `
        : await sql`
            UPDATE facilities SET id = id${geomFrag}
            WHERE id = ${id}
            RETURNING ${sql.unsafe(FACILITY_ROW_COLUMNS)}
          `;
    const after = rows[0];

    const changed: Record<string, { from: postgres.JSONValue; to: postgres.JSONValue }> = {};
    for (const key of Object.keys(patch)) {
      if (before[key] !== after[key]) changed[key] = { from: before[key], to: after[key] };
    }
    await writeAudit(sql, {
      actorId,
      action: "facility.update",
      entityType: "Facility",
      entityId: id,
      meta: Object.keys(changed).length ? { changed } : null,
    });
    return after;
  });
}

/** No known dependent tables reference `facility_id` anywhere in this codebase --
 *  same reasoning as deleteProtocol. A real FK violation this repo doesn't know
 *  about still surfaces as a clean 400 via mapDbError's 23503 case, not a raw 500. */
export async function deleteFacility(id: string, reason: string, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const rows = await sql`DELETE FROM facilities WHERE id = ${id} RETURNING id`;
    if (!rows[0]) return null;
    await writeAudit(sql, {
      actorId,
      action: "facility.delete",
      entityType: "Facility",
      entityId: id,
      reason,
    });
    return rows[0].id;
  });
}

/** Soft-delete aware (issue #15): `deleted_at IS NULL` is the default for every case
 *  read. There is deliberately no `includeDeleted` flag -- nothing in the portal can
 *  view or restore a soft-deleted case yet, and an unused escape hatch on the one
 *  query the admin table renders is how a "deleted" row quietly comes back. Restore is
 *  a follow-up that should add its own explicit query, not a boolean here. */
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
    WHERE c.deleted_at IS NULL
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

const CHW_PROFILE_ROW_COLUMNS = `
  id, user_id, full_name, district_id, phone, language, created_at
`;

/** `user_id` is never set by this writer -- see chwProfileCreateSchema's comment for
 *  why linking to a `users` row is out of this task's scope. New profiles are
 *  created with `user_id` left NULL by omission from the INSERT's column list. */
export async function createChwProfile(input: ChwProfileCreate & { actorId: string }) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const rows = await sql`
      INSERT INTO chw_profiles (full_name, district_id, phone, language)
      VALUES (${input.full_name}, ${input.district_id ?? null}, ${input.phone ?? null}, ${input.language})
      RETURNING ${sql.unsafe(CHW_PROFILE_ROW_COLUMNS)}
    `;
    const profile = rows[0];
    await writeAudit(sql, {
      actorId: input.actorId,
      action: "chw_profile.create",
      entityType: "ChwProfile",
      entityId: profile.id,
      meta: { created: { full_name: input.full_name } },
    });
    return profile;
  });
}

/** The ONLY columns an admin PUT may touch on `chw_profiles` -- `user_id` is absent,
 *  same rationale as createChwProfile above. */
const CHW_PROFILE_WRITABLE_COLUMNS = ["full_name", "district_id", "phone", "language"] as const;

export async function updateChwProfile(id: string, patch: ChwProfileUpdate, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const before = (
      await sql`SELECT ${sql.unsafe(CHW_PROFILE_ROW_COLUMNS)} FROM chw_profiles WHERE id = ${id}`
    )[0];
    if (!before) return null;

    const writable: Record<string, unknown> = {};
    for (const key of CHW_PROFILE_WRITABLE_COLUMNS) {
      if (key in patch) writable[key] = (patch as Record<string, unknown>)[key];
    }

    const rows = await sql`
      UPDATE chw_profiles SET ${sql(writable)}
      WHERE id = ${id}
      RETURNING ${sql.unsafe(CHW_PROFILE_ROW_COLUMNS)}
    `;
    const after = rows[0];

    const changed: Record<string, { from: postgres.JSONValue; to: postgres.JSONValue }> = {};
    for (const key of Object.keys(writable)) {
      if (before[key] !== after[key]) changed[key] = { from: before[key], to: after[key] };
    }
    await writeAudit(sql, {
      actorId,
      action: "chw_profile.update",
      entityType: "ChwProfile",
      entityId: id,
      meta: Object.keys(changed).length ? { changed } : null,
    });
    return after;
  });
}

/** No known dependent tables reference `chw_id`/`chw_profile_id` pointing at
 *  `chw_profiles` specifically (`cases.chw_id` and `alert_acknowledgements.chw_id`
 *  reference `users`, not this table) -- same reasoning as deleteProtocol/
 *  deleteFacility. A real FK violation this repo doesn't know about still surfaces
 *  as a clean 400 via mapDbError, not a raw 500. */
export async function deleteChwProfile(id: string, reason: string, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const rows = await sql`DELETE FROM chw_profiles WHERE id = ${id} RETURNING id`;
    if (!rows[0]) return null;
    await writeAudit(sql, {
      actorId,
      action: "chw_profile.delete",
      entityType: "ChwProfile",
      entityId: id,
      reason,
    });
    return rows[0].id;
  });
}

export async function listProtocols() {
  const sql = await getDb();
  return sql`SELECT * FROM protocols ORDER BY is_disaster DESC`;
}

const PROTOCOL_ROW_COLUMNS = `
  id, slug, title, category, body, source, is_disaster, created_at
`;

export async function createProtocol(input: ProtocolCreate & { actorId: string }) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const rows = await sql`
      INSERT INTO protocols (slug, title, category, body, source, is_disaster)
      VALUES (
        ${input.slug}, ${input.title}, ${input.category}, ${input.body}, ${input.source},
        ${input.is_disaster ?? false}
      )
      RETURNING ${sql.unsafe(PROTOCOL_ROW_COLUMNS)}
    `;
    const protocol = rows[0];
    await writeAudit(sql, {
      actorId: input.actorId,
      action: "protocol.create",
      entityType: "Protocol",
      entityId: protocol.id,
      meta: { created: { slug: input.slug, title: input.title, source: input.source } },
    });
    return protocol;
  });
}

/** The ONLY columns an admin write may touch on `protocols`, independent of
 *  whatever the zod schema currently allows -- same second-layer-lock rationale as
 *  LAKE_WRITABLE_COLUMNS. `slug` is absent -- create-only, set once in
 *  createProtocol(). There is deliberately no "generate"/"improve wording" field or
 *  code path anywhere in this file: dosing/diagnosis text must be transcribed from
 *  a cited source, never produced by a model (CLAUDE.md's protocol rule, issue #13). */
const PROTOCOL_WRITABLE_COLUMNS = ["title", "category", "body", "source", "is_disaster"] as const;

export async function updateProtocol(id: string, patch: ProtocolUpdate, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const before = (
      await sql`SELECT ${sql.unsafe(PROTOCOL_ROW_COLUMNS)} FROM protocols WHERE id = ${id}`
    )[0];
    if (!before) return null;

    const writable: Record<string, unknown> = {};
    for (const key of PROTOCOL_WRITABLE_COLUMNS) {
      if (key in patch) writable[key] = (patch as Record<string, unknown>)[key];
    }

    const rows = await sql`
      UPDATE protocols SET ${sql(writable)}
      WHERE id = ${id}
      RETURNING ${sql.unsafe(PROTOCOL_ROW_COLUMNS)}
    `;
    const after = rows[0];

    const changed: Record<string, { from: postgres.JSONValue; to: postgres.JSONValue }> = {};
    for (const key of Object.keys(writable)) {
      if (before[key] !== after[key]) changed[key] = { from: before[key], to: after[key] };
    }
    await writeAudit(sql, {
      actorId,
      action: "protocol.update",
      entityType: "Protocol",
      entityId: id,
      meta: Object.keys(changed).length ? { changed } : null,
    });
    return after;
  });
}

/** No known dependent tables reference `protocol_id` anywhere in this codebase (the
 *  CHW app reads protocols by lookup, not by FK) -- so unlike deleteLake/
 *  deleteGlacier there's no explicit pre-check here. If CryoHealth-api's schema
 *  does have an FK pointing at protocols that this repo doesn't know about, a
 *  DELETE that violates it surfaces as a plain 23503 and mapDbError already turns
 *  that into a clean 400 rather than a raw 500. */
export async function deleteProtocol(id: string, reason: string, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const rows = await sql`DELETE FROM protocols WHERE id = ${id} RETURNING id`;
    if (!rows[0]) return null;
    await writeAudit(sql, {
      actorId,
      action: "protocol.delete",
      entityType: "Protocol",
      entityId: id,
      reason,
    });
    return rows[0].id;
  });
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

/** Every column the admin API returns for a single case. `deleted_at` is included on
 *  purpose: a write's RETURNING row proves the row it touched is live (null), and the
 *  update path diffs against it. No joins -- an INSERT/UPDATE ... RETURNING can't reach
 *  `users`/`districts`, and the client refetches the joined list after a write anyway
 *  (same shape as FACILITY_ROW_COLUMNS). */
const CASE_ROW_COLUMNS = `
  id, chw_id, district_id, patient_age, patient_sex, symptoms, diagnosis,
  treatment, outcome, is_disaster_related, created_at, deleted_at
`;

/** The ONLY columns an admin PUT may touch on `cases`, independent of whatever
 *  caseUpdateSchema currently allows -- same second-layer-lock rationale as
 *  FACILITY_WRITABLE_COLUMNS. Three deliberate absences: `chw_id` (create-only, it is
 *  clinical provenance -- see caseUpdateSchema), `created_at`, and `deleted_at`. The
 *  last one matters most: soft-delete state belongs to softDeleteCase alone, so even if
 *  someone drops `.strict()` from the schema later, a PUT still cannot resurrect or
 *  silently re-delete a case. */
const CASE_WRITABLE_COLUMNS = [
  "district_id",
  "patient_age",
  "patient_sex",
  "symptoms",
  "diagnosis",
  "treatment",
  "outcome",
  "is_disaster_related",
] as const;

/* Audit meta on `cases` records WHICH fields were written and never their values --
 * unlike updateFacility, which stores a full from/to diff. `audit` is readable and
 * CSV-exportable by every cryohealth_admin (api/admin/audit.ts), so copying symptoms,
 * diagnosis, treatment or patient age into it would fork clinical content into a second
 * table with different retention and a wider audience. Same data-minimisation call as
 * excluding chw_cases.payload from listChwCases. What the audit trail owes us here is
 * who touched which case, when, and why -- not a shadow copy of the record.
 */

/** `actorId` is who performed the write; `chwId` is who the case is attributed to.
 *  They're the same for POST /api/public/cases (a CHW logging their own case) and
 *  different for the admin POST (an admin logging on a CHW's behalf) -- which is
 *  exactly why the audit row can't just reuse chw_id. */
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
  actorId: string;
}) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const rows = await sql`
      INSERT INTO cases (chw_id, district_id, patient_age, patient_sex, symptoms, diagnosis, treatment, outcome, is_disaster_related)
      VALUES (${input.chwId}, ${input.districtId}, ${input.patientAge}, ${input.patientSex}, ${input.symptoms}, ${input.diagnosis}, ${input.treatment}, ${input.outcome}, ${input.isDisasterRelated})
      RETURNING ${sql.unsafe(CASE_ROW_COLUMNS)}
    `;
    const created = rows[0];
    await writeAudit(sql, {
      actorId: input.actorId,
      action: "case.create",
      entityType: "Case",
      entityId: created.id,
      // Attribution and geography only. The clinical columns are intentionally absent.
      meta: {
        created: {
          chw_id: input.chwId,
          district_id: input.districtId,
          is_disaster_related: input.isDisasterRelated,
        },
      },
    });
    return created;
  });
}

export async function updateCase(id: string, patch: CaseUpdate, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    // `deleted_at IS NULL` here too, not just in the list query: a soft-deleted case is
    // gone as far as the portal is concerned, so editing one 404s rather than quietly
    // mutating a row nothing displays.
    const beforeRows = await sql`
      SELECT ${sql.unsafe(CASE_ROW_COLUMNS)} FROM cases
      WHERE id = ${id} AND deleted_at IS NULL
    `;
    const before = beforeRows[0];
    if (!before) return null;

    const writable: Record<string, unknown> = {};
    for (const key of CASE_WRITABLE_COLUMNS) {
      if (key in patch) writable[key] = (patch as Record<string, unknown>)[key];
    }
    // Unreachable through the API (the route 400s an empty patch, and every key
    // caseUpdateSchema accepts is writable) -- but if it ever is, no write happened, so
    // there is nothing to audit and no audit row is written.
    if (Object.keys(writable).length === 0) return before;

    const rows = await sql`
      UPDATE cases SET ${sql(writable)}
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING ${sql.unsafe(CASE_ROW_COLUMNS)}
    `;
    const after = rows[0];

    const changed = Object.keys(writable).filter((key) => before[key] !== after[key]);
    await writeAudit(sql, {
      actorId,
      action: "case.update",
      entityType: "Case",
      entityId: id,
      meta: changed.length ? { changed_fields: changed.sort() } : null,
    });
    return after;
  });
}

/** Soft delete (issue #15): `UPDATE ... SET deleted_at = now()`, never
 *  `DELETE FROM cases`. The hard delete that deleteFacility/deleteProtocol use is wrong
 *  here for two reasons -- these are patient-adjacent clinical records, and
 *  `cases.chw_id` is `ON DELETE RESTRICT`, so the case row is also what stops a CHW's
 *  user account being destroyed out from under an audit trail.
 *
 *  `AND deleted_at IS NULL` makes a repeat delete a 404 instead of silently bumping the
 *  timestamp and writing a second audit row for the same removal. */
export async function softDeleteCase(id: string, reason: string, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const rows = await sql`
      UPDATE cases SET deleted_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id
    `;
    if (!rows[0]) return null;
    await writeAudit(sql, {
      actorId,
      action: "case.delete",
      entityType: "Case",
      entityId: id,
      reason,
      // Says plainly that the row is still in Postgres, so a later reader of the audit
      // log doesn't assume it was destroyed. Nothing in the portal restores it yet.
      meta: { soft: true },
    });
    return rows[0].id;
  });
}

export async function getKpis() {
  const sql = await getDb();
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const [[{ count: highLakes }], [{ count: alerts30d }], [{ count: cases7d }], [{ count: chws }]] =
    await Promise.all([
      sql`SELECT count(*)::int FROM lakes WHERE "currentTier" IN ('high', 'critical')`,
      sql`SELECT count(*)::int FROM alerts WHERE "createdAt" >= ${since30}`,
      sql`SELECT count(*)::int FROM cases WHERE created_at >= ${since7} AND deleted_at IS NULL`,
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

/** Thrown when `district_id` doesn't reference an existing district. A plain FK
 *  violation (23503) would otherwise surface as a NOT NULL violation on the derived
 *  `district` text column instead (Postgres checks NOT NULL before the FK constraint
 *  trigger fires), which `mapDbError` doesn't recognize and would 500 -- so this is
 *  checked explicitly, before the INSERT/UPDATE, rather than left to the DB. */
export class InvalidDistrictError extends Error {
  constructor() {
    super("district_id does not reference an existing district");
  }
}

async function deriveDistrictName(sql: postgres.ISql, districtId: string): Promise<string> {
  const rows = await sql`SELECT name FROM districts WHERE id = ${districtId}`;
  if (!rows[0]) throw new InvalidDistrictError();
  return rows[0].name as string;
}

/** The ONLY columns an admin write may touch on `lakes`, independent of whatever the
 *  zod schema currently allows -- task #11 GATE decision 1's second layer.
 *  `currentTier`/`current_risk_score` are absent by design: they are tier-policy
 *  output owned by CryoHealth-api's alert service (alerts.service.ts:103,141,183 are
 *  the only writers of currentTier in the system; current_risk_score has no writer
 *  anywhere yet). `district` (the legacy text column) is also absent -- it is derived
 *  server-side from `district_id` by deriveDistrictName(), never taken directly from a
 *  client payload. `slug` is absent -- create-only, set once in createLake(). */
const LAKE_WRITABLE_COLUMNS = [
  "name",
  "nameUr",
  "valley",
  "district_id",
  "damType",
  "glacierContact",
  "icimodId",
  "elevationM",
  "historicalGlof",
  "source",
  "sourceUrl",
  "downstream_population",
  "area_km2",
] as const;

export async function createLake(
  input: LakeCreate & {
    actorId: string;
  },
) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const districtName = await deriveDistrictName(sql, input.district_id);
    const rows = await sql`
      INSERT INTO lakes (
        name, "nameUr", valley, district, district_id, "damType", "glacierContact",
        "icimodId", "elevationM", "historicalGlof", source, "sourceUrl",
        downstream_population, area_km2, slug, geom
      )
      VALUES (
        ${input.name}, ${input.nameUr ?? null}, ${input.valley}, ${districtName}, ${input.district_id},
        ${input.damType ?? "unknown"}, ${input.glacierContact ?? false}, ${input.icimodId ?? null},
        ${input.elevationM ?? null}, ${input.historicalGlof ?? false}, ${input.source},
        ${input.sourceUrl ?? null}, ${input.downstream_population ?? 0}, ${input.area_km2 ?? null},
        ${input.slug}, ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)
      )
      RETURNING id
    `;
    const lake = rows[0];
    await writeAudit(sql, {
      actorId: input.actorId,
      action: "lake.create",
      entityType: "Lake",
      entityId: lake.id,
      meta: { created: { name: input.name, slug: input.slug, source: input.source } },
    });
    return lake;
  });
}

const LAKE_ROW_COLUMNS = `
  name, "nameUr", valley, district_id, "damType", "glacierContact", "icimodId",
  "elevationM", "historicalGlof", source, "sourceUrl", downstream_population, area_km2,
  ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng
`;

export async function updateLake(id: string, patch: LakeUpdate, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const before = (
      await sql`SELECT ${sql.unsafe(LAKE_ROW_COLUMNS)} FROM lakes WHERE id = ${id}`
    )[0];
    if (!before) return null;

    // lat/lng aren't real columns (geom is) -- pulled out before the allowlist filter,
    // which only ever sees genuine column names.
    const { lat, lng, ...rest } = patch;
    const writable: Record<string, unknown> = {};
    for (const key of LAKE_WRITABLE_COLUMNS) {
      if (key in rest) writable[key] = (rest as Record<string, unknown>)[key];
    }
    if (typeof writable.district_id === "string") {
      writable.district = await deriveDistrictName(sql, writable.district_id);
    }

    // updatedAt is injected unconditionally so `sql(scalar)` is never called with an
    // empty object -- an empty SET list is a syntax error, and this is the only case
    // reachable if a patch contains only lat/lng (findings task-11, probed live).
    const scalar = { ...writable, updatedAt: new Date() };
    const geomFrag =
      lat !== undefined || lng !== undefined
        ? sql`, geom = ST_SetSRID(ST_MakePoint(${lng ?? before.lng}, ${lat ?? before.lat}), 4326)`
        : sql``;

    const rows = await sql`
      UPDATE lakes SET ${sql(scalar)}${geomFrag}
      WHERE id = ${id}
      RETURNING ${sql.unsafe(LAKE_ROW_COLUMNS)}
    `;
    const after = rows[0];

    // Diffed over the original `patch` keys, not `scalar` -- `scalar` always contains
    // `updatedAt`, which would otherwise make every audit row report a bogus change.
    const changed: Record<string, { from: postgres.JSONValue; to: postgres.JSONValue }> = {};
    for (const key of Object.keys(patch)) {
      if (before[key] !== after[key]) changed[key] = { from: before[key], to: after[key] };
    }
    await writeAudit(sql, {
      actorId,
      action: "lake.update",
      entityType: "Lake",
      entityId: id,
      meta: Object.keys(changed).length ? { changed } : null,
    });
    return after;
  });
}

export async function deleteLake(id: string, reason: string, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    const [[observations], [hazardScores], [lakeRiskScores], [alerts], [facilities]] =
      await Promise.all([
        sql`SELECT count(*)::int AS n FROM observations WHERE "lakeId" = ${id}`,
        sql`SELECT count(*)::int AS n FROM hazard_scores WHERE "lakeId" = ${id}`,
        sql`SELECT count(*)::int AS n FROM lake_risk_scores WHERE lake_id = ${id}`,
        sql`SELECT count(*)::int AS n FROM alerts WHERE "lakeId" = ${id}`,
        sql`SELECT count(*)::int AS n FROM facilities WHERE "lakeId" = ${id}`,
      ]);
    const dependents = {
      observations: observations.n,
      hazard_scores: hazardScores.n,
      lake_risk_scores: lakeRiskScores.n,
      alerts: alerts.n,
      facilities: facilities.n,
    };
    if (Object.values(dependents).some((n) => n > 0)) {
      throw new HasDependentsError(dependents);
    }

    const rows = await sql`DELETE FROM lakes WHERE id = ${id} RETURNING id`;
    if (!rows[0]) return null;
    await writeAudit(sql, {
      actorId,
      action: "lake.delete",
      entityType: "Lake",
      entityId: id,
      reason,
    });
    return rows[0].id;
  });
}

/* -------------------------------------------------------------------------- */
/* Users & roles (issue #16)                                                   */
/*                                                                            */
/* There is deliberately no deleteUser() in this file. `cases.chw_id` is       */
/* `REFERENCES users(id) ON DELETE RESTRICT` (CryoHealth-api migration         */
/* 1785700000000-WebSchema.ts:149) and `audit."actorId"` points at users too,  */
/* so a hard delete would either be refused by the DB or orphan the audit      */
/* trail. Deactivation (`active = false`, which api/auth/login.ts already      */
/* rejects at sign-in) is the only removal this system has.                    */
/* -------------------------------------------------------------------------- */

/** The only columns of `users` any handler may read. `passwordHash` is absent by
 *  design and must stay absent — this row shape is returned straight to the client. */
const USER_ROW_COLUMNS = `
  id, name, role::text AS role, "lhwId" AS lhw_id, phone,
  "facilityId" AS facility_id, active, "createdAt" AS created_at
`;

export async function listUsers() {
  const sql = await getDb();
  return sql`
    SELECT u.id, u.name, u.role::text AS role, u."lhwId" AS lhw_id, u.phone,
           u."facilityId" AS facility_id, u.active, u."createdAt" AS created_at,
           f.name AS facility_name
    FROM users u
    LEFT JOIN facilities f ON f.id = u."facilityId"
    ORDER BY u.active DESC, u.name
  `;
}

/** Hashes `pin` with bcrypt cost 10 — the same pattern and cost as
 *  CryoHealth-api/scripts/seed-users.ts, so accounts made here are indistinguishable
 *  from seeded ones to api/auth/login.ts's `compare()`. The plaintext PIN and the
 *  resulting hash never reach the audit row. */
export async function createUser(input: UserCreate & { actorId: string }) {
  // Hashed before begin(): bcrypt at cost 10 is deliberately slow, and there's no
  // reason to hold a transaction open across it.
  const passwordHash = await hash(input.pin, 10);
  const db = await getDb();
  return db.begin(async (sql) => {
    const rows = await sql`
      INSERT INTO users (name, role, "lhwId", phone, "facilityId", "passwordHash")
      VALUES (
        ${input.name}, ${input.role}, ${input.lhwId ?? null}, ${input.phone ?? null},
        ${input.facilityId ?? null}, ${passwordHash}
      )
      RETURNING ${sql.unsafe(USER_ROW_COLUMNS)}
    `;
    const user = rows[0];
    await writeAudit(sql, {
      actorId: input.actorId,
      action: "user.create",
      entityType: "User",
      entityId: user.id,
      meta: {
        created: { name: input.name, role: input.role, lhwId: input.lhwId ?? null },
      },
    });
    return user;
  });
}

/** Thrown by updateUser when a change would leave zero active `cryohealth_admin`s.
 *  Unlike every other guard in this file that's a convenience, this one is the
 *  difference between a recoverable mistake and a permanently locked-out install:
 *  only a `cryohealth_admin` may create or re-role a user, and there is no hard
 *  delete, so the sole way back would be re-running seed-users.ts against the DB. */
export class LastAdminError extends Error {
  constructor() {
    super("Cannot remove the last active cryohealth_admin");
  }
}

/** Applies a role change and/or an active flip. Writes one audit row per distinct
 *  change (`user.role_change`, `user.deactivate`/`user.reactivate`) rather than a
 *  single `user.update` — issue #16 audits these as separate events, and "who
 *  deactivated this account" is the question the audit log gets asked. A patch that
 *  changes nothing writes no audit row. */
export async function updateUser(id: string, patch: UserUpdate, actorId: string) {
  const db = await getDb();
  return db.begin(async (sql) => {
    // FOR UPDATE serializes concurrent writes to this same user (the double-click
    // case). It does not serialize two admins demoting two *different* last-remaining
    // admins at the same instant — that race is left open knowingly rather than
    // locking the whole admin set on every role change.
    const before = (
      await sql`SELECT id, name, role::text AS role, active FROM users WHERE id = ${id} FOR UPDATE`
    )[0];
    if (!before) return null;

    const nextRole = patch.role ?? before.role;
    const nextActive = patch.active ?? before.active;
    const dropsAnAdmin =
      before.role === "cryohealth_admin" &&
      before.active &&
      (nextRole !== "cryohealth_admin" || !nextActive);
    if (dropsAnAdmin) {
      const [{ n }] = await sql`
        SELECT count(*)::int AS n FROM users
        WHERE role = 'cryohealth_admin' AND active = true AND id <> ${id}
      `;
      if (n === 0) throw new LastAdminError();
    }

    const writable: Record<string, unknown> = {};
    if (patch.role !== undefined) writable.role = patch.role;
    if (patch.active !== undefined) writable.active = patch.active;

    const rows = await sql`
      UPDATE users SET ${sql(writable)}
      WHERE id = ${id}
      RETURNING ${sql.unsafe(USER_ROW_COLUMNS)}
    `;
    const after = rows[0];

    if (before.role !== after.role) {
      await writeAudit(sql, {
        actorId,
        action: "user.role_change",
        entityType: "User",
        entityId: id,
        meta: { changed: { role: { from: before.role, to: after.role } } },
      });
    }
    if (before.active !== after.active) {
      await writeAudit(sql, {
        actorId,
        action: after.active ? "user.reactivate" : "user.deactivate",
        entityType: "User",
        entityId: id,
        meta: { changed: { active: { from: before.active, to: after.active } } },
      });
    }
    return after;
  });
}

/** Filters accepted by the audit-log read path (issue #18). All optional — omit a field
 *  to leave it unconstrained. `from`/`to` are inclusive YYYY-MM-DD day bounds. */
export type AuditFilters = { actorId?: string; entityType?: string; from?: string; to?: string };

/** Builds the WHERE clause shared by listAudit's rows + count queries, AND-joining only
 *  the active filters; returns an empty fragment (a no-op when embedded) when nothing is
 *  filtered. Built fresh on each call rather than shared between the two queries, so one
 *  fragment is never aliased across two concurrent executions. `createdAt` (timestamptz)
 *  is compared to `from`/`to` cast to `date`; the `< to::date + 1` form makes `to` an
 *  inclusive whole-day bound. Day boundaries resolve in the DB session's timezone. */
function auditWhere(sql: postgres.ISql, f: AuditFilters) {
  const parts = [
    f.actorId ? sql`a."actorId" = ${f.actorId}` : null,
    f.entityType ? sql`a."entityType" = ${f.entityType}` : null,
    f.from ? sql`a."createdAt" >= ${f.from}::date` : null,
    f.to ? sql`a."createdAt" < (${f.to}::date + 1)` : null,
  ].filter((p) => p !== null);
  if (parts.length === 0) return sql``;
  let clause = parts[0];
  for (let i = 1; i < parts.length; i++) clause = sql`${clause} AND ${parts[i]}`;
  return sql`WHERE ${clause}`;
}

/** Read-only, paginated audit-log query for the admin audit page (issue #18). LEFT JOINs
 *  `users` so a row survives even when `actorId` is null (nothing in this app writes a
 *  null-actor audit row today, but CryoHealth-api's geo path is auditless and could grow
 *  one) or points at a since-changed user — the actor columns just come back null and the
 *  page renders "System". Newest first. Returns the requested page plus the total matching
 *  count for the pager. Note: this file had no audit *read* before this; writes still go
 *  exclusively through writeAudit() and are untouched. */
export async function listAudit(filters: AuditFilters, page: number, pageSize: number) {
  const sql = await getDb();
  const offset = (page - 1) * pageSize;
  const [rows, [{ count }]] = await Promise.all([
    sql`
      SELECT a.id, a."actorId" AS actor_id, a.action, a."entityType" AS entity_type,
             a."entityId" AS entity_id, a.reason, a.meta, a."createdAt" AS created_at,
             u.name AS actor_name, u."lhwId" AS actor_lhw_id, u.role::text AS actor_role
      FROM audit a
      LEFT JOIN users u ON u.id = a."actorId"
      ${auditWhere(sql, filters)}
      ORDER BY a."createdAt" DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
    sql`SELECT count(*)::int AS count FROM audit a ${auditWhere(sql, filters)}`,
  ]);
  return { rows, total: count as number };
}

/** Distinct actors that appear in the audit log, for the page's actor filter. INNER JOIN
 *  (not LEFT): an option the dropdown can't resolve to a name is useless, so null/dangling
 *  actorIds aren't offered as filter choices — those rows still show in the table, just
 *  under "System". */
export async function listAuditActors() {
  const sql = await getDb();
  return sql`
    SELECT DISTINCT a."actorId" AS id, u.name, u."lhwId" AS lhw_id
    FROM audit a
    JOIN users u ON u.id = a."actorId"
    ORDER BY u.name
  `;
}

/** Distinct entityType values present in the audit log, for the page's entity-type
 *  filter — derived from the data rather than hardcoded, so a new writer's entityType
 *  becomes a filter option without a change here. */
export async function listAuditEntityTypes() {
  const sql = await getDb();
  const rows =
    await sql`SELECT DISTINCT "entityType" AS entity_type FROM audit ORDER BY "entityType"`;
  return rows.map((r) => r.entity_type as string);
}

/* Sync activity (issue #19) — read-only. Both tables belong to the offline-sync feature and
 * are written exclusively by CryoHealth-api, so there is deliberately no insert/update/delete
 * counterpart here.
 *
 * The two tables are NOT in the same state, and the page must distinguish them rather than
 * show one blanket "no data" message:
 *   - `sync_log`  — no writer exists anywhere in CryoHealth-api. Grepped 2026-08-24: only the
 *     entity, the InitialSchema migration and all-entities.ts mention it; no controller or
 *     service ever inserts. It reads empty until a sync endpoint is built there, which is a
 *     separate CryoHealth-api goal (out of scope for #19).
 *   - `chw_cases` — DOES have a live writer: `POST /cases` (CasesController, `chw` role)
 *     upserts a device-captured case, idempotent on `clientCaseId`. Empty here means "no
 *     device has synced a case yet", NOT "the feature is missing". (The admin PRD §5 table
 *     lists this table as writer-less; that line is out of date as of 2026-08-24.)
 *
 * Both tables use quoted camelCase identifiers, matching CryoHealth-api's TypeORM naming
 * (like `audit`, and unlike the snake_case `cases`/`districts` tables). Each query returns an
 * unfiltered count alongside the capped rows so the page can tell "the table is genuinely
 * empty" apart from "the limit trimmed the list".
 */

/** Most recent device sync attempts, newest first. LEFT JOIN `users` (not INNER) so a row
 *  still renders if its `userId` points at a since-removed user — the name columns just come
 *  back null. */
export async function listSyncLog(limit = 200) {
  const sql = await getDb();
  const [rows, [{ count }]] = await Promise.all([
    sql`
      SELECT s.id, s."userId" AS user_id, s."deviceId" AS device_id,
             s."startedAt" AS started_at, s."finishedAt" AS finished_at,
             s."itemCount" AS item_count, s.status, s.detail,
             s."createdAt" AS created_at,
             u.name AS user_name, u."lhwId" AS user_lhw_id
      FROM sync_log s
      LEFT JOIN users u ON u.id = s."userId"
      ORDER BY s."startedAt" DESC
      LIMIT ${limit}
    `,
    sql`SELECT count(*)::int AS count FROM sync_log`,
  ]);
  return { rows, total: count as number };
}

/** Cases captured on a CHW device and synced up, newest capture first. `payload` (jsonb) is
 *  deliberately NOT selected: it holds the clinical case content, which this page has no need
 *  for — sync activity is about when/whether a device delivered, not what was in the record.
 *  `syncState` is a Postgres enum, cast to text so it serializes as a plain string. */
export async function listChwCases(limit = 200) {
  const sql = await getDb();
  const [rows, [{ count }]] = await Promise.all([
    sql`
      SELECT c.id, c."chwId" AS chw_id, c."capturedAt" AS captured_at,
             c.outcome, c."syncState"::text AS sync_state,
             c."deviceId" AS device_id, c."clientCaseId" AS client_case_id,
             c."createdAt" AS created_at,
             u.name AS chw_name, u."lhwId" AS chw_lhw_id
      FROM chw_cases c
      LEFT JOIN users u ON u.id = c."chwId"
      ORDER BY c."capturedAt" DESC
      LIMIT ${limit}
    `,
    sql`SELECT count(*)::int AS count FROM chw_cases`,
  ]);
  return { rows, total: count as number };
}
