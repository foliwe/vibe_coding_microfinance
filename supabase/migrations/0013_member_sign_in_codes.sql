alter table public.branches
  alter column code type text using upper(trim(code));

update public.branches
set
  code = upper(trim(code)),
  updated_at = timezone('utc', now())
where code <> upper(trim(code));

do $$
begin
  if exists (
    select 1
    from public.branches
    where code !~ '^[A-Z0-9]{3}$'
  ) then
    raise exception 'branch code must be exactly 3 uppercase letters or numbers';
  end if;
end;
$$;

alter table public.branches
  add constraint branches_code_format_ck
  check (code ~ '^[A-Z0-9]{3}$');

alter table public.member_profiles
  add column sign_in_code text;

do $$
declare
  member_record record;
  branch_code text;
  source_pool text;
  candidate text;
  candidate_email text;
  source_chars text;
  tries integer;
begin
  for member_record in
    select
      mp.profile_id,
      mp.id_number,
      p.branch_id
    from public.member_profiles mp
    join public.profiles p on p.id = mp.profile_id
    where mp.sign_in_code is null
  loop
    select b.code
    into branch_code
    from public.branches b
    where b.id = member_record.branch_id;

    if branch_code is null then
      raise exception 'member % has no branch code available', member_record.profile_id;
    end if;

    source_pool := regexp_replace(upper(coalesce(member_record.id_number, '')), '[^A-Z0-9]+', '', 'g');

    if length(source_pool) < 2 then
      source_pool := source_pool || replace(upper(member_record.profile_id::text), '-', '');
    end if;

    if source_pool = '' then
      source_pool := replace(upper(member_record.profile_id::text), '-', '');
    end if;

    tries := 0;

    loop
      tries := tries + 1;

      if tries > 50 then
        raise exception 'unable to generate unique sign in code for member %', member_record.profile_id;
      end if;

      source_chars :=
        substr(source_pool, 1 + floor(random() * length(source_pool))::integer, 1) ||
        substr(source_pool, 1 + floor(random() * length(source_pool))::integer, 1);
      candidate :=
        'MM' ||
        branch_code ||
        source_chars ||
        upper(encode(gen_random_bytes(1), 'hex'));

      exit when not exists (
        select 1
        from public.member_profiles existing
        where existing.sign_in_code = candidate
      );
    end loop;

    candidate_email := lower('member-' || candidate || '@members.local');

    update public.member_profiles
    set sign_in_code = candidate
    where profile_id = member_record.profile_id;

    update public.profiles
    set
      email = candidate_email,
      updated_at = timezone('utc', now())
    where id = member_record.profile_id;

    update auth.users
    set
      email = candidate_email,
      email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('sign_in_code', candidate),
      email_change = '',
      email_change_token_current = '',
      email_change_token_new = '',
      email_change_confirm_status = 0,
      updated_at = timezone('utc', now())
    where id = member_record.profile_id;
  end loop;
end;
$$;

alter table public.member_profiles
  alter column sign_in_code set not null;

alter table public.member_profiles
  add constraint member_profiles_sign_in_code_format_ck
  check (sign_in_code ~ '^MM[A-Z0-9]{7}$');

create unique index member_profiles_sign_in_code_idx
  on public.member_profiles (sign_in_code);
