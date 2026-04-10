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

For the loan-specific workflow summary and current implementation gaps, see [`docs/loans.md`](/Users/foliwefossung/Vibe_code/docs/loans.md).

Use RPCs or Edge Functions for:

- creating transaction requests
- setting transaction PINs
- approving/rejecting transaction requests
- reversing transactions
- submitting loan applications
- approving/disbursing loans
- ingesting offline sync batches
- submitting cash reconciliation
- reviewing cash reconciliation
- generating report jobs

## Transaction RPCs

- `create_transaction_request(actor_id, member_account_id, transaction_type, amount, note, idempotency_key, submitted_offline, device_id, payload_hash, transaction_pin)`
- `create_admin_transaction(actor_id, member_account_id, cash_agent_profile_id, transaction_type, amount, note)`
- `approve_transaction_request(request_id, actor_id, note)`
- `reject_transaction_request(request_id, actor_id, note)`
- `set_my_transaction_pin(pin)`
- `submit_cash_reconciliation(counted_cash, variance_reason, device_id)`
- `review_cash_reconciliation(reconciliation_id, action, review_note)`

## Staff Device RPCs

- `register_my_device(device_id, device_name, device_kind)`
- `assert_staff_device_access(device_id, device_kind)`
- `reset_staff_device(staff_profile_id, note)`

## Loan RPCs

- `create_loan_application(actor_id, member_profile_id, requested_amount, monthly_interest_rate, term_months, collateral_required, collateral_notes, note)`
- `start_loan_application_review(application_id, actor_id, note)`
- `approve_loan_application(application_id, actor_id, approved_principal, note)`
- `reject_loan_application(application_id, actor_id, note)`
- `disburse_loan(loan_id, actor_id, cash_agent_profile_id, note)`
- `record_loan_repayment(loan_id, actor_id, cash_agent_profile_id, amount, repayment_mode, note)`

Behavior:

- loan application creation is limited to authenticated `branch_manager` or `admin`
- branch managers remain branch-scoped; admins can act across branches
- approval and disbursement stay separate actions
- approval creates the `loans` record and sets the application to `approved`
- disbursement posts ledger entries and adjusts the selected agent cash drawer
- repayments post ledger entries, update remaining principal, and write repayment rows
- collateral-required applications cannot be approved without collateral notes in the current schema shape

Behavior:

- request creation is limited to the authenticated `agent` or `service_role` acting on that agent
- agent withdrawals require a valid transaction PIN and live connectivity
- admin-panel transaction creation is limited to authenticated `branch_manager` or `admin`
- admin-panel transaction creation requires selecting the agent drawer that should receive or release the cash
- admin-panel transactions are auto-approved immediately, post ledger entries in the same write, update the selected agent cash drawer, and write audit logs
- approvals are limited to authenticated `branch_manager` or `admin`
- approvals enforce maker-checker, post immutable ledger journals and entries, update the agent cash drawer, and write audit logs
- rejections preserve the request, skip ledger posting, and still write approval + audit records
- cash reconciliation submission is limited to the authenticated agent for the current drawer and trusted mobile device
- reconciliation review is limited to authenticated `branch_manager` or `admin`

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
