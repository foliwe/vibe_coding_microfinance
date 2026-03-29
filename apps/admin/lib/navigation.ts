import type { Route } from "next";

const allSidebarItems = [
  { href: "/" as Route, label: "Dashboard" },
  { href: "/branch" as Route, label: "Branch Dashboard" },
  { href: "/branches" as Route, label: "Branches" },
  { href: "/branches/new" as Route, label: "Create Branch" },
  { href: "/users" as Route, label: "Users" },
  { href: "/users/new" as Route, label: "Create Manager" },
  { href: "/members" as Route, label: "Members" },
  { href: "/members/new" as Route, label: "Create Member" },
  { href: "/agents" as Route, label: "Agents" },
  { href: "/agents/new" as Route, label: "Create Agent" },
  { href: "/transactions" as Route, label: "Transactions" },
  { href: "/loans" as Route, label: "Loans" },
  { href: "/reconciliation" as Route, label: "Reconciliation" },
  { href: "/reports" as Route, label: "Reports" },
  { href: "/audit" as Route, label: "Audit Log" },
  { href: "/settings" as Route, label: "Settings" },
] as const;

export function getSidebarItems(role: "admin" | "branch_manager") {
  if (role === "admin") {
    return allSidebarItems;
  }

  return allSidebarItems.filter((item) =>
    [
      "/branch",
      "/members",
      "/members/new",
      "/agents/new",
      "/transactions",
      "/loans",
      "/reports",
      "/audit",
      "/settings",
      "/agents",
      "/reconciliation",
    ].includes(item.href),
  );
}
