import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";

export function AdminDetailList({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-3", className)} {...props} />;
}

export function AdminDetailItem({
  children,
  className,
  label,
  value,
}: {
  children?: ReactNode;
  className?: string;
  label: ReactNode;
  value?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border/70 bg-background/80 px-4 py-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="text-sm text-muted-foreground sm:text-right">
        {children ?? value}
      </div>
    </div>
  );
}
