import { env } from "cloudflare:workers";
import postgres from "postgres";

// Server-only: talks to the same PostgreSQL instance as CryoHealth-api (docker-compose `db` service).
// Never import this from client code — postgres.js requires Node's `net`/`tls`.
interface HyperdriveEnv {
  HYPERDRIVE?: { connectionString: string };
}

// Cloudflare Hyperdrive bindings arrive via this `cloudflare:workers` import, not
// process.env — it's what lets the Worker reach Postgres over the private Tunnel route
// instead of a public address. @cloudflare/vite-plugin runs `bun dev` inside workerd too,
// so this resolves locally as well; it's just unset there since no dev Hyperdrive is
// configured, and we fall back to the discrete DB_* vars against the docker-compose db.
function createSql() {
  const hyperdrive = (env as HyperdriveEnv).HYPERDRIVE;
  if (hyperdrive) {
    return postgres(hyperdrive.connectionString, { max: 5 });
  }

  const host = process.env.DB_HOST ?? "localhost";
  const port = Number(process.env.DB_PORT ?? 5433);
  const username = process.env.DB_USER ?? "cryohealth";
  const password = process.env.DB_PASSWORD ?? "cryohealth-dev";
  const database = process.env.DB_NAME ?? "cryohealth";

  return postgres({
    host,
    port,
    username,
    password,
    database,
    max: 5,
  });
}

let _sql: ReturnType<typeof createSql> | undefined;

export function getDb() {
  if (!_sql) _sql = createSql();
  return _sql;
}
