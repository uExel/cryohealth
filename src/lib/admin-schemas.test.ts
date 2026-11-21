import assert from "node:assert/strict";
import { test } from "node:test";
import { chwProfileCreateSchema, facilityCreateSchema, userCreateSchema } from "./admin-schemas.ts";

const chw = { full_name: "A", language: "en" };
const facility = { name: "F", type: "clinic", district: "D", vulnerability: "high" };

test("a blank or whitespace-only optional phone/contact becomes null", () => {
  assert.equal(chwProfileCreateSchema.parse({ ...chw, phone: "" }).phone, null);
  assert.equal(chwProfileCreateSchema.parse({ ...chw, phone: "   " }).phone, null);
  assert.equal(facilityCreateSchema.parse({ ...facility, contact: "" }).contact, null);
});

test("a real phone/contact value is kept", () => {
  assert.equal(chwProfileCreateSchema.parse({ ...chw, phone: "+92 300 1" }).phone, "+92 300 1");
  assert.equal(facilityCreateSchema.parse({ ...facility, contact: "x@y.z" }).contact, "x@y.z");
});

test("an omitted or null optional phone stays omitted or null", () => {
  assert.equal(chwProfileCreateSchema.parse(chw).phone, undefined);
  assert.equal(chwProfileCreateSchema.parse({ ...chw, phone: null }).phone, null);
});

test("a required field is still required", () => {
  assert.equal(chwProfileCreateSchema.safeParse({ ...chw, full_name: "" }).success, false);
});

test("user phone: blank becomes null, a value is trimmed, and a login id is still required", () => {
  const base = { name: "U", role: "chw", pin: "1234" };
  assert.equal(userCreateSchema.parse({ ...base, lhwId: "L1", phone: "" }).phone, null);
  assert.equal(userCreateSchema.parse({ ...base, phone: "  0300  " }).phone, "0300");
  assert.equal(userCreateSchema.safeParse({ ...base, phone: "" }).success, false);
});
