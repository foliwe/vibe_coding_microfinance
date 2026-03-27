import type { Route } from "next";

export const sidebarItems = [
  { href: "/" as Route, label: "Dashboard" },
  { href: "/branch" as Route, label: "Branch Dashboard" },
  { href: "/branches" as Route, label: "Branches" },
  { href: "/members" as Route, label: "Members" },
  { href: "/members/new" as Route, label: "Create Member" },
  { href: "/transactions" as Route, label: "Transactions" },
  { href: "/loans" as Route, label: "Loans" },
  { href: "/reports" as Route, label: "Reports" },
  { href: "/audit" as Route, label: "Audit Log" },
  { href: "/settings" as Route, label: "Settings" },
] as const;
