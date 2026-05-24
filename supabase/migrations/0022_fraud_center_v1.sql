create table public.fraud_alerts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  agent_profile_id uuid references public.profiles (id),
  member_profile_id uuid references public.member_profiles (profile_id),
  transaction_request_id uuid references public.transaction_requests (id) on delete set null,
  cash_reconciliation_id uuid references public.cash_reconciliations (id) on delete set null,
  rule_id text not null check (
    rule_id in (
      'login_anomaly',
      'offline_transaction_burst',
      'unusual_deposit_size',
      'multi_device_access',
      'fast_approval',
      'agent_behavioral_pattern',
      'duplicate_cash_entry',
      'failed_pin_attempts',
      'out_of_branch_handling',
      'dormant_account_reactivation_spike',
      'reconciliation_variance'
    )
  ),
  severity text not null check (severity in ('low', 'medium', 'high')),
  score integer not null check (score in (30, 60, 85)),
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'false_positive')),
  title text not null,
  summary text not null,
  evidence jsonb not null default '{}'::jsonb,
  fingerprint text not null,
  detected_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolution_note text,
  assigned_to uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index fraud_alerts_active_fingerprint_idx
  on public.fraud_alerts (fingerprint)
  where status in ('open', 'investigating');

create index fraud_alerts_branch_status_idx
  on public.fraud_alerts (branch_id, status, detected_at desc);

create index fraud_alerts_agent_idx
  on public.fraud_alerts (agent_profile_id, detected_at desc);

create index fraud_alerts_transaction_idx
  on public.fraud_alerts (transaction_request_id);

alter table public.fraud_alerts enable row level security;

create policy "fraud alerts visible by admin and branch manager"
  on public.fraud_alerts
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
  );

