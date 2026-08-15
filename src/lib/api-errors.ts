/** Server-only helpers for api/admin/* route handlers: safe JSON parsing and mapping
 *  common Postgres error codes to stable JSON responses instead of a raw 500. */

export async function parseJsonBody(
  request: Request,
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false, response: Response.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
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
  if (code === "22P02") {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  return null;
}
