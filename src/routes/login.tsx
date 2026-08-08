import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { login } from "@/lib/auth-client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CryoHealth" },
      {
        name: "description",
        content: "Sign in to the CryoHealth platform as a community health worker or admin.",
      },
      { property: "og:title", content: "Sign in — CryoHealth" },
      {
        property: "og:description",
        content:
          "Authentication for CryoHealth community health workers, facility admins, and CryoHealth admins.",
      },
      { property: "og:url", content: "https://cryohealth.io/login" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://cryohealth.io/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(identifier, password);
      refresh();
      toast.success("Signed in.");
      nav({ to: "/chw" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold text-foreground">Sign in to CryoHealth</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign in with your LHW ID or phone number and PIN/password.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            type="text"
            required
            placeholder="LHW ID or phone"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={4}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
