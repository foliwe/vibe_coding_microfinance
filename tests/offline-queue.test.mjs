import test from "node:test";
import assert from "node:assert/strict";

function queueSummary(queue) {
  return queue.reduce(
    (summary, item) => {
      if (item.status === "unsynced") summary.unsynced += 1;
      if (item.status === "pending_approval") summary.pendingApproval += 1;
      if (item.status === "sync_conflict") summary.conflicts += 1;
      return summary;
    },
    { unsynced: 0, pendingApproval: 0, conflicts: 0 },
  );
}

test("queue summary counts offline and pending items", () => {
  const summary = queueSummary([
    { status: "unsynced" },
    { status: "pending_approval" },
    { status: "pending_approval" },
    { status: "sync_conflict" },
  ]);

  assert.deepEqual(summary, {
    unsynced: 1,
    pendingApproval: 2,
    conflicts: 1,
  });
});
