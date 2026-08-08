import { SignJWT, jwtVerify } from "jose";

export type Role = "cryohealth_admin" | "facility_admin" | "chw" | "viewer";
export type JwtPayload = { sub: string; role: Role; name: string };

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing JWT_SECRET environment variable.");
  return new TextEncoder().encode(s);
}

/** Mirrors CryoHealth-api's AuthService: same secret, same payload shape, so a
 *  token issued by either service is valid on the other. */
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(process.env.JWT_EXPIRES ?? "12h")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret());
  return payload as unknown as JwtPayload;
}
