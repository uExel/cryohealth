import { createFileRoute } from "@tanstack/react-router";

const URL = "https://cryohealth.io/privacy-policy";

const POLICY_SECTIONS = [
  {
    title: "1. Introduction",
    paragraphs: [
      "This Privacy Policy explains how cryohealth handles information through the CRYO Health website, field application, and related services. CRYO Health provides public glacial-lake hazard information and tools for authorized community health workers and administrators to record and manage health-related cases.",
    ],
  },
  {
    title: "2. Information We Collect",
    paragraphs: [
      "When an administrator creates an account, the account may include a user's name, role, LHW ID and/or phone number, facility association, active status, and account creation date. A community health worker profile may also include a full name, phone number, district, preferred language, and a link to a user account.",
      "When a health worker records a case in the field app, the current form records the patient's age, sex, selected health problem, case outcome, and capture time. The case is associated with the health worker's account and includes a random case identifier and an identifier for the app installation used to record it.",
      "The separate case-management feature can store patient age and sex, symptoms, diagnosis, treatment, outcome, disaster-related status, district, and the associated health worker. The field app does not currently ask for a patient name or patient ID, but its case payload can contain additional fields.",
      "The app also stores downloaded lake, alert, and health-protocol information locally for offline use. Public hazard information can be viewed without an account.",
    ],
  },
  {
    title: "3. Health and Patient Information",
    paragraphs: [
      "CRYO Health processes health-related case information to support community health work and case management. Case records can be linked to a health worker and district, which may make a record identifiable in context even if it does not contain a patient name.",
      "The field app can save cases on the device and synchronize them when a network connection is available. The app's current form includes an age field and can be used to record cases involving children. The software does not implement a child-specific consent or safeguarding workflow.",
    ],
  },
  {
    title: "4. How We Use Information",
    paragraphs: [
      "CRYO Health uses account and profile information to authenticate authorized users, apply access permissions, and associate health-worker activity with the correct account. Case information is used to record, synchronize, and manage cases.",
      "The app downloads and locally caches public lake, alert, and protocol information so those features remain available offline. The geo-processing service calculates environmental observations and hazard scores using satellite imagery and population datasets. The reviewed service integrations do not send patient case records to those data providers.",
    ],
  },
  {
    title: "5. How Information Is Stored and Protected",
    paragraphs: [
      "The backend stores data in PostgreSQL with PostGIS. The field app stores cached information and queued cases in a local database. It stores session credentials and its generated app-install identifier using Expo SecureStore. The website stores its bearer session token in browser local storage.",
      "PINs and passwords are stored as bcrypt hashes. The API uses signed, expiring bearer tokens and role-based access controls. The production app is configured to communicate with the API over HTTPS. Deployment materials identify Cloudflare services and a Hetzner-hosted backend environment.",
      "These implementation details do not guarantee a particular level of security. The software does not define database or backup encryption, and local case records are not cleared by the app's logout function.",
    ],
  },
  {
    title: "6. Data Sharing and Disclosure",
    paragraphs: [
      "Some environmental and hazard information is available through public, unauthenticated API endpoints. A public indicator endpoint provides aggregate counts, such as recent case totals and active health workers. The case endpoints reviewed require authentication: a community health worker can retrieve their own synced cases, and the cryohealth_admin role can access and manage case records.",
      "Community health worker profiles are also available through unauthenticated API endpoints. Those endpoints currently return profile and linked-account information that can include names, phone numbers, district, language, LHW ID, account status, and profile creation time.",
      "CRYO Health uses infrastructure and data services described in this Policy to operate the platform. The reviewed code does not show advertising or analytics integrations, or a feature that sells personal information.",
    ],
  },
  {
    title: "7. Third-Party Services",
    paragraphs: [
      "Deployment materials identify Cloudflare services for website hosting and network/database access, and a Hetzner-hosted backend environment. The API deployment workflow also uses GitHub Actions and GitHub Container Registry to build and deploy software.",
      "The geo-processing service uses Microsoft Planetary Computer and Copernicus Data Space for satellite imagery and WorldPop population data. These services are used for environmental calculations; the reviewed integrations use geographic areas around monitored lakes and do not send patient case records.",
      "The API's notification implementation logs alert-recipient information rather than sending push notifications or email. The reviewed app and API code do not show a configured push/email delivery provider, analytics SDK, or crash-reporting SDK.",
    ],
  },
  {
    title: "8. User Accounts",
    paragraphs: [
      "Accounts are created by an administrator; the reviewed software does not provide public self-registration. Implemented roles include cryohealth_admin, facility_admin, chw, and viewer, with access determined by role and endpoint.",
      "The app stores session credentials on the device using SecureStore. The website stores its session token in browser local storage. The API issues expiring bearer tokens; the default expiry is 12 hours unless configured otherwise.",
    ],
  },
  {
    title: "9. Account and Data Deletion",
    paragraphs: [
      "The reviewed software does not provide self-service account deletion. Its user-account API allows a CryoHealth administrator to create accounts and update a user's role or active status. Deactivating an account does not delete it.",
      "A CryoHealth administrator can soft-delete case-management records. Soft-deleted cases are hidden from ordinary listings but remain stored in the database with a deletion timestamp and audit record; they are not erased by that action.",
      "Database constraints link case records to the health worker account and prevent deleting an account while associated cases remain. The app's logout function removes session credentials but does not clear locally stored case records.",
    ],
  },
  {
    title: "10. Data Retention",
    paragraphs: [
      "The software does not define a fixed retention period or automatic expiry for accounts, cases, or audit records. Soft-deleted case-management records remain stored. Local cases may remain on a device after logout. Accordingly, retention depends on operational handling outside the automatic behavior implemented in the software.",
    ],
  },
  {
    title: "11. User Rights",
    paragraphs: [
      "The software does not include a self-service privacy-request or account-deletion feature. For questions or requests about account or personal information, contact cryohealth at info@uexcel.com. Requests will be handled in accordance with applicable requirements.",
    ],
  },
  {
    title: "12. Children's Privacy",
    paragraphs: [
      "CRYO Health is designed for health workers and people accessing public hazard information, not for children to create accounts. The case-recording features can record a patient's age, including an age indicating a child. This Policy does not describe a separate child-specific consent or safeguarding process.",
    ],
  },
  {
    title: "13. International Data Transfers",
    paragraphs: [
      "CRYO Health's deployment materials identify Cloudflare services and a Hetzner-hosted backend environment, as well as external satellite and population-data services. The software and deployment configuration reviewed do not specify all processing locations or whether personal information is transferred across national borders.",
    ],
  },
  {
    title: "14. Changes to This Privacy Policy",
    paragraphs: [
      "CRYO Health may update this Policy as its services or data practices change. The effective date above indicates when this version applies. The current Policy will be published on the CRYO Health website.",
    ],
  },
] as const;

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CRYO Health" },
      {
        name: "description",
        content:
          "How CRYO Health handles account, community health worker, and patient case information.",
      },
      { property: "og:title", content: "Privacy Policy — CRYO Health" },
      {
        property: "og:description",
        content: "Privacy information for the CRYO Health website and field application.",
      },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <article>
        <header className="border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            CRYO Health
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Effective date: October 1, 2026</p>
        </header>

        <div className="mt-8 space-y-8">
          {POLICY_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-lg font-semibold text-foreground">15. Contact Information</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              For privacy questions or requests, contact cryohealth:
            </p>
            <address className="mt-3 space-y-1 text-sm not-italic leading-relaxed text-muted-foreground">
              <p>Office 2, 2nd Floor, Building 140, Street No. 29, G-9/1, Islamabad, Pakistan</p>
              <p>
                <a className="text-primary underline" href="mailto:info@uexcel.com">
                  info@uexcel.com
                </a>
              </p>
            </address>
          </section>
        </div>
      </article>
    </main>
  );
}
