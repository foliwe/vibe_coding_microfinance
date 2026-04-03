alter table public.cash_reconciliations
  alter column reviewed_by drop not null;

alter table public.cash_reconciliations
  add column if not exists submitted_by uuid references public.profiles (id),
  add column if not exists counted_cash numeric(18,2),
  add column if not exists expected_cash numeric(18,2),
  add column if not exists variance numeric(18,2),
  add column if not exists status text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

update public.cash_reconciliations cr
set
  submitted_by = coalesce(cr.submitted_by, cr.reviewed_by),
  counted_cash = coalesce(cr.counted_cash, cd.counted_cash, cd.expected_cash, 0),
  expected_cash = coalesce(cr.expected_cash, cd.expected_cash, 0),
  variance = coalesce(
    cr.variance,
    cd.variance,
    coalesce(cd.counted_cash, cd.expected_cash, 0) - coalesce(cd.expected_cash, 0)
  ),
  status = coalesce(cr.status, 'approved'),
  submitted_at = coalesce(cr.submitted_at, cr.created_at),
  reviewed_at = coalesce(cr.reviewed_at, cr.created_at)
from public.cash_drawers cd
where cd.id = cr.cash_drawer_id;

alter table public.cash_reconciliations
  alter column submitted_by set not null,
  alter column counted_cash set not null,
  alter column expected_cash set not null,
  alter column variance set not null,
  alter column status set not null,
  alter column submitted_at set not null;

alter table public.cash_reconciliations
  add constraint cash_reconciliations_status_check
  check (status in ('pending_review', 'approved', 'rejected'));

