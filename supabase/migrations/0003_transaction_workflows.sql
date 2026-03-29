create unique index if not exists ledger_accounts_member_account_unique_idx
  on public.ledger_accounts (member_account_id)
  where member_account_id is not null;

create unique index if not exists ledger_accounts_agent_cash_unique_idx
  on public.ledger_accounts (branch_id, owner_profile_id, account_type)
  where account_type = 'agent_cash_drawer';

create unique index if not exists ledger_accounts_branch_cash_unique_idx
  on public.ledger_accounts (branch_id, account_type)
  where account_type = 'branch_cash_vault' and owner_profile_id is null;

create or replace function public.assert_actor_context(
  p_actor_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_auth_user_id uuid := auth.uid();
  v_jwt_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if p_actor_id is null then
    raise exception 'actor id is required';
  end if;

  if v_jwt_role <> 'service_role' then
    if v_auth_user_id is null then
      raise exception 'authentication required';
    end if;

    if p_actor_id <> v_auth_user_id then
      raise exception 'actor mismatch';
    end if;
  end if;

  select *
  into v_actor
  from public.profiles
  where id = p_actor_id
    and is_active = true;

  if not found then
    raise exception 'active actor profile not found';
  end if;

  return v_actor;
end;
$$;

create or replace function public.write_audit_log(
  p_actor_id uuid,
  p_branch_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.audit_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log public.audit_logs;
begin
  insert into public.audit_logs (
    actor_id,
    branch_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_actor_id,
    p_branch_id,
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_log;

  return v_log;
end;
$$;

create or replace function public.get_ledger_account_balance(
  p_ledger_account_id uuid
)
returns numeric(18,2)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case
      when la.account_type in ('savings', 'deposit')
        then sum(le.credit - le.debit)
      else
        sum(le.debit - le.credit)
    end,
    0
  )::numeric(18,2)
  from public.ledger_accounts la
  left join public.ledger_entries le on le.ledger_account_id = la.id
  where la.id = p_ledger_account_id
  group by la.account_type;
$$;

create or replace function public.ensure_member_ledger_account(
  p_member_account_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_account_id uuid;
  v_member_account public.member_accounts;
  v_member_name text;
begin
  select ma.*
  into v_member_account
  from public.member_accounts ma
  where ma.id = p_member_account_id;

  if not found then
    raise exception 'member account not found';
  end if;

  select p.full_name
  into v_member_name
  from public.profiles p
  where p.id = v_member_account.member_profile_id;

  select la.id
  into v_ledger_account_id
  from public.ledger_accounts la
  where la.member_account_id = p_member_account_id
  limit 1;

  if v_ledger_account_id is not null then
    return v_ledger_account_id;
  end if;

  insert into public.ledger_accounts (
    branch_id,
    owner_profile_id,
    member_account_id,
    account_type,
    account_name
  )
  values (
    v_member_account.branch_id,
    v_member_account.member_profile_id,
    v_member_account.id,
    v_member_account.account_type,
    format(
      '%s account - %s',
      initcap(v_member_account.account_type::text),
      coalesce(v_member_name, v_member_account.member_profile_id::text)
    )
  )
  on conflict (member_account_id) where member_account_id is not null
  do update
    set account_name = excluded.account_name
  returning id into v_ledger_account_id;

  return v_ledger_account_id;
end;
$$;

create or replace function public.ensure_agent_cash_ledger_account(
  p_branch_id uuid,
  p_agent_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_account_id uuid;
  v_agent_name text;
begin
  select p.full_name
  into v_agent_name
  from public.profiles p
  where p.id = p_agent_profile_id
    and p.role = 'agent'
    and p.branch_id = p_branch_id
    and p.is_active = true;

  if not found then
    raise exception 'active agent not found in branch';
  end if;

  select la.id
  into v_ledger_account_id
  from public.ledger_accounts la
  where la.branch_id = p_branch_id
    and la.owner_profile_id = p_agent_profile_id
    and la.account_type = 'agent_cash_drawer'
  limit 1;

  if v_ledger_account_id is not null then
    return v_ledger_account_id;
  end if;

  insert into public.ledger_accounts (
    branch_id,
    owner_profile_id,
    account_type,
    account_name
  )
  values (
    p_branch_id,
    p_agent_profile_id,
    'agent_cash_drawer',
    format('Cash drawer - %s', v_agent_name)
  )
  on conflict (branch_id, owner_profile_id, account_type)
  where account_type = 'agent_cash_drawer'
  do update
    set account_name = excluded.account_name
  returning id into v_ledger_account_id;

  return v_ledger_account_id;
end;
$$;

create or replace function public.ensure_cash_drawer(
  p_branch_id uuid,
  p_agent_profile_id uuid,
  p_business_date date
)
returns public.cash_drawers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drawer public.cash_drawers;
begin
  insert into public.cash_drawers (
    branch_id,
    agent_profile_id,
    business_date
  )
  values (
    p_branch_id,
    p_agent_profile_id,
    p_business_date
  )
  on conflict (agent_profile_id, business_date)
  do update
    set branch_id = excluded.branch_id
  returning * into v_drawer;

  return v_drawer;
end;
$$;

create or replace function public.get_member_account_balance(
  p_member_account_id uuid
)
returns numeric(18,2)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ledger_account_id uuid;
begin
  select la.id
  into v_ledger_account_id
  from public.ledger_accounts la
  where la.member_account_id = p_member_account_id
  limit 1;

  if v_ledger_account_id is null then
    return 0;
  end if;

  return public.get_ledger_account_balance(v_ledger_account_id);
end;
$$;

create or replace function public.create_transaction_request(
  p_actor_id uuid,
  p_member_account_id uuid,
  p_transaction_type public.transaction_type,
  p_amount numeric,
  p_note text default null,
  p_idempotency_key text default null,
  p_submitted_offline boolean default false,
  p_device_id text default null,
  p_payload_hash text default null
)
returns public.transaction_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_request public.transaction_requests;
  v_member_account public.member_accounts;
  v_member public.member_profiles;
  v_assigned_agent_id uuid;
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role <> 'agent' then
    raise exception 'only agents can create transaction requests';
  end if;

  if v_actor.branch_id is null then
    raise exception 'agent branch is required';
  end if;

  if p_transaction_type not in ('deposit', 'withdrawal') then
    raise exception 'unsupported transaction type %', p_transaction_type;
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be greater than zero';
  end if;

  if p_idempotency_key is not null then
    select *
    into v_request
    from public.transaction_requests tr
    where tr.idempotency_key = p_idempotency_key
      and tr.created_by = p_actor_id
    limit 1;

    if found then
      return v_request;
    end if;
  end if;

  select ma.*
  into v_member_account
  from public.member_accounts ma
  where ma.id = p_member_account_id
    and ma.status = 'active';

  if not found then
    raise exception 'active member account not found';
  end if;

  select mp.*
  into v_member
  from public.member_profiles mp
  where mp.profile_id = v_member_account.member_profile_id
    and mp.branch_id = v_actor.branch_id
    and mp.status = 'active';

  if not found then
    raise exception 'active member profile not found in agent branch';
  end if;

  if v_member_account.branch_id <> v_actor.branch_id then
    raise exception 'member account branch mismatch';
  end if;

  select ama.agent_profile_id
  into v_assigned_agent_id
  from public.agent_member_assignments ama
  where ama.member_profile_id = v_member.profile_id
    and ama.is_active = true
  order by ama.starts_at desc
  limit 1;

  if v_assigned_agent_id is null then
    v_assigned_agent_id := v_member.assigned_agent_id;
  end if;

  if v_assigned_agent_id is not null and v_assigned_agent_id <> v_actor.id then
    raise exception 'member is not assigned to this agent';
  end if;

  insert into public.transaction_requests (
    branch_id,
    member_profile_id,
    member_account_id,
    agent_profile_id,
    transaction_type,
    amount,
    note,
    status,
    idempotency_key,
    submitted_offline,
    device_id,
    payload_hash,
    created_by
  )
  values (
    v_actor.branch_id,
    v_member.profile_id,
    v_member_account.id,
    v_actor.id,
    p_transaction_type,
    round(p_amount::numeric, 2),
    p_note,
    'pending_approval',
    p_idempotency_key,
    coalesce(p_submitted_offline, false),
    p_device_id,
    p_payload_hash,
    v_actor.id
  )
  returning * into v_request;

  perform public.write_audit_log(
    v_actor.id,
    v_actor.branch_id,
    'create_transaction_request',
    'transaction_request',
    v_request.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'transaction_type', v_request.transaction_type,
        'amount', v_request.amount,
        'member_account_id', v_request.member_account_id,
        'member_profile_id', v_request.member_profile_id,
        'submitted_offline', v_request.submitted_offline,
        'device_id', v_request.device_id,
        'payload_hash', v_request.payload_hash
      )
    )
  );

  return v_request;
end;
$$;

create or replace function public.approve_transaction_request(
  p_request_id uuid,
  p_actor_id uuid,
  p_note text default null
)
returns public.transaction_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_request public.transaction_requests;
  v_member_account public.member_accounts;
  v_member_ledger_account_id uuid;
  v_cash_ledger_account_id uuid;
  v_journal_id uuid;
  v_amount numeric(18,2);
  v_business_date date := timezone('utc', now())::date;
  v_cash_delta numeric(18,2);
  v_available_balance numeric(18,2);
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role not in ('admin', 'branch_manager') then
    raise exception 'only admins and branch managers can approve transactions';
  end if;

  select *
  into v_request
  from public.transaction_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'transaction request not found';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id <> v_request.branch_id then
    raise exception 'branch managers can only approve requests in their branch';
  end if;

  if v_request.created_by = v_actor.id then
    raise exception 'maker-checker violation';
  end if;

  if v_request.status <> 'pending_approval' then
    raise exception 'request is not pending approval';
  end if;

  select ma.*
  into v_member_account
  from public.member_accounts ma
  where ma.id = v_request.member_account_id
    and ma.branch_id = v_request.branch_id
    and ma.status = 'active';

  if not found then
    raise exception 'active member account not found for request';
  end if;

  if v_member_account.member_profile_id <> v_request.member_profile_id then
    raise exception 'member account does not belong to request member';
  end if;

  if v_request.transaction_type = 'withdrawal' then
    v_available_balance := public.get_member_account_balance(v_request.member_account_id);

    if v_available_balance < v_request.amount then
      raise exception 'insufficient approved balance';
    end if;
  end if;

  v_member_ledger_account_id := public.ensure_member_ledger_account(v_request.member_account_id);
  v_cash_ledger_account_id := public.ensure_agent_cash_ledger_account(
    v_request.branch_id,
    v_request.agent_profile_id
  );
  v_amount := round(v_request.amount::numeric, 2);

  insert into public.ledger_journals (
    branch_id,
    transaction_request_id,
    created_by,
    approved_by,
    journal_type,
    description
  )
  values (
    v_request.branch_id,
    v_request.id,
    v_request.created_by,
    v_actor.id,
    v_request.transaction_type,
    format(
      '%s %s for request %s',
      initcap(v_request.transaction_type::text),
      v_amount,
      v_request.id
    )
  )
  returning id into v_journal_id;

  if v_request.transaction_type = 'deposit' then
    insert into public.ledger_entries (journal_id, ledger_account_id, debit, credit)
    values
      (v_journal_id, v_cash_ledger_account_id, v_amount, 0),
      (v_journal_id, v_member_ledger_account_id, 0, v_amount);

    v_cash_delta := v_amount;
  else
    insert into public.ledger_entries (journal_id, ledger_account_id, debit, credit)
    values
      (v_journal_id, v_member_ledger_account_id, v_amount, 0),
      (v_journal_id, v_cash_ledger_account_id, 0, v_amount);

    v_cash_delta := -v_amount;
  end if;

  perform public.ensure_cash_drawer(
    v_request.branch_id,
    v_request.agent_profile_id,
    v_business_date
  );

  update public.cash_drawers
  set expected_cash = round((expected_cash + v_cash_delta)::numeric, 2)
  where agent_profile_id = v_request.agent_profile_id
    and business_date = v_business_date;

  update public.transaction_requests
  set status = 'approved',
      approved_at = timezone('utc', now())
  where id = p_request_id
  returning * into v_request;

  insert into public.approval_actions (request_id, action, actor_id, note)
  values (p_request_id, 'approve', v_actor.id, p_note);

  perform public.write_audit_log(
    v_actor.id,
    v_request.branch_id,
    'approve_transaction',
    'transaction_request',
    p_request_id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'transaction_type', v_request.transaction_type,
        'amount', v_request.amount,
        'journal_id', v_journal_id,
        'member_account_id', v_request.member_account_id,
        'member_profile_id', v_request.member_profile_id,
        'agent_profile_id', v_request.agent_profile_id,
        'note', p_note
      )
    )
  );

  return v_request;
