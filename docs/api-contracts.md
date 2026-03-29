# API Contracts

## Shared payloads

- `BranchDashboardSummary`
- `AdminDashboardSummary`
- `MemberAccountSummary`
- `LoanDetailSummary`
- `OfflineSyncEnvelope`
- `ApprovalActionPayload`
- `ReportRequest`
- `ReportResult`

## Sensitive write paths

Use RPCs or Edge Functions for:

- creating transaction requests
- approving/rejecting transaction requests
- reversing transactions
- submitting loan applications
- approving/disbursing loans
- ingesting offline sync batches
- closing cash reconciliation
- generating report jobs

## Transaction RPCs

- `create_transaction_request(actor_id, member_account_id, transaction_type, amount, note, idempotency_key, submitted_offline, device_id, payload_hash)`
- `approve_transaction_request(request_id, actor_id, note)`
- `reject_transaction_request(request_id, actor_id, note)`

Behavior:

- request creation is limited to the authenticated `agent` or `service_role` acting on that agent
- approvals are limited to authenticated `branch_manager` or `admin`
- approvals enforce maker-checker, post immutable ledger journals and entries, update the agent cash drawer, and write audit logs
- rejections preserve the request, skip ledger posting, and still write approval + audit records

## Offline sync

Every sync item must include:

- `idempotencyKey`
- `deviceId`
- `actorId`
- `operationType`
- `createdAt`
- `payloadHash`
- request payload

Server responses must classify each item as:

- accepted
- rejected
- duplicate
- conflict
