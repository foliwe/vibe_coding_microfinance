import type { Route } from "next";

export type SidebarItem = {
  href: Route;
  label: string;
  children?: readonly {
    href: Route;
    label: string;
  }[];
};

const allSidebarItems: readonly SidebarItem[] = [
  { href: "/" as Route, label: "Dashboard" },
  { href: "/branches" as Route, label: "Branches" },
  { href: "/branches/new" as Route, label: "Create Branch" },
  { href: "/users" as Route, label: "Users" },
  { href: "/users/new" as Route, label: "Create Manager" },
  { href: "/members" as Route, label: "Members" },
  { href: "/members/new" as Route, label: "Create Member" },
  { href: "/agents" as Route, label: "Agents" },
  { href: "/agents/new" as Route, label: "Create Agent" },
  {
    href: "/transactions" as Route,
    label: "Transactions",
    children: [
      { href: "/transactions/deposit" as Route, label: "Deposit" },
      { href: "/transactions/withdrawal" as Route, label: "Withdrawal" },
    ],
  },
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

  return [
    { href: "/branch" as Route, label: "Branch Dashboard" },
    ...allSidebarItems.filter((item) =>
      [
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
    ),
  ];
}