end;
$$;

create or replace function public.reject_transaction_request(
  p_request_id uuid,
  p_actor_id uuid,
  p_note text default null
)
returns public.transaction_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_request public.transaction_requests;
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role not in ('admin', 'branch_manager') then
    raise exception 'only admins and branch managers can reject transactions';
  end if;

  select *
  into v_request
  from public.transaction_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'transaction request not found';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id <> v_request.branch_id then
    raise exception 'branch managers can only reject requests in their branch';
  end if;

  if v_request.created_by = v_actor.id then
    raise exception 'maker-checker violation';
  end if;

  if v_request.status <> 'pending_approval' then
    raise exception 'request is not pending approval';
  end if;

  update public.transaction_requests
  set status = 'rejected',
      rejected_at = timezone('utc', now())
  where id = p_request_id
  returning * into v_request;

  insert into public.approval_actions (request_id, action, actor_id, note)
  values (p_request_id, 'reject', v_actor.id, p_note);

  perform public.write_audit_log(
    v_actor.id,
    v_request.branch_id,
    'reject_transaction',
    'transaction_request',
    p_request_id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'transaction_type', v_request.transaction_type,
        'amount', v_request.amount,
        'member_account_id', v_request.member_account_id,
        'member_profile_id', v_request.member_profile_id,
        'agent_profile_id', v_request.agent_profile_id,
        'note', p_note
      )
    )
  );

  return v_request;
