import test from "node:test";
import assert from "node:assert/strict";

import {
  getWithdrawalConnectivityMessage,
  shouldQueueOfflineTransaction,
} from "../apps/mobile/src/lib/transaction-submission.ts";

test("offline transaction queueing remains enabled for deposits only", () => {
  assert.equal(shouldQueueOfflineTransaction("deposit", true), true);
  assert.equal(shouldQueueOfflineTransaction("deposit", false), false);
  assert.equal(shouldQueueOfflineTransaction("withdrawal", true), false);
});

test("withdrawal connectivity message explains why offline queueing is blocked", () => {
  assert.equal(
    getWithdrawalConnectivityMessage(),
    "Withdrawals require connectivity so your transaction PIN can be verified.",
  );
});
