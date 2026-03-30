import type { TransactionType } from "@credit-union/shared";

import type { AdminTransactionPageContext } from "../lib/onboarding-data";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Textarea } from "./ui/textarea";
import { SectionCard } from "./section-card";

type AdminTransactionFormProps = {
  action: (formData: FormData) => Promise<void>;
  buttonLabel: string;
  context: AdminTransactionPageContext;
  description: string;
  detail?: string;
  result?: string;
  title: string;
  transactionType: Extract<TransactionType, "deposit" | "withdrawal">;
};

function Notice({ detail, result }: { detail?: string; result?: string }) {
  if (!result) {
    return null;
  }

  return (
    <p className={`notice ${result === "success" ? "notice-success" : "notice-error"}`}>
      {detail ??
        (result === "success"
          ? "Saved successfully."
          : "Something went wrong while creating the transaction.")}
    </p>
  );
}

export function AdminTransactionForm({
  action,
  buttonLabel,
  context,
  description,
  detail,
  result,
  title,
  transactionType,
}: AdminTransactionFormProps) {
  return (
    <SectionCard
      description={description}
      title={title}
    >
      <Notice detail={detail} result={result} />
      <form action={action} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="memberAccountId">Member account</Label>
            <NativeSelect defaultValue="" id="memberAccountId" name="memberAccountId" required>
              <NativeSelectOption disabled value="">
                Select account
              </NativeSelectOption>
              {context.memberAccounts.map((account) => (
                <NativeSelectOption key={account.id} value={account.id}>
                  {account.memberName} · {account.accountType} · {account.accountNumber}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cashAgentProfileId">Cash drawer agent</Label>
            <NativeSelect defaultValue="" id="cashAgentProfileId" name="cashAgentProfileId" required>
              <NativeSelectOption disabled value="">
                Select agent
              </NativeSelectOption>
              {context.agents.map((agent) => (
                <NativeSelectOption key={agent.id} value={agent.id}>
                  {agent.fullName} · {agent.branchName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              {transactionType === "deposit" ? "Deposit amount" : "Withdrawal amount"}
            </Label>
            <Input id="amount" min="0.01" name="amount" placeholder="25000" required step="0.01" type="number" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchScope">Branch scope</Label>
            <Input disabled id="branchScope" value={context.currentBranchLabel} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Note</Label>
          <Textarea id="note" name="note" placeholder="Optional ledger note or cash-drawer context." />
        </div>

        <Button type="submit">{buttonLabel}</Button>
      </form>
    </SectionCard>
  );
}
