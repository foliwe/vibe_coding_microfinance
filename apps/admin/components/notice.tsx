import type { ReactNode } from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  InfoIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { cn } from "../lib/utils";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

type NoticeTone = "success" | "error" | "warning" | "info";

const iconByTone = {
  success: CheckCircle2Icon,
  error: AlertCircleIcon,
  warning: TriangleAlertIcon,
  info: InfoIcon,
} as const;

const toneClasses: Record<NoticeTone, string> = {
  success: "border-emerald-500/20 bg-emerald-500/8",
  error: "border-destructive/25 bg-destructive/8",
  warning: "border-amber-500/25 bg-amber-500/8",
  info: "border-border bg-card/90",
};

type NoticeProps = {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title?: string;
  tone?: NoticeTone;
};

export function Notice({
  children,
  className,
  description,
  title,
  tone = "info",
}: NoticeProps) {
  const Icon = iconByTone[tone];

  return (
    <Alert className={cn(toneClasses[tone], className)}>
      <Icon />
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>
        {children}
        {description ? <div className="mt-1">{description}</div> : null}
      </AlertDescription>
    </Alert>
  );
}

export function ResultNotice({
  detail,
  errorFallback,
  successFallback,
  result,
}: {
  detail?: string;
  errorFallback: string;
  successFallback: string;
  result?: string;
}) {
  if (!result) {
    return null;
  }

  return (
    <Notice tone={result === "error" ? "error" : "success"}>
      {detail ?? (result === "error" ? errorFallback : successFallback)}
    </Notice>
  );
}
