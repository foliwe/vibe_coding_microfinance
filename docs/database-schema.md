# Database Schema

## Core tables

- `branches`
- `profiles`
- `staff_users`
- `member_profiles`
- `agent_member_assignments`
- `member_accounts`
- `ledger_accounts`
- `ledger_journals`
- `ledger_entries`
- `transaction_requests`
- `approval_actions`
- `cash_drawers`
- `cash_reconciliations`
- `loan_applications`
- `loans`
- `loan_collateral`
- `loan_repayments`
- `device_registrations`
- `audit_logs`
- `report_jobs`

## Key constraints

- one active branch per staff user
- one active branch and one active assigned agent per member
- a user cannot approve a financial request they created
- approved ledger rows are immutable
- branch aggregates must only include accounts and loans tied to that branch

## Aggregate strategy

- ledger is the source of truth
- dashboard totals are computed from ledger-backed accounts and loan balances
- branch dashboards aggregate on branch ownership
- admin dashboard aggregates across all branches

## Security model

- map `auth.users.id` to `profiles.id`
- use helper SQL functions to expose the current role and branch
- allow scoped reads with RLS
- route sensitive writes through RPCs and Edge Functions
