# Mobile Design Implementation Plan

## Summary

Implement the new mobile design as a structured refactor of the current Expo app. Keep the existing offline queue, Supabase integration, and device PIN flows, but reorganize the app around a shared mobile shell, consistent status language, and explicit agent/member screen flows.

## Key Changes

- Rebuild the mobile shell so signed-in screens consistently show:
  - global sync/status strip
  - top bar with back/title/menu
  - main content area
  - bottom navigation
- Standardize status rendering for:
  - `OFFLINE`
  - `ONLINE`
  - `PENDING SYNC`
  - `SYNCING`
  - `FAILED TO SYNC`
  - `PENDING APPROVAL`
  - `APPROVED`
  - `REJECTED`
  - `FLAGGED`
  - `RECONCILIATION REQUIRED`
- Replace the old agent tabs with:
  - `Home`
  - `Transactions`
  - `Members`
  - `More`
- Replace the old member tabs with:
  - `Home`
  - `Transactions`
  - `Loans`
  - `More`
- Keep password-change and PIN setup as blocking subflows before the main shell opens.
- Reuse existing queue persistence, member snapshot loading, assigned-member loading, and local device security logic.
- Add the missing design screens:
  - agent home
  - add member
  - deposit
  - withdrawal
  - sync queue
  - cash reconciliation
  - member transactions
  - loan detail

## Interfaces And Data Handling

- Keep shared backend/domain enums unchanged.
- Add a mobile-local status mapping layer so backend values are translated into the exact UI labels required by the design.
- Extend queue summaries to support the global status strip and sync queue screen.
- Keep member mobile read-only in v1.
- Route agent reconciliation submission through Supabase RPCs and surface manager review state back in mobile.
- Keep offline queue support for deposits, but require live connectivity for withdrawals so transaction PIN verification stays server-side.

## Test Plan

- Agent login, password change, and transaction PIN setup.
- Offline deposit with visible `PENDING SYNC`.
- Offline withdrawal blocked with a clear connectivity error.
- Online transaction submission with visible `PENDING APPROVAL`.
- Agent first-login password change plus transaction PIN setup before shell access.
- Queue persistence after app restart.
- Sync queue retry and sync actions.
- Reconciliation submission and pending-review visibility.
- Member list search and add-member draft flow.
- Member read-only balances, transactions, and loans in the new shell.
- Member PIN and biometric settings.
- Status consistency across all screens.

## Assumptions

- The implementation stays within the current Expo/React Native stack.
- No navigation library is introduced in this pass.
- `docs/mobile-design.md` is the mobile UI source of truth where it differs from older mobile docs.
