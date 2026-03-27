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
