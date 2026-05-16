import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "./ui/field";

export function AdminFieldGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <FieldGroup
      className={cn("grid gap-4 md:grid-cols-2", className)}
      {...props}
    />
  );
}

export function AdminFormField({
  children,
  description,
  htmlFor,
  label,
}: {
  children: ReactNode;
  description?: ReactNode;
  htmlFor?: string;
  label: ReactNode;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      <FieldContent>
        {children}
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </FieldContent>
    </Field>
  );
}
