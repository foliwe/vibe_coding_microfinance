alter table public.member_profiles
  add column if not exists id_issue_date date,
  add column if not exists id_expiry_date date;
