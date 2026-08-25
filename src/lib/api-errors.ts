/** Server-only helpers for api/admin/* and api/public/* route handlers: safe JSON
 *  parsing, up-front path-param validation, and mapping common Postgres error codes to
 *  stable JSON responses instead of a raw 500. */

export async function parseJsonBody(
  request: Request,
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false, response: Response.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
}

/** Canonical 8-4-4-4-12 hex UUID. Deliberately a literal regex rather than zod's
 *  `.uuid()`: this runs on read-only public GETs that otherwise import no schema code,
 *  and `package.json` pins zod with a caret (`^3.24.2`), so the exact strictness of
 *  `.uuid()` can shift under us on an unrelated `bun install` — a validator guarding the
 *  404-vs-400 boundary shouldn't move on a dependency bump.
 *
 *  Stricter than Postgres, on purpose. Postgres's `uuid` input also accepts braced
 *  (`{...}`) and hyphen-less forms, which this rejects. That's safe here because every id
 *  in circulation comes from postgres.js, which renders `uuid` columns in exactly this
 *  canonical lowercase-hyphenated form; no client builds an id by hand. Case-insensitive
 *  so an id upper-cased in transit (copied out of a spreadsheet, say) still resolves
 *  instead of 400ing on a value Postgres would have matched. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guards a `$param` path segment before it reaches a `uuid` column. Returns null when
 *  `value` is a well-formed UUID, otherwise the 400 the handler should return straight
 *  away — same `const x = f(); if (x) return x;` shape as `mapDbError` below.
 *
 *  Why up front instead of leaning on `mapDbError`'s 22P02 branch: an unvalidated id
 *  reaches SQL and Postgres raises `invalid_text_representation`, which these public GETs
 *  don't catch, so it escapes as a 500 with a `text/html` SSR error shell — the wrong
 *  content type from a JSON API, and inconsistent with the 401/403/404 paths beside it.
 *  Checking here also skips a pointless DB round-trip for an id that cannot match a row.
 *
 *  `label` is the resource-specific noun for the message ("lake id" → "Invalid lake id"),
 *  so a caller hitting the wrong one of two ids in a nested route can tell them apart. */
export function invalidUuidResponse(value: string, label: string): Response | null {
  if (UUID_RE.test(value)) return null;
  return Response.json({ error: `Invalid ${label}` }, { status: 400 });
}

/** Maps common Postgres error codes to a stable Response. Returns null if the
 *  caller should rethrow -- an error this doesn't recognize should still 500
 *  rather than have this helper guess at a message, but a recognized one should
 *  never leak driver text (SQLSTATE codes: https://www.postgresql.org/docs/current/errcodes-appendix.html). */
export function mapDbError(err: unknown): Response | null {
  const code = (err as { code?: string } | null)?.code;
  if (code === "23503") {
    return Response.json(
      { error: "Invalid reference: the related record does not exist" },
      { status: 400 },
    );
  }
  if (code === "23505") {
    return Response.json(
      { error: "Already taken: another record already uses one of these values" },
      { status: 409 },
    );
  }
  if (code === "22P02") {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  return null;
}
