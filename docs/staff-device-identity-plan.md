# Staff Device Identity v1

## Summary

Implement staff device identity with two different trust models:

- `agent`: personal device binding on mobile, with exactly one active trusted phone per agent account
- `branch_manager`: shared workstation trust on the web, where multiple manager accounts may use the same office computer/browser profile

`admin` remains exempt in v1. First trust registration happens only after required setup is complete. For agents, that means password change plus transaction PIN setup in mobile. For branch managers, that means password change plus transaction PIN setup in the web app before the workstation is trusted.

## Key Changes

- Add a real staff device/workstation identity layer on both client surfaces.
  - Mobile agent app creates an install-scoped device ID on first run, stores it persistently, and derives a readable device label from Expo device metadata.
  - Admin web creates a browser-profile-scoped workstation ID, stores it in `localStorage`, and mirrors it into a `staff_device_id` cookie so server actions can read it.
  - For managers, "device identity" means the office browser profile/workstation, not an exclusive personal laptop.
- Add first-login setup gates before trust registration.
  - Agent mobile keeps the current password/PIN setup flow and appends device registration after setup succeeds.
  - Add a new branch-manager web setup screen that requires password change and transaction PIN creation before redirecting to `/branch`.
  - No first bind may occur while the user is still on a temporary password without completed setup.
- Add the Supabase RPC layer for device/workstation trust.
  - `register_my_device(p_device_id text, p_device_name text, p_device_kind text)` registers or reactivates the current staff user's trusted device/workstation and updates `last_seen_at`.
  - `assert_staff_device_access(p_device_id text, p_device_kind text)` returns `allowed`, `needs_binding`, or `blocked`.
  - `reset_staff_device(p_profile_id uuid, p_reason text default null)` clears the target staff user's active trust binding and requires rebind on next allowed login.
  - Enforce one active registration per `agent` account; allow the same workstation ID to be active across many `branch_manager` accounts.
  - Preserve old registrations as inactive rows for audit history.
- Enforce trust checks during entry and before sensitive actions.
  - Agent mobile: after auth and profile load, run device assertion; auto-register only if the agent has no active trusted device and setup is complete; otherwise show a blocked/reset-needed screen and prevent access to the agent shell.
  - Branch-manager web: after auth, if setup is incomplete go to setup; if complete, assert workstation trust before allowing access to `/branch` or any web mutations; auto-register only when there is no active trusted workstation for that manager account.
  - Sensitive mobile actions must fail closed when the active device is untrusted: member creation, transaction request submission, offline sync ingestion, and reconciliation submission.
  - Sensitive branch-manager web actions must fail closed when the workstation is untrusted: member/agent creation, transaction approve/reject, reconciliation review, loan actions, and report job creation.
- Add a branch-manager device management screen in the admin app.
  - New route for staff device/workstation bindings, visible to `branch_manager` and `admin`.
  - Branch managers see only staff in their branch; admins see institution-wide staff.
  - Each row shows staff name, role, branch, active device/workstation label, last seen time, and trust status.
  - Reset action is per staff account, not per physical machine.
- Update audit and UX surfaces.
  - Log `register_device`, `device_access_denied`, and `reset_staff_device` events to `audit_logs`.
  - Replace the current Settings wording so manager trust is described as shared workstation trust, not personal device lock-in.
  - Add clear blocked-state copy:
    - agents: "This account is locked to a different phone"
    - managers: "This account is not trusted on this workstation/browser profile"

## Public APIs / Interfaces

- New RPCs:
  - `register_my_device(p_device_id text, p_device_name text, p_device_kind text)`
  - `assert_staff_device_access(p_device_id text, p_device_kind text)`
  - `reset_staff_device(p_profile_id uuid, p_reason text default null)`
- Extend sensitive mutation boundaries to carry trust context.
  - `submit_cash_reconciliation` should accept `p_device_id text`.
  - The mobile `create-member` Edge Function should accept device metadata.
  - Admin server actions should read the `staff_device_id` cookie and assert workstation access before mutating.
- Add client-side trust state for staff entry gates:
  - `allowed`
  - `needs_binding`
  - `blocked`

## Test Plan

- SQL/RPC tests:
  - agent first bind succeeds only after setup is complete
  - same agent device remains allowed on later access
  - different agent device is blocked when an active binding exists
  - branch manager can register a workstation after password/PIN setup
  - two different branch-manager accounts can both be trusted on the same workstation ID
  - resetting one manager account does not remove trust for another manager account on the same workstation
  - reset deactivates the target account's active binding and writes an audit log
- Mobile app-flow tests:
  - agent completes password/PIN setup, first device registers, and later launches on the same phone succeed
  - agent on a different phone is blocked before entering the field shell
  - blocked agent cannot create members, submit transactions, sync offline items, or submit reconciliation
- Web/app-flow tests:
  - branch manager signs in on a shared workstation, completes password/PIN setup, and workstation trust is registered
  - another branch-manager account can sign in on that same workstation and register its own trust successfully
  - branch manager on an untrusted workstation is blocked from dashboard mutations
  - branch manager can reset an agent in-branch and can reset their own or another manager account in branch scope if permitted by role policy
- Acceptance scenarios:
  - first bind never happens before required setup
  - agent trust is personal and one-phone-only
  - branch-manager trust is per account but may point to the same shared workstation identity across many managers
  - old trusted device/workstation remains blocked after reset until rebind occurs

## Assumptions

- `agent` accounts use one active personal mobile device in v1.
- `branch_manager` accounts use shared office workstations; many managers may use the same workstation/browser profile.
- "Same workstation" means the same browser profile identity, because cookies/local storage are browser-profile scoped.
- `admin` is not device-bound in v1.
- Required setup for both agents and branch managers is password change plus transaction PIN setup before first trust registration.
- Reset is per staff account binding, not a global machine wipe across all manager accounts using the same workstation.
