import { AdminShell } from "../../../components/admin-shell";
import { SectionCard } from "../../../components/section-card";

export default function CreateBranchPage() {
  return (
    <AdminShell
      role="admin"
      title="Create Branch"
      subtitle="Register a new branch, assign its manager, and establish the branch identity used for dashboard aggregates."
    >
      <SectionCard title="Branch Setup">
        <div className="form-grid">
          <label className="field">
            <span>Branch Name</span>
            <input placeholder="Bamenda Central" />
          </label>
          <label className="field">
            <span>Branch Code</span>
            <input placeholder="BAM" />
          </label>
          <label className="field">
            <span>City</span>
            <input placeholder="Bamenda" />
          </label>
          <label className="field">
            <span>Region</span>
            <input placeholder="Northwest" />
          </label>
          <label className="field">
            <span>Phone</span>
            <input placeholder="+2376..." />
          </label>
          <label className="field">
            <span>Branch Manager</span>
            <select defaultValue="">
              <option value="" disabled>
                Select branch manager
              </option>
              <option>Rose M.</option>
              <option>Peter T.</option>
            </select>
          </label>
        </div>
        <div className="actions">
          <button className="button" type="button">
            Create Branch
          </button>
        </div>
      </SectionCard>
    </AdminShell>
  );
}
