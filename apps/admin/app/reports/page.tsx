import { requestReportAction } from "../actions";
import { AdminFieldGrid, AdminFormField } from "../../components/admin-form-field";
import { AdminShell } from "../../components/admin-shell";
import { AdminTableEmptyRow, AdminTableFrame } from "../../components/admin-table";
import { ResultNotice } from "../../components/notice";
import { SectionCard } from "../../components/section-card";
import { StatusBadge } from "../../components/status-badge";
import { Button } from "../../components/ui/button";
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
import { getReportsPageData } from "../../lib/dashboard-data";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; detail?: string }>;
}) {
  const params = await searchParams;
  const { branches, currentBranchLabel, isLive, profile, rows } = await getReportsPageData();
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [breadcrumb("Reports")])}
      currentBranchLabel={currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Reports"
      subtitle="Queue branch or institution-wide export requests and track their delivery status."
    >
      <SectionCard
        title="Queue Report"
        description="This now records a live report job in Supabase instead of showing a dead placeholder button."
      >
        <ResultNotice
          detail={params?.detail}
          errorFallback="Something went wrong."
          result={params?.result}
          successFallback="Saved successfully."
        />
        <form action={requestReportAction}>
          <AdminFieldGrid className="mb-5">
            <AdminFormField htmlFor="reportType" label="Report Type">
              <NativeSelect defaultValue="daily_collections" id="reportType" name="reportType">
                <NativeSelectOption value="daily_collections">Daily Collections</NativeSelectOption>
                <NativeSelectOption value="member_statement">Member Statement</NativeSelectOption>
                <NativeSelectOption value="loan_portfolio">Loan Portfolio</NativeSelectOption>
                <NativeSelectOption value="arrears_default">Arrears / Default</NativeSelectOption>
                <NativeSelectOption value="reconciliation_variance">Reconciliation Variance</NativeSelectOption>
                <NativeSelectOption value="audit_trail">Audit Trail</NativeSelectOption>
              </NativeSelect>
            </AdminFormField>
            <AdminFormField htmlFor="branchId" label="Branch">
              <NativeSelect
                defaultValue={profile.role === "branch_manager" ? profile.branch_id ?? "" : ""}
                id="branchId"
                name="branchId"
              >
                {profile.role === "admin" ? (
                  <NativeSelectOption value="">All Branches</NativeSelectOption>
                ) : null}
                {branches.map((branch) => (
                  <NativeSelectOption key={branch.id} value={branch.id}>
                    {branch.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </AdminFormField>
            <AdminFormField htmlFor="dateFrom" label="Date From">
              <Input id="dateFrom" name="dateFrom" type="date" />
            </AdminFormField>
            <AdminFormField htmlFor="dateTo" label="Date To">
              <Input id="dateTo" name="dateTo" type="date" />
            </AdminFormField>
            <AdminFormField htmlFor="exportFormat" label="Export Format">
              <NativeSelect defaultValue="csv" id="exportFormat" name="exportFormat">
                <NativeSelectOption value="csv">CSV</NativeSelectOption>
                <NativeSelectOption value="xlsx">XLSX</NativeSelectOption>
                <NativeSelectOption value="pdf">Printable / PDF</NativeSelectOption>
              </NativeSelect>
            </AdminFormField>
          </AdminFieldGrid>
          <Button type="submit">Queue Report</Button>
        </form>
      </SectionCard>

      <SectionCard title="Recent Report Jobs" description="Latest queued exports in the visible scope.">
        <AdminTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>File</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.reportType}</TableCell>
                <TableCell>{row.branchName}</TableCell>
                <TableCell>
                  <StatusBadge>{row.status}</StatusBadge>
                </TableCell>
                <TableCell>{row.requestedAt}</TableCell>
                <TableCell>{row.filePath ?? "Pending export"}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <AdminTableEmptyRow colSpan={5} description="No report jobs have been queued yet." />
            ) : null}
            </TableBody>
          </Table>
        </AdminTableFrame>
      </SectionCard>
    </AdminShell>
  );
}
