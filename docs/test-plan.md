# Test Plan

## Critical scenarios

- admin dashboard includes all branch totals
- branch dashboard includes branch totals only
- create member assigns both branch and agent
- agent deposit stays pending until approval
- member sees pending transaction separately from approved balance
- approval posts ledger entries
- rejection leaves balances unchanged
- reversal creates compensating entries
- interest-only repayment preserves principal
- interest-plus-principal reduces principal
- monthly interest uses remaining principal
- offline sync is idempotent
- stale sync is rejected and logged
- reconciliation variance is surfaced
- suspicious activity appears in exception reporting
- audit log captures all sensitive actions

## Test layers

- shared domain unit tests
- Supabase SQL/RPC integration tests
- admin UI smoke tests
- mobile workflow tests
- end-to-end seeded role journeys
