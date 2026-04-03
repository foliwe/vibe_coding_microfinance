# Product Spec

## Product summary

The platform serves four user roles:

- `admin`
- `branch_manager`
- `agent`
- `member`

The institution is cash-only in v1. No electronic sending, wallet transfer, or card flow is supported.

## Hierarchy

- `admin` controls the whole institution
- `branch_manager` controls one branch
- `agent` belongs to one branch
- `member` belongs to one branch and one active agent

## Accounts

- members can hold a `savings` account
- members can hold a `deposit` account
- ledger-backed cash control accounts exist for branch vaults and agent cash drawers

## Transactions

- deposits and withdrawals initiated by agents are always `pending_approval`
- only `branch_manager` or `admin` may approve or reject those transactions
- makers cannot approve their own transaction
- approved transactions post immutable ledger entries
- rejected transactions remain in history and do not affect balances
- reversals are compensating entries only

## Loans

- See [`docs/loans.md`](/Users/foliwefossung/Vibe_code/docs/loans.md) for the consolidated loan specification, current implementation status, and known gaps.
- loans are created at the branch office
- members see loan status and repayment history in mobile
- interest is calculated monthly on remaining principal
- repayment supports `interest_only` and `interest_plus_principal`
- some loans require collateral and supporting documents

## Offline policy

- agents may capture deposits and pending-member drafts offline
- withdrawals require both connectivity and a valid transaction PIN
- offline approval, reversal, and loan disbursement are not allowed
- every offline write must carry an idempotency key and device context
- stale sync submissions must be rejected safely and logged

## Security rules

- first-login password change for member, agent, and branch_manager
- agents must also set a 4-digit transaction PIN before entering the field workspace
- members sign in with generated sign-in codes, not ID card numbers
- password + device binding + transaction PIN for staff
- member app re-entry guarded with local PIN or biometric
- audit log for all sensitive actions
- suspicious activity detection for duplicate, late, out-of-pattern, or high-risk transactions

## Reporting

Admin sees institution-wide totals:

- total savings
- total deposits
- total loans
- total outstanding principal
- interest collected
- overdue/defaulted loans
- pending approvals
- reconciliation variances

Branch managers see only their branch totals and operational summaries.

Cash reconciliation now follows a submit-and-review workflow:

- agents submit counted cash from mobile
- `branch_manager` or `admin` approve or reject the submitted reconciliation
- rejected reconciliations reopen the drawer so the agent can resubmit
