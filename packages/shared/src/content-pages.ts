export const APP_CONTENT_PAGE_KEYS = ["about_us", "terms_conditions"] as const;

export type AppContentPageKey = (typeof APP_CONTENT_PAGE_KEYS)[number];

export type AppContentPage = {
  content: string;
  key: AppContentPageKey;
  title: string;
  updatedAt?: string;
};

export const DEFAULT_APP_CONTENT_PAGES: Record<AppContentPageKey, AppContentPage> = {
  about_us: {
    key: "about_us",
    title: "About Us",
    content: `# About Us

Foliwe Credit Union helps members save, borrow, and manage daily financial activity with trusted local support.

## What We Do

- Support member savings and deposits
- Provide loan services with clear approval steps
- Keep branch, agent, and member activity transparent

Our team is committed to practical financial access, responsible lending, and service that stays close to the communities we support.`,
  },
  terms_conditions: {
    key: "terms_conditions",
    title: "Terms & Conditions",
    content: `# Terms & Conditions

These terms explain the basic rules for using Foliwe Credit Union member services.

## Member Responsibilities

1. Keep your account details accurate.
2. Protect your password, PIN, and device access.
3. Review transaction activity and report concerns promptly.

Transactions, loan activity, and profile updates may be reviewed by authorized credit union staff for security, compliance, and member support.`,
  },
};

export function isAppContentPageKey(value: string): value is AppContentPageKey {
  return APP_CONTENT_PAGE_KEYS.includes(value as AppContentPageKey);
}
