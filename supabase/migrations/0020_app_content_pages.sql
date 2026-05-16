create table if not exists public.app_content_pages (
  key text primary key check (key in ('about_us', 'terms_conditions')),
  title text not null,
  content text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id)
);

create index if not exists app_content_pages_published_idx
  on public.app_content_pages (is_published)
  where is_published = true;

alter table public.app_content_pages enable row level security;

drop policy if exists "published app content readable by authenticated users" on public.app_content_pages;
create policy "published app content readable by authenticated users"
  on public.app_content_pages
  for select
  to authenticated
  using (is_published = true or (select public.is_admin()));

drop policy if exists "admins can insert app content" on public.app_content_pages;
create policy "admins can insert app content"
  on public.app_content_pages
  for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "admins can update app content" on public.app_content_pages;
create policy "admins can update app content"
  on public.app_content_pages
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "admins can delete app content" on public.app_content_pages;
create policy "admins can delete app content"
  on public.app_content_pages
  for delete
  to authenticated
  using ((select public.is_admin()));

grant select, insert, update, delete on public.app_content_pages to authenticated;
grant all on public.app_content_pages to service_role;

insert into public.app_content_pages (key, title, content, is_published)
values
  (
    'about_us',
    'About Us',
    '# About Us

Foliwe Credit Union helps members save, borrow, and manage daily financial activity with trusted local support.

## What We Do

- Support member savings and deposits
- Provide loan services with clear approval steps
- Keep branch, agent, and member activity transparent

Our team is committed to practical financial access, responsible lending, and service that stays close to the communities we support.',
    true
  ),
  (
    'terms_conditions',
    'Terms & Conditions',
    '# Terms & Conditions

These terms explain the basic rules for using Foliwe Credit Union member services.

## Member Responsibilities

1. Keep your account details accurate.
2. Protect your password, PIN, and device access.
3. Review transaction activity and report concerns promptly.

Transactions, loan activity, and profile updates may be reviewed by authorized credit union staff for security, compliance, and member support.',
    true
  )
on conflict (key) do update
set
  title = excluded.title,
  content = excluded.content,
  is_published = excluded.is_published,
  updated_at = timezone('utc', now());
