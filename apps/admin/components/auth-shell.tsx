import type { ReactNode } from "react";

import { cn } from "../lib/utils";
import { Card, CardContent, CardHeader } from "./ui/card";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-lg flex-col gap-4">{children}</div>
    </main>
  );
}

export function AuthCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/70 bg-card/95 shadow-sm backdrop-blur", className)}>
      {children}
    </Card>
  );
}

export function AuthCardHeader({ children }: { children: ReactNode }) {
  return <CardHeader className="gap-2">{children}</CardHeader>;
}

export function AuthCardContent({ children }: { children: ReactNode }) {
  return <CardContent>{children}</CardContent>;
}