create or replace function public.fraud_score_to_severity(
  p_score integer
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_score >= 85 then 'high'
    when p_score >= 60 then 'medium'
    else 'low'
  end;
$$;

create or replace function public.upsert_fraud_alert(
  p_branch_id uuid,
  p_agent_profile_id uuid,
  p_member_profile_id uuid,
  p_transaction_request_id uuid,
  p_cash_reconciliation_id uuid,
  p_rule_id text,
  p_score integer,
  p_title text,
  p_summary text,
  p_evidence jsonb default '{}'::jsonb,
  p_fingerprint text default null
)
returns public.fraud_alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alert public.fraud_alerts;
  v_fingerprint text := nullif(trim(coalesce(p_fingerprint, '')), '');
  v_now timestamptz := timezone('utc', now());
  v_score integer := case
    when p_score >= 85 then 85
    when p_score >= 60 then 60
    else 30
  end;
begin
  if p_branch_id is null then
    raise exception 'fraud alert branch is required';
  end if;

  if v_fingerprint is null then
    raise exception 'fraud alert fingerprint is required';
  end if;

  select *
  into v_alert
  from public.fraud_alerts
  where fingerprint = v_fingerprint
    and status in ('open', 'investigating')
  order by detected_at desc
  limit 1
  for update;

  if found then
    update public.fraud_alerts
    set
      branch_id = p_branch_id,
      agent_profile_id = coalesce(p_agent_profile_id, agent_profile_id),
      member_profile_id = coalesce(p_member_profile_id, member_profile_id),
      transaction_request_id = coalesce(p_transaction_request_id, transaction_request_id),
      cash_reconciliation_id = coalesce(p_cash_reconciliation_id, cash_reconciliation_id),
      severity = public.fraud_score_to_severity(greatest(score, v_score)),
      score = greatest(score, v_score),
      title = p_title,
      summary = p_summary,
      evidence = coalesce(p_evidence, '{}'::jsonb),
      last_seen_at = v_now,
      updated_at = v_now
    where id = v_alert.id
    returning * into v_alert;

    return v_alert;
  end if;

  insert into public.fraud_alerts (
    branch_id,
    agent_profile_id,
    member_profile_id,
    transaction_request_id,
    cash_reconciliation_id,
    rule_id,
    severity,
    score,
    title,
    summary,
    evidence,
    fingerprint,
    detected_at,
    last_seen_at,
    updated_at
  )
  values (
    p_branch_id,
    p_agent_profile_id,
    p_member_profile_id,
    p_transaction_request_id,
    p_cash_reconciliation_id,
    p_rule_id,
    public.fraud_score_to_severity(v_score),
    v_score,
    p_title,
    p_summary,
    coalesce(p_evidence, '{}'::jsonb),
    v_fingerprint,
    v_now,
    v_now,
    v_now
  )
  returning * into v_alert;

  return v_alert;
end;
$$;

create or replace function public.evaluate_fraud_event(
  p_event_type text,
  p_branch_id uuid default null,
  p_actor_id uuid default null,
  p_transaction_request_id uuid default null,
  p_cash_reconciliation_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_alert_count integer := 0;
  v_approval_action public.approval_actions;
  v_average_amount numeric(18,2);
  v_count integer;
  v_current_device_id text := nullif(trim(coalesce(p_metadata ->> 'device_id', '')), '');
  v_denied_count integer;
  v_drawer public.cash_drawers;
  v_event_branch_id uuid;
  v_event_time timestamptz := timezone('utc', now());
  v_last_activity_at timestamptz;
  v_matching_count integer;
  v_other_device_id text;
  v_recent_deposit public.transaction_requests;
  v_reconciliation public.cash_reconciliations;
  v_rejected_count integer;
  v_reset_count integer;
  v_same_member_ratio numeric(8,4);
  v_sum_amount numeric(18,2);
  v_target_branch_id uuid;
  v_transaction public.transaction_requests;
begin
  if p_actor_id is not null then
    v_actor := public.assert_actor_context(p_actor_id);
  elsif auth.uid() is not null then
    select *
    into v_actor
    from public.profiles
    where id = auth.uid()
      and is_active = true;
  end if;

  if p_transaction_request_id is not null then
    select *
    into v_transaction
    from public.transaction_requests
    where id = p_transaction_request_id;
  end if;

  if p_cash_reconciliation_id is not null then
    select *
    into v_reconciliation
    from public.cash_reconciliations
    where id = p_cash_reconciliation_id;

    if found then
      select *
      into v_drawer
      from public.cash_drawers
      where id = v_reconciliation.cash_drawer_id;
    end if;
  end if;

  v_event_branch_id := coalesce(
    p_branch_id,
    v_transaction.branch_id,
    v_reconciliation.branch_id,
    v_actor.branch_id
  );

  if p_event_type = 'staff_login' and v_actor.id is not null then
    select count(*)
    into v_denied_count
    from public.audit_logs
    where actor_id = v_actor.id
      and action = 'device_access_denied'
      and created_at >= v_event_time - interval '24 hours';

    if v_denied_count >= 2 then
      perform public.upsert_fraud_alert(
        v_event_branch_id,
        v_actor.id,
        null,
        null,
        null,
        'login_anomaly',
        case when v_denied_count >= 4 then 85 else 60 end,
        'Login anomaly',
        format('Staff account saw %s denied device access event(s) in the last 24 hours.', v_denied_count),
        jsonb_build_object(
          'denied_access_count', v_denied_count,
          'window_hours', 24
        ),
        format(
          'login_anomaly:denied:%s:%s',
          v_actor.id,
          to_char(date_trunc('day', v_event_time), 'YYYYMMDD')
        )
      );
      v_alert_count := v_alert_count + 1;
    end if;

    if v_current_device_id is not null then
      select nullif(trim(coalesce(al.metadata ->> 'device_id', '')), '')
      into v_other_device_id
      from public.audit_logs al
      where al.actor_id = v_actor.id
        and al.action in ('staff_sign_in', 'register_device')
        and al.created_at >= v_event_time - interval '24 hours'
        and nullif(trim(coalesce(al.metadata ->> 'device_id', '')), '') is not null
        and nullif(trim(coalesce(al.metadata ->> 'device_id', '')), '') <> v_current_device_id
      order by al.created_at desc
      limit 1;

      if v_other_device_id is not null then
        perform public.upsert_fraud_alert(
          v_event_branch_id,
          v_actor.id,
          null,
          null,
          null,
          'login_anomaly',
          60,
          'Login anomaly',
          'Successful sign-in followed a different trusted device or workstation signal within 24 hours.',
          jsonb_build_object(
            'current_device_id', v_current_device_id,
            'previous_device_id', v_other_device_id,
            'channel', p_metadata ->> 'channel'
          ),
          format('login_anomaly:device:%s:%s', v_actor.id, v_current_device_id)
        );
        v_alert_count := v_alert_count + 1;
      end if;
    end if;
  end if;

  if p_event_type = 'device_asserted'
    and v_actor.id is not null
    and coalesce(p_metadata ->> 'access', '') = 'blocked' then
    perform public.upsert_fraud_alert(
      v_event_branch_id,
      v_actor.id,
      null,
      null,
      null,
      'multi_device_access',
      85,
      'Multi-device access',
      'Blocked device assertion indicates a conflicting trusted device or workstation.',
      jsonb_strip_nulls(
        jsonb_build_object(
          'attempted_device_id', p_metadata ->> 'device_id',
          'active_device_id', p_metadata ->> 'active_device_id',
          'active_device_kind', p_metadata ->> 'active_device_kind'
        )
      ),
      format(
        'multi_device_access:block:%s:%s',
        v_actor.id,
        coalesce(nullif(trim(coalesce(p_metadata ->> 'device_id', '')), ''), 'unknown')
      )
    );
    v_alert_count := v_alert_count + 1;
  end if;

  if p_event_type = 'device_registered' and v_actor.id is not null then
    select count(*)
    into v_reset_count
    from public.audit_logs
    where action = 'reset_staff_device'
      and entity_id = v_actor.id::text
      and created_at >= v_event_time - interval '7 days';

    if v_reset_count > 0 then
      perform public.upsert_fraud_alert(
        v_event_branch_id,
        v_actor.id,
        null,
        null,
        null,
        'multi_device_access',
        60,
        'Multi-device access',
        'Trusted device was re-registered soon after a recent device reset.',
        jsonb_build_object(
          'reset_count_last_7_days', v_reset_count,
          'device_id', p_metadata ->> 'device_id'
        ),
        format(
          'multi_device_access:rebind:%s:%s',
          v_actor.id,
          to_char(date_trunc('week', v_event_time), 'IYYYIW')
        )
      );
      v_alert_count := v_alert_count + 1;
    end if;
  end if;

  if p_event_type = 'device_reset'
    and v_actor.role = 'branch_manager'
    and nullif(trim(coalesce(p_metadata ->> 'target_profile_id', '')), '') is not null then
    select branch_id
    into v_target_branch_id
    from public.profiles
    where id = (p_metadata ->> 'target_profile_id')::uuid;

    if v_target_branch_id is not null and v_target_branch_id is distinct from v_actor.branch_id then
      perform public.upsert_fraud_alert(
        v_event_branch_id,
        (p_metadata ->> 'target_profile_id')::uuid,
        null,
        null,
        null,
        'out_of_branch_handling',
        85,
        'Out-of-branch handling',
        'Branch-scoped device action referenced a profile outside the manager branch scope.',
        jsonb_build_object(
          'actor_branch_id', v_actor.branch_id,
          'target_branch_id', v_target_branch_id,
          'target_profile_id', p_metadata ->> 'target_profile_id'
        ),
        format(
          'out_of_branch_handling:device_reset:%s:%s',
          v_actor.id,
          p_metadata ->> 'target_profile_id'
        )
      );
      v_alert_count := v_alert_count + 1;
    end if;
  end if;

  if p_event_type = 'transaction_pin_failed' and v_actor.id is not null then
    select count(*)
    into v_count
    from public.audit_logs
    where actor_id = v_actor.id
      and action = 'failed_transaction_pin'
      and created_at >= v_event_time - interval '30 minutes';

    if v_count >= 3 then
      perform public.upsert_fraud_alert(
        v_event_branch_id,
        v_actor.id,
        null,
        null,
        null,
        'failed_pin_attempts',
        case when v_count >= 5 then 85 else 60 end,
        'Failed PIN attempts',
        format('Staff account triggered %s failed withdrawal PIN validation(s) in the last 30 minutes.', v_count),
        jsonb_build_object(
          'failed_attempts', v_count,
          'window_minutes', 30,
          'device_id', p_metadata ->> 'device_id'
        ),
        format(
          'failed_pin_attempts:%s:%s',
          v_actor.id,
          to_char(date_trunc('hour', v_event_time), 'YYYYMMDDHH24')
        )
      );
      v_alert_count := v_alert_count + 1;
    end if;
  end if;

  if v_transaction.id is not null and p_event_type in ('transaction_created', 'transaction_approved') then
    if v_transaction.transaction_type = 'deposit' and v_transaction.submitted_offline then
      select count(*), coalesce(sum(amount), 0)::numeric(18,2)
      into v_count, v_sum_amount
      from public.transaction_requests
      where agent_profile_id = v_transaction.agent_profile_id
        and transaction_type = 'deposit'
        and submitted_offline = true
        and created_at between v_transaction.created_at - interval '60 minutes' and v_transaction.created_at;

      if v_count >= 3 or v_sum_amount >= 150000 then
        perform public.upsert_fraud_alert(
          v_transaction.branch_id,
          v_transaction.agent_profile_id,
          v_transaction.member_profile_id,
          v_transaction.id,
          null,
          'offline_transaction_burst',
          case when v_sum_amount >= 150000 or v_count >= 5 then 85 else 60 end,
          'Offline transaction burst',
          'Offline deposit activity rose above the expected short-window threshold.',
          jsonb_build_object(
            'offline_deposit_count_last_60m', v_count,
            'offline_deposit_total_last_60m', v_sum_amount
          ),
          format(
            'offline_transaction_burst:%s:%s',
            v_transaction.agent_profile_id,
            to_char(date_trunc('hour', v_transaction.created_at), 'YYYYMMDDHH24')
          )
        );
        v_alert_count := v_alert_count + 1;
      end if;
    end if;

    if v_transaction.transaction_type = 'deposit' then
      select count(*), coalesce(avg(amount), 0)::numeric(18,2)
      into v_count, v_average_amount
      from public.transaction_requests
      where member_account_id = v_transaction.member_account_id
        and transaction_type = 'deposit'
        and created_at < v_transaction.created_at
        and created_at >= v_transaction.created_at - interval '30 days'
        and status in ('pending_approval', 'approved');

      if (v_count = 0 and v_transaction.amount >= 100000)
        or (v_count > 0 and v_transaction.amount >= 50000 and v_transaction.amount >= v_average_amount * 3) then
        perform public.upsert_fraud_alert(
          v_transaction.branch_id,
          v_transaction.agent_profile_id,
          v_transaction.member_profile_id,
          v_transaction.id,
          null,
          'unusual_deposit_size',
          case
            when v_count = 0 and v_transaction.amount >= 100000 then 85
            when v_average_amount > 0 and v_transaction.amount >= v_average_amount * 5 then 85
            else 60
          end,
          'Unusual deposit size',
          'Deposit amount is materially above the member''s normal cash pattern.',
          jsonb_build_object(
            'deposit_amount', v_transaction.amount,
            'prior_deposit_count_30d', v_count,
            'average_deposit_30d', v_average_amount
          ),
          format('unusual_deposit_size:%s', v_transaction.id)
        );
        v_alert_count := v_alert_count + 1;
      end if;
    end if;

    select count(*)
    into v_matching_count
    from public.transaction_requests
    where agent_profile_id = v_transaction.agent_profile_id
      and member_profile_id = v_transaction.member_profile_id
      and member_account_id = v_transaction.member_account_id
      and transaction_type = v_transaction.transaction_type
      and amount = v_transaction.amount
      and id <> v_transaction.id
      and created_at between v_transaction.created_at - interval '15 minutes' and v_transaction.created_at;

    if v_matching_count > 0 then
      perform public.upsert_fraud_alert(
        v_transaction.branch_id,
        v_transaction.agent_profile_id,
        v_transaction.member_profile_id,
        v_transaction.id,
        null,
        'duplicate_cash_entry',
        85,
        'Duplicate cash entry',
        'A near-identical cash transaction already exists in the last 15 minutes.',
        jsonb_build_object(
          'matching_transactions', v_matching_count,
          'amount', v_transaction.amount,
          'transaction_type', v_transaction.transaction_type
        ),
        format(
          'duplicate_cash_entry:%s:%s:%s:%s:%s',
          v_transaction.agent_profile_id,
          v_transaction.member_profile_id,
          v_transaction.member_account_id,
          v_transaction.transaction_type,
          v_transaction.amount
        )
      );
      v_alert_count := v_alert_count + 1;
    end if;

    select count(*)
    into v_count
    from public.transaction_requests
    where agent_profile_id = v_transaction.agent_profile_id
      and created_at between v_transaction.created_at - interval '60 minutes' and v_transaction.created_at;

    if v_count >= 10 then
      perform public.upsert_fraud_alert(
        v_transaction.branch_id,
        v_transaction.agent_profile_id,
        v_transaction.member_profile_id,
        v_transaction.id,
        null,
        'agent_behavioral_pattern',
        case when v_count >= 15 then 85 else 60 end,
        'Agent behavioral pattern',
        'Transaction volume for one agent rose above the short-window threshold.',
        jsonb_build_object(
          'transaction_count_last_60m', v_count
        ),
        format(
          'agent_behavioral_pattern:volume:%s:%s',
          v_transaction.agent_profile_id,
          to_char(date_trunc('hour', v_transaction.created_at), 'YYYYMMDDHH24')
        )
      );
      v_alert_count := v_alert_count + 1;
    end if;

    with last_twenty as (
      select member_profile_id
      from public.transaction_requests
      where agent_profile_id = v_transaction.agent_profile_id
      order by created_at desc
      limit 20
    )
    select
      case when count(*) = 0 then 0 else round((sum(case when member_profile_id = v_transaction.member_profile_id then 1 else 0 end)::numeric / count(*)::numeric), 4) end
    into v_same_member_ratio
    from last_twenty;

    if coalesce(v_same_member_ratio, 0) > 0.6 then
      perform public.upsert_fraud_alert(
        v_transaction.branch_id,
        v_transaction.agent_profile_id,
        v_transaction.member_profile_id,
        v_transaction.id,
        null,
        'agent_behavioral_pattern',
        60,
        'Agent behavioral pattern',
        'Recent transaction mix is unusually concentrated around one member.',
        jsonb_build_object(
          'same_member_ratio_last_20', v_same_member_ratio
        ),
        format(
          'agent_behavioral_pattern:member:%s:%s',
          v_transaction.agent_profile_id,
          v_transaction.member_profile_id
        )
      );
      v_alert_count := v_alert_count + 1;
    end if;

    if v_transaction.transaction_type = 'withdrawal' then
      select tr.*
      into v_recent_deposit
      from public.transaction_requests tr
      where tr.member_account_id = v_transaction.member_account_id
        and tr.transaction_type = 'deposit'
        and tr.created_at between v_transaction.created_at - interval '48 hours' and v_transaction.created_at
        and tr.status in ('pending_approval', 'approved')
      order by tr.created_at desc
      limit 1;

      if found and v_transaction.amount >= round((v_recent_deposit.amount * 0.8)::numeric, 2) then
        select max(created_at)
        into v_last_activity_at
        from public.transaction_requests
        where member_account_id = v_transaction.member_account_id
          and created_at < v_recent_deposit.created_at;

        if v_last_activity_at is null or v_last_activity_at <= v_recent_deposit.created_at - interval '90 days' then
          perform public.upsert_fraud_alert(
            v_transaction.branch_id,
            v_transaction.agent_profile_id,
            v_transaction.member_profile_id,
            v_transaction.id,
            null,
            'dormant_account_reactivation_spike',
            85,
            'Dormant account reactivation spike',
            'Large withdrawal followed a recent deposit after a long period of inactivity.',
            jsonb_build_object(
              'deposit_amount', v_recent_deposit.amount,
              'withdrawal_amount', v_transaction.amount,
              'previous_activity_at', v_last_activity_at
            ),
            format('dormant_account_reactivation_spike:%s', v_transaction.id)
          );
          v_alert_count := v_alert_count + 1;
        end if;
      end if;
    end if;
  end if;

  if v_transaction.id is not null and p_event_type = 'transaction_approved' then
    select *
    into v_approval_action
    from public.approval_actions
    where request_id = v_transaction.id
      and action = 'approve'
    order by created_at desc
    limit 1;

    if found then
      if coalesce((p_metadata ->> 'auto_approved')::boolean, false) = false
        and v_transaction.created_by is distinct from v_approval_action.actor_id
        and v_approval_action.created_at <= v_transaction.created_at + interval '60 seconds' then
        perform public.upsert_fraud_alert(
          v_transaction.branch_id,
          v_transaction.agent_profile_id,
          v_transaction.member_profile_id,
          v_transaction.id,
          null,
          'fast_approval',
          60,
          'Fast approval',
          'Transaction was approved unusually quickly after submission.',
          jsonb_build_object(
            'approval_seconds', extract(epoch from (v_approval_action.created_at - v_transaction.created_at))
          ),
          format('fast_approval:request:%s', v_transaction.id)
        );
        v_alert_count := v_alert_count + 1;
      end if;

      select count(*)
      into v_count
      from public.approval_actions
      where actor_id = v_approval_action.actor_id
        and action = 'approve'
        and created_at between v_approval_action.created_at - interval '10 minutes' and v_approval_action.created_at;

      if v_count >= 5 then
        perform public.upsert_fraud_alert(
          v_transaction.branch_id,
          v_transaction.agent_profile_id,
          v_transaction.member_profile_id,
          v_transaction.id,
          null,
          'fast_approval',
          case when v_count >= 8 then 85 else 60 end,
          'Fast approval',
          'Approver completed an unusually dense set of approvals in a short window.',
          jsonb_build_object(
            'approval_count_last_10m', v_count,
            'approver_id', v_approval_action.actor_id
          ),
          format(
            'fast_approval:approver:%s:%s',
            v_approval_action.actor_id,
            to_char(date_trunc('hour', v_approval_action.created_at), 'YYYYMMDDHH24')
          )
        );
        v_alert_count := v_alert_count + 1;
      end if;
    end if;

    if v_actor.role = 'branch_manager' and v_actor.branch_id is distinct from v_transaction.branch_id then
      perform public.upsert_fraud_alert(
        v_transaction.branch_id,
        v_transaction.agent_profile_id,
        v_transaction.member_profile_id,
        v_transaction.id,
        null,
        'out_of_branch_handling',
        85,
        'Out-of-branch handling',
        'Branch-scoped approval referenced a transaction outside the manager branch scope.',
        jsonb_build_object(
          'actor_branch_id', v_actor.branch_id,
          'transaction_branch_id', v_transaction.branch_id,
          'approver_id', v_actor.id
        ),
        format('out_of_branch_handling:approval:%s', v_transaction.id)
      );
      v_alert_count := v_alert_count + 1;
    end if;
  end if;

  if v_reconciliation.id is not null and p_event_type in ('reconciliation_submitted', 'reconciliation_reviewed') then
    if abs(coalesce(v_reconciliation.variance, 0)) > 5000 then
      perform public.upsert_fraud_alert(
        v_reconciliation.branch_id,
        v_drawer.agent_profile_id,
        null,
        null,
        v_reconciliation.id,
        'reconciliation_variance',
        case when abs(v_reconciliation.variance) >= 10000 then 85 else 60 end,
        'Reconciliation variance',
        'Cash reconciliation variance exceeded the review threshold.',
        jsonb_build_object(
          'variance', v_reconciliation.variance,
          'expected_cash', v_reconciliation.expected_cash,
          'counted_cash', v_reconciliation.counted_cash
        ),
        format('reconciliation_variance:%s', v_reconciliation.id)
      );
      v_alert_count := v_alert_count + 1;
    end if;

    if p_event_type = 'reconciliation_reviewed' and v_reconciliation.status = 'rejected' then
      select count(*)
      into v_rejected_count
      from public.cash_reconciliations cr
      join public.cash_drawers cd on cd.id = cr.cash_drawer_id
      where cd.agent_profile_id = v_drawer.agent_profile_id
        and cr.status = 'rejected'
        and coalesce(cr.reviewed_at, cr.submitted_at) >= v_event_time - interval '7 days';

      if v_rejected_count >= 2 then
        perform public.upsert_fraud_alert(
          v_reconciliation.branch_id,
          v_drawer.agent_profile_id,
          null,
          null,
          v_reconciliation.id,
          'reconciliation_variance',
          case when v_rejected_count >= 3 then 85 else 60 end,
          'Reconciliation variance',
          'Agent has repeated rejected reconciliations inside the last 7 days.',
          jsonb_build_object(
            'rejected_reconciliations_last_7d', v_rejected_count
          ),
          format(
            'reconciliation_variance:rejected:%s:%s',
            v_drawer.agent_profile_id,
            to_char(date_trunc('week', v_event_time), 'IYYYIW')
          )
        );
        v_alert_count := v_alert_count + 1;
      end if;
    end if;
  end if;

  return v_alert_count;
end;
$$;

create or replace function public.record_fraud_auth_event(
  p_channel text,
  p_device_id text default null,
  p_device_name text default null,
  p_device_kind text default null
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

  if not found or v_actor.role not in ('admin', 'branch_manager', 'agent') then
    return false;
  end if;

  perform public.write_audit_log(
    v_actor.id,
    v_actor.branch_id,
    'staff_sign_in',
    'profile',
    v_actor.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'channel', nullif(trim(p_channel), ''),
        'device_id', nullif(trim(p_device_id), ''),
        'device_name', nullif(trim(p_device_name), ''),
        'device_kind', nullif(trim(p_device_kind), '')
      )
    )
  );

  perform public.evaluate_fraud_event(
    'staff_login',
    v_actor.branch_id,
    v_actor.id,
    null,
    null,
    jsonb_strip_nulls(
      jsonb_build_object(
        'channel', nullif(trim(p_channel), ''),
        'device_id', nullif(trim(p_device_id), ''),
        'device_name', nullif(trim(p_device_name), ''),
        'device_kind', nullif(trim(p_device_kind), '')
      )
    )
  );

  return true;
end;
$$;

create or replace function public.record_failed_transaction_pin(
  p_device_id text default null
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

  if not found or v_actor.role <> 'agent' then
    return false;
  end if;

  perform public.write_audit_log(
    v_actor.id,
    v_actor.branch_id,
    'failed_transaction_pin',
    'profile',
    v_actor.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'device_id', nullif(trim(p_device_id), '')
      )
    )
  );

  perform public.evaluate_fraud_event(
    'transaction_pin_failed',
    v_actor.branch_id,
    v_actor.id,
    null,
    null,
    jsonb_strip_nulls(
      jsonb_build_object(
        'device_id', nullif(trim(p_device_id), '')
      )
    )
  );

  return true;
