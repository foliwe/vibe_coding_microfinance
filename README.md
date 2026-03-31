# Microfinance Credit Union

Greenfield monorepo scaffold for a cash-based microfinance credit union platform:

- `apps/admin`: Next.js + shadcn/ui-inspired admin shell for `admin` and `branch_manager`
- `apps/mobile`: Expo + React Native shell for `agent` and `member`
- `packages/shared`: shared domain types, permissions, finance helpers, and mock fixtures
- `supabase`: schema, policies, SQL functions, seed data, and Edge Function stubs
- `docs`: product, schema, API, security, roadmap, and test references

## Getting started

1. Review the docs in [`docs/`](/Users/foliwefossung/Vibe_code/docs). For loan functionality, start with [`docs/loans.md`](/Users/foliwefossung/Vibe_code/docs/loans.md).
2. Install workspace dependencies with `npm install`.
3. Run the admin shell with `npm run dev:admin`.
4. Run the mobile shell with `npm run dev:mobile`.
5. Apply the Supabase SQL in `supabase/migrations` before wiring live data.
6. Bootstrap a live test branch flow with `npm run create:test-users`.

## Current status

This repository is intentionally scaffold-first:

- shared contracts are defined up front
- dashboards and forms are mocked against the shared model
- backend schema and SQL workflows are laid out for implementation
- offline queue and approval flow primitives are documented and stubbed in code

The next step after dependency install is connecting the apps to live Supabase data and replacing mock fixtures with authenticated queries/RPCs. Use `npm run create:test-users` to provision a branch manager, agent, member, assignment, and member accounts for end-to-end testing.
