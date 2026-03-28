import { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning";
  icon?: ReactNode;
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "",
  success: "bg-emerald-50/80",
  warning: "bg-amber-50/80",
};

export function StatCard({ label, value, hint, tone = "default", icon }: StatCardProps) {
  return (
    <Card className={cn("stat-card border border-[#735d4126] shadow-[0_10px_28px_rgba(35,24,10,0.05)]", toneStyles[tone])}>
      <CardHeader className="stat-row space-y-0 p-5 pb-2">
        <span className="muted text-sm">{label}</span>
        {icon ? <Badge variant="outline">{icon}</Badge> : null}
      </CardHeader>
      <CardContent className="p-5 pt-1">
        <strong className="stat-value text-3xl font-semibold tracking-tight">{value}</strong>
        {hint ? <p className="muted text-sm">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
