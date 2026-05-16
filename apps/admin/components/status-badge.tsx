import type { ComponentProps } from "react";

import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";

type StatusTone = "success" | "warning" | "danger" | "neutral";

function getStatusTone(value: string): StatusTone {
  const normalized = value.trim().toLowerCase();

  if (
    normalized.includes("reject") ||
    normalized.includes("error") ||
    normalized.includes("blocked") ||
    normalized.includes("default") ||
    normalized.includes("missing")
  ) {
    return "danger";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("await") ||
    normalized.includes("setup needed") ||
    normalized.includes("reset") ||
    normalized.includes("not implemented")
  ) {
    return "warning";
  }

  if (
    normalized.includes("live") ||
    normalized.includes("active") ||
    normalized.includes("approve") ||
    normalized.includes("trusted") ||
    normalized.includes("enabled") ||
    normalized.includes("configured") ||
    normalized.includes("clear") ||
    normalized.includes("success") ||
    normalized.includes("disbursed")
  ) {
    return "success";
  }

  return "neutral";
}

const toneClasses: Record<StatusTone, string> = {
  success:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger:
    "border-destructive/20 bg-destructive/10 text-destructive dark:text-destructive",
  neutral:
    "border-border bg-secondary text-secondary-foreground",
};

type StatusBadgeProps = Omit<ComponentProps<typeof Badge>, "children"> & {
  children: string;
};

export function StatusBadge({
  children,
  className,
  variant,
  ...props
}: StatusBadgeProps) {
  const tone = getStatusTone(children);

  return (
    <Badge
      className={cn(toneClasses[tone], className)}
      variant={variant ?? (tone === "neutral" ? "secondary" : "outline")}
      {...props}
    >
      {children}
    </Badge>
  );
}
