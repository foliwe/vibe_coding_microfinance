create extension if not exists "pgcrypto";

create type public.user_role as enum ('member', 'agent', 'branch_manager', 'admin');
create type public.account_type as enum (
  'savings',
  'deposit',
  'loan_principal',
  'loan_interest',
  'agent_cash_drawer',
  'branch_cash_vault'
);
create type public.transaction_type as enum (
  'deposit',
  'withdrawal',
  'loan_disbursement',
  'loan_repayment',
  'reversal'
);
create type public.transaction_request_status as enum (
  'draft',
  'unsynced',
  'pending_approval',
  'approved',
  'rejected',
  'reversed',
  'sync_conflict'
);
create type public.loan_status as enum (
  'application_submitted',
  'under_review',
  'approved',
  'rejected',
  'disbursed',
  'active',
  'closed',
  'defaulted'
);
create type public.repayment_mode as enum ('interest_only', 'interest_plus_principal');
create type public.report_status as enum ('queued', 'running', 'completed', 'failed');

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  address text,
  city text,
  region text,
  phone text,
  status text not null default 'active',
  manager_profile_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  phone text not null unique,
  email text,
  branch_id uuid references public.branches (id),
  must_change_password boolean not null default true,
  requires_pin_setup boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.staff_users (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id),
  national_id text,
  address text,
  transaction_pin_hash text,
  device_binding_required boolean not null default true,
  status text not null default 'active'
);

create table public.member_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id),
  assigned_agent_id uuid references public.profiles (id),
  date_of_birth date,
  gender text,
  residential_address text,
  occupation text,
  id_type text,
  id_number text,
  next_of_kin_name text,
  next_of_kin_phone text,
  next_of_kin_address text,
  status text not null default 'active',
  created_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id)
);

create table public.agent_member_assignments (
  id uuid primary key default gen_random_uuid(),
  member_profile_id uuid not null references public.member_profiles (profile_id) on delete cascade,
  agent_profile_id uuid not null references public.profiles (id),
  branch_id uuid not null references public.branches (id),
  is_active boolean not null default true,
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz
);

create unique index agent_member_assignments_active_member_idx
  on public.agent_member_assignments (member_profile_id)
  where is_active = true;

create table public.member_accounts (
  id uuid primary key default gen_random_uuid(),
  member_profile_id uuid not null references public.member_profiles (profile_id) on delete cascade,
  branch_id uuid not null references public.branches (id),
  account_type public.account_type not null check (account_type in ('savings', 'deposit')),
  account_number text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  owner_profile_id uuid references public.profiles (id),
  member_account_id uuid references public.member_accounts (id),
  account_type public.account_type not null,
  account_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.ledger_journals (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  transaction_request_id uuid,
  loan_id uuid,
  created_by uuid not null references public.profiles (id),
  approved_by uuid references public.profiles (id),
  journal_type public.transaction_type not null,
  description text not null,
  posted_at timestamptz not null default timezone('utc', now()),
  reversal_of uuid references public.ledger_journals (id)
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.ledger_journals (id) on delete cascade,
  ledger_account_id uuid not null references public.ledger_accounts (id),
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  check ((debit = 0 and credit > 0) or (credit = 0 and debit > 0))
);

create table public.transaction_requests (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  member_profile_id uuid not null references public.member_profiles (profile_id),
  member_account_id uuid not null references public.member_accounts (id),
  agent_profile_id uuid not null references public.profiles (id),
  transaction_type public.transaction_type not null check (transaction_type in ('deposit', 'withdrawal')),
  amount numeric(18,2) not null check (amount > 0),
  note text,
  status public.transaction_request_status not null default 'pending_approval',
  idempotency_key text,
  submitted_offline boolean not null default false,
  device_id text,
  payload_hash text,
  created_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz,
  rejected_at timestamptz,
  created_by uuid not null references public.profiles (id)
);

create unique index transaction_requests_idempotency_key_idx
  on public.transaction_requests (idempotency_key)
  where idempotency_key is not null;

create table public.approval_actions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.transaction_requests (id) on delete cascade,
  action text not null check (action in ('approve', 'reject', 'reverse')),
  actor_id uuid not null references public.profiles (id),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.cash_drawers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  agent_profile_id uuid not null references public.profiles (id),
  opening_float numeric(18,2) not null default 0,
  expected_cash numeric(18,2) not null default 0,
  counted_cash numeric(18,2),
  variance numeric(18,2),
  business_date date not null,
  status text not null default 'open'
);

create unique index cash_drawers_unique_day_idx
  on public.cash_drawers (agent_profile_id, business_date);

