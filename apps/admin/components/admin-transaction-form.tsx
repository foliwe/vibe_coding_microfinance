import type { TransactionType } from "@credit-union/shared";

import type { AdminTransactionPageContext } from "../lib/onboarding-data";
import { AdminFieldGrid, AdminFormField } from "./admin-form-field";
import { ResultNotice } from "./notice";
import { AdminSection } from "./section-card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Textarea } from "./ui/textarea";

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
    <AdminSection
      description={description}
      title={title}
    >
      <ResultNotice
        detail={detail}
        errorFallback="Something went wrong while creating the transaction."
        result={result}
        successFallback="Saved successfully."
      />
      <form action={action} className="space-y-5">
        <AdminFieldGrid>
          <AdminFormField htmlFor="memberAccountId" label="Member account">
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
          </AdminFormField>

          <AdminFormField htmlFor="cashAgentProfileId" label="Cash drawer agent">
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
          </AdminFormField>

          <AdminFormField
            htmlFor="amount"
            label={transactionType === "deposit" ? "Deposit amount" : "Withdrawal amount"}
          >
            <Input
              id="amount"
              min="0.01"
              name="amount"
              placeholder="25000"
              required
              step="0.01"
              type="number"
            />
          </AdminFormField>

          <AdminFormField htmlFor="branchScope" label="Branch scope">
            <Input disabled id="branchScope" value={context.currentBranchLabel} />
          </AdminFormField>
        </AdminFieldGrid>

        <AdminFormField htmlFor="note" label="Note">
          <Textarea id="note" name="note" placeholder="Optional ledger note or cash-drawer context." />
        </AdminFormField>

        <Button type="submit">{buttonLabel}</Button>
      </form>
    </AdminSection>
  );
}
