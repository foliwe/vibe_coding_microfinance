export function compactCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CM", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function prettyCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}
