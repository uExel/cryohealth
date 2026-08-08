import postgres from "postgres";

// Server-only: talks to the same PostgreSQL instance as CryoHealth-api (docker-compose `db` service).
// Never import this from client code — postgres.js requires Node's `net`/`tls`.
function createSql() {
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
