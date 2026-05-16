create index if not exists app_content_pages_updated_by_idx
  on public.app_content_pages (updated_by)
  where updated_by is not null;
