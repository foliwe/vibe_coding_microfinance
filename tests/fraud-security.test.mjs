import test from "node:test";
import assert from "node:assert/strict";

import {
  FRAUD_RULES,
  FRAUD_SEVERITY_SCORES,
  fraudSeverityToScore,
} from "../packages/shared/src/security.ts";

test("fraud rule catalog exposes the full fixed v1 rule set", () => {
  assert.equal(FRAUD_RULES.length, 11);

  const ids = new Set(FRAUD_RULES.map((rule) => rule.id));

  assert.equal(ids.size, FRAUD_RULES.length);
  assert.ok(ids.has("login_anomaly"));
  assert.ok(ids.has("offline_transaction_burst"));
  assert.ok(ids.has("unusual_deposit_size"));
  assert.ok(ids.has("multi_device_access"));
  assert.ok(ids.has("fast_approval"));
  assert.ok(ids.has("agent_behavioral_pattern"));
  assert.ok(ids.has("duplicate_cash_entry"));
  assert.ok(ids.has("failed_pin_attempts"));
  assert.ok(ids.has("out_of_branch_handling"));
  assert.ok(ids.has("dormant_account_reactivation_spike"));
  assert.ok(ids.has("reconciliation_variance"));
});

test("fraud severity mapping stays aligned with persisted score thresholds", () => {
  assert.deepEqual(FRAUD_SEVERITY_SCORES, {
    low: 30,
    medium: 60,
    high: 85,
  });

  assert.equal(fraudSeverityToScore("low"), 30);
  assert.equal(fraudSeverityToScore("medium"), 60);
  assert.equal(fraudSeverityToScore("high"), 85);
});
