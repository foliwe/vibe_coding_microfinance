import type { ComponentType } from "react";

import { cn } from "../lib/utils";
import { StatusBadge } from "./status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type MetricCardProps = {
  description?: string;
  icon?: ComponentType<{ "data-icon"?: string; className?: string }>;
  label: string;
  tone?: "default" | "success" | "warning" | "danger";
  value: string;
};

const toneClasses = {
  default: "from-card via-card to-muted/30",
  success: "from-emerald-500/8 via-card to-card",
  warning: "from-amber-500/12 via-card to-card",
  danger: "from-destructive/8 via-card to-card",
} as const;

const toneLabels = {
  default: "Overview",
  success: "Healthy",
  warning: "Attention",
  danger: "Risk",
} as const;

export function MetricCard({
  description,
  icon: Icon,
  label,
  tone = "default",
  value,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border border-border/70 bg-linear-to-br shadow-sm",
        toneClasses[tone]
      )}
    >
      <CardHeader className="gap-3 border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-[0.18em]">
              {label}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight md:text-3xl">
              {value}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {Icon ? <Icon data-icon="inline-start" /> : null}
            <StatusBadge>{toneLabels[tone]}</StatusBadge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">
          {description ?? "Operational snapshot for the current scope."}
        </p>
      </CardContent>
    </Card>
  );
}

export function StatCard(props: MetricCardProps) {
  return <MetricCard {...props} />;
}
