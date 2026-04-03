# Microfinance Credit Union App Plan

## Summary
Build this as a greenfield monorepo with three applications and one shared domain layer:

- `mobile`: Expo/React Native app for `member` and `agent`
- `admin`: Next.js + shadcn/ui web app for `branch_manager` and `admin`
- `backend`: Supabase Postgres, Auth, Storage, Realtime, and Edge Functions
- `shared`: shared TypeScript types, validation schemas, permission rules, and finance helpers

The first release should be a production-ready v1 for a single institution operating in one currency, with strong auditability, cash controls, offline-capable agent workflows, and a strict approval model for all agent-originated financial transactions.

## Current Status
### Implemented as of April 2, 2026
- Monorepo structure is in place with `apps/mobile`, `apps/admin`, `packages/shared`, and `supabase`.
- Live Supabase-backed auth is working for `admin`, `branch_manager`, `agent`, and `member`.
- Branch, manager, agent, and member creation flows are working.
- Member onboarding now follows the current product rule:
  - create members with minimum identity only
  - keep members under an agent
  - keep agents under a manager and branch
  - let members complete the rest of their profile later from mobile
- Agent mobile workflows are live for:
  - assigned member list
  - member creation
  - deposit request submission
  - withdrawal request submission
  - sync queue visibility
- Branch-manager and admin web workflows are live for:
  - transaction approval and rejection
  - direct member creation
  - direct agent creation
  - loan workflow actions already implemented in the current schema and admin app
- Member mobile workflows are live for:
  - dashboard and balances
  - transaction history
  - loan visibility
  - self-service profile completion

### Current Build Priorities
- Finish real password-change enforcement and PIN setup for agent and member first login.
- Implement device binding and branch-manager reset flow for staff devices.
- Replace cash reconciliation preview with a real submit-and-review workflow.
- Complete any remaining loan repayment UX gaps in mobile and admin where the backend already exists.
- Tighten QA coverage around:
  - direct member creation from mobile
  - member self-service profile completion
  - maker-checker transaction flow
  - branch and agent scope enforcement

## Key Changes
### Product and access model
- Roles are fixed to `member`, `agent`, `branch_manager`, and `admin`.
- `admin` can create branches and branch managers, and can see all branches.
- `branch_manager` can see only their branch, create/manage agents and members in that branch, approve transactions, approve loans, reconcile branch cash, and run branch reports.
- `agent` uses the mobile app to register member intake, collect cash deposits/savings, initiate cash withdrawals, and view only their assigned member list.
- `member` uses the mobile app only to view profile, accounts, balances, transactions, loan applications/statuses, and repayment history.

### Recommended repo and backend shape
- Use a monorepo with `apps/mobile`, `apps/admin`, `packages/shared`, and `supabase/`.
- Keep business rules server-side in Supabase SQL functions and Edge Functions; clients should never directly compute balances or finalize approvals.
- Use Row Level Security for read scoping, but route all sensitive writes through controlled RPC/functions for validation, idempotency, and audit logging.
- Use an immutable double-entry ledger as the source of truth for balances; account summaries are derived/cached projections, never the primary source.

### Core domain model
Important public/domain interfaces and types to lock in:

- `UserRole`: `member | agent | branch_manager | admin`
- `AccountType`: `savings | deposit | loan_principal | loan_interest | agent_cash_drawer | branch_cash_vault`
- `TransactionRequestStatus`: `draft | pending_approval | approved | rejected | reversed | sync_conflict`
- `LoanStatus`: `application_submitted | under_review | approved | rejected | disbursed | active | closed | defaulted`
- `LoanRepaymentAllocation`: `interest_only | interest_plus_principal`
- `MemberAssignment`: member belongs to one active agent and one branch at a time
- `OfflineSyncEnvelope`: client-generated UUID, device ID, created-at, payload hash, actor ID, operation type, retry count

Core tables/entities:

- `branches`
- `profiles` and `auth_identities`
- `staff_users` and `member_profiles`
- `agent_assignments`
- `member_accounts`
- `ledger_accounts`, `ledger_journals`, `ledger_entries`
- `cash_drawers` and `cash_reconciliations`
- `transaction_requests`
- `loan_applications`, `loans`, `loan_collateral`, `loan_schedules`, `loan_repayments`
- `approval_actions`
- `device_registrations`
- `audit_logs`
- `report_jobs`

### Business workflows
#### Member onboarding
- No public signup.
- `admin` creates branch managers.
- `admin` and `branch_manager` create agents.
- `branch_manager` and `admin` can create members directly from the web.
- `agent`, `branch_manager`, and `admin` can create members directly, and new members stay assigned under the creating/selected agent within the branch hierarchy.
- Required first login password change applies to agent, branch manager, and member accounts.
- Collect only the minimum identity set at member creation for v1:
  - Full legal name
  - Phone number
  - ID card number
  - Branch
  - Assigned agent
- The remaining member profile fields are completed later by the member from the mobile profile page:
  - Date of birth
  - Gender
  - Residential address
  - Occupation / business type
  - Next of kin / emergency contact
  - Other non-blocking profile details

#### Savings and deposit operations
- Each member can have one or more cash-backed savings/deposit accounts as configured by the institution.
- Agent creates a deposit or withdrawal request from mobile.
- Every agent-originated financial transaction lands in `pending_approval`.
- Approval is maker-checker only: the same user cannot both create and approve a transaction.
- Approval by branch manager or admin posts the final journal entries and updates balances.
- Rejections preserve the request and audit trail; they do not delete records.
- Reversals are separate compensating entries, never edits to approved ledger rows.

