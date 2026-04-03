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
  where public.profiles.id = auth.uid();

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

  update public.profiles as profile_record
  set
    full_name = trim(p_full_name),
    phone = trim(p_phone),
    updated_at = timezone('utc', now())
  where profile_record.id = auth.uid();

  update public.member_profiles as member_profile_record
  set
    date_of_birth = p_date_of_birth,
    gender = nullif(trim(coalesce(p_gender, '')), ''),
    residential_address = nullif(trim(coalesce(p_residential_address, '')), ''),
    occupation = nullif(trim(coalesce(p_occupation, '')), ''),
    next_of_kin_name = nullif(trim(coalesce(p_next_of_kin_name, '')), ''),
    next_of_kin_phone = nullif(trim(coalesce(p_next_of_kin_phone, '')), ''),
    next_of_kin_address = nullif(trim(coalesce(p_next_of_kin_address, '')), '')
  where member_profile_record.profile_id = auth.uid();

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
    member_profile_record.profile_id,
    profile_record.full_name,
    profile_record.phone,
    member_profile_record.date_of_birth,
    member_profile_record.gender,
    member_profile_record.residential_address,
    member_profile_record.occupation,
    member_profile_record.id_type,
    member_profile_record.id_number,
    member_profile_record.next_of_kin_name,
    member_profile_record.next_of_kin_phone,
    member_profile_record.next_of_kin_address,
    member_profile_record.status
  from public.member_profiles as member_profile_record
  join public.profiles as profile_record
    on profile_record.id = member_profile_record.profile_id
  where member_profile_record.profile_id = auth.uid();
end;
$$;
