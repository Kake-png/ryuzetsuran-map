import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("serves both initial photos and observation photos", async () => {
  const route = await readFile(new URL("app/api/photos/[...key]/route.ts", root), "utf8");
  assert.match(route, /observations\\\/AGV-/);
  assert.match(route, /\(\?:webp\|jpg\)/);
  assert.match(route, /key\.endsWith\("\.jpg"\)/);
});

test("accepts iPhone photos and has a safe JPEG fallback", async () => {
  const dialog = await readFile(new URL("app/submission-dialog.tsx", root), "utf8");
  const security = await readFile(new URL("lib/photo-security.ts", root), "utf8");
  assert.match(dialog, /image\/heic/);
  assert.match(dialog, /canvasBlob\(canvas, "image\/jpeg"/);
  assert.match(dialog, /描画が済むまでURLを保持/);
  assert.match(security, /sanitizeJpeg/);
  assert.match(security, /APPnとコメントには撮影位置などが入り得るため除去する/);
});
