import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://cryohealth.io";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — CryoHealth" },
      {
        name: "description",
        content:
          "CryoHealth is built by uExel Solutions, a Pakistani software company, with implementation delivered through SDA Technology Hub in Gilgit Baltistan.",
      },
      { property: "og:title", content: "About — CryoHealth" },
      {
        property: "og:description",
        content: "The team and partners building CryoHealth in Gilgit Baltistan.",
      },
      { property: "og:url", content: `${SITE_URL}/about` },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }],
  }),
  component: AboutPage,
});

const TEAM: { name: string; role: string }[] = [
  {
    name: "Shaan M. Khan",
    role: "Chief Executive Officer and Technical Lead. Data science and health systems.",
  },
  {
    name: "Shazia Bano",
    role: "Co-founder, Director and Principal Investigator. Master of Public Health, Aga Khan University. Leads public health strategy and field direction.",
  },
  { name: "Abdul Latif", role: "Lead Developer, Backend." },
  { name: "Shoaib Shamrez", role: "Full Stack Developer." },
  { name: "Kainat", role: "Quality Assurance." },
  { name: "Zoha Latif", role: "Designer and community liaison." },
  {
    name: "Prof. Zafar Fatmi",
    role: "Advisor on climate and environmental health, Aga Khan University.",
  },
];

function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">About</p>
      <h1 className="mt-2 text-3xl font-semibold text-foreground">About CryoHealth</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        CryoHealth began with a simple observation. In Gilgit Baltistan, the data that predicts a
        flood and the guidance that prevents the disease afterwards both exist, and neither reaches
        the person who needs them. It is built by uExel Solutions, a Pakistani software company
        founded in 2019 with more than a decade of healthcare IT delivery behind it, working with
        SDA Technology Hub in Gilgit.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Team</h2>
      <ul className="mt-4 space-y-4">
        {TEAM.map((m) => (
          <li key={m.name} className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-semibold text-foreground">{m.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{m.role}</div>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Partners</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        SDA Technology Hub, Danyore, is CryoHealth's implementation partner in Gilgit Baltistan,
        providing training venue and field presence. Other organisations are listed here only once
        an agreement is in place.
      </p>
    </main>
  );
}