create or replace function public.set_my_transaction_pin(
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
begin
  select *
  into v_actor
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found then
    raise exception 'active actor profile not found';
  end if;

  if v_actor.role not in ('agent', 'branch_manager') then
    raise exception 'only staff can set transaction pins';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'transaction pin must be exactly 4 digits';
  end if;

  insert into public.staff_users (
    profile_id,
    branch_id,
    transaction_pin_hash,
    device_binding_required,
    status
  )
  values (
    v_actor.id,
    v_actor.branch_id,
    extensions.crypt(p_pin, extensions.gen_salt('bf')),
    true,
    'active'
  )
  on conflict (profile_id)
  do update
    set
      branch_id = excluded.branch_id,
      transaction_pin_hash = excluded.transaction_pin_hash;

  update public.profiles
  set
    requires_pin_setup = false,
    updated_at = timezone('utc', now())
  where id = v_actor.id;

  perform public.write_audit_log(
    v_actor.id,
    v_actor.branch_id,
    'set_transaction_pin',
    'profile',
    v_actor.id::text
  );

  return true;
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
  p_payload_hash text default null,
  p_transaction_pin text default null
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
  v_staff_user public.staff_users;
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

  if p_transaction_type = 'withdrawal' then
    if coalesce(p_submitted_offline, false) then
      raise exception 'withdrawals require connectivity';
    end if;

    if p_transaction_pin is null or p_transaction_pin !~ '^[0-9]{4}$' then
      raise exception 'transaction pin is required for withdrawals';
    end if;

    select *
    into v_staff_user
    from public.staff_users su
    where su.profile_id = v_actor.id
      and su.status = 'active'
    limit 1;

    if not found or v_staff_user.transaction_pin_hash is null then
      raise exception 'transaction pin setup is required before withdrawals';
    end if;

    if extensions.crypt(p_transaction_pin, v_staff_user.transaction_pin_hash) <> v_staff_user.transaction_pin_hash then
      raise exception 'invalid transaction pin';
    end if;
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

create or replace function public.submit_cash_reconciliation(
  p_counted_cash numeric,
  p_variance_reason text default null
)
returns public.cash_reconciliations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_drawer public.cash_drawers;
  v_reconciliation public.cash_reconciliations;
  v_counted_cash numeric(18,2);
  v_expected_cash numeric(18,2);
  v_variance numeric(18,2);
begin
  select *
  into v_actor
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found then
    raise exception 'active actor profile not found';
  end if;

  if v_actor.role <> 'agent' then
    raise exception 'only agents can submit cash reconciliations';
  end if;

  if p_counted_cash is null or p_counted_cash < 0 then
    raise exception 'counted cash must be zero or greater';
  end if;

  select *
  into v_drawer
  from public.cash_drawers cd
  where cd.agent_profile_id = v_actor.id
    and cd.business_date = timezone('utc', now())::date
  for update;

  if not found then
    raise exception 'no open cash drawer found for today';
  end if;

  if v_drawer.status = 'closed' then
    raise exception 'cash drawer is already closed';
  end if;

  if exists (
    select 1
    from public.cash_reconciliations cr
    where cr.cash_drawer_id = v_drawer.id
      and cr.status = 'pending_review'
  ) then
    raise exception 'cash reconciliation is already pending review';
  end if;

  v_counted_cash := round(p_counted_cash::numeric, 2);
  v_expected_cash := round(coalesce(v_drawer.expected_cash, 0)::numeric, 2);
  v_variance := round((v_counted_cash - v_expected_cash)::numeric, 2);

  if v_variance <> 0 and coalesce(nullif(trim(p_variance_reason), ''), null) is null then
    raise exception 'variance reason is required when counted cash differs from expected cash';
  end if;

  update public.cash_drawers
  set
    counted_cash = v_counted_cash,
    variance = v_variance,
    status = 'pending_review'
  where id = v_drawer.id
  returning * into v_drawer;

  insert into public.cash_reconciliations (
    branch_id,
    cash_drawer_id,
    submitted_by,
    reviewed_by,
    counted_cash,
    expected_cash,
    variance,
    variance_reason,
    status,
    submitted_at,
    reviewed_at,
    review_note
  )
  values (
    v_drawer.branch_id,
    v_drawer.id,
    v_actor.id,
    null,
    v_counted_cash,
    v_expected_cash,
    v_variance,
    nullif(trim(p_variance_reason), ''),
    'pending_review',
    timezone('utc', now()),
    null,
    null
  )
  returning * into v_reconciliation;

  perform public.write_audit_log(
    v_actor.id,
    v_drawer.branch_id,
    'submit_cash_reconciliation',
    'cash_reconciliation',
    v_reconciliation.id::text,
    jsonb_build_object(
      'cash_drawer_id', v_drawer.id,
      'counted_cash', v_counted_cash,
      'expected_cash', v_expected_cash,
      'variance', v_variance
    )
  );

  return v_reconciliation;
end;
$$;

create or replace function public.review_cash_reconciliation(
  p_reconciliation_id uuid,
  p_action text,
  p_review_note text default null
)
returns public.cash_reconciliations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_reconciliation public.cash_reconciliations;
  v_drawer public.cash_drawers;
  v_next_status text;
begin
  select *
  into v_actor
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found then
    raise exception 'active actor profile not found';
  end if;

  if v_actor.role not in ('admin', 'branch_manager') then
    raise exception 'only admins and branch managers can review cash reconciliations';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception 'unsupported review action';
  end if;

  select *
  into v_reconciliation
  from public.cash_reconciliations
  where id = p_reconciliation_id
  for update;

  if not found then
    raise exception 'cash reconciliation not found';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id <> v_reconciliation.branch_id then
    raise exception 'branch managers can only review reconciliations in their branch';
  end if;

  if v_reconciliation.status <> 'pending_review' then
    raise exception 'cash reconciliation is not pending review';
  end if;

  select *
  into v_drawer
  from public.cash_drawers
  where id = v_reconciliation.cash_drawer_id
  for update;

  if not found then
    raise exception 'cash drawer not found for reconciliation';
  end if;

  v_next_status := case when p_action = 'approve' then 'approved' else 'rejected' end;

  update public.cash_reconciliations
  set
    status = v_next_status,
    reviewed_by = v_actor.id,
    reviewed_at = timezone('utc', now()),
    review_note = nullif(trim(p_review_note), '')
  where id = p_reconciliation_id
  returning * into v_reconciliation;

  update public.cash_drawers
  set status = case when p_action = 'approve' then 'closed' else 'open' end
  where id = v_drawer.id;

  perform public.write_audit_log(
    v_actor.id,
    v_reconciliation.branch_id,
    case when p_action = 'approve' then 'approve_cash_reconciliation' else 'reject_cash_reconciliation' end,
    'cash_reconciliation',
    v_reconciliation.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'cash_drawer_id', v_reconciliation.cash_drawer_id,
        'variance', v_reconciliation.variance,
        'review_note', nullif(trim(p_review_note), '')
      )
    )
  );

  return v_reconciliation;
end;
$$;

revoke all on function public.set_my_transaction_pin(text) from public, anon, authenticated;
grant execute on function public.set_my_transaction_pin(text) to authenticated, service_role;

revoke all on function public.create_transaction_request(
  uuid,
  uuid,
  public.transaction_type,
  numeric,
  text,
  text,
  boolean,
  text,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.create_transaction_request(
  uuid,
  uuid,
  public.transaction_type,
  numeric,
  text,
  text,
  boolean,
  text,
  text,
  text
) to authenticated, service_role;

revoke all on function public.submit_cash_reconciliation(numeric, text) from public, anon, authenticated;
grant execute on function public.submit_cash_reconciliation(numeric, text) to authenticated, service_role;

revoke all on function public.review_cash_reconciliation(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_cash_reconciliation(uuid, text, text) to authenticated, service_role;