end;
$$;

drop view if exists public.admin_dashboard_summary;
drop view if exists public.branch_dashboard_summary;

create view public.branch_dashboard_summary
with (security_invoker = true) as
select
  b.id as branch_id,
  b.name as branch_name,
  (
    select count(*)
    from public.member_profiles mp
    where mp.branch_id = b.id
      and mp.status = 'active'
  ) as total_members,
  (
    select count(*)
    from public.staff_users su
    join public.profiles p on p.id = su.profile_id
    where su.branch_id = b.id
      and p.role = 'agent'
      and p.is_active = true
  ) as active_agents,
  coalesce((
    select sum(public.get_ledger_account_balance(la.id))
    from public.ledger_accounts la
    where la.branch_id = b.id
      and la.account_type = 'savings'
  ), 0)::numeric(18,2) as total_savings,
  coalesce((
    select sum(public.get_ledger_account_balance(la.id))
    from public.ledger_accounts la
    where la.branch_id = b.id
      and la.account_type = 'deposit'
  ), 0)::numeric(18,2) as total_deposits,
  coalesce((
    select sum(l.remaining_principal)
    from public.loans l
    where l.branch_id = b.id
      and l.status in ('approved', 'disbursed', 'active', 'defaulted')
  ), 0)::numeric(18,2) as outstanding_principal,
  (
    select count(*)
    from public.transaction_requests tr
    where tr.branch_id = b.id
      and tr.status = 'pending_approval'
  ) as pending_approvals
