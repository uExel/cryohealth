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

test("a CHW phone and a facility contact are trimmed", () => {
  assert.equal(chwProfileCreateSchema.parse({ ...chw, phone: "  0300 111  " }).phone, "0300 111");
  assert.equal(facilityCreateSchema.parse({ ...facility, contact: " a@b.c " }).contact, "a@b.c");
});

test("a user can be saved with only a phone: a blank LHW ID becomes null", () => {
  const base = { name: "U", role: "chw", pin: "1234" };
  const parsed = userCreateSchema.parse({ ...base, lhwId: "", phone: "0300" });
  assert.equal(parsed.lhwId, null);
  assert.equal(parsed.phone, "0300");
  assert.equal(userCreateSchema.parse({ ...base, lhwId: "   ", phone: "0300" }).lhwId, null);
});

test("a user with neither LHW ID nor phone gets the login-id message, not a length error", () => {
  const base = { name: "U", role: "chw", pin: "1234" };
  const result = userCreateSchema.safeParse({ ...base, lhwId: "", phone: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues.map((i) => i.message).join("|"), /LHW ID or a phone/);
  }
});
