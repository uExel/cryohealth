import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fetchLakesFromApi } from "./cryohealth-api.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const apiLake = (over: Record<string, unknown>) => ({
  id: "l1",
  name: "L",
  district: "D",
  currentTier: "high",
  stale: false,
  elevationM: null,
  geom: { type: "Point", coordinates: [74.9, 36.3] },
  updatedAt: "2026-08-17T00:00:00Z",
  ...over,
});

async function mapLakes(items: unknown[]) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ items, total: items.length }), {
      status: 200,
    })) as unknown as typeof fetch;
  return fetchLakesFromApi();
}

test("a lake with no population or score keeps null, not 0", async () => {
  const [lake] = await mapLakes([apiLake({ currentRiskScore: null, downstreamPopulation: null })]);
  assert.equal(lake.current_risk_score, null);
  assert.equal(lake.downstream_population, null);
});

test("a lake with the field missing entirely also stays null", async () => {
  const [lake] = await mapLakes([apiLake({})]);
  assert.equal(lake.current_risk_score, null);
  assert.equal(lake.downstream_population, null);
});

test("real values are kept: a string score becomes a number, and a genuine 0 stays 0", async () => {
  const [a, b] = await mapLakes([
    apiLake({ currentRiskScore: "0.7925", downstreamPopulation: 12000 }),
    apiLake({ id: "l2", currentRiskScore: 0, downstreamPopulation: 0 }),
  ]);
  assert.equal(a.current_risk_score, 0.7925);
  assert.equal(a.downstream_population, 12000);
  assert.equal(b.current_risk_score, 0);
  assert.equal(b.downstream_population, 0);
});
