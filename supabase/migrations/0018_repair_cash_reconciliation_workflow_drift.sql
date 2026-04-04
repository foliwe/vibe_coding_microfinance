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
  submitted_by = coalesce(cr.submitted_by, cr.reviewed_by, cd.agent_profile_id),
  counted_cash = coalesce(cr.counted_cash, cd.counted_cash, cd.expected_cash, 0),
  expected_cash = coalesce(cr.expected_cash, cd.expected_cash, 0),
  variance = coalesce(
    cr.variance,
    cd.variance,
    coalesce(cd.counted_cash, cd.expected_cash, 0) - coalesce(cd.expected_cash, 0)
  ),
  status = coalesce(
    cr.status,
    case
      when cr.reviewed_by is null then 'pending_review'
      else 'approved'
    end
  ),
  submitted_at = coalesce(cr.submitted_at, cr.created_at),
  reviewed_at = case
    when cr.reviewed_at is not null then cr.reviewed_at
    when coalesce(
      cr.status,
      case
        when cr.reviewed_by is null then 'pending_review'
        else 'approved'
      end
    ) = 'pending_review' then null
    else cr.created_at
  end
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
  drop constraint if exists cash_reconciliations_status_check;

alter table public.cash_reconciliations
  add constraint cash_reconciliations_status_check
  check (status in ('pending_review', 'approved', 'rejected'));

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

revoke all on function public.review_cash_reconciliation(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_cash_reconciliation(uuid, text, text) to authenticated, service_role;
