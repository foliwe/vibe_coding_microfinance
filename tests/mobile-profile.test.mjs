import test from "node:test";
import assert from "node:assert/strict";

import { toMobileProfile } from "../apps/mobile/src/lib/mobile-profile.ts";

test("toMobileProfile maps password and pin setup flags from the profile RPC row", () => {
  const profile = toMobileProfile({
    id: "profile-1",
    role: "agent",
    full_name: "Field Agent",
    email: "agent@example.com",
    branch_id: "branch-1",
    must_change_password: true,
    requires_pin_setup: true,
    is_active: true,
  });

  assert.deepEqual(profile, {
    id: "profile-1",
    role: "agent",
    fullName: "Field Agent",
    email: "agent@example.com",
    branchId: "branch-1",
    mustChangePassword: true,
    requiresPinSetup: true,
    isActive: true,
  });
});
