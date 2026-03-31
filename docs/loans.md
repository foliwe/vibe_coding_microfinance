# Loans

This document is the primary source of truth for loan functionality in this repo. It consolidates the v1 product rules, schema intent, current implementation shape, and known gaps that were previously spread across the plan, product, schema, API, and UI docs.

## Overview

The v1 loan model is intentionally narrow:

- one manual loan product only
- branch-office initiated loan workflow
- member mobile access is read-only
- monthly interest is calculated on remaining principal
- repayments support `interest_only` and `interest_plus_principal`

Primary actors:

- `admin`: institution-wide visibility and branch creation; may participate in loan approval/disbursement flows
- `branch_manager`: branch-scoped loan creation, review, approval, and disbursement preparation
- `member`: read-only visibility into status, balances, and repayment history in mobile
- `agent`: no primary loan write workflow is defined in v1

Out of scope in v1:

- self-service loan applications from member mobile
- offline loan approval or disbursement
- multiple loan products with different interest methods
- electronic repayment rails

## Lifecycle

The shared `LoanStatus` contract is:

- `application_submitted`
- `under_review`
- `approved`
- `rejected`
- `disbursed`
- `active`
- `closed`
- `defaulted`

Intended lifecycle:

`application_submitted -> under_review -> approved/rejected -> disbursed -> active -> closed/defaulted`

Status meaning in v1:

- `application_submitted`: application captured but not yet reviewed
- `under_review`: branch/admin is evaluating the request and supporting data
- `approved`: decision made, but funds not yet disbursed
- `rejected`: decision made not to issue the loan
- `disbursed`: funds released and loan exists as an issued facility
- `active`: repayments are underway and principal remains outstanding
- `closed`: obligation fully repaid
- `defaulted`: loan is overdue or otherwise treated as delinquent/defaulted

Current-repo note:

- the status set is shared and present in the schema today
- the full transition workflow is not yet enforced end-to-end in a dedicated write path
- test fixtures currently shortcut parts of the lifecycle by inserting an already approved application and an already active loan

## Product Rules

- Loans are created at the branch office by `branch_manager` or `admin`; members only view the result in mobile.
- Approval and disbursement are separate actions even when performed by the same back-office role.
- Interest uses a fixed monthly-rate calculation on current remaining principal.
- After each approved repayment, subsequent monthly interest should be based on the reduced remaining principal.
- Supported repayment modes are:
  - `interest_only`
  - `interest_plus_principal`
- Some loans require collateral and supporting documents.
- Loan disbursement and repayment are expected to create ledger-backed financial records and audit entries.
- Offline approval, reversal, and loan disbursement are not allowed.

Planned business fields called out elsewhere in the repo include:

- requested amount
- approved principal
- monthly rate
- start date
- term in months
- repayment frequency
- collateral requirement and collateral documents
- guarantor details when needed
- approval notes
- disbursement date

Current-repo note:

- the schema only stores part of the planned field set today
- `term_months`, collateral flags/notes, approved principal, remaining principal, rate, and disbursement date exist
- guarantor details, repayment frequency, explicit approval notes, and loan schedules are documented in planning material but are not yet modeled in the current schema

## Data Model And Shared Interfaces

### Shared interfaces

The current public loan-facing shared types are defined in `packages/shared/src/domain.ts`:

- `LoanStatus`
- `RepaymentMode`
- `LoanDetailSummary`

`LoanDetailSummary` currently exposes:

- `id`
- `memberId`
- `memberName`
- `branchId`
- `approvedPrincipal`
- `remainingPrincipal`
- `monthlyInterestRate`
- `status`
- `nextInterestDue`
- `collateralRequired`

The shared finance helpers in `packages/shared/src/finance.ts` currently define:

- `calculateMonthlyInterest(principal, monthlyRate)`
- `previewRepayment(loan, paymentAmount, mode)`

Current-repo note:

- repayment previews are available in shared code, but a dedicated repayment workflow consuming them is not yet wired end-to-end in the admin or mobile apps

### Database tables

The loan-related tables present in the current schema are:

- `loan_applications`: application-level request data, requested amount, rate, term, collateral requirement, creator/reviewer, and application status
- `loans`: approved/disbursed loan record with branch/member linkage, approved and remaining principal, rate, disbursement timestamp, and loan status
- `loan_collateral`: collateral description, optional document path, and verifier reference linked to a loan
- `loan_repayments`: repayment amount, repayment mode, interest/principal components, creator/approver, and timestamp

Related schema details:

- `public.loan_status` enum matches the shared `LoanStatus`
- `public.repayment_mode` enum matches the shared `RepaymentMode`
- `public.transaction_type` includes `loan_disbursement` and `loan_repayment`

Current-repo note:

- the root plan mentions `loan_schedules`, but no `loan_schedules` table exists in the current migrations
- the schema supports collateral as a separate table, while collateral-required flags also exist on applications

## Write-Path Architecture

The intended sensitive write boundary is documented in `docs/api-contracts.md`:

