import { AdminShell } from "../../../components/admin-shell";
import { SectionCard } from "../../../components/section-card";

function Field({
  label,
  placeholder,
  as = "input",
}: {
  label: string;
  placeholder: string;
  as?: "input" | "textarea" | "select";
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {as === "textarea" ? (
        <textarea placeholder={placeholder} />
      ) : as === "select" ? (
        <select defaultValue="">
          <option value="" disabled>
            {placeholder}
          </option>
          <option>Bamenda Central</option>
          <option>Douala North</option>
          <option>Buea Main</option>
        </select>
      ) : (
        <input placeholder={placeholder} />
      )}
    </label>
  );
}

export default function CreateMemberPage() {
  return (
    <AdminShell
      role="branch_manager"
      title="Create Member"
      subtitle="Onboard a new member with branch assignment, agent ownership, accounts, and first-login credentials."
    >
      <SectionCard title="Member Onboarding Form" description="This form follows the agreed financial-app requirements, including identity, branch, next-of-kin, and account setup fields.">
        <div className="form-grid">
          <Field label="Full Name" placeholder="John Nkem" />
          <Field label="Date Of Birth" placeholder="1990-08-24" />
          <Field label="Gender" placeholder="Select gender" as="select" />
          <Field label="Phone Number" placeholder="+2376..." />
          <Field label="Email" placeholder="Optional email address" />
          <Field label="Occupation" placeholder="Trader" />
          <Field label="ID Type" placeholder="National ID" />
          <Field label="ID Number" placeholder="CM123456789" />
          <Field label="Branch" placeholder="Select branch" as="select" />
          <Field label="Assigned Agent" placeholder="Select agent" as="select" />
          <Field label="Next Of Kin Name" placeholder="Jane Nkem" />
          <Field label="Next Of Kin Phone" placeholder="+2376..." />
          <Field label="Savings Account Number" placeholder="Auto-generate or type" />
          <Field label="Deposit Account Number" placeholder="Auto-generate or type" />
          <Field label="Residential Address" placeholder="Mile 4 Nkwen" as="textarea" />
          <Field label="Risk Notes" placeholder="Optional internal notes" as="textarea" />
        </div>
        <div className="actions">
          <button className="button" type="button">
            Save Member
          </button>
          <button className="button-secondary" type="button">
            Save And Add Another
          </button>
        </div>
      </SectionCard>
    </AdminShell>
  );
}
