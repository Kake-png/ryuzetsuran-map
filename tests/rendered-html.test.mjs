import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("defines the map metadata and security headers", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");

  assert.match(layout, /title: "リュウゼツランマップ"/);
  assert.match(layout, /<html lang="ja">/);
  assert.match(worker, /X-Content-Type-Options/);
  assert.match(worker, /frame-ancestors 'none'/);
});
