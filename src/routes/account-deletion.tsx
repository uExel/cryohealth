import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://cryohealth.io/account-deletion";

export const Route = createFileRoute("/account-deletion")({
  head: () => ({
    meta: [
      { title: "Account & Data Deletion — CRYO Health" },
      {
        name: "description",
        content: "How to request deletion of a CRYO Health account and associated personal data.",
      },
      { property: "og:title", content: "Account & Data Deletion — CRYO Health" },
      {
        property: "og:description",
        content: "How to request deletion of a CRYO Health account and associated personal data.",
      },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: AccountDeletionPage,
});

function AccountDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <article>
        <header className="border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            CRYO Health
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Account &amp; Data Deletion
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: October 1, 2026</p>
        </header>

        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Request account and data deletion
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              CRYO Health does not currently offer self-service account deletion. You can ask us to
              delete your account and associated personal data by submitting a request for review. A
              request is not an immediate deletion, and submitting one does not itself deactivate or
              remove an account.
            </p>
          </section>

          <section className="border-y border-border py-6">
            <h2 className="text-lg font-semibold text-foreground">Request Account Deletion</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Email our team with the account details below. We will review the request and verify
              that you are the account holder or are authorized to act for them before taking
              action.
            </p>
            <a
              className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              href="mailto:info@uexcel.com?subject=CRYO%20Health%20Account%20Deletion%20Request"
            >
              Request Account Deletion
            </a>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">What to include</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Include the name on the account and the email address, phone number, or username
              associated with it. Tell us whether your request covers the account, community health
              worker profile, and any associated case information. Do not include your password,
              PIN, or patient details in the email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Review and verification</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We may contact you to verify your identity or authority and clarify the scope of your
              request. We will assess which account and personal data can be deleted and whether any
              information must be retained, for example to meet legal, security, or recordkeeping
              requirements. We will let you know the outcome; deletion is not complete until the
              review and any required actions have finished.
            </p>
          </section>

          <p className="text-sm leading-relaxed text-muted-foreground">
            For details about information CRYO Health handles and its retention practices, read our{" "}
            <Link to="/privacy-policy" className="text-primary underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </article>
    </main>
  );
}
