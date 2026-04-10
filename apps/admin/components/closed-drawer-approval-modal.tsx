"use client";

import { useMemo, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ClosedDrawerApprovalModalProps = {
  businessDate: string;
  drawerStatus: "closed" | "pending_review";
  nextApprovalAt: string;
  transactionType: "deposit" | "withdrawal";
};

const MODAL_QUERY_KEYS = [
  "businessDate",
  "detail",
  "drawerStatus",
  "modal",
  "nextApprovalAt",
  "result",
  "transactionType",
] as const;

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatLocalApprovalTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(parsed);
}

export function ClosedDrawerApprovalModal({
  businessDate,
  drawerStatus,
  nextApprovalAt,
  transactionType,
}: ClosedDrawerApprovalModalProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);

  const cleanedHref = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    for (const key of MODAL_QUERY_KEYS) {
      nextParams.delete(key);
    }

    const query = nextParams.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);

  const formattedNextApprovalTime = formatLocalApprovalTime(nextApprovalAt);
  const formattedBusinessDate = useMemo(() => {
    const parsed = new Date(`${businessDate}T00:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
      return businessDate;
    }

    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(parsed);
  }, [businessDate]);

  function closeModal() {
    setOpen(false);
    router.replace(cleanedHref as Route, { scroll: false });
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          router.replace(cleanedHref as Route, { scroll: false });
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cash drawer is no longer open</DialogTitle>
          <DialogDescription>
            This {transactionType} request could not be approved because the agent&apos;s cash drawer
            for {formattedBusinessDate} is already {drawerStatus === "pending_review" ? "pending review" : "closed"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            The pending transaction was left unchanged and has not been posted to the ledger.
          </p>
          <p>
            {formattedNextApprovalTime
              ? `You can approve this transaction after ${formattedNextApprovalTime} in your local time.`
              : "You can approve this transaction after the next UTC business-day rollover."}
          </p>
          <p>
            Next approval window: <span className="font-medium text-foreground">{formattedNextApprovalTime ?? nextApprovalAt}</span>
          </p>
          <p>
            Status: <span className="font-medium text-foreground">{toTitleCase(drawerStatus === "pending_review" ? "pending review" : drawerStatus)}</span>
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => router.push(cleanedHref as Route)} type="button">
            Back to Transactions
          </Button>
          <Button onClick={closeModal} type="button" variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
