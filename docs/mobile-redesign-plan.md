# Mobile Redesign Plan

## Summary

Replace the current single-file, basic-looking mobile shell with a design-system-driven Expo app that feels like a production finance product. Keep the existing agent/member flows, queue logic, and Supabase integration, but rebuild the presentation layer around bundled brand assets, custom fonts, vector icons, richer cards, and chart-based dashboards.

## Key Changes

- Establish a UI foundation for Expo.
  - Add bundled assets under `apps/mobile/assets/` for logo marks, textures/patterns, and any hero/background artwork.
  - Load custom fonts with `expo-font` during app bootstrap and keep the app on splash until fonts/assets are ready.
  - Standardize iconography with `@expo/vector-icons` and replace text-only navigation/menu affordances.
  - Introduce a shared theme layer for color tokens, spacing, radii, shadows, typography, and status colors so the app stops relying on one giant inline `StyleSheet`.
- Rebuild the mobile shell into reusable presentation primitives.
  - Split `apps/mobile/App.tsx` into shell/layout components plus screen sections for agent and member flows.
  - Keep the existing global structure from `docs/mobile-design.md`, but redesign it as a premium enterprise-finance UI: stronger hierarchy, polished cards, better empty states, and a more intentional top bar/bottom nav.
  - Add branded backgrounds and depth using Expo-friendly primitives such as gradients, layered surfaces, and subtle decorative assets instead of flat blocks.
- Redesign the core screens around professional dashboard patterns.
  - Agent home: identity header, status band, action cards, KPI cards, recent activity, and a compact summary chart.
  - Transactions and sync queue: cleaner list rows, stronger status chips, more legible detail cards, and obvious primary/secondary actions.
  - Members and profile flows: more structured forms, grouped sections, and better information density.
  - Member home: balance snapshot cards, loan overview, transaction history cards, and a cleaner profile/settings presentation.
- Add charts in an Expo-safe way.
  - Use lightweight custom chart components rather than a heavy chart framework.
  - Implement a small chart set: agent collections vs withdrawals bar chart, member balances summary chart, and optional approval/pending status mini chart.
  - Feed charts from existing computed state only; no backend contract change.
- Improve app polish and device behavior.
  - Use `expo-asset` to preload images/backgrounds used by the shell.
  - Add loading placeholders/skeleton states for screens that depend on live data.
  - Preserve the current light theme as default, optimized for field readability and enterprise finance aesthetics.
  - Keep navigation structure and role-based behavior unchanged in this pass.

## Public Interfaces / Dependencies

- Add Expo/UI dependencies for:
  - `expo-font`
  - `expo-asset`
  - `@expo/vector-icons`
- No backend schema, RPC, or shared domain type changes.
- No change to existing agent/member business logic; this is a presentation and component-architecture redesign.

## Test Plan

- App boot:
  - bundled fonts/assets load correctly
  - loading state stays visible until UI resources are ready
  - no missing-font or missing-asset fallback flashes
- Agent flow:
  - login, home, transactions, members, sync queue, reconciliation, and profile all render with the new shell
  - approval/sync statuses still display correctly after the redesign
  - chart cards render with live and empty-state data
- Member flow:
  - home, transactions, loans, and profile render correctly
  - balances and charts remain legible on small screens
- Platform/layout:
  - verify iOS and Android layouts at minimum
  - check safe areas, bottom nav, scroll behavior, and keyboard interactions
  - ensure icons and preloaded assets render in Expo dev builds without native linking issues
- Regression:
  - queue persistence, live sync, status refresh, PIN flows, and auth flows still behave as before

## Assumptions

- Visual direction is enterprise finance: polished, restrained, premium, and dashboard-oriented.
- Charts should be custom and lightweight rather than introduced via a large charting framework.
- Context7 Expo docs could not be retrieved in this session because the Context7 quota is exceeded; this implementation therefore uses standard Expo-supported patterns and should be cross-checked against Context7 Expo docs once access is restored.
