import { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <Card className="border border-[#735d4126] shadow-[0_10px_28px_rgba(35,24,10,0.05)]">
      <CardHeader className="section-header block p-5 pb-3">
        <CardTitle className="text-xl">{title}</CardTitle>
        {description ? <CardDescription className="muted mt-1">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="p-5 pt-1">{children}</CardContent>
    </Card>
  );
}
