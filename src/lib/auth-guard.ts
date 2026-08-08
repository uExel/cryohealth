import { verifyToken, type JwtPayload } from "@/lib/jwt";

/** Thrown by requireAuth when the request lacks a valid Bearer token. Callers
 *  should catch this and return `err.response`. */
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
