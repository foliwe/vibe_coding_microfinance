"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import {
  ActivityIcon,
  BadgeDollarSignIcon,
  BanknoteArrowDownIcon,
  BanknoteArrowUpIcon,
  BookTextIcon,
  Building2Icon,
  LayoutDashboardIcon,
  LogOutIcon,
  ScanSearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UserCogIcon,
  UserRoundPlusIcon,
  UsersIcon,
} from "lucide-react";

import { signOutAction } from "../app/actions";
import type { AdminBreadcrumb } from "../lib/breadcrumbs";
import { getSidebarSections } from "../lib/navigation";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { Button } from "./ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger } from "./ui/sidebar";

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

const iconByHref = {
  "/": LayoutDashboardIcon,
  "/branch": ActivityIcon,
  "/branches": Building2Icon,
  "/managers": UserCogIcon,
  "/managers/new": UserRoundPlusIcon,
  "/members": UsersIcon,
  "/members/new": UserRoundPlusIcon,
  "/agents": UsersIcon,
  "/agents/new": UserRoundPlusIcon,
  "/transactions": BadgeDollarSignIcon,
  "/transactions/deposit": BanknoteArrowUpIcon,
  "/transactions/withdrawal": BanknoteArrowDownIcon,
  "/loans": ShieldCheckIcon,
  "/reconciliation": ScanSearchIcon,
  "/reports": BookTextIcon,
  "/audit": ShieldCheckIcon,
  "/settings": Settings2Icon,
} as const;

function isRouteActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  const pathname = usePathname();
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

        <SidebarContent>
          {sidebarSections.map((section) => (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const Icon =
                      iconByHref[item.href as keyof typeof iconByHref] ?? LayoutDashboardIcon;
                    const active = isRouteActive(pathname, item.href);

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                          <Link href={item.href}>
                            <Icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {item.type === "group" ? (
                          <SidebarMenuSub>
                            {item.children.map((child) => (
                              <li key={child.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isRouteActive(pathname, child.href)}
                                >
                                  <Link href={child.href}>
                                    <span>{child.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </li>
                            ))}
                          </SidebarMenuSub>
                        ) : null}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

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

      <SidebarInset className="bg-transparent">
        <div className="sticky top-0 z-20 border-b border-border/70 bg-background/85 px-4 py-4 backdrop-blur md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between ">
            <div className="flex items-start gap-3">
              <SidebarTrigger className="mt-0.5 " variant="outline" />
              <div className="space-y-2 ">
                {breadcrumbs?.length ? (
                  <Breadcrumb>
                    <BreadcrumbList>
                      {breadcrumbs.map((item, index) => {
                        const isLast = index === breadcrumbs.length - 1;

                        return (
                          <Fragment key={`${item.label}-${index}`}>
                            <BreadcrumbItem>
                              {isLast ? (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                              ) : item.href ? (
                                <BreadcrumbLink asChild>
                                  <Link href={item.href}>{item.label}</Link>
                                </BreadcrumbLink>
                              ) : (
                                <span className="text-sm text-muted-foreground">{item.label}</span>
                              )}
                            </BreadcrumbItem>
                            {!isLast ? <BreadcrumbSeparator /> : null}
                          </Fragment>
                        );
                      })}
                    </BreadcrumbList>
                  </Breadcrumb>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{currentBranchLabel}</Badge>
                  <Badge
                    className={cn(
                      statusBadge.toLowerCase().includes("live")
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    )}
                    variant="secondary"
                  >
                    {statusBadge}
                  </Badge>
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 md:px-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