from public.branches b;

create view public.admin_dashboard_summary
with (security_invoker = true) as
select
  count(*) as branch_count,
  coalesce(sum(total_members), 0) as total_members,
  coalesce(sum(active_agents), 0) as total_agents,
  coalesce(sum(total_savings), 0)::numeric(18,2) as total_savings,
  coalesce(sum(total_deposits), 0)::numeric(18,2) as total_deposits,
  coalesce(sum(outstanding_principal), 0)::numeric(18,2) as outstanding_principal,
  coalesce(sum(pending_approvals), 0) as pending_approvals
from public.branch_dashboard_summary;

alter table public.ledger_accounts enable row level security;
alter table public.ledger_journals enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.approval_actions enable row level security;
alter table public.cash_drawers enable row level security;
alter table public.loan_repayments enable row level security;

drop policy if exists "ledger accounts scoped by branch or owner" on public.ledger_accounts;
create policy "ledger accounts scoped by branch or owner"
  on public.ledger_accounts
  for select
  using (
    public.is_admin()
    or branch_id = public.current_branch_id()
    or owner_profile_id = auth.uid()
  );

drop policy if exists "ledger journals scoped by branch" on public.ledger_journals;
create policy "ledger journals scoped by branch"
  on public.ledger_journals
  for select
  using (
    public.is_admin()
    or branch_id = public.current_branch_id()
    or created_by = auth.uid()
    or approved_by = auth.uid()
  );

