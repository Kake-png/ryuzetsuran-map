import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("resets the shared page scroll position only when the pathname changes", () => {
  const source = fs.readFileSync(new URL("../app/scroll-reset.tsx", import.meta.url), "utf8");
  assert.match(source, /usePathname/);
  assert.match(source, /\.site-page-content/);
  assert.match(source, /scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  assert.match(source, /\}, \[pathname\]\)/);
});
