import type { TransactionRequest } from "@credit-union/shared";

import { formatDateLabel, formatTransactionDayLabel, formatTransactionMonthLabel } from "./mobile-data";

export interface TransactionMonthTab {
  key: string;
  label: string;
}

export interface TransactionDayGroup<TTransaction extends { createdAt: string }> {
  key: string;
  label: string;
  transactions: TTransaction[];
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getTransactionMonthKey(value: string | Date) {
  const date = toDate(value);

  if (!date) {
    return "unknown";
  }

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}`;
}

function getTransactionDayKey(value: string | Date) {
  const date = toDate(value);

  if (!date) {
    return "unknown";
  }

  return `${getTransactionMonthKey(date)}-${padDatePart(date.getDate())}`;
}

function buildMonthDate(key: string) {
  const [yearValue, monthValue] = key.split("-");
  const year = Number(yearValue);
  const monthIndex = Number(monthValue) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return new Date(NaN);
  }

  return new Date(year, monthIndex, 1);
}

export function getCurrentTransactionMonthKey() {
  return getTransactionMonthKey(new Date());
}

export function buildTransactionMonthTabs(
  transactions: { createdAt: string }[],
  currentMonthKey = getCurrentTransactionMonthKey(),
): TransactionMonthTab[] {
  const monthKeys = new Set<string>([currentMonthKey]);

  for (const transaction of transactions) {
    monthKeys.add(getTransactionMonthKey(transaction.createdAt));
  }

  return Array.from(monthKeys)
    .filter((key) => key !== "unknown")
    .sort((left, right) => right.localeCompare(left))
    .map((key) => ({
      key,
      label: formatTransactionMonthLabel(buildMonthDate(key)),
    }));
}

export function buildTransactionDayGroups<TTransaction extends TransactionRequest>(
  transactions: TTransaction[],
  monthKey: string,
): TransactionDayGroup<TTransaction>[] {
  const monthTransactions = transactions
    .filter((transaction) => getTransactionMonthKey(transaction.createdAt) === monthKey)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

  const groups = new Map<string, TTransaction[]>();

  for (const transaction of monthTransactions) {
    const dayKey = getTransactionDayKey(transaction.createdAt);
    const entry = groups.get(dayKey);

    if (entry) {
      entry.push(transaction);
    } else {
      groups.set(dayKey, [transaction]);
    }
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, items]) => ({
      key,
      label: formatTransactionDayLabel(items[0]?.createdAt ?? key),
      transactions: items,
    }));
}

export function formatTransactionRowDate(value: string | Date) {
  return formatDateLabel(value);
}
