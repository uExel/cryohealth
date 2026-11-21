import assert from "node:assert/strict";
import { test } from "node:test";
import { lakeRiskNorm } from "./geo.ts";

test("a 0-1 score, number or numeric string, is used as is (not divided by 100)", () => {
  assert.equal(lakeRiskNorm(0.7925), 0.7925);
  assert.equal(lakeRiskNorm("0.43"), 0.43);
  assert.equal(lakeRiskNorm(1), 1);
  assert.equal(lakeRiskNorm(0), 0);
});

test("a missing or non-numeric score counts as 0, never NaN", () => {
  for (const v of [null, undefined, "", "abc", NaN, Infinity]) {
    assert.equal(lakeRiskNorm(v), 0, `input ${String(v)}`);
  }
});

test("an out-of-range score is clamped to 0-1", () => {
  assert.equal(lakeRiskNorm(1.4), 1);
  assert.equal(lakeRiskNorm(-0.2), 0);
});

test("a higher score ranks higher than a lower one", () => {
  assert.ok(lakeRiskNorm("0.79") > lakeRiskNorm("0.38"));
});
