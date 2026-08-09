import postgres from "postgres";

// Server-only: talks to the same PostgreSQL instance as CryoHealth-api (docker-compose `db` service).
// Never import this from client code — postgres.js requires Node's `net`/`tls`.
interface HyperdriveEnv {
  HYPERDRIVE?: { connectionString: string };
}

// Cloudflare Hyperdrive bindings arrive via `cloudflare:workers`, not process.env — it's
// what lets the Worker reach Postgres over the private Tunnel route instead of a public
// address. That module only resolves under the real Workers runtime (prod, `wrangler
// dev`); the Cloudflare plugin is build-only for `bun dev` (see vite.config.ts), so under
// `vite dev` this import always fails — imported dynamically so that failure can be
// caught, and dev falls back to the discrete DB_* vars against the docker-compose db.
function isModuleNotFound(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if ((err as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND") return true;
  const cause = (err as { cause?: unknown }).cause;
  if (cause instanceof Error && (cause as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND") {
    return true;
  }
  return /cannot find module ['"]cloudflare:workers['"]/i.test(err.message);
}

async function getHyperdrive(): Promise<HyperdriveEnv["HYPERDRIVE"]> {
  try {
    const { env } = await import("cloudflare:workers");
    return (env as HyperdriveEnv).HYPERDRIVE;
  } catch (err) {
    if (isModuleNotFound(err)) return undefined;
    throw err;
  }
}

async function createSql() {
  const hyperdrive = await getHyperdrive();
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

let _sql: Awaited<ReturnType<typeof createSql>> | undefined;
let _sqlPromise: ReturnType<typeof createSql> | undefined;

export async function getDb() {
  if (_sql) return _sql;
  if (!_sqlPromise) _sqlPromise = createSql();
  _sql = await _sqlPromise;
  return _sql;
}
