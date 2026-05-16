import {
  APP_CONTENT_PAGE_KEYS,
  DEFAULT_APP_CONTENT_PAGES,
  type AppContentPage,
  type AppContentPageKey,
} from "@credit-union/shared";

import { hasSupabaseEnv } from "./supabase/env";
import { createClient } from "./supabase/server";

export type AdminContentPage = AppContentPage & {
  isPublished: boolean;
};

type AppContentPageRow = {
  content: string;
  is_published: boolean;
  key: AppContentPageKey;
  title: string;
  updated_at: string;
};

function fallbackPages(): AdminContentPage[] {
  return APP_CONTENT_PAGE_KEYS.map((key) => ({
    ...DEFAULT_APP_CONTENT_PAGES[key],
    isPublished: true,
  }));
}

export async function getAdminContentPages(): Promise<AdminContentPage[]> {
  if (!hasSupabaseEnv()) {
    return fallbackPages();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_content_pages")
    .select("key, title, content, is_published, updated_at")
    .in("key", [...APP_CONTENT_PAGE_KEYS])
    .order("key", { ascending: true });

  if (error) {
    return fallbackPages();
  }

  const rows = (data as AppContentPageRow[] | null) ?? [];
  const rowMap = new Map(rows.map((row) => [row.key, row]));

  return APP_CONTENT_PAGE_KEYS.map((key) => {
    const row = rowMap.get(key);

    if (!row) {
      return {
        ...DEFAULT_APP_CONTENT_PAGES[key],
        isPublished: true,
      };
    }

    return {
      content: row.content,
      isPublished: row.is_published,
      key: row.key,
      title: row.title,
      updatedAt: row.updated_at,
    };
  });
}
