# Unity Credit NativeWind Mobile Redesign

## Summary

- Rebrand the Expo mobile app to **Unity Credit** using `/Users/foliwefossung/Pictures/mobileApp/logo.png`, the "Stronger Together" tagline, and the supplied screen references as the visual source of truth.
- Redesign the **entire mobile app** with NativeWind/Tailwind classes while preserving existing live Supabase/data hooks, auth, queue, transaction, member, and loan behavior.
- Keep currency formatting as **CFA**, even where the mockups show naira.
- Execute the work one step at a time, verifying each step before moving forward.
- Build and verify **member screens first**, then move to agent screens.

## Key Changes

- Confirm and retain the current NativeWind v5/Tailwind v4 setup from Context7: `withNativewind(config)`, `@tailwindcss/postcss`, `global.css` Tailwind imports, and `nativewind-env.d.ts`.
- Replace the current `StyleSheet`-heavy UI layer with reusable NativeWind primitives: branded screen shell, blue header, logo lockup, notification badge, metric card, glass/white card, status chip, form field, amount input, action tile, list row, section header, and bottom tab item.
- Add Unity Credit theme tokens in `global.css`: deep blue, brand teal, mint, success, warning, danger, muted slate, light surface, border, shadow, and status colors.
- Copy the provided logo into `apps/mobile/assets/images/` and preload it in the root layout alongside existing assets.

## Execution Order

1. Save this plan under `plan/`.
2. Build the NativeWind/theme/logo foundation.
3. Verify the foundation with mobile lint/type checks and a basic Expo render.
4. Build the member shell and member bottom tabs.
5. Build member home, deposits/savings/account pages, loans/detail, profile/settings, transactions/detail, notifications, legal/about, and password flows.
6. Verify all member screens before touching agent screens.
7. Build the agent shell and agent bottom tabs.
8. Build agent home, members, member detail, collect deposit, register member, transaction history/detail/receipt, notifications, sync queue, reconciliation, profile, and password/security flows.
9. Run final lint/typecheck/manual Expo verification.

## Screen Behavior

- Login: rebuild to match the supplied login screen with branded blue header, logo, phone/PIN-style fields mapped to existing sign-in identifier/password behavior, remember/forgot/biometric visual controls, and current auth error handling.
- Member app: redesign home, deposits/savings/account pages, loans/detail, profile/settings, transactions/detail, notifications, legal/about, and password flows with the member mockups as the primary pattern.
- Agent app: redesign home, members, member detail, collect deposit, transaction history/detail/receipt, add member, notifications, sync queue, reconciliation, profile, and password/security flows using the mockup language after member verification passes.
- Navigation: update visible tabs to match the designs where possible:
  - Agent: Home/Dashboard, Members, Collect, History/Collections, Profile/More.
  - Member: Home, Deposits, Loans, Profile.
- Hidden or secondary routes remain reachable through cards, rows, and settings links.

## Public Interfaces

- No backend schema, RPC, shared package, or data contract changes.
- Keep `formatCurrency()` returning CFA.
- Add or adjust shared UI component props only for presentation, such as icons, status tone, action handlers, amount labels, badges, and optional accessory content.

## Test Plan

- After each implementation step, run the narrowest useful verification before continuing.
- Run `npm run lint --workspace @credit-union/mobile`.
- Run `npx tsc -p apps/mobile/tsconfig.json --noEmit`.
- Start Expo with `npm run dev:mobile` and verify login, agent, and member navigation.
- Visually check iOS-sized and Android-sized layouts for safe areas, bottom tabs, scrolling, keyboard fields, clipped text, and card/list alignment.
- Regression check live flows: sign-in, agent member creation, deposit submission, transaction history, member balances, loan pages, profile save, sync queue, and reconciliation.

## Assumptions

- Use the mockups for layout, hierarchy, colors, and branding, but keep real app data and statuses.
- Member and agent photos from the mockups are placeholders; use initials or existing profile image URLs only if the current data provides them.
- Gradients and runtime-only values may keep small inline style objects; core spacing, color, typography, layout, and component styling should move to NativeWind classes.
