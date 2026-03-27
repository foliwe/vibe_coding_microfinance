import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";

export default function SettingsPage() {
  return (
    <AdminShell
      role="admin"
      title="Settings"
      subtitle="Institution-level security and operating defaults for the cash-only system."
    >
      <SectionCard title="Security Defaults">
        <div className="list">
          <div className="list-item">
            <strong>Force first-login password change</strong>
            <span className="chip">enabled</span>
          </div>
          <div className="list-item">
            <strong>Require transaction PIN</strong>
            <span className="chip">enabled</span>
          </div>
          <div className="list-item">
            <strong>Device binding</strong>
            <span className="chip">enabled</span>
          </div>
          <div className="list-item">
            <strong>Suspicious activity alerts</strong>
            <span className="chip">enabled</span>
          </div>
        </div>
      </SectionCard>
    </AdminShell>
  );
}
