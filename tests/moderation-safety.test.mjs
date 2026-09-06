import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps moderation history while erasing expired contact data", async () => {
  const admin = await readFile(new URL("../app/api/admin/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(admin, /DELETE FROM change_requests/);
  assert.match(admin, /SET contact_email = NULL, reporter_hash = NULL/);
  assert.match(admin, /outcome = \?/);
});

test("holds nearby re-registrations for review", async () => {
  const submissions = await readFile(new URL("../app/api/agaves/route.ts", import.meta.url), "utf8");
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  assert.match(schema, /location_restrictions/);
  assert.match(submissions, /matchedRestriction \? "pending" : "approved"/);
  assert.match(submissions, /distanceMeters/);
});

test("rate-limits submissions globally and per client", async () => {
  const submissions = await readFile(new URL("../app/api/agaves/route.ts", import.meta.url), "utf8");
  assert.match(submissions, /enforceRateLimit\(request, "pin-submission", 5\)/);
  assert.match(submissions, /enforceGlobalRateLimit\("pin-submission", 80\)/);
});

test("fails closed without a production rate-limit secret and throttles admin access", async () => {
  const security = await readFile(new URL("../lib/server-security.ts", import.meta.url), "utf8");
  const admin = await readFile(new URL("../app/api/admin/route.ts", import.meta.url), "utf8");
  assert.match(security, /configured\.length >= 24/);
  assert.match(security, /投稿保護機能の設定が完了していません/);
  assert.match(admin, /enforceRateLimit\(request, "admin-access", 80\)/);
});
