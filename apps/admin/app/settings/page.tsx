import Link from "next/link";
import type { AppContentPage } from "@credit-union/shared";

import { AdminDetailItem, AdminDetailList } from "../../components/admin-detail-list";
import { AdminShell } from "../../components/admin-shell";
import { ContentMarkdownEditor } from "../../components/content-markdown-editor";
import { ActionBar } from "../../components/action-bar";
import { Notice } from "../../components/notice";
import { SectionCard } from "../../components/section-card";
import { StatusBadge } from "../../components/status-badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { getAdminContentPages } from "../../lib/content-pages";
import { getOnboardingPageContext } from "../../lib/onboarding-data";
import { hasSupabaseServiceEnv } from "../../lib/supabase/env";

type SettingsPageProps = {
  searchParams?: Promise<{
    detail?: string;
    result?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const { currentBranchLabel, isLive, profile } = await getOnboardingPageContext([
    "admin",
    "branch_manager",
  ]);
  const contentPages = await getAdminContentPages();
  const role = profile.role === "admin" ? "admin" : "branch_manager";
  const result = params?.result;
  const detail = params?.detail;

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
      {result && detail ? (
        <Notice tone={result === "success" ? "success" : "error"}>{detail}</Notice>
      ) : null}

      <SectionCard title="Current Controls" description="These rows now reflect the real app posture instead of hardcoded fake switches.">
        <AdminDetailList>
          <AdminDetailItem
            label="Force first-login password change"
            value={<StatusBadge>enabled for newly created users</StatusBadge>}
          />
          <AdminDetailItem
            label="Require transaction PIN"
            value={<StatusBadge>enforced for live mobile withdrawals</StatusBadge>}
          />
          <AdminDetailItem
            label="Agent phone trust"
            value={<StatusBadge>one active trusted phone per agent account</StatusBadge>}
          />
          <AdminDetailItem
            label="Branch-manager workstation trust"
            value={
              <StatusBadge>
                browser-profile trust enabled after password and PIN setup
              </StatusBadge>
            }
          />
          <AdminDetailItem
            label="Service-role backed onboarding"
            value={
              <StatusBadge>
                {hasSupabaseServiceEnv() ? "configured" : "missing env"}
              </StatusBadge>
            }
          />
          <AdminDetailItem
            label="Suspicious activity alerts"
            value={<StatusBadge>live in Fraud Center</StatusBadge>}
          />
        </AdminDetailList>
      </SectionCard>

      <SectionCard
        title="Member App Content"
        description={
          role === "admin"
            ? "Edit the global About Us and Terms & Conditions pages shown in the member app."
            : "Global member-app content is visible here. Only administrators can edit it."
        }
      >
        <div className="grid gap-6 xl:grid-cols-2">
          {contentPages.map((page) => (
            <Card className="border-border/70 bg-background/80" key={page.key}>
              <CardContent className="p-4">
              {role === "admin" ? (
                <ContentMarkdownEditor
                  content={page.content}
                  contentKey={page.key}
                  title={page.title}
                />
              ) : (
                <ReadOnlyContentPage page={page} />
              )}
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={role === "admin" ? "Admin Actions" : "Branch Actions"}
        description="Quick links to the creation flows that are now wired live."
      >
        <ActionBar>
          <Button asChild variant="outline">
            <Link href="/staff-devices">Review Staff Trust</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/fraud">Open Fraud Center</Link>
          </Button>
          {role === "admin" ? (
            <>
              <Button asChild>
                <Link href="/branches/new">Create Branch</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/managers/new">Create Manager</Link>
              </Button>
            </>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/agents/new">Create Agent</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/members/new">Create Member</Link>
          </Button>
        </ActionBar>
      </SectionCard>
    </AdminShell>
  );
}

function ReadOnlyContentPage({ page }: { page: AppContentPage }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{page.title}</h3>
        {page.updatedAt ? (
          <p className="text-sm text-muted-foreground">
            Updated {new Date(page.updatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>
      <MarkdownPreview content={page.content} />
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-6">
      {content.split(/\r?\n/).map((rawLine, index) => {
        const line = rawLine.trim();

        if (!line) {
          return null;
        }

        if (line.startsWith("# ")) {
          return <h2 className="text-xl font-semibold" key={`${line}-${index}`}>{line.slice(2)}</h2>;
        }

        if (line.startsWith("## ")) {
          return <h3 className="pt-2 text-base font-semibold" key={`${line}-${index}`}>{line.slice(3)}</h3>;
        }

        const bullet = line.match(/^[-*]\s+(.+)$/);

        if (bullet) {
          return <p key={`${line}-${index}`}>- {bullet[1]}</p>;
        }

        return <p key={`${line}-${index}`}>{line}</p>;
      })}
    </div>
  );
}
