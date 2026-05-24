# Agent Guide

This repository is a scaffold-first monorepo for a cash-based microfinance credit union platform. Use this file as the quick orientation layer before making changes.

## Project Shape

- `apps/admin`: Next.js admin shell for `admin` and `branch_manager` roles.
- `apps/mobile`: Expo and React Native app shell for `agent` and `member` roles.
- `packages/shared`: shared TypeScript domain types, permissions, finance helpers, and mock fixtures.
- `supabase`: database migrations, policies, SQL helpers, seed data, and Edge Function stubs.
- `docs`: product, schema, API, security, roadmap, test, and screen references.
- `tests`: Node smoke/domain tests plus Playwright end-to-end coverage.

## Useful Commands

- Install dependencies: `npm install`
- Run admin app: `npm run dev:admin`
- Run mobile app: `npm run dev:mobile`
- Lint workspaces: `npm run lint`
- Run unit/domain tests: `npm test`
- Run schema and admin smoke checks: `npm run smoke`
- Run Playwright tests: `npm run test:e2e`
- Run admin Playwright spec: `npm run test:e2e:admin`
- Bootstrap test users: `npm run create:test-users`

## Implementation Notes

- Prefer existing workspace patterns over new abstractions.
- Keep shared domain logic in `packages/shared` when both apps need it.
- Keep admin-only UI and server code under `apps/admin`.
- Keep mobile-only screens and native behavior under `apps/mobile`.
- Keep database behavior in versioned SQL migrations under `supabase/migrations`.
- Review the relevant docs before feature work, especially `docs/product-spec.md`, `docs/database-schema.md`, `docs/security-fraud.md`, and `docs/loans.md`.

## Security And Data Rules

- Treat auth, role checks, RLS, transaction posting, reconciliation, loan state transitions, and member ownership as high-risk areas.
- Do not bypass Supabase RLS expectations in application code.
- Use service-role Supabase clients only in trusted server-side scripts, server code, or admin workflows that already follow the repo pattern.
- Avoid logging secrets, PINs, passwords, auth tokens, or member financial details.
- For financial calculations, prefer shared helpers and add focused tests for rounding, balances, and edge cases.

## Testing Guidance

- For shared helpers or workflow logic, add or update tests in `tests`.
- For admin UI workflows, update Playwright coverage in `tests/e2e` when behavior changes.
- For migrations, run `npm run smoke:schema` when the schema workflow is touched.
- Run the narrowest useful command first, then broaden to `npm run smoke` or `npm test` when the change touches shared behavior.

## Style

- TypeScript is the default for app and shared code.
- Keep route/page components thin when data or workflow logic belongs in helpers.
- Follow existing component style in `apps/admin/components` and existing mobile screen conventions in `apps/mobile/app`.
- Avoid unrelated refactors while implementing a feature or fix.
