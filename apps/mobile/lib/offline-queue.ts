export interface QueueItem<TPayload = unknown> {
  id: string;
  kind: "transaction_request" | "member_draft";
  status: "unsynced" | "pending_approval" | "approved" | "rejected" | "sync_conflict";
  createdAt: string;
  payload: TPayload;
}

export function enqueue<TPayload>(
  queue: QueueItem<TPayload>[],
  item: QueueItem<TPayload>,
): QueueItem<TPayload>[] {
  return [item, ...queue];
}

export function markQueueItem<TPayload>(
  queue: QueueItem<TPayload>[],
  id: string,
  status: QueueItem<TPayload>["status"],
): QueueItem<TPayload>[] {
  return queue.map((item) => (item.id === id ? { ...item, status } : item));
}

export function queueSummary(queue: QueueItem[]): {
  unsynced: number;
  pendingApproval: number;
  conflicts: number;
} {
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
