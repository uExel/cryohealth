import { verifyToken, type JwtPayload, type Role } from "@/lib/jwt";

/** Thrown by requireAuth (invalid/missing token) or requireRole (wrong role).
 *  Callers should catch this and return `err.response`. */
export class AuthError extends Error {
  constructor(public response: Response) {
    super("Unauthorized");
  }
}

/** Verifies the request's Bearer token, or throws AuthError. Use inside
 *  `server.handlers` for routes that require an authenticated user:
 *  `try { claims = await requireAuth(request) } catch (e) { if (e instanceof AuthError) return e.response; throw e }` */
export async function requireAuth(request: Request): Promise<JwtPayload> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError(Response.json({ error: "Unauthorized" }, { status: 401 }));
  }
  const token = authHeader.slice("Bearer ".length);
  try {
    return await verifyToken(token);
  } catch {
    throw new AuthError(Response.json({ error: "Unauthorized: invalid token" }, { status: 401 }));
  }
}

/** Throws AuthError (403) if `claims.role` is not in `roles`. Use inside the same
 *  `try` block as `requireAuth`, immediately after it:
 *  `try { claims = await requireAuth(request); requireRole(claims, ["cryohealth_admin"]); } catch (e) { if (e instanceof AuthError) return e.response; throw e }` */
export function requireRole(claims: JwtPayload, roles: Role[]): void {
  if (!roles.includes(claims.role)) {
    throw new AuthError(Response.json({ error: "Forbidden" }, { status: 403 }));
  }
}
