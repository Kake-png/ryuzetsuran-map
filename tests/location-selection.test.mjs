import assert from "node:assert/strict";
import test from "node:test";

import { formatCoordinates, parseCoordinates } from "../lib/coordinates.ts";

test("Google Mapsで使われる座標形式を読み取れる", () => {
  const expected = { latitude: 35.681236, longitude: 139.767125 };
  assert.deepEqual(parseCoordinates("35.681236, 139.767125"), expected);
  assert.deepEqual(parseCoordinates("N35.681236 E139.767125"), expected);
  assert.deepEqual(parseCoordinates("北緯35.681236 東経139.767125"), expected);
  assert.deepEqual(
    parseCoordinates("https://www.google.com/maps/place/test/@35.681236,139.767125,17z"),
    expected,
  );
  assert.deepEqual(
    parseCoordinates("https://www.google.com/maps/search/?api=1&query=35.681236%2C139.767125"),
    expected,
  );
  assert.deepEqual(
    parseCoordinates("https://www.google.com/maps/data=!3d35.681236!4d139.767125"),
    expected,
  );
});

test("度分秒と経緯度の逆順を読み取れる", () => {
  const dms = parseCoordinates(`35°40'52.4\"N 139°46'01.7\"E`);
  assert.ok(dms);
  assert.ok(Math.abs(dms.latitude - 35.681222) < 0.00001);
  assert.ok(Math.abs(dms.longitude - 139.767139) < 0.00001);
  assert.deepEqual(parseCoordinates("139.767125, 35.681236"), {
    latitude: 35.681236,
    longitude: 139.767125,
  });
});

test("日本国外や壊れた値は受け付けない", () => {
  assert.equal(parseCoordinates("not coordinates"), null);
  assert.equal(parseCoordinates("40.7128, -74.0060"), null);
});

test("地図で確定した座標は統一形式で表示する", () => {
  assert.equal(
    formatCoordinates({ latitude: 35.7688674, longitude: 139.3427824 }),
    "35.768867, 139.342782",
  );
});
