import assert from "node:assert/strict";
import test from "node:test";

import { cleanLocationName, formatAgaveTitle } from "../lib/location-title.ts";

test("目印が空欄なら市区町村名を地点名に使う", () => {
  assert.equal(
    formatAgaveTitle("", "東京都瑞穂町"),
    "東京都瑞穂町のアオノリュウゼツラン",
  );
});

test("目印から短く読みやすい地点名を作る", () => {
  assert.equal(
    formatAgaveTitle("みずほエコパーク北側", "東京都瑞穂町"),
    "みずほエコパーク北側のアオノリュウゼツラン",
  );
  assert.equal(
    formatAgaveTitle("○○駅近くの", "東京都瑞穂町"),
    "○○駅近くのアオノリュウゼツラン",
  );
});

test("改行や余分な空白を表示名に残さない", () => {
  assert.equal(cleanLocationName("  △△川\n  沿い  "), "△△川 沿い");
});
