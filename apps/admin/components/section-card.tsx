import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type SectionCardProps = {
  children: ReactNode;
  description?: string;
  title: string;
};

export function SectionCard({ children, description, title }: SectionCardProps) {
  return (
    <Card className="border border-border/70 bg-card/95 shadow-sm backdrop-blur  my-2 ">
      <CardHeader className="border-b border-border/60">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4 pt-5">{children}</CardContent>
    </Card>
  );
}