drop policy if exists "ledger entries scoped by journal branch" on public.ledger_entries;
create policy "ledger entries scoped by journal branch"
  on public.ledger_entries
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.ledger_journals lj
      where lj.id = ledger_entries.journal_id
        and (
          lj.branch_id = public.current_branch_id()
          or lj.created_by = auth.uid()
          or lj.approved_by = auth.uid()
        )
    )
  );

drop policy if exists "approval actions scoped by related request" on public.approval_actions;
create policy "approval actions scoped by related request"
  on public.approval_actions
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.transaction_requests tr
      where tr.id = approval_actions.request_id
        and (
          tr.branch_id = public.current_branch_id()
          or tr.member_profile_id = auth.uid()
          or tr.agent_profile_id = auth.uid()
        )
    )
  );

drop policy if exists "cash drawers scoped by branch or agent" on public.cash_drawers;
create policy "cash drawers scoped by branch or agent"
  on public.cash_drawers
  for select
  using (
    public.is_admin()
    or branch_id = public.current_branch_id()
    or agent_profile_id = auth.uid()
  );

drop policy if exists "loan repayments scoped by branch or member" on public.loan_repayments;
create policy "loan repayments scoped by branch or member"
  on public.loan_repayments
  for select
  using (
    public.is_admin()
    or branch_id = public.current_branch_id()
    or exists (
      select 1
      from public.loans l
      where l.id = loan_repayments.loan_id
        and l.member_profile_id = auth.uid()
    )
  );

revoke all on function public.assert_actor_context(uuid) from public, anon, authenticated;
revoke all on function public.write_audit_log(uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.ensure_member_ledger_account(uuid) from public, anon, authenticated;
revoke all on function public.ensure_agent_cash_ledger_account(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ensure_cash_drawer(uuid, uuid, date) from public, anon, authenticated;
revoke all on function public.get_member_account_balance(uuid) from public, anon, authenticated;

grant execute on function public.get_ledger_account_balance(uuid)
  to authenticated, service_role;

grant execute on function public.create_transaction_request(
  uuid,
  uuid,
  public.transaction_type,
  numeric,
  text,
  text,
  boolean,
  text,
  text
) to authenticated, service_role;

grant execute on function public.approve_transaction_request(uuid, uuid, text)
  to authenticated, service_role;

grant execute on function public.reject_transaction_request(uuid, uuid, text)
  to authenticated, service_role;
