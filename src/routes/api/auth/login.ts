import { createFileRoute } from "@tanstack/react-router";
import { compare } from "bcryptjs";
import { getDb } from "@/lib/db";
import { signToken } from "@/lib/jwt";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { identifier, password } = (await request.json()) as {
          identifier?: string;
          password?: string;
        };
        if (!identifier || !password) {
          return Response.json({ error: "Missing identifier or password" }, { status: 400 });
        }

        const sql = getDb();
        const rows = await sql<
          { id: string; role: string; name: string; passwordHash: string; active: boolean }[]
        >`
          SELECT id, role, name, "passwordHash", active
          FROM users
          WHERE "lhwId" = ${identifier} OR phone = ${identifier}
          LIMIT 1
        `;
        const user = rows[0];
        if (!user || !user.active || !(await compare(password, user.passwordHash))) {
          return Response.json({ error: "Wrong ID or PIN" }, { status: 401 });
        }

        const accessToken = await signToken({
          sub: user.id,
          role: user.role as never,
          name: user.name,
        });
        return Response.json({ accessToken, role: user.role, name: user.name });
      },
    },
  },
});