#### Cash control
- Each agent has a tracked daily cash drawer.
- Opening float, collections, withdrawals paid out, and closing cash are reconciled daily against approved transactions.
- Branch managers approve end-of-day reconciliation and investigate variances.
- Branch has its own vault/cash account for supervision and transfer recording.
- Agent cannot exceed configurable limits:
  - max cash carried
  - max single withdrawal
  - max daily transaction count
  - max pending amount before sync/approval

#### Loan management
- Primary consolidated reference: [`docs/loans.md`](/Users/foliwefossung/Vibe_code/docs/loans.md).
- Use single manual loan type in v1.
- Interest method is fixed to monthly interest on remaining principal.
- Loan application is created at branch office by branch manager or admin; member can view status in mobile.
- Loan record stores:
  - requested amount
  - approved principal
  - monthly rate
  - start date
  - term in months
  - repayment frequency
  - collateral required flag
  - collateral details/documents
  - guarantor details if used
  - approval notes
  - disbursement date
- Repayment modes:
  - interest only
  - interest plus principal
- Monthly interest is recalculated from current unpaid principal after each approved repayment.
- Loan disbursement and repayment also use ledger postings and full audit logs.
- Loan approval and disbursement must be separated actions.

### Offline and sync design
- Agents get core offline queue support.
- Mobile stores locally:
  - assigned members
  - account summaries
  - unsynced transaction requests
  - pending member-registration drafts
  - device/session metadata
- All offline writes use client-generated idempotency keys.
- Sync behavior:
  - queue locally when offline
  - submit in timestamp order when online
  - server validates actor, branch, assignment, limits, and duplicates
  - server returns accepted, rejected, or conflict state per item
- Do not allow offline approval, reversal, or loan disbursement.
- If a member was reassigned or suspended while the device was offline, sync should reject the stale transaction and require supervisor review.

### Admin panel and mobile UX scope
#### Admin panel
- Clean sidebar with sections:
  - Dashboard
  - Branches
  - Users
  - Members
  - Agents
  - Accounts
  - Transactions
  - Loans
  - Approvals
  - Reconciliation
  - Reports
  - Settings
  - Audit Log
- `admin` sees global metrics and all branches.
- `branch_manager` sees only branch-scoped data and actions.

#### Mobile app
- Agent dashboard:
  - today’s collection summary
  - pending sync count
  - pending approval count
  - assigned members
  - quick actions: register member, deposit, withdrawal, receipts, sync status
- Member dashboard:
  - savings/deposit balances
  - recent transactions
  - loan status timeline
  - repayment history
  - profile view and self-service profile completion

### Reports
Support report filters by date range, branch, agent, member, status, and transaction type.

Initial report set:
- Daily collections by agent
- Daily approvals and rejections
- Branch cash reconciliation and variances
- Member account statements
- Loan portfolio summary
- Loan arrears/default report
- Interest collected report
- New members by branch/agent
- Suspicious activity / exception report
- Audit trail export

Export formats:
- CSV
- XLSX
- print/PDF-friendly view

### Security and fraud-resistance recommendations
These should be first-class requirements, not “nice to have”:

- Immutable ledger with compensating reversals only
- Full maker-checker approvals for all agent money movements
- Mandatory password change on first login
- Separate 4-6 digit transaction PIN for agents and managers
- Device binding for staff accounts with branch-manager reset flow
- Short session lifetimes and remote logout/device revocation
- Per-transaction signed receipt/reference number
- Photo or signature capture option for large cash withdrawals
- Geo-location and device timestamp capture for field transactions where allowed
- Daily cash drawer reconciliation with mandatory variance reason codes
- Limit engine for branch, agent, transaction size, and pending volume
- Suspicious activity rules:
  - duplicate amount repeated rapidly
  - too many withdrawals for one member in a day
  - offline batch submitted unusually late
  - agent acting outside assigned branch/member scope
  - manual loan rate outliers
- Audit log on every sensitive action:
  - login
  - password change
  - PIN change
  - create/update member
  - submit/approve/reject/reverse transaction
  - loan decision
  - reconciliation approval
- Soft-delete business records only where unavoidable; never hard-delete financial history
- Scheduled backups and tested restore procedure
- Database constraints for assignment integrity, balance integrity, and branch scoping
- RLS plus server-side authorization checks; never rely on client role checks alone

## Test Plan
- Auth and permissions:
  - each role can access only its allowed app and data scope
  - first-login password reset is enforced
  - device binding and PIN checks block unauthorized use
- Transactions:
  - agent deposits/withdrawals always start as pending
  - maker cannot approve own transaction
  - approval posts correct ledger entries
  - rejection leaves no balance mutation
  - reversal creates balancing entries only
- Offline:
  - offline deposit syncs once when network returns
  - duplicate sync payload is idempotent
  - stale member assignment causes sync rejection
  - unsynced queue survives app restart
- Loans:
  - interest-only repayment reduces no principal
  - interest-plus-principal repayment reduces principal correctly
  - next month interest uses remaining principal
  - collateral-required loans cannot be approved without collateral data
- Reconciliation:
  - drawer totals match approved transactions
  - variance requires reason and appears in reports
- Reports:
  - branch manager sees only branch data
  - admin sees global data
  - exports respect filters and totals

## Assumptions
- Greenfield project with no existing repo structure.
- One institution per deployment, one operating currency per deployment.
- No electronic payments, transfers, or wallet integrations in v1.
- Members do not self-register.
- Agents can capture member registration drafts, but activation requires branch-manager/admin approval.
- Loans are single manual products in v1 with monthly interest on remaining principal.
- Branch managers and admins use web only; agents and members use mobile only.
- Supabase is the only backend platform for v1, with Postgres as system of record and Edge Functions/RPC for sensitive write paths.
