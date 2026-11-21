/** Display helpers for lake fields that CryoHealth-api reports as `null` when nothing real
 *  is known (downstream population, risk score, per-score confidence). A missing value
 *  renders as "—", never as 0: "0 people downstream" or "0% confidence" reads as a real,
 *  safe measurement when it is not. */

const MISSING = "—";

const toFiniteNumber = (value: string | number | null | undefined): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function formatPopulation(value: string | number | null | undefined): string {
  const n = toFiniteNumber(value);
  return n == null ? MISSING : n.toLocaleString();
}

/** The hazard score is a 0–1 composite (CryoHealth-geo docs/HAZARD_METHODOLOGY.md; the
 *  tier thresholds are 0.25 / 0.45 / 0.65), so it is shown with two decimals like the
 *  risk-score history table — `toFixed(0)` would turn 0.43 into "0" and 0.73 into "1". */
export function formatRiskScore(value: string | number | null | undefined): string {
  const n = toFiniteNumber(value);
  return n == null ? MISSING : n.toFixed(2);
}

/** Confidence is a 0–1 fraction shown as a percentage. */
export function formatConfidence(value: string | number | null | undefined): string {
  const n = toFiniteNumber(value);
  return n == null ? MISSING : `${Math.round(n * 100)}%`;
}

/** Form input → value to submit. A blank box means "not provided" (undefined, which is
 *  omitted from the request), not 0. */
export function parsePopulationInput(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
