import test from "node:test";
import assert from "node:assert/strict";

import {
  isMissingStaffDeviceRpc,
  STAFF_DEVICE_RPC_MISSING_MESSAGE,
  toStaffDeviceRpcError,
} from "../packages/shared/src/staff-device-rpc.ts";

test("isMissingStaffDeviceRpc detects PostgREST schema cache misses for staff-device routines", () => {
  assert.equal(
    isMissingStaffDeviceRpc({
      code: "PGRST202",
      message:
        "Could not find the function public.assert_staff_device_access(p_device_id, p_device_kind) in the schema cache",
    }),
    true,
  );
});

test("toStaffDeviceRpcError rewrites missing staff-device RPC errors into a friendly message", () => {
  const error = toStaffDeviceRpcError(
    {
      code: "PGRST202",
      message:
        "Searched for the function public.register_my_device with parameters p_device_id, p_device_kind, p_device_name, but no matches were found in the schema cache.",
    },
    "fallback",
  );

  assert.equal(error.message, STAFF_DEVICE_RPC_MISSING_MESSAGE);
});

test("toStaffDeviceRpcError preserves unrelated Supabase errors", () => {
  const error = toStaffDeviceRpcError(
    {
      message: "Invalid login credentials",
    },
    "fallback",
  );

  assert.equal(error.message, "Invalid login credentials");
});
