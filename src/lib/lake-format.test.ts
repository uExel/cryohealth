import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatConfidence,
  formatPopulation,
  formatRiskScore,
  parsePopulationInput,
} from "./lake-format.ts";

test("a missing population renders as a dash instead of throwing or showing 0", () => {
  // dashboard.tsx used `l.downstream_population.toLocaleString()`, which throws on null.
  assert.equal(formatPopulation(null), "—");
  assert.equal(formatPopulation(undefined), "—");
  assert.equal(formatPopulation(""), "—");
  assert.equal(formatPopulation("not a number"), "—");
});

test("a real population is shown as a number", () => {
  assert.equal(formatPopulation(5000), (5000).toLocaleString());
  assert.equal(formatPopulation("1200"), (1200).toLocaleString());
});

test("a missing risk score renders as a dash, a real 0 stays 0.00", () => {
  assert.equal(formatRiskScore(null), "—");
  assert.equal(formatRiskScore(undefined), "—");
  assert.equal(formatRiskScore(0), "0.00");
});

test("a 0-1 risk score keeps its two decimals (toFixed(0) showed 0.43 as 0 and 0.73 as 1)", () => {
  assert.equal(formatRiskScore("0.4300"), "0.43"); // numeric column arrives as a string
  assert.equal(formatRiskScore(0.73), "0.73");
  assert.equal(formatRiskScore(0.25), "0.25");
});

test("a missing confidence renders as a dash, not 0%", () => {
  assert.equal(formatConfidence(null), "—");
  assert.equal(formatConfidence(undefined), "—");
});

test("a real confidence is shown as a percentage", () => {
  assert.equal(formatConfidence("0.8"), "80%");
  assert.equal(formatConfidence(0), "0%");
  assert.equal(formatConfidence(1), "100%");
});

test("a blank population input means not provided, not 0", () => {
  assert.equal(parsePopulationInput(""), undefined);
  assert.equal(parsePopulationInput("   "), undefined);
  assert.equal(parsePopulationInput("abc"), undefined);
});

test("a typed population input is passed through, including a deliberate 0", () => {
  assert.equal(parsePopulationInput("1200"), 1200);
  assert.equal(parsePopulationInput("0"), 0);
});
