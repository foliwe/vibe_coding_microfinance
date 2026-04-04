import type { Route } from "next";

export type SidebarLinkItem = {
  type: "link";
  href: Route;
  label: string;
};

export type SidebarGroupItem = {
  type: "group";
  href: Route;
  label: string;
  children: readonly SidebarLinkItem[];
};

export type SidebarSection = {
  label: string;
  items: readonly (SidebarLinkItem | SidebarGroupItem)[];
};

function link(href: string, label: string): SidebarLinkItem {
  return {
    type: "link",
    href: href as Route,
    label,
  };
}

function group(
  href: string,
  label: string,
  children: readonly SidebarLinkItem[],
): SidebarGroupItem {
  return {
    type: "group",
    href: href as Route,
    label,
    children,
  };
}

const transactionsGroup = group("/transactions", "Transactions", [
  link("/transactions/deposit", "Deposit"),
  link("/transactions/withdrawal", "Withdrawal"),
]);

const adminSections: readonly SidebarSection[] = [
  {
    label: "Overview",
    items: [link("/", "Dashboard"), link("/branches", "Branches")],
  },
  {
    label: "People",
    items: [
      link("/members", "Members"),
      link("/members/new", "Create Member"),
      link("/agents", "Agents"),
      link("/agents/new", "Create Agent"),
      link("/managers", "Managers"),
      link("/managers/new", "Create Manager"),
    ],
  },
  {
    label: "Operations",
    items: [
      transactionsGroup,
      link("/loans", "Loans"),
      link("/reconciliation", "Reconciliation"),
      link("/staff-devices", "Staff Devices"),
      link("/reports", "Reports"),
      link("/audit", "Audit Log"),
      link("/settings", "Settings"),
    ],
  },
] as const;

const branchManagerSections: readonly SidebarSection[] = [
  {
    label: "Overview",
    items: [link("/branch", "Branch Dashboard")],
  },
  {
    label: "People",
    items: [
      link("/members", "Members"),
      link("/members/new", "Create Member"),
      link("/agents", "Agents"),
      link("/agents/new", "Create Agent"),
    ],
  },
  {
    label: "Operations",
    items: [
      transactionsGroup,
      link("/loans", "Loans"),
      link("/reconciliation", "Reconciliation"),
      link("/staff-devices", "Staff Devices"),
      link("/reports", "Reports"),
      link("/audit", "Audit Log"),
      link("/settings", "Settings"),
    ],
  },
] as const;

export function getSidebarSections(role: "admin" | "branch_manager") {
  return role === "admin" ? adminSections : branchManagerSections;
}
