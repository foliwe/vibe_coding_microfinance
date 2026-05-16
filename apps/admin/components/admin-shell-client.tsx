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
  ScanSearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UserCogIcon,
  UserRoundPlusIcon,
  UsersIcon,
} from "lucide-react";

import type { AdminBreadcrumb } from "../lib/breadcrumbs";
import type { SidebarSection } from "../lib/navigation";
import { StatusBadge } from "./status-badge";
import { Badge } from "./ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarTrigger,
} from "./ui/sidebar";

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
  "/staff-devices": SmartphoneIcon,
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

export function AdminSidebarNavigation({
  sections,
}: {
  sections: readonly SidebarSection[];
}) {
  const pathname = usePathname();

  return (
    <SidebarContent>
      {sections.map((section) => (
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
  );
}

export function AdminShellInset({
  breadcrumbs,
  children,
  currentBranchLabel,
  statusBadge,
  subtitle,
  title,
}: {
  breadcrumbs?: AdminBreadcrumb[];
  children: ReactNode;
  currentBranchLabel: string;
  statusBadge: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <SidebarInset className="bg-transparent">
      <div className="sticky top-0 z-20 border-b border-border/70 bg-background/90 px-4 py-4 backdrop-blur md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <SidebarTrigger className="mt-0.5" variant="outline" />
            <div className="flex min-w-0 flex-col gap-2">
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
                              <span className="text-sm text-muted-foreground">
                                {item.label}
                              </span>
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
                <StatusBadge>{statusBadge}</StatusBadge>
              </div>
              <div className="space-y-1">
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
  );
}
