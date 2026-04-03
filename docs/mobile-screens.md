# Mobile Screens

## Agent flows

### Primary navigation

- `Today`
- `Members`
- `Queue`
- `Profile`

### Required screens

- Login
- First password change
- Set transaction PIN
- Today dashboard
- Assigned members list
- Member detail
- Record deposit
- Record withdrawal
- New member draft
- Queue / sync status
- Receipt
- Notifications
- Profile

### UX rules

- guided member-first workflow
- always show sync state and last-sync timestamp
- withdrawals require PIN confirmation and live connectivity
- pending approvals remain visible after sync
- deposit queue survives app restarts
- cash reconciliation submits for branch-manager review instead of staying local-only

## Member flows

For the consolidated loan behavior, current mobile implementation, and timeline/detail gaps, see [`docs/loans.md`](/Users/foliwefossung/Vibe_code/docs/loans.md).

### Primary navigation

- `Home`
- `Accounts`
- `Loans`
- `Profile`

### Required screens

- Login
- First password change
- Enable PIN/biometric
- Home dashboard
- Accounts list
- Account statement
- Transaction detail
- Loans list
- Loan detail / timeline
- Notifications
- Profile

### UX rules

- read-only in v1
- show pending transactions clearly
- loan timeline must expose stage changes
- branch contact information should remain visible in support contexts
