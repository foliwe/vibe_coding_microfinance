import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { resetStaffDeviceAction } from "../actions";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { requireRole } from "../../lib/auth";

type ProfileRow = {
  id: string;
  role: "agent" | "branch_manager";
  full_name: string;
  branch_id: string | null;
  is_active: boolean;
};

type StaffUserRow = {
  profile_id: string;
  branch_id: string;
  device_binding_required: boolean;
  status: string;
};

type DeviceRow = {
  profile_id: string;
  device_id: string;
  device_kind: "mobile" | "workstation";
  device_name: string | null;
  last_seen_at: string | null;
};

type BranchRow = {
  id: string;
  name: string;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-CM", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function StaffDevicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ detail?: string; result?: string }>;
}) {
  const { profile, supabase } = await requireRole(["admin", "branch_manager"]);
  const params = await searchParams;
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  const [profileResponse, staffUserResponse, deviceResponse, branchResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, full_name, branch_id, is_active")
      .in("role", ["agent", "branch_manager"])
      .order("full_name", { ascending: true }),
    supabase
      .from("staff_users")
      .select("profile_id, branch_id, device_binding_required, status"),
    supabase
      .from("device_registrations")
      .select("profile_id, device_id, device_kind, device_name, last_seen_at")
      .eq("is_active", true),
    supabase.from("branches").select("id, name"),
  ]);

  const branchMap = new Map(
    (((branchResponse.data as BranchRow[] | null) ?? [])).map((branch) => [branch.id, branch.name]),
  );
  const staffUserMap = new Map(
    (((staffUserResponse.data as StaffUserRow[] | null) ?? [])).map((staffUser) => [
      staffUser.profile_id,
      staffUser,
    ]),
  );
  const activeDeviceMap = new Map(
    (((deviceResponse.data as DeviceRow[] | null) ?? [])).map((device) => [device.profile_id, device]),
  );

  const rows = (((profileResponse.data as ProfileRow[] | null) ?? [])).map((row) => {
    const staffUser = staffUserMap.get(row.id);
    const device = activeDeviceMap.get(row.id);
    const branchId = staffUser?.branch_id ?? row.branch_id;

    return {
      branchName: branchId ? branchMap.get(branchId) ?? branchId : "Unassigned",
      deviceLabel: device
        ? device.device_name ??
          (device.device_kind === "workstation" ? "Shared workstation" : "Trusted mobile phone")
        : "Awaiting trusted rebind",
      id: row.id,
      isActive: row.is_active,
      lastSeenAt: formatDateTime(device?.last_seen_at ?? null),
      roleLabel: row.role === "branch_manager" ? "Branch Manager" : "Agent",
      staffName: row.full_name,
      status:
        device && staffUser?.device_binding_required !== true
          ? "Trusted"
          : "Reset required",
    };
  });

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [breadcrumb("Staff Devices")])}
      currentBranchLabel={profile.role === "admin" ? "All branches" : (profile.branch_id ?? "Branch")}
      currentUserName={profile.full_name}
      role={role}
      statusBadge="Live Supabase"
      title="Staff Device Trust"
      subtitle="Reset and audit trusted phones for agents plus trusted workstation bindings for branch managers."
    >
      {params?.result && params.detail ? (
        <SectionCard title={params.result === "success" ? "Success" : "Issue"}>
          <p className={params.result === "success" ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
            {params.detail}
          </p>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Trust Registry"
        description="Agents remain bound to one trusted phone. Branch managers bind per account, but multiple managers may trust the same office browser profile."
      >
        <table className="table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Trusted Device</th>
              <th>Last Seen</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.staffName}</td>
                <td>{row.roleLabel}</td>
                <td>{row.branchName}</td>
                <td>{row.deviceLabel}</td>
                <td>{row.lastSeenAt}</td>
                <td>
                  <span className="chip">{row.status}</span>
                </td>
                <td>
                  <form action={resetStaffDeviceAction}>
                    <input name="profileId" type="hidden" value={row.id} />
                    <input
                      name="reason"
                      type="hidden"
                      value="Manual reset from staff device trust console"
                    />
                    <button
                      className="button-secondary"
                      disabled={!row.isActive}
                      type="submit"
                    >
                      Reset Trust
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="muted" colSpan={7}>
                  No visible staff accounts were found for this scope yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
