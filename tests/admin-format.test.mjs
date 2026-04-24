import test from "node:test";
import assert from "node:assert/strict";

import { formatElapsedTime, prettyDate } from "../apps/admin/lib/format.ts";

test("prettyDate formats dates for member profile display", () => {
  assert.equal(prettyDate("2012-07-04T00:00:00.000Z"), "04 July 2012");
});

test("formatElapsedTime reports years and months when available", () => {
  assert.equal(
    formatElapsedTime("2012-07-04T00:00:00.000Z", "2026-04-18T00:00:00.000Z"),
    "13 years, 9 months",
  );
});

test("formatElapsedTime falls back to days for recent memberships", () => {
  assert.equal(
    formatElapsedTime("2026-04-10T00:00:00.000Z", "2026-04-18T00:00:00.000Z"),
    "8 days",
  );
});