- submitting loan applications should use RPCs or Edge Functions
- approving/disbursing loans should use RPCs or Edge Functions

Current loan RPCs:

- `create_loan_application`
- `start_loan_application_review`
- `approve_loan_application`
- `reject_loan_application`
- `disburse_loan`
- `record_loan_repayment`

The design intent behind that boundary is:

- keep approval rules and validation server-side
- preserve maker-checker and audit behavior
- avoid clients directly finalizing loan status changes or ledger effects

Loan-specific write expectations:

- application submission should validate actor role and branch/member scope
- approval should validate the current status and required supporting data
- disbursement should be a separate action from approval
- disbursement and repayments should produce ledger-backed financial records
- every sensitive loan action should create audit history

Current-repo note:

- the repo now has named loan RPCs for application creation, review, approval, disbursement, and repayment
- the admin loans page is wired to those RPCs for a branch-office workflow
- member mobile remains read-only and still does not surface standalone pre-approval applications

## Read Scoping And Security

Loan read scoping is already represented in RLS policies:

- `admin` can read all loans, loan applications, collateral, and repayments
- `branch_manager` can read records for their branch
- `member` can read their own loans, applications, collateral, and repayments

This is implemented in the RLS hardening migration for:

- `loans`
- `loan_applications`
- `loan_collateral`
- `loan_repayments`

Additional security/fraud expectations that affect loans:

- out-of-pattern loan rate or amount should be considered suspicious
- collateral and identity/supporting documents should have an upload trail
- loan decisions should appear in the audit log

## UI Surfaces

### Admin

Documented admin loan surfaces:

- loans list
- loan review

Current implementation:

- `/loans` exists in the admin app
- the current page is a read-oriented loan snapshot table
- it shows loan id, member name, approved principal, remaining principal, monthly rate, next interest due, and status
- `branch_manager` data is branch-scoped, while `admin` can see institution-wide data

Current-repo gap:

- there is no dedicated loan review/disbursement workflow UI yet
- the current page is informational rather than a full lifecycle management tool

### Member mobile

Documented mobile loan surfaces:

- loans list
- loan detail / timeline

Current implementation:

- the member app has a `Loans` tab
- `mobileData.getLoans()` reads from `loans`, `loan_applications`, and `loan_repayments`
- the mobile UI renders loan cards showing approved amount, remaining principal, next due label, repayment mode label, and a stage timeline
- the timeline is synthesized from application creation, loan creation/disbursement, and latest repayment data

Current-repo gap:

- there is not yet a dedicated member loan detail route; timeline information is rendered inline within the list cards
- the status pill currently compresses the display state to either `APPROVED` or `PENDING APPROVAL`, which is simpler than the full shared status model

## Current Implementation Status

Implemented today:

- shared loan status and repayment mode contracts
- shared interest calculation and repayment preview helpers
- loan-related schema tables and enums
- loan workflow RPCs for application creation, review, approval, disbursement, and repayment
- loan principal and interest ledger-account support
- RLS read scoping for loan records
- admin loans workflow page backed by live Supabase reads and RPC mutations when env is configured
- member mobile loans tab backed by live Supabase reads when env is configured
- admin e2e coverage for create -> review -> approve -> disburse -> repay

Partially implemented or represented mostly by scaffolding:

- dedicated member loan detail screen
- member visibility for standalone `application_submitted` and `under_review` records before a loan exists

## Tests And Coverage

Repo-level loan scenarios already called out in `docs/test-plan.md` include:

- `interest_only` repayment preserves principal
- `interest_plus_principal` repayment reduces principal
- monthly interest uses remaining principal

Current test-related implementation notes:

- the admin e2e spec exercises create -> review -> approve -> disburse -> repay through the `/loans` page
- older fixture helpers may still seed loan rows directly for targeted data setup

## Known Gaps And Discrepancies

- `PLAN.md` mentions `loan_schedules`, but the current schema does not implement that table.
- `PLAN.md` lists planned loan fields such as repayment frequency, guarantor details, approval notes, and start date; the current schema does not store all of them.
- The current loan approval model stores approval notes in audit metadata rather than dedicated loan/application note columns.
- The mobile docs mention a loan detail screen, but the current member app uses list cards with inline timeline detail instead of a separate detail route.
- Member mobile still reads from `loans` rather than `loan_applications`, so pre-approval application statuses are not yet visible there.

## Supporting References

- `PLAN.md`
- `docs/product-spec.md`
- `docs/database-schema.md`
- `docs/api-contracts.md`
- `docs/admin-screens.md`
- `docs/mobile-screens.md`
- `docs/security-fraud.md`
- `packages/shared/src/domain.ts`
- `packages/shared/src/finance.ts`
- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0004_rls_hardening.sql`
- `apps/admin/app/loans/page.tsx`
- `apps/admin/lib/dashboard-data.ts`
- `apps/mobile/src/lib/mobile-data.ts`
- `apps/mobile/src/features/member/screens.tsx`
- `tests/e2e/admin-panel.spec.ts`
- `tests/e2e/support/admin-panel-fixtures.ts`
