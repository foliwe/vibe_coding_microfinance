create or replace function public.calculate_monthly_interest(
  principal numeric,
  monthly_rate numeric
)
returns numeric
language sql
immutable
set search_path = public
as $$
  select round((principal * monthly_rate)::numeric, 2);
$$;

alter table public.agent_member_assignments enable row level security;
alter table public.cash_reconciliations enable row level security;
alter table public.loan_applications enable row level security;
alter table public.loan_collateral enable row level security;
alter table public.device_registrations enable row level security;
alter table public.report_jobs enable row level security;
alter table public.approval_actions enable row level security;
alter table public.cash_drawers enable row level security;
alter table public.ledger_accounts enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.ledger_journals enable row level security;
alter table public.loan_repayments enable row level security;

drop policy if exists "admins can view all branches" on public.branches;
create policy "branches visible by scoped role"
  on public.branches
  for select
  to authenticated
  using (
    (select public.is_admin())
    or id = (select public.current_branch_id())
  );

drop policy if exists "users can view scoped profiles" on public.profiles;
create policy "profiles visible by role scope"
  on public.profiles
  for select
  to authenticated
  using (
    (select public.is_admin())
    or id = (select auth.uid())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or (
      (select public.current_role()) = 'agent'
      and exists (
        select 1
        from public.member_profiles mp
        where mp.profile_id = profiles.id
          and mp.assigned_agent_id = (select auth.uid())
      )
    )
    or (
      (select public.current_role()) = 'member'
      and exists (
        select 1
        from public.member_profiles mp
        where mp.profile_id = (select auth.uid())
          and mp.assigned_agent_id = profiles.id
      )
    )
    or (
      (select public.current_role()) = 'member'
      and exists (
        select 1
        from public.transaction_requests tr
        where tr.member_profile_id = (select auth.uid())
          and tr.agent_profile_id = profiles.id
      )
    )
  );

drop policy if exists "staff view branch users" on public.staff_users;
create policy "staff users visible by role scope"
  on public.staff_users
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or profile_id = (select auth.uid())
  );

drop policy if exists "members scoped by branch" on public.member_profiles;
create policy "member profiles visible by role scope"
  on public.member_profiles
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or (
      (select public.current_role()) = 'agent'
      and assigned_agent_id = (select auth.uid())
    )
    or profile_id = (select auth.uid())
  );

drop policy if exists "member accounts scoped by branch" on public.member_accounts;
create policy "member accounts visible by role scope"
  on public.member_accounts
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or (
      (select public.current_role()) = 'agent'
      and exists (
        select 1
        from public.member_profiles mp
        where mp.profile_id = member_accounts.member_profile_id
          and mp.assigned_agent_id = (select auth.uid())
      )
    )
    or member_profile_id = (select auth.uid())
  );

drop policy if exists "transactions scoped by branch" on public.transaction_requests;
create policy "transaction requests visible by role scope"
  on public.transaction_requests
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or agent_profile_id = (select auth.uid())
    or member_profile_id = (select auth.uid())
  );

drop policy if exists "approval actions scoped by related request" on public.approval_actions;
create policy "approval actions visible by related request scope"
  on public.approval_actions
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.transaction_requests tr
      where tr.id = approval_actions.request_id
        and (
          (
            (select public.current_role()) = 'branch_manager'
            and tr.branch_id = (select public.current_branch_id())
          )
          or tr.member_profile_id = (select auth.uid())
          or tr.agent_profile_id = (select auth.uid())
        )
    )
  );

drop policy if exists "cash drawers scoped by branch or agent" on public.cash_drawers;
create policy "cash drawers visible by role scope"
  on public.cash_drawers
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or agent_profile_id = (select auth.uid())
  );

drop policy if exists "ledger accounts scoped by branch or owner" on public.ledger_accounts;
create policy "ledger accounts visible by role scope"
  on public.ledger_accounts
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or owner_profile_id = (select auth.uid())
    or exists (
      select 1
      from public.member_accounts ma
      where ma.id = ledger_accounts.member_account_id
        and ma.member_profile_id = (select auth.uid())
    )
  );

drop policy if exists "ledger journals scoped by branch" on public.ledger_journals;
create policy "ledger journals visible by role scope"
  on public.ledger_journals
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or created_by = (select auth.uid())
    or approved_by = (select auth.uid())
  );

drop policy if exists "ledger entries scoped by journal branch" on public.ledger_entries;
create policy "ledger entries visible by journal scope"
  on public.ledger_entries
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.ledger_journals lj
      where lj.id = ledger_entries.journal_id
        and (
          (
            (select public.current_role()) = 'branch_manager'
            and lj.branch_id = (select public.current_branch_id())
          )
          or lj.created_by = (select auth.uid())
          or lj.approved_by = (select auth.uid())
        )
    )
    or exists (
      select 1
      from public.ledger_accounts la
      join public.member_accounts ma on ma.id = la.member_account_id
      where la.id = ledger_entries.ledger_account_id
        and ma.member_profile_id = (select auth.uid())
    )
  );

drop policy if exists "loans scoped by branch or member" on public.loans;
create policy "loans visible by role scope"
  on public.loans
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or member_profile_id = (select auth.uid())
  );

drop policy if exists "loan repayments scoped by branch or member" on public.loan_repayments;
create policy "loan repayments visible by role scope"
  on public.loan_repayments
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or exists (
      select 1
      from public.loans l
      where l.id = loan_repayments.loan_id
        and l.member_profile_id = (select auth.uid())
    )
  );

drop policy if exists "audit scoped by branch" on public.audit_logs;
create policy "audit logs visible by admin and branch manager"
  on public.audit_logs
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
  );

create policy "agent member assignments visible by role scope"
  on public.agent_member_assignments
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or agent_profile_id = (select auth.uid())
    or member_profile_id = (select auth.uid())
  );

create policy "cash reconciliations visible by role scope"
  on public.cash_reconciliations
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or exists (
      select 1
      from public.cash_drawers cd
      where cd.id = cash_reconciliations.cash_drawer_id
        and cd.agent_profile_id = (select auth.uid())
    )
  );

create policy "loan applications visible by role scope"
  on public.loan_applications
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or member_profile_id = (select auth.uid())
  );

create policy "loan collateral visible by related loan scope"
  on public.loan_collateral
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.loans l
      where l.id = loan_collateral.loan_id
        and (
          (
            (select public.current_role()) = 'branch_manager'
            and l.branch_id = (select public.current_branch_id())
          )
          or l.member_profile_id = (select auth.uid())
        )
    )
  );

create policy "device registrations visible by role scope"
  on public.device_registrations
  for select
  to authenticated
  using (
    (select public.is_admin())
    or profile_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = device_registrations.profile_id
        and (select public.current_role()) = 'branch_manager'
        and p.branch_id = (select public.current_branch_id())
    )
  );

create policy "report jobs visible by role scope"
  on public.report_jobs
  for select
  to authenticated
  using (
    (select public.is_admin())
    or requested_by = (select auth.uid())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
  );
