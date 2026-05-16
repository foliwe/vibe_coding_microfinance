import Link from "next/link";
import { type ReactNode } from "react";
import { Building2Icon, LogOutIcon } from "lucide-react";

import { signOutAction } from "../app/actions";
import type { AdminBreadcrumb } from "../lib/breadcrumbs";
import { getSidebarSections } from "../lib/navigation";
import { AdminShellInset, AdminSidebarNavigation } from "./admin-shell-client";
import { Button } from "./ui/button";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from "./ui/sidebar";

type AdminShellProps = {
  breadcrumbs?: AdminBreadcrumb[];
  children: ReactNode;
  currentBranchLabel: string;
  currentUserName: string;
  role: "admin" | "branch_manager";
  statusBadge: string;
  subtitle?: string;
  title: string;
};

export function AdminShell({
  breadcrumbs,
  children,
  currentBranchLabel,
  currentUserName,
  role,
  statusBadge,
  subtitle,
  title,
}: AdminShellProps) {
  const sidebarSections = getSidebarSections(role);

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <Link
            className="flex items-center gap-3 rounded-xl border border-sidebar-border/80 bg-sidebar-primary/10 px-3 py-3 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
            href={role === "admin" ? "/" : "/branch"}
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <Building2Icon className="size-5" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">Credit Union Admin</p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                {role === "admin" ? "Institution Control" : currentBranchLabel}
              </p>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarSeparator />

        <AdminSidebarNavigation sections={sidebarSections} />

        <SidebarSeparator />

        <SidebarFooter>
          <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 p-3 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold text-sidebar-foreground">{currentUserName}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-sidebar-foreground/70">
              {role === "admin" ? "Administrator" : "Branch Manager"}
            </p>
            <p className="mt-3 text-xs text-sidebar-foreground/70">Current scope</p>
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {currentBranchLabel}
            </p>
          </div>

          <form action={signOutAction}>
            <Button className="w-full justify-start" type="submit" variant="outline">
              <LogOutIcon />
              <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
            </Button>
          </form>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <AdminShellInset
        breadcrumbs={breadcrumbs}
        currentBranchLabel={currentBranchLabel}
        statusBadge={statusBadge}
        subtitle={subtitle}
        title={title}
      >
        {children}
      </AdminShellInset>
    </SidebarProvider>
  );
}
