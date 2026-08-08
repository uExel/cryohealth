// Minimal ambient type for the one Workers runtime import we use (src/lib/db.ts).
// Deliberately not the full @cloudflare/workers-types package: that package's global
// Response/fetch overrides ripple into ~20 unrelated call sites across this app that
// mix DOM and Workers code in one tsconfig — out of scope for wiring up Hyperdrive.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
