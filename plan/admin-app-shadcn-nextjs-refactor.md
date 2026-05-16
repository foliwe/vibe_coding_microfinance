# Admin App shadcn/Next.js Refactor Plan

## Summary

Refactor the full `apps/admin` Next.js admin app into a cohesive shadcn-based operational UI while preserving the current purple brand direction. Keep the existing routes, Supabase/server-action behavior, and data contracts intact; focus on component composition, accessibility, responsive density, and reducing custom CSS.

## Key Changes

- Split `AdminShell` into a mostly server-rendered frame plus small client-only sidebar/pathname pieces, keeping `Sidebar`, `Breadcrumb`, `TooltipProvider`, and sign-out behavior but reducing unnecessary client surface.
- Replace global custom utility classes in `apps/admin/app/globals.css` such as `.button`, `.button-secondary`, `.table`, `.field`, `.chip`, `.notice`, `.list`, and `.login-card` with shadcn primitives and reusable domain components.
- Keep the purple/fuchsia brand tokens, but make the admin UI quieter: neutral surfaces, restrained purple primary actions, semantic status badges, less decorative background treatment, and denser scan-friendly spacing.
- Introduce shared admin primitives:
  - `AdminSection` built from full `CardHeader`/`CardContent` composition.
  - `MetricCard` replacing `StatCard`, using semantic variants without raw status color classes.
  - `StatusBadge` for transaction/member/device/loan statuses.
  - `AdminTable` wrappers using shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, and `Empty`.
  - `ActionBar` for page and row actions using shadcn `Button` with `asChild` for links.
  - `Notice` using shadcn `Alert` for success/error/info messages.
  - `AdminFieldGroup` patterns using shadcn `Field`, `FieldGroup`, `FieldLabel`, `FieldDescription`, and `FieldError`.
- Refactor all admin pages to use these patterns: dashboard, branch dashboard, branches, managers, agents, members, transactions, loans, reconciliation, staff devices, reports, audit, settings, login, setup, and workstation-blocked.
- Add route-level loading states where useful with `loading.tsx` skeletons for major dashboard/list areas; avoid over-clientifying pages that already fetch data correctly as async Server Components.

## Interfaces

- No database, Supabase RPC, route URL, server action, or external API changes.
- Internal component props will change for shared UI primitives:
  - `SectionCard` becomes `AdminSection` with `title`, `description`, optional `actions`, and `children`.
  - `StatCard` becomes `MetricCard` with `label`, `value`, optional `description`, `tone`, and optional icon.
  - Tables receive typed column/render props or explicit child slots, but remain server-renderable.
- Existing page data functions in `apps/admin/lib/*` remain the source of truth; page components fetch once server-side and pass prepared display values into UI components.

## Implementation Details

- Use installed shadcn components only; do not re-run `shadcn init` or switch presets.
- Follow shadcn composition rules: `Button` instead of custom link/button classes, `Badge` instead of `.chip`, `Alert` instead of `.notice`, `Empty` for empty rows/states, `Skeleton` for loading, `FieldGroup`/`Field` for forms, and `Table` components for all tabular data.
- Use lucide icons in command/action buttons where they clarify the action; icons inside buttons should rely on shadcn sizing conventions.
- Preserve App Router and RSC practices: keep pages async server components, isolate `"use client"` to interactive components, fetch independent server data in parallel where pages currently have multiple independent reads, and avoid passing large duplicated objects into client components.
- Remove page-level raw HTML form/table styling after each screen has been migrated, then trim obsolete global CSS.

## Test Plan

- Run `npm run lint --workspace @credit-union/admin`.
- Run `npm run build --workspace @credit-union/admin`.
- Run `npm run test`.
- Run `npm run test:e2e:admin`.
- Visually verify desktop and mobile for dashboard, transactions, loans, member detail, create member, login/setup, and workstation-blocked flows.
- Confirm keyboard navigation and accessible labels for sidebar, forms, dialogs/modals, tables, and action buttons.

## Assumptions

- Scope is the full admin app.
- Preserve the current purple brand, but apply it with restraint so the UI remains operational and readable.
- No backend behavior changes are intended; any data or permission issue discovered during implementation should be fixed only if required by the UI refactor.
