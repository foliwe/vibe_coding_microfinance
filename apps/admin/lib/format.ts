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

export function prettyDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatElapsedTime(from: string | Date, to: string | Date = new Date()): string {
  const start = new Date(from);
  const end = new Date(to);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0 && months > 0) {
    return `${years} year${years === 1 ? "" : "s"}, ${months} month${months === 1 ? "" : "s"}`;
  }

  if (years > 0) {
    return `${years} year${years === 1 ? "" : "s"}`;
  }

  if (months > 0) {
    return `${months} month${months === 1 ? "" : "s"}`;
  }

  const diffMs = Math.max(end.getTime() - start.getTime(), 0);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
  }

  return "today";
}