end;
$$;

create or replace function public.set_fraud_alert_status(
  p_alert_id uuid,
  p_status text,
  p_note text default null
)
returns public.fraud_alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_alert public.fraud_alerts;
  v_previous_status text;
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
    raise exception 'only admins and branch managers can update fraud alerts';
  end if;

  if p_status not in ('open', 'investigating', 'resolved', 'false_positive') then
    raise exception 'unsupported fraud alert status';
  end if;

  select *
  into v_alert
  from public.fraud_alerts
  where id = p_alert_id
  for update;

  if not found then
    raise exception 'fraud alert not found';
  end if;

  if v_actor.role = 'branch_manager' and v_actor.branch_id is distinct from v_alert.branch_id then
    raise exception 'branch managers can only update alerts in their branch';
  end if;

  v_previous_status := v_alert.status;

  update public.fraud_alerts
  set
    status = p_status,
    resolution_note = case
      when p_status in ('resolved', 'false_positive', 'investigating') then nullif(trim(p_note), '')
      else resolution_note
    end,
    resolved_at = case
      when p_status in ('resolved', 'false_positive') then timezone('utc', now())
      else null
    end,
    assigned_to = case
      when p_status = 'investigating' then v_actor.id
      else assigned_to
    end,
    updated_at = timezone('utc', now())
  where id = v_alert.id
  returning * into v_alert;

  perform public.write_audit_log(
    v_actor.id,
    v_alert.branch_id,
    'update_fraud_alert_status',
    'fraud_alert',
    v_alert.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'previous_status', v_previous_status,
        'next_status', v_alert.status,
        'note', nullif(trim(p_note), '')
      )
    )
  );

  return v_alert;
end;
$$;

grant select on public.fraud_alerts to authenticated, service_role;

revoke all on function public.upsert_fraud_alert(uuid, uuid, uuid, uuid, uuid, text, integer, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.upsert_fraud_alert(uuid, uuid, uuid, uuid, uuid, text, integer, text, text, jsonb, text) to service_role;

revoke all on function public.evaluate_fraud_event(text, uuid, uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.evaluate_fraud_event(text, uuid, uuid, uuid, uuid, jsonb) to authenticated, service_role;

revoke all on function public.record_fraud_auth_event(text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_fraud_auth_event(text, text, text, text) to authenticated, service_role;

revoke all on function public.record_failed_transaction_pin(text) from public, anon, authenticated;
grant execute on function public.record_failed_transaction_pin(text) to authenticated, service_role;

revoke all on function public.set_fraud_alert_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_fraud_alert_status(uuid, text, text) to authenticated, service_role;
