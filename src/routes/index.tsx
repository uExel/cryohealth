import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Satellite,
  Bell,
  Stethoscope,
  BookOpen,
  Database,
  ShieldCheck,
  Github,
  Scale,
  MapPin,
  Users,
} from "lucide-react";
import heroImage from "@/assets/glacial-hero.jpg";
import logo from "@/assets/cryohealth-logo.png";
import { PipelineDiagram } from "@/components/cryohealth/PipelineDiagram";
import { StatPair } from "@/components/cryohealth/StatCard";

const GITHUB_REPO_URL = "https://github.com/uExel/cryohealth";
const SITE_URL = "https://cryohealth.io";
const OG_IMAGE = `${SITE_URL}${heroImage}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CryoHealth — Prevention that arrives before the flood does" },
      {
        name: "description",
        content:
          "CryoHealth turns satellite data on rising water and weather into early alerts for community health workers, with the prevention guidance already on their phone. It works with no internet, because that is exactly when it is needed.",
      },
      {
        property: "og:title",
        content: "CryoHealth — Prevention that arrives before the flood does",
      },
      {
        property: "og:description",
        content:
          "Open source GLOF early warning and offline prevention guidance for community health workers in Gilgit Baltistan.",
      },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:alt", content: "Glacial lake in the Hindu Kush–Himalaya" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:site_name", content: "CryoHealth" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "CryoHealth — Prevention that arrives before the flood does",
      },
      {
        name: "twitter:description",
        content:
          "Open source GLOF early warning and offline prevention guidance for community health workers in Gilgit Baltistan.",
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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-foreground/70">
              Open source, MIT licensed · Built in Gilgit Baltistan
            </p>
            <img src={logo} alt="CryoHealth logo" className="mt-6 h-20 w-20 object-contain" />
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] text-foreground md:text-5xl lg:text-6xl">
              Prevention that arrives <span className="text-primary">before the flood</span> does.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              CryoHealth turns satellite data on rising water and weather into early alerts for
              community health workers, with the prevention guidance already on their phone. It
              works with no internet, because that is exactly when it is needed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/lakes"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 hover:bg-primary/90"
              >
                See the live hazard map <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                How it works
              </a>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Hazard data is live. The mobile app is in field testing with community health workers
              in Gilgit district.
            </p>
          </div>
          <div className="relative min-h-[320px] md:min-h-[640px]">
            <img
              src={heroImage}
              alt="Aerial view of a turquoise glacial lake surrounded by Karakoram peaks at golden hour"
              width={1280}
              height={1280}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-background/20" />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-3 md:px-12">
          <div className="md:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              The challenge
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground">
              When the road closes, the guidance stops.
            </h2>
          </div>
          <div className="space-y-6 md:col-span-2">
            <p className="text-base leading-relaxed text-muted-foreground">
              Gilgit Baltistan holds more than 3,000 glacial lakes. Thirty three are classified as
              critical outburst risk by Pakistan’s NDMA and ICIMOD. When a flood comes, the damage
              does not end with the water. Roads are cut, clinics lose their supply lines and
              waterborne disease moves through the community in the days that follow.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              The guidance that would prevent most of that already exists. Advice on avoiding
              contaminated water, on handwashing, on managing diarrhoea in young children is well
              established and published by WHO and Pakistan’s NHSRC. It simply does not reach the
              valley at the moment it is needed.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              Community health workers are often the only health resource for days, with no internet
              and no doctor to call. They are working from memory while children under five bear the
              worst of it.
            </p>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatPair label="Glacial lakes across Pakistan's north" value="3,000+" />
              <StatPair label="Classified as critical outburst risk" value="33" />
              <StatPair
                label="Doctor to population ratio in mountain districts"
                value="1 : 1,300"
              />
              <StatPair label="Major flood events since 1994" value="35" />
            </dl>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-12">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
              Four steps, built to work when everything else fails.
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Prevention first. Response second. Each layer is designed to keep working when
              bandwidth, electricity or roads do not.
            </p>
          </div>
          <div className="mt-12">
            <PipelineDiagram />
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            <Step
              n="01"
              icon={<Satellite />}
              title="Watch"
              desc="Daily imagery from ESA Copernicus Sentinel 1 and 2 and NASA MODIS is processed into a risk score for every monitored lake and catchment."
            />
            <Step
              n="02"
              icon={<Bell />}
              title="Alert"
              desc="When risk crosses a threshold, health workers receive a plain instruction, not a number: caution, possible outbreak of diarrhoea, mobilise water sanitation methods."
            />
            <Step
              n="03"
              icon={<BookOpen />}
              title="Prepare"
              desc="A full prevention library on safe water, hygiene and disease control lives on the device and refreshes whenever the worker connects at a health post."
            />
            <Step
              n="04"
              icon={<Stethoscope />}
              title="Respond"
              desc="If an emergency still hits, the worker registers a case. The app works offline to suggest possible diagnoses and care steps for the emergency at hand."
            />
          </ol>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-12">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              What’s inside
            </p>
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
              desc="Chronological feed of hazard alerts with estimated impact windows and downstream populations."
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
              desc="For CryoHealth admins and facility admins: inventory, role management, and audit-ready data."
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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Get started
            </p>
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
              tag="CryoHealth / facility admin"
              title="Coordinate response"
              steps={[
                "Sign in with the cryohealth_admin or facility_admin role.",
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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Open source
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Built in the open. Free to fork.
            </h2>
            <p className="mt-3 max-w-2xl text-primary-foreground/80">
              CryoHealth is released under the MIT License. Code, database schema and sample data
              are public, so any health programme, ministry or research group can audit it, fork it
              and run it in their own valley without asking us and without paying us. Anonymised
              case data, alert logs and hazard observations are published under CC BY 4.0 through
              public endpoints.
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
              className="inline-flex items-center gap-2 rounded-md bg-primary-foreground px-5 py-3 text-sm font-semibold text-primary hover:bg-white/90"
            >
              <Github className="h-4 w-4" /> View on GitHub
            </a>
            <a
              href={`${GITHUB_REPO_URL}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/30 px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
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
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="relative rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-mono tracking-widest">{n}</span>
        <span className="rounded-md bg-secondary p-1.5 text-primary [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
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
        <Link
          to={to}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
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
      <span className="self-start border border-border bg-secondary px-2.5 py-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        {tag}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <ol className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center bg-secondary text-[11px] font-semibold text-primary">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <Link
        to={to}
        className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
