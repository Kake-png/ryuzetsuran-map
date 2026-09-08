import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps external-photo attribution separate from ordinary submissions", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  const map = await readFile(new URL("../app/map-app.tsx", import.meta.url), "utf8");
  const observations = await readFile(new URL("../app/api/observations/route.ts", import.meta.url), "utf8");

  assert.match(schema, /photoAuthor: text\("photo_author"\)/);
  assert.match(schema, /photoLicense: text\("photo_license"\)/);
  assert.match(map, /写真：\{openedPhoto\.attribution\.author\}/);
  assert.match(map, /投稿写真/);
  assert.match(observations, /photo_author = CASE WHEN \? IS NOT NULL THEN NULL ELSE photo_author END/);
});
