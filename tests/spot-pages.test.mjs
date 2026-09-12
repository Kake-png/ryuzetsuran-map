import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("publishes stable URLs only for approved locations", async () => {
  const loader = await readFile(new URL("../lib/public-agave.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/spots/[id]/page.tsx", import.meta.url), "utf8");
  const map = await readFile(new URL("../app/map-app.tsx", import.meta.url), "utf8");

  assert.match(loader, /public_id = \? AND visibility = 'approved'/);
  assert.match(page, /pin\.locationType === "private_authorized"/);
  assert.match(page, /index: false, follow: false, noarchive: true/);
  assert.match(page, /<ShareButton title=\{pin\.title\}/);
  assert.match(page, /const locationTitle = pin\.title\.startsWith\(pin\.municipality\)/);
  assert.match(map, /href=\{`\/spots\/\$\{encodeURIComponent\(selected\.id\)\}`\}/);
  assert.match(map, /new URLSearchParams\(window\.location\.search\)\.get\("spot"\)/);
});

test("keeps the support link small and does not expose the admin route", async () => {
  const footer = await readFile(new URL("../app/site-footer.tsx", import.meta.url), "utf8");
  const support = await readFile(new URL("../app/support/page.tsx", import.meta.url), "utf8");

  assert.match(footer, /href="\/support"/);
  assert.doesNotMatch(footer, /\/admin/);
  assert.match(support, /https:\/\/ofuse\.me\/da117b13/);
  assert.match(support, /支援の有無によって/);
});

test("uses one shared header and footer and keeps full history on spot pages", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const header = await readFile(new URL("../app/site-header.tsx", import.meta.url), "utf8");
  const map = await readFile(new URL("../app/map-app.tsx", import.meta.url), "utf8");
  const spot = await readFile(new URL("../app/spots/[id]/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(layout, /<SiteHeader \/>/);
  assert.match(layout, /<SiteFooter \/>/);
  assert.match(header, /投稿する/);
  assert.match(header, /地図に戻る/);
  assert.match(map, /selected\.observations\.find\(\(observation\) => observation\.photoUrl\)/);
  assert.doesNotMatch(map, /className="observation-list"/);
  assert.match(spot, /history\.map\(\(observation\)/);
  assert.match(css, /\.spot-page-link[\s\S]*?white-space: nowrap/);
});
