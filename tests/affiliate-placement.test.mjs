import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const guide = readFileSync(new URL("../app/guide/page.tsx", import.meta.url), "utf8");
const grow = readFileSync(new URL("../app/grow/page.tsx", import.meta.url), "utf8");
const worker = readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");

test("keeps affiliate products out of the botanical catalog", () => {
  assert.doesNotMatch(guide, /hb\.afl\.rakuten\.co\.jp/);
  assert.match(guide, /植物と育成用品を見る/);
});

test("lists plants and a watering tool in the separate affiliate section", () => {
  assert.match(grow, /ハオルチア/);
  assert.match(grow, /アガベ・トウメヤナ・ベラ/);
  assert.match(grow, /細口じょうろ/);
  assert.equal(grow.match(/link_type=pict/g)?.length, 3);
  assert.match(grow, /楽天アフィリエイト/);
});

test("allows only the required Rakuten image hosts", () => {
  assert.match(worker, /https:\/\/hbb\.afl\.rakuten\.co\.jp/);
  assert.match(worker, /https:\/\/thumbnail\.image\.rakuten\.co\.jp/);
  assert.match(worker, /https:\/\/image\.rakuten\.co\.jp/);
});
