import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("restores ended pins and lets an admin maintain individual observations", async () => {
  const adminApi = await readFile(new URL("../app/api/admin/route.ts", import.meta.url), "utf8");
  const adminUi = await readFile(new URL("../app/admin/admin-client.tsx", import.meta.url), "utf8");

  assert.match(adminApi, /visibility IN \('pending', 'rejected'\)/);
  assert.match(adminApi, /action: z\.literal\("update_observation"\)/);
  assert.match(adminApi, /action: z\.literal\("delete_observation_photo"\)/);
  assert.match(adminApi, /action: z\.literal\("delete_observation"\)/);
  assert.match(adminApi, /action: z\.literal\("attach_observation_photo"\)/);
  assert.match(adminApi, /sanitizeUploadedPhoto/);
  assert.match(adminApi, /AND photo_key IS NULL/);
  assert.match(adminApi, /DELETE FROM observations WHERE public_id = \? AND agave_public_id = \?/);
  assert.match(adminApi, /syncPinFromLatestObservation/);
  assert.match(adminUi, /公開へ復帰/);
  assert.match(adminUi, /この写真だけ削除/);
  assert.match(adminUi, /この記録を削除/);
  assert.match(adminUi, /観察記録を追加/);
  assert.match(adminUi, /この記録に写真を追加/);
});

test("protects admin photo uploads before reading or writing data", async () => {
  const adminApi = await readFile(new URL("../app/api/admin/route.ts", import.meta.url), "utf8");
  const sameOrigin = adminApi.indexOf("assertSameOrigin(request)");
  const adminAuth = adminApi.indexOf("assertAdmin(request)", sameOrigin);
  const multipartRead = adminApi.indexOf("request.formData()", adminAuth);

  assert.ok(sameOrigin >= 0 && adminAuth > sameOrigin && multipartRead > adminAuth);
  assert.match(adminApi, /photo\.size > 3_000_000/);
  assert.match(adminApi, /WHERE public_id = \? AND agave_public_id = \?/);
  assert.match(adminApi, /\.bind\(parsedPhoto\.data\.observationId, parsedPhoto\.data\.pinId\)/);
  assert.match(adminApi, /Failed admin photo database cleanup/);
  assert.match(adminApi, /Failed admin photo object cleanup/);
});

test("provides policy links and keeps the public defaults conservative", async () => {
  const footer = await readFile(new URL("../app/site-footer.tsx", import.meta.url), "utf8");
  const map = await readFile(new URL("../app/map-app.tsx", import.meta.url), "utf8");
  const submission = await readFile(new URL("../app/submission-dialog.tsx", import.meta.url), "utf8");
  const types = await readFile(new URL("../lib/agave.ts", import.meta.url), "utf8");

  assert.match(footer, /href="\/policy"/);
  assert.match(footer, /href="\/privacy"/);
  assert.match(map, /useState<Filter>\("all"\)/);
  assert.match(submission, /useState\("normal"\)/);
  assert.match(types, /公共の場所（公道などから見える場所）/);
});
