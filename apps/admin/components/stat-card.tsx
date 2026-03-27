import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning";
  icon?: ReactNode;
}

export function StatCard({ label, value, hint, tone = "default", icon }: StatCardProps) {
  return (
    <section className={`card stat-card tone-${tone}`}>
      <div className="stat-row">
        <span className="muted">{label}</span>
        <span>{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      {hint ? <p className="muted">{hint}</p> : null}
    </section>
  );
}
