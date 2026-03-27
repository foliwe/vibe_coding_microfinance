import Link from "next/link";
import { ReactNode } from "react";

import { signOutAction } from "../app/actions";
import { sidebarItems } from "../lib/navigation";

interface AdminShellProps {
  title: string;
  subtitle: string;
  role: "admin" | "branch_manager";
  currentUserName?: string;
  currentBranchLabel?: string;
  statusBadge?: string;
  children: ReactNode;
}

export function AdminShell({
  title,
  subtitle,
  role,
  currentUserName,
  currentBranchLabel,
  statusBadge,
  children,
}: AdminShellProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">CU</span>
          <div>
            <strong>Credit Union</strong>
            <p>Cash-first banking</p>
          </div>
        </div>
        <nav className="nav">
          {sidebarItems.map((item) => (
            <Link className="nav-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{role === "admin" ? "Institution view" : "Branch view"}</p>
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>
          <div className="topbar-actions">
            {statusBadge ? <div className="pill">{statusBadge}</div> : null}
            <div className="pill">{currentBranchLabel ?? (role === "admin" ? "All branches" : "Branch")}</div>
            <div className="pill">{currentUserName ?? "Signed in"}</div>
            <form action={signOutAction}>
              <button className="button-secondary" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
