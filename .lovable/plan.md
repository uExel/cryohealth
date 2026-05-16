# CryoHealth – Lovable Build Plan

The PRD describes a full platform (Flutter mobile app, on-device LLM via Ollama, satellite/IoT ML pipelines, SMS gateways, DHIS2, Kubernetes). Most of those layers are not buildable in a Lovable web project. What Lovable can deliver well is **Layer 4 (Open Dashboard + API)** plus a **web-based CHW/admin companion** that exercises Layers 1–3 against seeded/simulated data, so the platform is demonstrable end-to-end for the UNICEF Venture Fund pitch.

## Scope I will build

**1. Public Hazard Dashboard** (`/`, `/lakes`, `/lakes/$id`)
- Interactive map of GB glacial lakes with risk-tier coloring (NORMAL / WATCH / HIGH / CRITICAL).
- Lake detail: current risk score, 7-day trend chart, confidence, affected downstream communities, recent alerts.
- KPI strip: active CHWs, cases logged 7d, lakes in HIGH+, alerts sent 30d (DET-01..06, DASH KPIs).

**2. Alert Log & Broadcast Console** (`/alerts`, `/alerts/new`)
- Chronological alert feed filterable by tier/district/lake.
- Admin form to issue a custom broadcast to a district (ALT-04, ALT-05).
- Acknowledgement tracking view (ALT-06).

**3. CHW Web Companion** (`/chw`, `/chw/triage`, `/chw/cases`, `/chw/disaster`)
- Auth'd CHW workspace (replaces the Flutter app for the web demo).
- Symptom-checker chat using Lovable AI Gateway (Gemini) as a stand-in for the on-device LLM; cites protocol source (LLM-04, LLM-08).
- Patient case logging form, list, and offline-friendly local cache (LLM-09).
- Disaster-mode banner that auto-activates when the CHW's district has a HIGH/CRITICAL alert (LLM-05, US-LLM-02).
- Urdu / English language toggle (LLM-06).

**4. Facility Admin & NDMA Views** (`/admin/caseload`, `/admin/facilities`)
- CHW caseload table by district; facility vulnerability overlay on the hazard map.

**5. Open Data** (`/data` + JSON endpoints)
- Read-only public endpoints: `GET /api/public/lakes`, `/api/public/lakes/:id/risk`, `/api/public/alerts`, `/api/public/kpis` (mirrors §5.3.1 of PRD).
- "Download CSV" buttons for lakes, alerts, aggregate cases.

**6. Data model (Lovable Cloud / Postgres)**
- `lakes`, `lake_risk_scores`, `alerts`, `alert_acknowledgements`, `districts`, `facilities`, `chw_profiles`, `cases`, `protocols`, `broadcast_messages`.
- RLS: public read on lakes/risk/alerts; CHWs read/write their own cases; admins (via `user_roles` table) read all + write broadcasts.
- Seed script with the 33 priority GB lakes, sample 90-day risk history, sample alerts, ~10 demo CHWs, 5 facilities.

**7. Simulation tools** (so the demo is alive without a satellite pipeline)
- Admin "Simulate risk update" action that bumps a lake's risk score and, if it crosses HIGH/CRITICAL, inserts an alert + notifies CHWs in affected districts (mirrors DET-04, ALT-01 logically).
- Cron-style server function that nudges risk scores daily for realistic motion on the dashboard.

## Explicitly out of scope (and why)
- Flutter Android app, Ollama / Phi-3 / TinyLlama on-device inference, Sentinel-1 / CNN training, IoT/MQTT, Jazz/Telenor SMS gateway, Firebase push, DHIS2/FHIR sync, Kubernetes/GCP infra. None of these run inside a Lovable web project. The CHW web companion + Lovable AI symptom checker is the closest faithful substitute for the demo/grant submission.
- Real PII / medical use. The app will display a clear "demonstration platform – not for clinical use" banner.

## Tech notes
- Stack: existing TanStack Start + Tailwind + shadcn. Add Lovable Cloud, `react-leaflet` + OpenStreetMap tiles for the map, `recharts` for trend charts.
- Auth: Lovable Cloud email auth; roles in a separate `user_roles` table (CHW / FACILITY_ADMIN / NDMA / PUBLIC).
- AI: Lovable AI Gateway (`google/gemini-2.5-flash`) for the symptom checker with RAG-style protocol snippets stored in `protocols` table.
- Each major section is its own route (`/lakes`, `/alerts`, `/chw`, `/admin`, `/data`) for SSR/SEO, per project conventions.

## Build order
1. Enable Lovable Cloud, schema + seed (lakes, districts, protocols, demo users).
2. Public dashboard: map + lake detail + KPI strip.
3. Alerts: feed, detail, broadcast form, simulation action.
4. Auth + roles + CHW workspace shell.
5. CHW symptom checker (AI Gateway) + case logging + disaster-mode auto-switch.
6. Admin caseload + facility overlay.
7. Open Data page + public JSON endpoints + CSV export.
8. Polish: Urdu/English toggle, "demo platform" banner, empty states, loading skeletons.

Confirm and I'll start with step 1.
