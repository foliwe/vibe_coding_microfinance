import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "./ui/empty";
import { TableCell, TableRow } from "./ui/table";

export function AdminTableFrame({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-xs",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AdminTableEmptyRow({
  colSpan,
  description,
  title = "Nothing to show yet",
}: {
  colSpan: number;
  description: ReactNode;
  title?: string;
}) {
  return (
    <TableRow>
      <TableCell className="p-0" colSpan={colSpan}>
        <Empty className="rounded-none border-0 py-8">
          <EmptyHeader>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </TableCell>
    </TableRow>
  );
}
