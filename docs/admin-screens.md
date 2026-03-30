# Admin Screens

## Shared layout

Sidebar sections:

- Dashboard
- Branches
- Users
- Members
- Agents
- Accounts
- Transactions
- Approvals
- Loans
- Reconciliation
- Reports
- Audit Log
- Settings

## Admin pages

- institution dashboard
- branches list
- branch detail
- create branch
- create branch manager
- users list
- members list
- create member
- member detail
- transactions list
- transaction review
- create deposit
- create withdrawal
- loans list
- loan review
- reconciliation
- reports
- audit log
- settings

## Branch manager pages

Use the same shell but branch-scoped data and actions:

- branch dashboard
- create agent
- create member
- create deposit
- create withdrawal
- approvals
- loans
- reconciliation
- reports
- audit log

## Dashboard expectations

Admin dashboard:

- consolidated totals for all branches
- charting by branch and over time
- pending approvals and exception widgets

Transaction navigation:

- `Transactions` remains the approval queue
- `Deposit` and `Withdrawal` appear as child links under `Transactions`
- the Transactions page also exposes `New Deposit` and `New Withdrawal` shortcuts

Branch dashboard:

- branch-only totals
- agent performance summary
- branch cash/reconciliation summary
- branch trend charts
