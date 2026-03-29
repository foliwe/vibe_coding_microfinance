import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";

type StatCardProps = {
  label: string;
  tone?: "default" | "success" | "warning";
  value: string;
};

const toneClasses = {
  default: "from-card via-card to-muted/30",
  success: "from-emerald-500/8 via-card to-card",
  warning: "from-amber-500/12 via-card to-card",
} as const;

const toneLabels = {
  default: "Live",
  success: "Healthy",
  warning: "Attention",
} as const;

export function StatCard({ label, tone = "default", value }: StatCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border border-border/70 bg-linear-to-br shadow-sm",
        toneClasses[tone]
      )}
    >
      <CardContent className="space-y-4 py-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <Badge variant={tone === "default" ? "outline" : "secondary"}>
            {toneLabels[tone]}
          </Badge>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
