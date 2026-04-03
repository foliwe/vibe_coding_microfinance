create unique index if not exists member_profiles_id_number_unique_idx
  on public.member_profiles (id_number)
  where id_number is not null and btrim(id_number) <> '';

create or replace function public.update_my_member_profile(
  p_full_name text,
  p_phone text,
  p_date_of_birth date default null,
  p_gender text default null,
  p_residential_address text default null,
  p_occupation text default null,
  p_next_of_kin_name text default null,
  p_next_of_kin_phone text default null,
  p_next_of_kin_address text default null
)
returns table (
  profile_id uuid,
  full_name text,
  phone text,
  date_of_birth date,
  gender text,
  residential_address text,
  occupation text,
  id_type text,
  id_number text,
  next_of_kin_name text,
  next_of_kin_phone text,
  next_of_kin_address text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'No signed-in profile was found.';
  end if;

  if v_profile.role <> 'member' then
    raise exception 'Only members can complete this profile.';
  end if;

  if nullif(trim(coalesce(p_full_name, '')), '') is null then
    raise exception 'Full name is required.';
  end if;

  if nullif(trim(coalesce(p_phone, '')), '') is null then
    raise exception 'Phone number is required.';
  end if;

  update public.profiles
  set
    full_name = trim(p_full_name),
    phone = trim(p_phone),
    updated_at = timezone('utc', now())
  where id = auth.uid();

  update public.member_profiles
  set
    date_of_birth = p_date_of_birth,
    gender = nullif(trim(coalesce(p_gender, '')), ''),
    residential_address = nullif(trim(coalesce(p_residential_address, '')), ''),
    occupation = nullif(trim(coalesce(p_occupation, '')), ''),
    next_of_kin_name = nullif(trim(coalesce(p_next_of_kin_name, '')), ''),
    next_of_kin_phone = nullif(trim(coalesce(p_next_of_kin_phone, '')), ''),
    next_of_kin_address = nullif(trim(coalesce(p_next_of_kin_address, '')), '')
  where profile_id = auth.uid();

  insert into public.audit_logs (
    actor_id,
    branch_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    v_profile.branch_id,
    'update_member_profile',
    'member_profile',
    auth.uid()::text,
    jsonb_build_object('source', 'member_mobile')
  );

  return query
  select
    mp.profile_id,
    p.full_name,
    p.phone,
    mp.date_of_birth,
    mp.gender,
    mp.residential_address,
    mp.occupation,
    mp.id_type,
    mp.id_number,
    mp.next_of_kin_name,
    mp.next_of_kin_phone,
    mp.next_of_kin_address,
    mp.status
  from public.member_profiles mp
  join public.profiles p on p.id = mp.profile_id
  where mp.profile_id = auth.uid();
end;
$$;

revoke all on function public.update_my_member_profile(
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.update_my_member_profile(
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated, service_role;
