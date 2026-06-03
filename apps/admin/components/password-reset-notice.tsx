"use client";

import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import type { PasswordResetFlash } from "../lib/password-reset";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

function buildCredentialText({
  fullName,
  loginIdentifier,
  loginLabel,
  temporaryPassword,
}: PasswordResetFlash) {
  return [
    `Name: ${fullName}`,
    `${loginLabel}: ${loginIdentifier}`,
    `Temporary password: ${temporaryPassword}`,
  ].join("\n");
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Some embedded browsers expose the Clipboard API but deny writes.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.left = "-9999px";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    const copied = document.execCommand("copy");

    if (!copied) {
      throw new Error("Copy command failed.");
    }
  } finally {
    document.body.removeChild(textArea);
  }
}

export function PasswordResetNotice(props: PasswordResetFlash) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const credentialText = buildCredentialText(props);

  const closeAfterCopy = () => {
    if (!copied) {
      return;
    }

    setOpen(false);
    router.replace(pathname as Route, { scroll: false });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true);
          return;
        }

        closeAfterCopy();
      }}
    >
      <DialogContent
        className="sm:max-w-lg"
        onEscapeKeyDown={(event) => {
          if (!copied) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (!copied) {
            event.preventDefault();
          }
        }}
        showCloseButton={copied}
      >
        <DialogHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRoundIcon className="size-5" />
          </div>
          <DialogTitle>Password reset credentials</DialogTitle>
          <DialogDescription>
            Copy these credentials before closing this modal. The temporary password is shown only for secure handoff.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Account
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{props.fullName}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {props.loginLabel}
            </p>
            <p className="mt-1 break-all font-mono text-sm text-foreground">{props.loginIdentifier}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              New temporary password
            </p>
            <p className="mt-1 break-all font-mono text-sm text-foreground">{props.temporaryPassword}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          The user must change this password at next login. Existing transaction PIN setup remains unchanged.
        </p>
        {copyError ? <p className="text-xs font-medium text-destructive">{copyError}</p> : null}

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {copied ? "Credentials copied. You can close now." : "Close is locked until the copy button succeeds."}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button disabled={!copied} onClick={closeAfterCopy} type="button" variant="outline">
              Close
            </Button>
            <Button
              onClick={() => {
                setCopyError(null);
                void copyText(credentialText)
                  .then(() => setCopied(true))
                  .catch(() => setCopyError("Copy failed. Please allow clipboard access and try again."));
              }}
              type="button"
            >
              {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
              {copied ? "Copied" : "Copy code and password"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
