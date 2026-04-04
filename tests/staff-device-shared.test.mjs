import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWorkstationDeviceName,
  toStaffDeviceAssertion,
} from "../apps/admin/lib/staff-device-shared.ts";

test("buildWorkstationDeviceName combines platform and browser labels", () => {
  assert.equal(
    buildWorkstationDeviceName({
      platform: "MacIntel",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    }),
    "MacIntel • Chrome",
  );
});

test("toStaffDeviceAssertion normalizes RPC rows into the app trust state", () => {
  assert.deepEqual(
    toStaffDeviceAssertion([
      {
        access: "blocked",
        active_device_id: "workstation-1",
        active_device_kind: "workstation",
        active_device_name: "Front Desk • Chrome",
      },
    ]),
    {
      access: "blocked",
      activeDeviceId: "workstation-1",
      activeDeviceKind: "workstation",
      activeDeviceName: "Front Desk • Chrome",
    },
  );
});
