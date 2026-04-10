import Link from "next/link";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { getOnboardingPageContext } from "../../lib/onboarding-data";
import { hasSupabaseServiceEnv } from "../../lib/supabase/env";

export default async function SettingsPage() {
  const { currentBranchLabel, isLive, profile } = await getOnboardingPageContext([
    "admin",
    "branch_manager",
  ]);
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [breadcrumb("Settings")])}
      currentBranchLabel={currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Settings"
      subtitle="Operational defaults, security setup posture, and trust controls for the signed-in role."
    >
      <SectionCard title="Current Controls" description="These rows now reflect the real app posture instead of hardcoded fake switches.">
        <div className="list">
          <div className="list-item">
            <strong>Force first-login password change</strong>
            <span className="chip">enabled for newly created users</span>
          </div>
          <div className="list-item">
            <strong>Require transaction PIN</strong>
            <span className="chip">enforced for live mobile withdrawals</span>
          </div>
          <div className="list-item">
            <strong>Agent phone trust</strong>
            <span className="chip">one active trusted phone per agent account</span>
          </div>
          <div className="list-item">
            <strong>Branch-manager workstation trust</strong>
            <span className="chip">browser-profile trust enabled after password and PIN setup</span>
          </div>
          <div className="list-item">
            <strong>Service-role backed onboarding</strong>
            <span className="chip">{hasSupabaseServiceEnv() ? "configured" : "missing env"}</span>
          </div>
          <div className="list-item">
            <strong>Suspicious activity alerts</strong>
            <span className="chip">not implemented yet</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={role === "admin" ? "Admin Actions" : "Branch Actions"}
        description="Quick links to the creation flows that are now wired live."
      >
        <div className="actions">
          <Link className="button-secondary" href="/staff-devices">
            Review Staff Trust
          </Link>
          {role === "admin" ? (
            <>
              <Link className="button" href="/branches/new">
                Create Branch
              </Link>
              <Link className="button-secondary" href="/managers/new">
                Create Manager
              </Link>
            </>
          ) : null}
          <Link className="button-secondary" href="/agents/new">
            Create Agent
          </Link>
          <Link className="button-secondary" href="/members/new">
            Create Member
          </Link>
        </div>
      </SectionCard>
    </AdminShell>
  );
}
