import type { Route } from "next";

export type AdminBreadcrumb = {
  label: string;
  href?: Route;
};

export function breadcrumb(label: string, href?: string): AdminBreadcrumb {
  return href
    ? {
        label,
        href: href as Route,
      }
    : { label };
}

export function withDashboardBreadcrumbs(
  role: "admin" | "branch_manager",
  items: readonly AdminBreadcrumb[] = [],
): AdminBreadcrumb[] {
  const root =
    role === "admin"
      ? breadcrumb("Admin Dashboard", "/")
      : breadcrumb("Branch Dashboard", "/branch");

  return [root, ...items];
}
