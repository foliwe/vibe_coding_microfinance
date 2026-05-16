import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ActionBar } from "./action-bar";

type AdminSectionProps = {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: string;
  title: string;
};

export function AdminSection({
  actions,
  children,
  className,
  contentClassName,
  description,
  title,
}: AdminSectionProps) {
  return (
    <Card className={className ?? "border border-border/70 bg-card/95 shadow-sm"}>
      <CardHeader className="gap-3 border-b border-border/60">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <ActionBar>{actions}</ActionBar> : null}
      </CardHeader>
      <CardContent className={contentClassName ?? "space-y-4 pt-5"}>
        {children}
      </CardContent>
    </Card>
  );
}

export function SectionCard(props: AdminSectionProps) {
  return <AdminSection {...props} />;
}
