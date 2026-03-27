import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";

export default function ReportsPage() {
  return (
    <AdminShell
      role="admin"
      title="Reports"
      subtitle="Generate branch or institution-wide exports for collections, loans, reconciliation, and audit history."
    >
      <SectionCard title="Generate Report" description="Export reports as CSV, XLSX, or a printable/PDF-friendly layout.">
        <div className="form-grid">
          <label className="field">
            <span>Report Type</span>
            <select defaultValue="daily_collections">
              <option value="daily_collections">Daily Collections</option>
              <option value="member_statement">Member Statement</option>
              <option value="loan_portfolio">Loan Portfolio</option>
              <option value="arrears_default">Arrears / Default</option>
              <option value="reconciliation_variance">Reconciliation Variance</option>
              <option value="audit_trail">Audit Trail</option>
            </select>
          </label>
          <label className="field">
            <span>Branch</span>
            <select defaultValue="all">
              <option value="all">All Branches</option>
              <option value="bamenda">Bamenda Central</option>
              <option value="douala">Douala North</option>
              <option value="buea">Buea Main</option>
            </select>
          </label>
          <label className="field">
            <span>Date From</span>
            <input placeholder="2026-03-01" />
          </label>
          <label className="field">
            <span>Date To</span>
            <input placeholder="2026-03-27" />
          </label>
          <label className="field">
            <span>Export Format</span>
            <select defaultValue="csv">
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
              <option value="pdf">Printable / PDF</option>
            </select>
          </label>
        </div>
        <div className="actions">
          <button className="button" type="button">
            Generate Report
          </button>
        </div>
      </SectionCard>
    </AdminShell>
  );
}
