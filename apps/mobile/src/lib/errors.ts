type ErrorWithMessage = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  error_description?: unknown;
};

function normalizeErrorPart(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed || fallback;
  }

  if (error && typeof error === "object") {
    const nextError = error as ErrorWithMessage;
    const parts = [
      normalizeErrorPart(nextError.message),
      normalizeErrorPart(nextError.details),
      normalizeErrorPart(nextError.hint),
      normalizeErrorPart(nextError.error_description),
    ].filter((value): value is string => Boolean(value));

    if (parts.length > 0) {
      return Array.from(new Set(parts)).join(" ");
    }
  }

  return fallback;
}
