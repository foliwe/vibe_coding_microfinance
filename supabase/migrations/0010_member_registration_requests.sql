create table public.member_registration_requests (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  submitted_by uuid not null references public.profiles (id),
  assigned_agent_id uuid not null references public.profiles (id),
  member_type text not null default 'individual',
  full_name text not null,
  phone text not null,
  national_id text,
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  resolved_member_profile_id uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create index member_registration_requests_branch_status_idx
  on public.member_registration_requests (branch_id, status, created_at desc);

create index member_registration_requests_submitted_by_status_idx
  on public.member_registration_requests (submitted_by, status, created_at desc);

alter table public.member_registration_requests enable row level security;

create policy "member registration requests visible by role scope"
  on public.member_registration_requests
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.current_role()) = 'branch_manager'
      and branch_id = (select public.current_branch_id())
    )
    or submitted_by = (select auth.uid())
    or assigned_agent_id = (select auth.uid())
  );

create or replace function public.create_member_registration_request(
  p_actor_id uuid,
  p_member_type text,
  p_full_name text,
  p_phone text,
  p_national_id text default null
)
returns public.member_registration_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_request public.member_registration_requests;
  v_member_type text := lower(trim(coalesce(p_member_type, 'individual')));
  v_full_name text := trim(coalesce(p_full_name, ''));
  v_phone text := trim(coalesce(p_phone, ''));
  v_national_id text := nullif(trim(coalesce(p_national_id, '')), '');
begin
  v_actor := public.assert_actor_context(p_actor_id);

  if v_actor.role <> 'agent' then
    raise exception 'only agents can submit member registration requests';
  end if;

  if v_actor.branch_id is null then
    raise exception 'agent branch is required';
  end if;

  if v_full_name = '' then
    raise exception 'full name is required';
  end if;

  if v_phone = '' then
    raise exception 'phone is required';
  end if;

  if v_member_type = '' then
    v_member_type := 'individual';
  end if;

  insert into public.member_registration_requests (
    branch_id,
    submitted_by,
    assigned_agent_id,
    member_type,
    full_name,
    phone,
    national_id
  )
  values (
    v_actor.branch_id,
    v_actor.id,
    v_actor.id,
    v_member_type,
    v_full_name,
    v_phone,
    v_national_id
  )
  returning * into v_request;

  perform public.write_audit_log(
    v_actor.id,
    v_actor.branch_id,
    'create_member_registration_request',
    'member_registration_request',
    v_request.id::text,
    jsonb_strip_nulls(
      jsonb_build_object(
        'member_type', v_request.member_type,
        'full_name', v_request.full_name,
        'phone', v_request.phone,
        'national_id', v_request.national_id
      )
    )
  );

  return v_request;
end;
$$;

revoke all on function public.create_member_registration_request(uuid, text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.create_member_registration_request(uuid, text, text, text, text)
  to authenticated, service_role;
