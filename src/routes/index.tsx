import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Satellite,
  Bell,
  Stethoscope,
  Database,
  ShieldCheck,
  Github,
  Scale,
  MapPin,
  Radio,
  HeartPulse,
  Users,
  Globe2,
} from "lucide-react";
import heroImage from "@/assets/glacial-hero.jpg";

const GITHUB_REPO_URL = "https://github.com/cryohealth/cryohealth";
const SITE_URL = "https://cryohealth.life";
const OG_IMAGE = `${SITE_URL}${heroImage}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CryoHealth — GLOF Early Warning & Offline AI Health Assistant" },
      {
        name: "description",
        content:
          "Open-source platform connecting satellite-based glacial lake outburst flood (GLOF) early warning with offline AI health guidance for community health workers across Gilgit Baltistan and the Hindu Kush–Himalaya.",
      },
      { property: "og:title", content: "CryoHealth — GLOF Early Warning & Offline AI Health Assistant" },
      {
        property: "og:description",
        content:
          "From satellite to bedside in under 3 minutes. Open-source GLOF early warning + offline AI health assistant for Gilgit Baltistan.",
      },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:alt", content: "Glacial lake in the Hindu Kush–Himalaya" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:site_name", content: "CryoHealth" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "CryoHealth — GLOF Early Warning & Offline AI Health Assistant" },
      {
        name: "twitter:description",
        content:
          "From satellite to bedside in under 3 minutes. Open-source GLOF early warning + offline AI health assistant.",
      },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main>
      {/* HERO — split screen */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-0 md:grid-cols-2">
          <div className="relative flex flex-col justify-center px-6 py-16 md:px-12 md:py-24">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,oklch(0.62_0.09_215/0.15),transparent_60%)]" />
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent-foreground/70">
              Open source · Seeking funding partners
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] text-foreground md:text-5xl lg:text-6xl">
              From satellite <span className="text-primary">to bedside</span> in under three minutes.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              CryoHealth fuses near-real-time glacial lake outburst flood (GLOF) intelligence with an
              offline AI health assistant — built for community health workers across Gilgit Baltistan
              and the wider Hindu Kush–Himalaya.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-0.5 hover:bg-primary/90"
              >
                Open live dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/lakes"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
              >
                Explore hazard map
              </Link>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-6 text-left">
              <Stat label="Lead-time goal" value="< 3 min" />
              <Stat label="Region" value="HKH" />
              <Stat label="License" value="MIT" />
            </dl>
          </div>
          <div className="relative min-h-[320px] md:min-h-[640px]">
            <img
              src={heroImage}
              alt="Aerial view of a turquoise glacial lake surrounded by Karakoram peaks at golden hour"
              width={1280}
              height={1280}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-background/10 to-background/80 md:bg-gradient-to-r md:from-background/80 md:via-background/0" />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-3 md:px-12">
          <div className="md:col-span-1">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">The challenge</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground">
              Two crises, one mountain valley.
            </h2>
          </div>
          <div className="space-y-6 md:col-span-2">
            <p className="text-base leading-relaxed text-muted-foreground">
              More than 3,000 glacial lakes in Pakistan’s north now threaten downstream communities as the
              cryosphere thaws. When a moraine fails, villages have minutes — not hours — to evacuate.
              At the same time, the nearest doctor can be a day’s walk away, and connectivity is unreliable.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Pill icon={<Globe2 />} title="33+ GLOF events" desc="recorded across Gilgit Baltistan in the last two decades." />
              <Pill icon={<HeartPulse />} title="1 doctor / 1,300" desc="people in mountain districts — often offline." />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-12">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
              One pipeline. Satellite → SMS → CHW.
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Each layer is designed to keep working when bandwidth, electricity, or roads do not.
            </p>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            <Step
              n="01"
              icon={<Satellite />}
              title="Satellite watch"
              desc="Sentinel-1/2 and MODIS imagery monitor glacial lakes daily. ML scores each lake by tier."
            />
            <Step
              n="02"
              icon={<Bell />}
              title="Tiered alerts"
              desc="NDMA-aligned WATCH → HIGH → CRITICAL alerts trigger automatic notifications."
            />
            <Step
              n="03"
              icon={<Radio />}
              title="Last-mile delivery"
              desc="SMS, radio, and PWA push reach CHWs and village focal points within minutes."
            />
            <Step
              n="04"
              icon={<Stethoscope />}
              title="Offline AI care"
              desc="A local model guides triage, drug dosing, and referrals — works without internet."
            />
          </ol>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-12">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">What’s inside</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
              Built for the people closest to the risk.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <Feature
              icon={<MapPin />}
              title="Hazard map"
              desc="Interactive map of glaciers, lakes, and downstream facilities with live risk tiers."
              to="/lakes"
              cta="Open hazard map"
            />
            <Feature
              icon={<Bell />}
              title="Alerts feed"
              desc="Chronological feed of NDMA alerts with estimated impact windows and downstream populations."
              to="/alerts"
              cta="View alerts"
            />
            <Feature
              icon={<Database />}
              title="Open data API"
              desc="Public read-only endpoints for lakes, alerts, and KPIs — anyone can build on it."
              to="/data"
              cta="Read API docs"
            />
            <Feature
              icon={<Stethoscope />}
              title="CHW workspace"
              desc="Lightweight case capture, offline-first, with role-based access for community health workers."
              to="/chw"
              cta="CHW sign-in"
            />
            <Feature
              icon={<ShieldCheck />}
              title="Admin controls"
              desc="For NDMA and facility admins: inventory, role management, and audit-ready data."
              to="/admin"
              cta="Admin panel"
            />
            <Feature
              icon={<Users />}
              title="Bilingual UI"
              desc="English and Urdu interface, designed for low-bandwidth devices used in the field."
            />
          </div>
        </div>
      </section>

      {/* HOW TO USE / ROLE GUIDE */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-12">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">Get started</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
              Pick the path that matches your role.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <Role
              tag="Anyone"
              title="Explore the platform"
              steps={[
                "Open the live dashboard for current risk overview.",
                "Browse the hazard map and recent alerts.",
                "Query the open data API for research or journalism.",
              ]}
              to="/dashboard"
              cta="Open dashboard"
            />
            <Role
              tag="Community health worker"
              title="Triage cases offline"
              steps={[
                "Sign in with your CHW account.",
                "Capture cases in the field — syncs when online.",
                "Use the AI assistant for triage and dosing guidance.",
              ]}
              to="/chw"
              cta="CHW workspace"
            />
            <Role
              tag="NDMA / facility admin"
              title="Coordinate response"
              steps={[
                "Sign in with the ndma or facility_admin role.",
                "Manage glacier and lake inventory.",
                "Issue alerts and monitor downstream impact.",
              ]}
              to="/admin"
              cta="Admin panel"
            />
          </div>
        </div>
      </section>

      {/* OPEN SOURCE */}
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:grid-cols-[1.4fr_1fr] md:items-center md:px-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Open source</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Built in the open. Free to fork.</h2>
            <p className="mt-3 max-w-2xl text-primary-foreground/80">
              CryoHealth is released under the MIT License. Code, schema, and seed data are public so
              partners, researchers, and community health programs can audit, fork, and deploy the
              platform in their own valley. Contributions and funding partners are warmly welcomed.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary-foreground/30 px-2.5 py-1 text-xs">
                <Scale className="h-3.5 w-3.5" /> MIT License
              </span>
              <a
                href={`${GITHUB_REPO_URL}/blob/main/LICENSE`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline"
              >
                Read the license
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary-foreground px-5 py-3 text-sm font-medium text-primary hover:bg-white/90"
            >
              <Github className="h-4 w-4" /> View on GitHub
            </a>
            <a
              href={`${GITHUB_REPO_URL}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/30 px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/10"
            >
              Open an issue
            </a>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section>
        <div className="mx-auto max-w-7xl px-6 py-20 text-center md:px-12">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold text-foreground md:text-4xl">
            Ready to see the live picture of risk in the mountains?
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function Pill({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-primary [&_svg]:h-4 [&_svg]:w-4">
        {icon}
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Step({ n, icon, title, desc }: { n: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <li className="relative rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-mono tracking-widest">{n}</span>
        <span className="rounded-md bg-secondary p-1.5 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </li>
  );
}

function Feature({
  icon,
  title,
  desc,
  to,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to?: string;
  cta?: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{desc}</p>
      {to && cta && (
        <Link to={to} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {cta} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function Role({
  tag,
  title,
  steps,
  to,
  cta,
}: {
  tag: string;
  title: string;
  steps: string[];
  to: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-6">
      <span className="self-start rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        {tag}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <ol className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-primary">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <Link to={to} className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
