import Link from "next/link";

import { ActivityTrendChart, ChartBars } from "../../../components/chart-bars";
import { AdminShell } from "../../../components/admin-shell";
import { SectionCard } from "../../../components/section-card";
import { StatCard } from "../../../components/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { getAgentDetailPageData } from "../../../lib/dashboard-data";
import { prettyCurrency } from "../../../lib/format";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { activityTrend, agent, currentBranchLabel, isLive, members, profile, recentTransactions } =
    await getAgentDetailPageData(id);
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      currentBranchLabel={agent?.branchName ?? currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title={agent?.fullName ?? "Agent Detail"}
      subtitle="Profile context, assigned member relationships, and recent field activity for one agent."
    >
      {agent ? (
        <>
          <div className="grid grid-4">
            <StatCard label="Assigned Members" value={String(agent.assignedMemberCount)} />
            <StatCard label="Collections Today" value={prettyCurrency(agent.collectionsToday)} tone="success" />
            <StatCard label="Pending Approvals" value={String(agent.pendingApprovals)} tone="warning" />
            <StatCard label="Cash Variance" value={prettyCurrency(agent.cashVariance)} />
          </div>

          <div className="grid grid-2">
            <SectionCard title="Agent Profile" description="Branch ownership, contact details, and current status.">
              <div className="list">
                <div className="list-item">
                  <strong>Branch</strong>
                  <span>{agent.branchName}</span>
                </div>
                <div className="list-item">
                  <strong>Phone</strong>
                  <span>{agent.phone}</span>
                </div>
                <div className="list-item">
                  <strong>Status</strong>
                  <span className="chip">{agent.status}</span>
                </div>
                <div className="list-item">
                  <strong>Total Recent Collections</strong>
                  <span>{prettyCurrency(agent.collectionsTotal)}</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Activity Snapshot" description="Quick bar view of member coverage and approval pressure.">
              <ChartBars
                data={[
                  { label: "Members", value: agent.assignedMemberCount },
                  { label: "Pending", value: agent.pendingApprovals },
                  { label: "Today", value: agent.collectionsToday },
                ]}
              />
            </SectionCard>
          </div>

          <div className="grid grid-2">
            <SectionCard title="Collections Trend" description="Deposit and withdrawal activity for the most recent seven days.">
              {recentTransactions.length ? (
                <ActivityTrendChart data={activityTrend} />
              ) : (
                <p className="muted">No recent transaction activity is available for this agent yet.</p>
              )}
            </SectionCard>

            <SectionCard title="Assigned Members" description="Members currently assigned to this agent.">
              {members.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Occupation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <Link className="underline-offset-4 hover:underline" href={`/members/${member.id}`}>
                            {member.fullName}
                          </Link>
                        </TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell>{member.status}</TableCell>
                        <TableCell>{member.occupation ?? "No occupation"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="muted">No members are assigned to this agent yet.</p>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Recent Transactions" description="Latest transaction requests handled by this agent.">
            {recentTransactions.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell>
                        <Link className="underline-offset-4 hover:underline" href={`/members/${transaction.memberId}`}>
                          {transaction.memberName}
                        </Link>
                      </TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell>{transaction.status}</TableCell>
                      <TableCell>{prettyCurrency(transaction.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="muted">No transactions have been recorded for this agent yet.</p>
            )}
          </SectionCard>
        </>
      ) : (
        <SectionCard title="Agent not found">
          <p className="muted">No live agent record matches this route or your current branch scope.</p>
        </SectionCard>
      )}
    </AdminShell>
  );
}
