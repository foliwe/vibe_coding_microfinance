# Test Plan

## Critical scenarios

- admin dashboard includes all branch totals
- branch dashboard includes branch totals only
- create member assigns both branch and agent
- create member generates unique sign-in code and 7-character temporary password
- agent deposit stays pending until approval
- agent must finish first-login password change and transaction PIN setup before entering the field shell
- online withdrawal requires a valid transaction PIN
- offline withdrawal is blocked instead of queueing
- member sees pending transaction separately from approved balance
- member must change temporary password on first login
- approval posts ledger entries
- rejection leaves balances unchanged
- reversal creates compensating entries
- interest-only repayment preserves principal
- interest-plus-principal reduces principal
- monthly interest uses remaining principal
- offline sync is idempotent
- stale sync is rejected and logged
- reconciliation submission moves to pending review and can be approved or rejected
- reconciliation variance is surfaced
- suspicious activity appears in exception reporting
- audit log captures all sensitive actions

## Test layers

- shared domain unit tests
- Supabase SQL/RPC integration tests
- admin UI smoke tests
- mobile workflow tests
- end-to-end seeded role journeys
