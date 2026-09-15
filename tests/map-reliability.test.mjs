import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("地図の初期タイムアウトとズーム中のタイル遅延を区別する", async () => {
  const map = await readFile(new URL("../app/map-app.tsx", import.meta.url), "utf8");

  assert.match(map, /Only use this guard for the initial style load/);
  assert.match(map, /\}, 30_000\);/);
  assert.match(map, /地図を再読み込み/);
  assert.match(map, /const \[mapAttempt, setMapAttempt\]/);
});