create table public.cash_reconciliations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  cash_drawer_id uuid not null references public.cash_drawers (id),
  reviewed_by uuid not null references public.profiles (id),
  variance_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  member_profile_id uuid not null references public.member_profiles (profile_id),
  requested_amount numeric(18,2) not null check (requested_amount > 0),
  monthly_interest_rate numeric(8,6) not null check (monthly_interest_rate >= 0),
  term_months integer not null check (term_months > 0),
  collateral_required boolean not null default false,
  collateral_notes text,
  status public.loan_status not null default 'application_submitted',
  created_by uuid not null references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.loan_applications (id),
  branch_id uuid not null references public.branches (id),
  member_profile_id uuid not null references public.member_profiles (profile_id),
  approved_principal numeric(18,2) not null check (approved_principal > 0),
  remaining_principal numeric(18,2) not null check (remaining_principal >= 0),
  monthly_interest_rate numeric(8,6) not null check (monthly_interest_rate >= 0),
  disbursed_at timestamptz,
  status public.loan_status not null default 'approved',
  approved_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.loan_collateral (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
  description text not null,
  document_path text,
  verified_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
  branch_id uuid not null references public.branches (id),
  amount numeric(18,2) not null check (amount > 0),
  repayment_mode public.repayment_mode not null,
  interest_component numeric(18,2) not null default 0,
  principal_component numeric(18,2) not null default 0,
  created_by uuid not null references public.profiles (id),
  approved_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.device_registrations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  device_id text not null,
  device_name text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index device_registrations_unique_device_idx
  on public.device_registrations (profile_id, device_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  branch_id uuid references public.branches (id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.report_jobs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id),
  requested_by uuid not null references public.profiles (id),
  report_type text not null,
  params jsonb not null default '{}'::jsonb,
  status public.report_status not null default 'queued',
  file_path text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.branches
  add constraint branches_manager_profile_fk
  foreign key (manager_profile_id) references public.profiles (id);

create or replace function public.current_role()
returns public.user_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_branch_id()
returns uuid
language sql
stable
as $$
  select branch_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'admin';
$$;

create or replace function public.is_branch_manager()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'branch_manager';
$$;

create or replace function public.calculate_monthly_interest(
  principal numeric,
  monthly_rate numeric
)
returns numeric
language sql
immutable
as $$
  select round((principal * monthly_rate)::numeric, 2);
$$;

create or replace function public.approve_transaction_request(
  p_request_id uuid,
  p_actor_id uuid,
  p_note text default null
)
returns public.transaction_requests
language plpgsql
security definer
as $$
declare
  v_request public.transaction_requests;
begin
  select * into v_request
  from public.transaction_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'transaction request not found';
  end if;

  if v_request.created_by = p_actor_id then
    raise exception 'maker-checker violation';
  end if;

  if v_request.status <> 'pending_approval' then
    raise exception 'request is not pending approval';
  end if;

  update public.transaction_requests
  set status = 'approved',
      approved_at = timezone('utc', now())
  where id = p_request_id
  returning * into v_request;

  insert into public.approval_actions (request_id, action, actor_id, note)
  values (p_request_id, 'approve', p_actor_id, p_note);

  insert into public.audit_logs (actor_id, branch_id, action, entity_type, entity_id, metadata)
  values (p_actor_id, v_request.branch_id, 'approve_transaction', 'transaction_request', p_request_id::text, jsonb_build_object('amount', v_request.amount));

  return v_request;
end;
$$;

create or replace view public.branch_dashboard_summary
with (security_invoker = true) as
select
  b.id as branch_id,
  b.name as branch_name,
  count(distinct mp.profile_id) as total_members,
  count(distinct su.profile_id) filter (where p.role = 'agent') as active_agents,
  coalesce(sum(case when la.account_type = 'savings' then le.debit - le.credit else 0 end), 0) as total_savings,
  coalesce(sum(case when la.account_type = 'deposit' then le.debit - le.credit else 0 end), 0) as total_deposits,
  coalesce(sum(l.remaining_principal), 0) as outstanding_principal,
  count(distinct tr.id) filter (where tr.status = 'pending_approval') as pending_approvals
from public.branches b
left join public.member_profiles mp on mp.branch_id = b.id
left join public.staff_users su on su.branch_id = b.id
left join public.profiles p on p.id = su.profile_id
left join public.ledger_accounts la on la.branch_id = b.id
left join public.ledger_entries le on le.ledger_account_id = la.id
left join public.loans l on l.branch_id = b.id and l.status in ('approved', 'disbursed', 'active', 'defaulted')
left join public.transaction_requests tr on tr.branch_id = b.id
group by b.id, b.name;

create or replace view public.admin_dashboard_summary
with (security_invoker = true) as
select
  count(*) as branch_count,
  coalesce(sum(total_members), 0) as total_members,
  coalesce(sum(active_agents), 0) as total_agents,
  coalesce(sum(total_savings), 0) as total_savings,
  coalesce(sum(total_deposits), 0) as total_deposits,
  coalesce(sum(outstanding_principal), 0) as outstanding_principal,
  coalesce(sum(pending_approvals), 0) as pending_approvals
from public.branch_dashboard_summary;

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_users enable row level security;
alter table public.member_profiles enable row level security;
alter table public.member_accounts enable row level security;
alter table public.transaction_requests enable row level security;
alter table public.loans enable row level security;
alter table public.audit_logs enable row level security;

create policy "admins can view all branches"
  on public.branches
  for select
  using (public.is_admin() or id = public.current_branch_id());

create policy "users can view scoped profiles"
  on public.profiles
  for select
  using (
    public.is_admin()
    or id = auth.uid()
    or branch_id = public.current_branch_id()
  );

create policy "staff view branch users"
  on public.staff_users
  for select
  using (public.is_admin() or branch_id = public.current_branch_id());

create policy "members scoped by branch"
  on public.member_profiles
  for select
  using (
    public.is_admin()
    or branch_id = public.current_branch_id()
    or profile_id = auth.uid()
  );

create policy "member accounts scoped by branch"
  on public.member_accounts
  for select
  using (public.is_admin() or branch_id = public.current_branch_id());

create policy "transactions scoped by branch"
  on public.transaction_requests
  for select
  using (
    public.is_admin()
    or branch_id = public.current_branch_id()
    or member_profile_id = auth.uid()
    or agent_profile_id = auth.uid()
  );

create policy "loans scoped by branch or member"
  on public.loans
  for select
  using (
    public.is_admin()
    or branch_id = public.current_branch_id()
    or member_profile_id = auth.uid()
  );

create policy "audit scoped by branch"
  on public.audit_logs
  for select
  using (public.is_admin() or branch_id = public.current_branch_id());
