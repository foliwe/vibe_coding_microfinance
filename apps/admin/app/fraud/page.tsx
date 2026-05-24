import { updateFraudAlertStatusAction } from "../actions";
import { AdminShell } from "../../components/admin-shell";
import { FraudTrendChart } from "../../components/charts/fraud-trend-chart";
import { ResultNotice } from "../../components/notice";
import { SectionCard } from "../../components/section-card";
import { StatCard } from "../../components/stat-card";
import { StatusBadge } from "../../components/status-badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { NativeSelect, NativeSelectOption } from "../../components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { getFraudPageData } from "../../lib/dashboard-data";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function FraudPage({
  searchParams,
}: {
  searchParams?: Promise<{ detail?: string; result?: string }>;
}) {
  const params = await searchParams;
  const {
    branchRisk,
    currentBranchLabel,
    investigationQueue,
    isLive,
    profile,
    rules,
    summary,
    topAgents,
    trend,
  } = await getFraudPageData();
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [breadcrumb("Fraud Center")])}
      currentBranchLabel={currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Fraud Center"
      subtitle="Real-time operational risk review for suspicious cash movements, device trust drift, and approval anomalies."
    >
      <ResultNotice
        detail={params?.detail}
        errorFallback="Something went wrong."
        result={params?.result}
        successFallback="Saved successfully."
      />

      <div className="grid gap-4 xl:grid-cols-5">
        <StatCard
          description="Open and investigating alerts across the visible scope."
          label="Open Alerts"
          tone={summary.openAlerts > 0 ? "warning" : "default"}
          value={String(summary.openAlerts)}
        />
        <StatCard
          description="High-score transaction-linked alerts needing immediate review."
          label="High Risk Transactions"
          tone={summary.highRiskTransactions > 0 ? "danger" : "default"}
          value={String(summary.highRiskTransactions)}
        />
        <StatCard
          description="Offline burst cases currently active."
          label="Offline Bursts"
          tone={summary.offlineBurstCases > 0 ? "warning" : "default"}
          value={String(summary.offlineBurstCases)}
        />
        <StatCard
          description="Conflicting or recently reset device trust signals."
          label="Multi-Device Flags"
          tone={summary.multiDeviceFlags > 0 ? "danger" : "default"}
          value={String(summary.multiDeviceFlags)}
        />
        <StatCard
          description="Average review time for recently approved transactions."
          label="Avg Approval Time"
          tone="success"
          value={`${summary.averageApprovalSeconds}s`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr_0.9fr]">
        <SectionCard
          className="border border-border/70 bg-card/95 shadow-sm"
          description="Seven-day view of total alerts versus high-severity cases."
          title="Suspicious Activity Trend"
        >
          <FraudTrendChart data={trend} />
        </SectionCard>

        <SectionCard
          className="border border-border/70 bg-card/95 shadow-sm"
          description="Branch-level concentration of active alert pressure."
          title="Branch Risk Summary"
        >
          <div className="space-y-3">
            {branchRisk.slice(0, 6).map((row) => (
              <div
                className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4"
                key={row.branchId}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{row.branchName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Risk score {row.totalScore}
                    </p>
                  </div>
                  <StatusBadge>{row.highCount > 0 ? `${row.highCount} high` : "stable"}</StatusBadge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl bg-muted/70 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Open</p>
                    <p className="mt-1 font-semibold text-foreground">{row.openCount}</p>
                  </div>
                  <div className="rounded-xl bg-muted/70 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Investigating</p>
                    <p className="mt-1 font-semibold text-foreground">{row.investigatingCount}</p>
                  </div>
                  <div className="rounded-xl bg-muted/70 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">High</p>
                    <p className="mt-1 font-semibold text-foreground">{row.highCount}</p>
                  </div>
                </div>
              </div>
            ))}
            {branchRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active branch-level fraud pressure is visible right now.</p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          className="border border-border/70 bg-card/95 shadow-sm"
          description="Highest priority alerts ready for assignment or closure."
          title="Investigation Queue"
        >
          <div className="space-y-4">
            {investigationQueue.map((alert) => (
              <Card className="border border-border/60 bg-background/70 shadow-none" key={alert.id}>
                <CardHeader className="gap-3 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{alert.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{alert.summary}</p>
                    </div>
                    <StatusBadge>{`${alert.status} · ${alert.score}`}</StatusBadge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{alert.branchName}</span>
                    <span>{alert.agentName ?? "No agent"}</span>
                    <span>{formatDateTime(alert.lastSeenAt)}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <form action={updateFraudAlertStatusAction} className="space-y-3">
                    <input name="alertId" type="hidden" value={alert.id} />
                    <NativeSelect defaultValue={alert.status} name="status">
                      <NativeSelectOption value="open">Open</NativeSelectOption>
                      <NativeSelectOption value="investigating">Investigating</NativeSelectOption>
                      <NativeSelectOption value="resolved">Resolved</NativeSelectOption>
                      <NativeSelectOption value="false_positive">False positive</NativeSelectOption>
                    </NativeSelect>
                    <Input name="note" placeholder="Optional note for the case history" />
                    <Button className="w-full" size="sm" type="submit" variant="outline">
                      Update Alert
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
            {investigationQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts are waiting in the investigation queue.</p>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <SectionCard
          className="border border-border/70 bg-card/95 shadow-sm"
          description="Agents with the heaviest active alert concentration."
          title="Top Risky Agents"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead>Highest Score</TableHead>
                <TableHead>Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topAgents.map((agent) => (
                <TableRow key={agent.agentId}>
                  <TableCell className="font-medium">{agent.agentName}</TableCell>
                  <TableCell>{agent.branchName}</TableCell>
                  <TableCell>{agent.alertCount}</TableCell>
                  <TableCell>
                    <StatusBadge>{String(agent.highestScore)}</StatusBadge>
                  </TableCell>
                  <TableCell>{agent.latestDetectedAt}</TableCell>
                </TableRow>
              ))}
              {topAgents.length === 0 ? (
                <TableRow>
                  <TableCell className="text-sm text-muted-foreground" colSpan={5}>
                    No agent risk concentration is visible yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard
          className="border border-border/70 bg-card/95 shadow-sm"
          description="Each rule is fixed in code for v1 and shown here for operator clarity."
          title="Rule Library"
        >
          <div className="grid gap-3">
            {rules.map((rule) => (
              <div
                className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4"
                key={rule.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{rule.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                  <StatusBadge>{rule.severity}</StatusBadge>
                </div>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p className="uppercase tracking-[0.14em]">{rule.summaryLabel}</p>
                  <p className="text-sm normal-case tracking-normal text-foreground">{rule.thresholdLabel}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AdminShell>
  );
}
