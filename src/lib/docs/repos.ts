// GitHub repositories linked from the /documentation pages. Slugs match each repo's
// `origin` remote (note the app repo is lowercase `cryohealth-app` on GitHub). All four
// are public — keep it that way or drop the link, since these pages are public too.

const GITHUB = "https://github.com/uExel";

export const REPOS = {
  api: {
    name: "CryoHealth-api",
    url: `${GITHUB}/CryoHealth-api`,
    stack: "NestJS 11 · TypeORM · PostgreSQL + PostGIS",
    role: "Product logic: authentication and roles, alert policy, offline sync, admin, and the public Open Data API. Owns every schema migration.",
  },
  geo: {
    name: "CryoHealth-geo",
    url: `${GITHUB}/CryoHealth-geo`,
    stack: "Python 3.12 · FastAPI",
    role: "Sentinel-2 earth-observation pipeline: NDWI water-extent monitoring and hazard scoring. Pure computation, no policy decisions.",
  },
  app: {
    name: "CryoHealth-app",
    url: `${GITHUB}/cryohealth-app`,
    stack: "Expo · React Native",
    role: "Offline-first field app: GLOF alerts for the public and IMCI triage for community health workers.",
  },
  web: {
    name: "cryohealth",
    url: `${GITHUB}/cryohealth`,
    stack: "TanStack Start · Cloudflare Workers",
    role: "This website: hazard map, alerts, CHW and admin views, and the Open Data explorer.",
  },
} as const;

export const REPO_LINKS = {
  migrations: `${REPOS.api.url}/tree/main/src/database/migrations`,
  apiArchitecture: `${REPOS.api.url}/blob/main/ARCHITECTURE.md`,
  hazardMethodology: `${REPOS.geo.url}/blob/main/docs/HAZARD_METHODOLOGY.md`,
  diagramSource: `${REPOS.web.url}/tree/main/docs/architecture`,
};
