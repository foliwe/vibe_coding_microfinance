import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

test("fraud alert helper cannot be executed by broad SQL roles", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/0022_fraud_center_v1.sql", import.meta.url),
    "utf8",
  );
  const repairMigration = readFileSync(
    new URL("../supabase/migrations/0023_restrict_fraud_alert_helper.sql", import.meta.url),
    "utf8",
  );
  const helperSignature =
    "public.upsert_fraud_alert(uuid, uuid, uuid, uuid, uuid, text, integer, text, text, jsonb, text)";
  const revokeStatement = `revoke all on function ${helperSignature} from public, anon, authenticated;`;
  const grantStatement = `grant execute on function ${helperSignature} to service_role;`;
  const broadGrantStatement = `grant execute on function ${helperSignature} to authenticated`;

  for (const sql of [migration, repairMigration]) {
    assert.ok(sql.includes(revokeStatement));
    assert.ok(sql.includes(grantStatement));
    assert.ok(!sql.includes(broadGrantStatement));
  }
});

test("fraud dashboard paginates alert rows before calculating summaries", () => {
  const dashboardData = readFileSync(
    new URL("../apps/admin/lib/dashboard-data.ts", import.meta.url),
    "utf8",
  );

  assert.match(dashboardData, /const FRAUD_ALERT_PAGE_SIZE = 1000;/);
  assert.match(dashboardData, /\.range\(from, to\)/);
  assert.match(dashboardData, /rows\.push\(\.\.\.pageRows\)/);
  assert.match(dashboardData, /pageRows\.length < FRAUD_ALERT_PAGE_SIZE/);
  assert.doesNotMatch(dashboardData, /\.limit\(200\)/);
});
