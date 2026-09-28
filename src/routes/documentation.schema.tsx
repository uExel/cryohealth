import { createFileRoute } from "@tanstack/react-router";
import {
  DOMAINS,
  ENUMS,
  RELATIONSHIPS,
  SCHEMA_AS_OF,
  TABLES,
  type Column,
  type Table,
} from "@/lib/docs/schema";

const URL = "https://cryohealth.io/documentation/schema";

export const Route = createFileRoute("/documentation/schema")({
  head: () => ({
    meta: [
      { title: "Schema design — CryoHealth documentation" },
      {
        name: "description",
        content:
          "The CryoHealth PostgreSQL + PostGIS schema: every table, column, relationship, index, and enum, grouped by domain.",
      },
      { property: "og:title", content: "Schema design — CryoHealth" },
      {
        property: "og:description",
        content: "Tables, relationships, and enums in the shared CryoHealth database.",
      },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: SchemaPage,
});

/** Renders `backticked` spans in note strings as inline code. */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith("`") ? (
          <code key={i} className="rounded bg-secondary px-1 text-foreground">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

function FlagBadge({ flag }: { flag: string }) {
  return (
    <span className="rounded border border-border px-1 text-[10px] font-semibold leading-4 text-muted-foreground">
      {flag}
    </span>
  );
}

function ColumnRow({ col }: { col: Column }) {
  const flags = (col.flags ?? []).filter((f) => f !== "NN");
  const nullable = !col.flags?.includes("NN") && !col.flags?.includes("PK");
  return (
    <tr className="border-t border-border align-top">
      <td className="py-1.5 pr-3">
        <code className="text-foreground">{col.name}</code>
        {flags.length > 0 && (
          <span className="ml-1.5 inline-flex gap-1">
            {flags.map((f) => (
              <FlagBadge key={f} flag={f} />
            ))}
          </span>
        )}
      </td>
      <td className="py-1.5 pr-3 font-mono text-xs text-muted-foreground">
        {col.type}
        {nullable && <span className="text-muted-foreground/70"> · null</span>}
      </td>
      <td className="py-1.5 text-xs text-muted-foreground">
        {col.ref && (
          <div>
            →{" "}
            <a href={`#${col.ref.table}`} className="font-semibold text-primary hover:underline">
              {col.ref.table}
            </a>{" "}
            <span className="whitespace-nowrap">on delete {col.ref.onDelete.toLowerCase()}</span>
          </div>
        )}
        {col.default && (
          <div>
            default <code>{col.default}</code>
          </div>
        )}
        {col.note && <div>{col.note}</div>}
      </td>
    </tr>
  );
}

function TableCard({ table }: { table: Table }) {
  return (
    <section id={table.name} className="scroll-mt-24 rounded-xl border border-border bg-card p-4">
      <h4 className="font-mono text-sm font-semibold text-foreground">{table.name}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{table.purpose}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-1 pr-3 font-semibold">Column</th>
              <th className="pb-1 pr-3 font-semibold">Type</th>
              <th className="pb-1 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {table.columns.map((c) => (
              <ColumnRow key={c.name} col={c} />
            ))}
          </tbody>
        </table>
      </div>
      {table.indexes && (
        <div className="mt-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Indexes: </span>
          {table.indexes.map((ix, i) => (
            <span key={ix}>
              {i > 0 && " · "}
              <code>{ix}</code>
            </span>
          ))}
        </div>
      )}
      {table.notes?.map((n) => (
        <p key={n} className="mt-2 text-xs text-muted-foreground">
          <Prose text={n} />
        </p>
      ))}
    </section>
  );
}

function SchemaPage() {
  return (
    <article>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold text-foreground">Schema design</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          CryoHealth runs on a single PostgreSQL 16 database with the PostGIS extension. Every
          service reads and writes the same {TABLES.length} tables, and every change to them is a
          TypeORM migration in <code className="text-foreground">CryoHealth-api</code>. Nothing else
          alters the schema.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Current as of migration <code>{SCHEMA_AS_OF.migration}</code> ({SCHEMA_AS_OF.count}{" "}
          migrations).
        </p>

        <h2 className="mt-10 text-lg font-semibold text-foreground">Conventions</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Every table has a <code>uuid</code> primary key named <code>id</code>, generated by{" "}
            <code>uuid_generate_v4()</code>. Timestamps are <code>timestamptz</code>.
          </li>
          <li>
            Locations are PostGIS geometries in WGS 84 (SRID 4326), except glaciers and district
            centroids, which store latitude and longitude as plain numbers.
          </li>
          <li>
            Column names follow two styles. Tables from the initial API schema use camelCase (
            <code>lakeId</code>, <code>createdAt</code>). Tables and columns added for the web
            dashboard use snake_case (<code>district_id</code>, <code>created_at</code>).
          </li>
          <li>
            Pipeline outputs keep their inputs: <code>runId</code> on observations and scores, and
            the full score breakdown in <code>hazard_scores.components</code>.
          </li>
        </ul>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Tables by domain</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOMAINS.map((d) => (
          <div key={d.id} className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-semibold text-foreground">{d.label}</div>
            <p className="mt-1 text-xs text-muted-foreground">{d.blurb}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TABLES.filter((t) => t.domain === d.id).map((t) => (
                <a
                  key={t.name}
                  href={`#${t.name}`}
                  className="rounded border border-border px-1.5 py-0.5 font-mono text-xs text-foreground hover:border-[var(--color-accent)]"
                >
                  {t.name}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Relationships</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        All {RELATIONSHIPS.length} foreign keys. <code>lakes</code>, <code>users</code>, and{" "}
        <code>districts</code> are the hubs most other tables point to.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card p-4">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-1 pr-3 font-semibold">From</th>
              <th className="pb-1 pr-3 font-semibold">References</th>
              <th className="pb-1 font-semibold">On delete</th>
            </tr>
          </thead>
          <tbody>
            {RELATIONSHIPS.map((r) => (
              <tr key={`${r.from}.${r.column}`} className="border-t border-border">
                <td className="py-1.5 pr-3 font-mono text-xs">
                  <a href={`#${r.from}`} className="text-foreground hover:underline">
                    {r.from}
                  </a>
                  <span className="text-muted-foreground">.{r.column}</span>
                </td>
                <td className="py-1.5 pr-3 font-mono text-xs">
                  <a href={`#${r.to}`} className="text-primary hover:underline">
                    {r.to}
                  </a>
                  <span className="text-muted-foreground">.id</span>
                </td>
                <td className="py-1.5 text-xs text-muted-foreground">{r.onDelete.toLowerCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Enums</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ENUMS.map((e) => (
          <div key={e.name} className="rounded-xl border border-border bg-card p-4">
            <code className="text-sm font-semibold text-foreground">{e.name}</code>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {e.values.map((v) => (
                <span
                  key={v}
                  className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground"
                >
                  {v}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Used by {e.usedBy.join(", ")}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Tables</h2>
      <p className="mt-2 text-xs text-muted-foreground">
        <FlagBadge flag="PK" /> primary key · <FlagBadge flag="FK" /> foreign key ·{" "}
        <FlagBadge flag="UQ" /> unique · <span>null</span> column is nullable
      </p>
      {DOMAINS.map((d) => (
        <div key={d.id} className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            {d.label}
          </h3>
          <div className="mt-3 space-y-4">
            {TABLES.filter((t) => t.domain === d.id).map((t) => (
              <TableCard key={t.name} table={t} />
            ))}
          </div>
        </div>
      ))}
    </article>
  );
}
