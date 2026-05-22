-- Skills Tracker Wales
-- Complete Supabase/PostgreSQL setup for curriculum mapping only.
--
-- This schema is designed for a fresh Supabase project. If earlier versions
-- of these tables already exist, create table if not exists will not migrate
-- them. Use a fresh project or write a migration.
--
-- This database must not store pupil data, behaviour data, assessment data,
-- grades, judgement scores, compliance scores or staff ranking data.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'school_user_role') then
    create type public.school_user_role as enum (
      'platform_admin',
      'school_admin',
      'subject_lead',
      'teacher',
      'viewer'
    );
  end if;
end
$$;

alter type public.school_user_role add value if not exists 'platform_admin';
alter type public.school_user_role add value if not exists 'school_admin';
alter type public.school_user_role add value if not exists 'subject_lead';
alter type public.school_user_role add value if not exists 'teacher';
alter type public.school_user_role add value if not exists 'viewer';

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'progression_reference') then
    create type public.progression_reference as enum (
      'Step 1',
      'Step 2',
      'Step 3',
      'Step 4',
      'Step 5',
      'Step 3-4',
      'Step 4-5',
      'Not specified'
    );
  end if;
end
$$;

alter type public.progression_reference add value if not exists 'Step 1';
alter type public.progression_reference add value if not exists 'Step 2';
alter type public.progression_reference add value if not exists 'Step 3';
alter type public.progression_reference add value if not exists 'Step 4';
alter type public.progression_reference add value if not exists 'Step 5';
alter type public.progression_reference add value if not exists 'Step 3-4';
alter type public.progression_reference add value if not exists 'Step 4-5';
alter type public.progression_reference add value if not exists 'Not specified';

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'audit_action') then
    create type public.audit_action as enum (
      'create',
      'update',
      'delete',
      'import',
      'export',
      'login',
      'review'
    );
  end if;
end
$$;

alter type public.audit_action add value if not exists 'create';
alter type public.audit_action add value if not exists 'update';
alter type public.audit_action add value if not exists 'delete';
alter type public.audit_action add value if not exists 'import';
alter type public.audit_action add value if not exists 'export';
alter type public.audit_action add value if not exists 'login';
alter type public.audit_action add value if not exists 'review';

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  motto text,
  subdomain text unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schools_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_users (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.school_user_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, user_id)
);

-- App-facing staff profile table.
-- The front end reads: id, email, display_name, role, school_id, assigned_subjects, active.
create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  email text not null unique,
  display_name text,
  role public.school_user_role not null default 'viewer',
  assigned_subjects text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aoles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name),
  unique (id, school_id)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  aole_id uuid,
  name text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  appears_in_mapping_dropdowns boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name),
  unique (id, school_id),
  foreign key (aole_id, school_id) references public.aoles(id, school_id) on delete restrict
);

create table if not exists public.frameworks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  short_name text not null,
  description text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name),
  unique (id, school_id)
);

create table if not exists public.strands (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  framework_id uuid not null,
  name text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (framework_id, name),
  unique (id, school_id),
  foreign key (framework_id, school_id) references public.frameworks(id, school_id) on delete cascade
);

create table if not exists public.elements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  strand_id uuid not null,
  name text not null,
  official_wording text,
  teacher_friendly_explanation text not null,
  example_classroom_opportunities text[] not null default '{}',
  search_keywords text[] not null default '{}',
  related_connections text[] not null default '{}',
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (strand_id, name),
  unique (id, school_id),
  foreign key (strand_id, school_id) references public.strands(id, school_id) on delete cascade
);

create table if not exists public.progression_descriptors (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  element_id uuid not null,
  progression_step public.progression_reference not null,
  descriptor text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (element_id, progression_step),
  unique (id, school_id),
  foreign key (element_id, school_id) references public.elements(id, school_id) on delete cascade
);

create table if not exists public.curriculum_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  subject_id uuid not null,
  framework_id uuid not null,
  strand_id uuid not null,
  element_id uuid not null,
  year_group text not null,
  term text not null,
  unit_topic text not null,
  learning_activity_description text not null,
  scheme_reference text not null,
  progression_reference public.progression_reference not null default 'Not specified',
  progression_descriptor_id uuid,
  optional_note text,
  last_mapped_date date not null default current_date,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (subject_id, school_id) references public.subjects(id, school_id) on delete restrict,
  foreign key (framework_id, school_id) references public.frameworks(id, school_id) on delete restrict,
  foreign key (strand_id, school_id) references public.strands(id, school_id) on delete restrict,
  foreign key (element_id, school_id) references public.elements(id, school_id) on delete restrict,
  foreign key (progression_descriptor_id, school_id) references public.progression_descriptors(id, school_id) on delete set null,
  constraint curriculum_entries_year_group_check check (year_group in ('Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11')),
  constraint curriculum_entries_term_check check (term in ('Autumn', 'Spring', 'Summer')),
  constraint curriculum_entries_unit_not_blank check (char_length(trim(unit_topic)) > 0),
  constraint curriculum_entries_scheme_not_blank check (char_length(trim(scheme_reference)) > 0),
  constraint curriculum_entries_activity_length check (char_length(trim(learning_activity_description)) between 10 and 1000)
);

create table if not exists public.branding_settings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  school_name text not null,
  motto text,
  logo_url text,
  primary_colour text not null default '#741B47',
  secondary_colour text not null default '#571435',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id),
  constraint branding_primary_hex check (primary_colour ~ '^#[0-9A-Fa-f]{6}$'),
  constraint branding_secondary_hex check (secondary_colour ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.framework_colour_themes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  framework_id uuid not null,
  primary_colour text not null,
  pale_colour text not null,
  badge_colour text not null,
  chart_colour text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (framework_id),
  foreign key (framework_id, school_id) references public.frameworks(id, school_id) on delete cascade,
  constraint framework_theme_primary_hex check (primary_colour ~ '^#[0-9A-Fa-f]{6}$'),
  constraint framework_theme_pale_hex check (pale_colour ~ '^#[0-9A-Fa-f]{6}$'),
  constraint framework_theme_badge_hex check (badge_colour ~ '^#[0-9A-Fa-f]{6}$'),
  constraint framework_theme_chart_hex check (chart_colour ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.review_cycles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  starts_on date,
  ends_on date,
  active boolean not null default true,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name),
  constraint review_cycles_date_order check (starts_on is null or ends_on is null or starts_on <= ends_on)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  action public.audit_action not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists school_users_school_idx on public.school_users(school_id);
create index if not exists school_users_user_idx on public.school_users(user_id);
create index if not exists staff_profiles_school_idx on public.staff_profiles(school_id);
create index if not exists staff_profiles_role_idx on public.staff_profiles(role);
create index if not exists staff_profiles_active_idx on public.staff_profiles(active);
create index if not exists aoles_school_idx on public.aoles(school_id);
create index if not exists subjects_school_idx on public.subjects(school_id);
create index if not exists subjects_aole_idx on public.subjects(aole_id);
create index if not exists frameworks_school_idx on public.frameworks(school_id);
create index if not exists strands_school_framework_idx on public.strands(school_id, framework_id);
create index if not exists elements_school_strand_idx on public.elements(school_id, strand_id);
create index if not exists progression_descriptors_school_element_idx on public.progression_descriptors(school_id, element_id);
create index if not exists curriculum_entries_school_idx on public.curriculum_entries(school_id);
create index if not exists curriculum_entries_subject_idx on public.curriculum_entries(subject_id);
create index if not exists curriculum_entries_framework_idx on public.curriculum_entries(framework_id);
create index if not exists curriculum_entries_element_idx on public.curriculum_entries(element_id);
create index if not exists curriculum_entries_year_term_idx on public.curriculum_entries(school_id, year_group, term);
create index if not exists curriculum_entries_progression_idx on public.curriculum_entries(school_id, progression_reference);
create index if not exists curriculum_entries_progression_descriptor_idx on public.curriculum_entries(school_id, progression_descriptor_id);
create index if not exists review_cycles_school_idx on public.review_cycles(school_id);
create index if not exists audit_logs_school_created_idx on public.audit_logs(school_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_schools_updated_at on public.schools;
create trigger set_schools_updated_at before update on public.schools for each row execute function public.set_updated_at();
drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists set_school_users_updated_at on public.school_users;
create trigger set_school_users_updated_at before update on public.school_users for each row execute function public.set_updated_at();
drop trigger if exists set_staff_profiles_updated_at on public.staff_profiles;
create trigger set_staff_profiles_updated_at before update on public.staff_profiles for each row execute function public.set_updated_at();
drop trigger if exists set_aoles_updated_at on public.aoles;
create trigger set_aoles_updated_at before update on public.aoles for each row execute function public.set_updated_at();
drop trigger if exists set_subjects_updated_at on public.subjects;
create trigger set_subjects_updated_at before update on public.subjects for each row execute function public.set_updated_at();
drop trigger if exists set_frameworks_updated_at on public.frameworks;
create trigger set_frameworks_updated_at before update on public.frameworks for each row execute function public.set_updated_at();
drop trigger if exists set_strands_updated_at on public.strands;
create trigger set_strands_updated_at before update on public.strands for each row execute function public.set_updated_at();
drop trigger if exists set_elements_updated_at on public.elements;
create trigger set_elements_updated_at before update on public.elements for each row execute function public.set_updated_at();
drop trigger if exists set_progression_descriptors_updated_at on public.progression_descriptors;
create trigger set_progression_descriptors_updated_at before update on public.progression_descriptors for each row execute function public.set_updated_at();
drop trigger if exists set_curriculum_entries_updated_at on public.curriculum_entries;
create trigger set_curriculum_entries_updated_at before update on public.curriculum_entries for each row execute function public.set_updated_at();
drop trigger if exists set_branding_settings_updated_at on public.branding_settings;
create trigger set_branding_settings_updated_at before update on public.branding_settings for each row execute function public.set_updated_at();
drop trigger if exists set_framework_colour_themes_updated_at on public.framework_colour_themes;
create trigger set_framework_colour_themes_updated_at before update on public.framework_colour_themes for each row execute function public.set_updated_at();
drop trigger if exists set_review_cycles_updated_at on public.review_cycles;
create trigger set_review_cycles_updated_at before update on public.review_cycles for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.school_user_role
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select sp.role
      from public.staff_profiles sp
      where sp.id = auth.uid()
        and sp.active = true
      limit 1
    ),
    (
      select su.role
      from public.school_users su
      where su.user_id = auth.uid()
        and su.active = true
      order by case su.role
        when 'platform_admin' then 1
        when 'school_admin' then 2
        when 'subject_lead' then 3
        when 'teacher' then 4
        else 5
      end
      limit 1
    )
  );
$$;

create or replace function public.current_user_school_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select sp.school_id
      from public.staff_profiles sp
      where sp.id = auth.uid()
        and sp.active = true
      limit 1
    ),
    (
      select su.school_id
      from public.school_users su
      where su.user_id = auth.uid()
        and su.active = true
      order by su.created_at
      limit 1
    )
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.staff_profiles sp
    where sp.id = auth.uid()
      and sp.role = 'platform_admin'
      and sp.active = true
  )
  or exists (
    select 1
    from public.school_users su
    where su.user_id = auth.uid()
      and su.role = 'platform_admin'
      and su.active = true
  );
$$;

create or replace function public.is_school_admin(target_school_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.staff_profiles sp
      where sp.id = auth.uid()
        and sp.role = 'school_admin'
        and sp.active = true
        and (target_school_id is null or sp.school_id = target_school_id)
    )
    or exists (
      select 1
      from public.school_users su
      where su.user_id = auth.uid()
        and su.role = 'school_admin'
        and su.active = true
        and (target_school_id is null or su.school_id = target_school_id)
    );
$$;

create or replace function public.can_view_school(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.staff_profiles sp
      where sp.id = auth.uid()
        and sp.school_id = target_school_id
        and sp.active = true
    )
    or exists (
      select 1
      from public.school_users su
      where su.user_id = auth.uid()
        and su.school_id = target_school_id
        and su.active = true
    );
$$;

create or replace function public.can_edit_school(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_school_admin(target_school_id);
$$;

create or replace function public.can_manage_school(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_school_admin(target_school_id);
$$;

create or replace function public.can_manage_school_setup(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_school_admin(target_school_id);
$$;

create or replace function public.can_edit_curriculum_subject(target_school_id uuid, target_subject_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.staff_profiles sp
      where sp.id = auth.uid()
        and sp.school_id = target_school_id
        and sp.active = true
        and (
          sp.role = 'school_admin'
          or (
            sp.role in ('teacher', 'subject_lead')
            and exists (
              select 1
              from public.subjects s
              where s.id = target_subject_id
                and s.school_id = target_school_id
                and s.name = any(sp.assigned_subjects)
            )
          )
        )
    )
    or exists (
      select 1
      from public.school_users su
      where su.user_id = auth.uid()
        and su.school_id = target_school_id
        and su.active = true
        and su.role = 'school_admin'
    );
$$;

create or replace function public.can_delete_curriculum_subject(target_school_id uuid, target_subject_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_school_admin(target_school_id)
    or exists (
      select 1
      from public.staff_profiles sp
      where sp.id = auth.uid()
        and sp.school_id = target_school_id
        and sp.role in ('teacher', 'subject_lead')
        and sp.active = true
        and exists (
          select 1
          from public.subjects s
          where s.id = target_subject_id
            and s.school_id = target_school_id
            and s.name = any(sp.assigned_subjects)
        )
    );
$$;

alter table public.schools enable row level security;
alter table public.users enable row level security;
alter table public.school_users enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.aoles enable row level security;
alter table public.subjects enable row level security;
alter table public.frameworks enable row level security;
alter table public.strands enable row level security;
alter table public.elements enable row level security;
alter table public.progression_descriptors enable row level security;
alter table public.curriculum_entries enable row level security;
alter table public.branding_settings enable row level security;
alter table public.framework_colour_themes enable row level security;
alter table public.review_cycles enable row level security;
alter table public.audit_logs enable row level security;

do $$
declare
  target_table regclass;
  existing_policy record;
begin
  foreach target_table in array array[
    'public.schools'::regclass,
    'public.users'::regclass,
    'public.school_users'::regclass,
    'public.staff_profiles'::regclass,
    'public.aoles'::regclass,
    'public.subjects'::regclass,
    'public.frameworks'::regclass,
    'public.strands'::regclass,
    'public.elements'::regclass,
    'public.progression_descriptors'::regclass,
    'public.curriculum_entries'::regclass,
    'public.branding_settings'::regclass,
    'public.framework_colour_themes'::regclass,
    'public.review_cycles'::regclass,
    'public.audit_logs'::regclass
  ]
  loop
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = (
          select n.nspname
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where c.oid = target_table
        )
        and tablename = (
          select c.relname
          from pg_class c
          where c.oid = target_table
        )
    loop
      execute format('drop policy if exists %I on %s', existing_policy.policyname, target_table);
    end loop;
  end loop;
end
$$;

drop policy if exists "schools_select" on public.schools;
create policy "schools_select" on public.schools for select to authenticated
using (public.can_view_school(id));
drop policy if exists "schools_insert" on public.schools;
create policy "schools_insert" on public.schools for insert to authenticated
with check (public.is_platform_admin());
drop policy if exists "schools_update" on public.schools;
create policy "schools_update" on public.schools for update to authenticated
using (public.is_school_admin(id))
with check (public.is_school_admin(id));
drop policy if exists "schools_delete" on public.schools;
create policy "schools_delete" on public.schools for delete to authenticated
using (public.is_platform_admin());

drop policy if exists "users_select" on public.users;
create policy "users_select" on public.users for select to authenticated
using (
  id = auth.uid()
  or public.is_platform_admin()
  or exists (
    select 1
    from public.staff_profiles admin_profile
    join public.staff_profiles target_profile
      on target_profile.school_id = admin_profile.school_id
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'school_admin'
      and admin_profile.active = true
      and target_profile.id = public.users.id
      and target_profile.active = true
  )
  or exists (
    select 1
    from public.school_users admin_membership
    join public.school_users target_membership
      on target_membership.school_id = admin_membership.school_id
    where admin_membership.user_id = auth.uid()
      and admin_membership.role = 'school_admin'
      and admin_membership.active = true
      and target_membership.user_id = public.users.id
      and target_membership.active = true
  )
);
drop policy if exists "users_insert" on public.users;
create policy "users_insert" on public.users for insert to authenticated
with check (id = auth.uid() or public.is_platform_admin());
drop policy if exists "users_update" on public.users;
create policy "users_update" on public.users for update to authenticated
using (
  id = auth.uid()
  or public.is_platform_admin()
  or exists (
    select 1
    from public.staff_profiles admin_profile
    join public.staff_profiles target_profile
      on target_profile.school_id = admin_profile.school_id
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'school_admin'
      and admin_profile.active = true
      and target_profile.id = public.users.id
      and target_profile.active = true
  )
)
with check (
  id = auth.uid()
  or public.is_platform_admin()
  or exists (
    select 1
    from public.staff_profiles admin_profile
    join public.staff_profiles target_profile
      on target_profile.school_id = admin_profile.school_id
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'school_admin'
      and admin_profile.active = true
      and target_profile.id = public.users.id
      and target_profile.active = true
  )
);

drop policy if exists "school_users_select" on public.school_users;
create policy "school_users_select" on public.school_users for select to authenticated
using (user_id = auth.uid() or public.is_school_admin(school_id));
drop policy if exists "school_users_insert" on public.school_users;
create policy "school_users_insert" on public.school_users for insert to authenticated
with check (public.is_school_admin(school_id));
drop policy if exists "school_users_update" on public.school_users;
create policy "school_users_update" on public.school_users for update to authenticated
using (public.is_school_admin(school_id))
with check (public.is_school_admin(school_id));
drop policy if exists "school_users_delete" on public.school_users;
create policy "school_users_delete" on public.school_users for delete to authenticated
using (public.is_school_admin(school_id));

drop policy if exists "staff_profiles_select" on public.staff_profiles;
create policy "staff_profiles_select" on public.staff_profiles for select to authenticated
using (id = auth.uid() or public.is_school_admin(school_id));
drop policy if exists "staff_profiles_insert" on public.staff_profiles;
create policy "staff_profiles_insert" on public.staff_profiles for insert to authenticated
with check (public.is_school_admin(school_id));
drop policy if exists "staff_profiles_update" on public.staff_profiles;
create policy "staff_profiles_update" on public.staff_profiles for update to authenticated
using (public.is_school_admin(school_id))
with check (public.is_school_admin(school_id));
drop policy if exists "staff_profiles_delete" on public.staff_profiles;
create policy "staff_profiles_delete" on public.staff_profiles for delete to authenticated
using (public.is_school_admin(school_id));

drop policy if exists "aoles_select" on public.aoles;
create policy "aoles_select" on public.aoles for select to authenticated
using (public.can_view_school(school_id));
drop policy if exists "aoles_insert" on public.aoles;
create policy "aoles_insert" on public.aoles for insert to authenticated
with check (public.can_manage_school_setup(school_id));
drop policy if exists "aoles_update" on public.aoles;
create policy "aoles_update" on public.aoles for update to authenticated
using (public.can_manage_school_setup(school_id))
with check (public.can_manage_school_setup(school_id));
drop policy if exists "aoles_delete" on public.aoles;
create policy "aoles_delete" on public.aoles for delete to authenticated
using (public.can_manage_school_setup(school_id));

drop policy if exists "subjects_select" on public.subjects;
create policy "subjects_select" on public.subjects for select to authenticated
using (public.can_view_school(school_id));
drop policy if exists "subjects_insert" on public.subjects;
create policy "subjects_insert" on public.subjects for insert to authenticated
with check (public.can_manage_school_setup(school_id));
drop policy if exists "subjects_update" on public.subjects;
create policy "subjects_update" on public.subjects for update to authenticated
using (public.can_manage_school_setup(school_id))
with check (public.can_manage_school_setup(school_id));
drop policy if exists "subjects_delete" on public.subjects;
create policy "subjects_delete" on public.subjects for delete to authenticated
using (public.can_manage_school_setup(school_id));

drop policy if exists "frameworks_select" on public.frameworks;
create policy "frameworks_select" on public.frameworks for select to authenticated
using (public.can_view_school(school_id));
drop policy if exists "frameworks_insert" on public.frameworks;
create policy "frameworks_insert" on public.frameworks for insert to authenticated
with check (public.can_manage_school_setup(school_id));
drop policy if exists "frameworks_update" on public.frameworks;
create policy "frameworks_update" on public.frameworks for update to authenticated
using (public.can_manage_school_setup(school_id))
with check (public.can_manage_school_setup(school_id));
drop policy if exists "frameworks_delete" on public.frameworks;
create policy "frameworks_delete" on public.frameworks for delete to authenticated
using (public.can_manage_school_setup(school_id));

drop policy if exists "strands_select" on public.strands;
create policy "strands_select" on public.strands for select to authenticated
using (public.can_view_school(school_id));
drop policy if exists "strands_insert" on public.strands;
create policy "strands_insert" on public.strands for insert to authenticated
with check (public.can_manage_school_setup(school_id));
drop policy if exists "strands_update" on public.strands;
create policy "strands_update" on public.strands for update to authenticated
using (public.can_manage_school_setup(school_id))
with check (public.can_manage_school_setup(school_id));
drop policy if exists "strands_delete" on public.strands;
create policy "strands_delete" on public.strands for delete to authenticated
using (public.can_manage_school_setup(school_id));

drop policy if exists "elements_select" on public.elements;
create policy "elements_select" on public.elements for select to authenticated
using (public.can_view_school(school_id));
drop policy if exists "elements_insert" on public.elements;
create policy "elements_insert" on public.elements for insert to authenticated
with check (public.can_manage_school_setup(school_id));
drop policy if exists "elements_update" on public.elements;
create policy "elements_update" on public.elements for update to authenticated
using (public.can_manage_school_setup(school_id))
with check (public.can_manage_school_setup(school_id));
drop policy if exists "elements_delete" on public.elements;
create policy "elements_delete" on public.elements for delete to authenticated
using (public.can_manage_school_setup(school_id));

drop policy if exists "progression_descriptors_select" on public.progression_descriptors;
create policy "progression_descriptors_select" on public.progression_descriptors for select to authenticated
using (public.can_view_school(school_id));
drop policy if exists "progression_descriptors_insert" on public.progression_descriptors;
create policy "progression_descriptors_insert" on public.progression_descriptors for insert to authenticated
with check (public.can_manage_school_setup(school_id));
drop policy if exists "progression_descriptors_update" on public.progression_descriptors;
create policy "progression_descriptors_update" on public.progression_descriptors for update to authenticated
using (public.can_manage_school_setup(school_id))
with check (public.can_manage_school_setup(school_id));
drop policy if exists "progression_descriptors_delete" on public.progression_descriptors;
create policy "progression_descriptors_delete" on public.progression_descriptors for delete to authenticated
using (public.can_manage_school_setup(school_id));

drop policy if exists "curriculum_entries_select" on public.curriculum_entries;
create policy "curriculum_entries_select" on public.curriculum_entries for select to authenticated
using (public.can_view_school(school_id));
drop policy if exists "curriculum_entries_insert" on public.curriculum_entries;
create policy "curriculum_entries_insert" on public.curriculum_entries for insert to authenticated
with check (public.can_edit_curriculum_subject(school_id, subject_id));
drop policy if exists "curriculum_entries_update" on public.curriculum_entries;
create policy "curriculum_entries_update" on public.curriculum_entries for update to authenticated
using (public.can_edit_curriculum_subject(school_id, subject_id))
with check (public.can_edit_curriculum_subject(school_id, subject_id));
drop policy if exists "curriculum_entries_delete" on public.curriculum_entries;
create policy "curriculum_entries_delete" on public.curriculum_entries for delete to authenticated
using (public.can_delete_curriculum_subject(school_id, subject_id));

drop policy if exists "branding_settings_select" on public.branding_settings;
create policy "branding_settings_select" on public.branding_settings for select to authenticated
using (public.can_view_school(school_id));
drop policy if exists "branding_settings_insert" on public.branding_settings;
create policy "branding_settings_insert" on public.branding_settings for insert to authenticated
with check (public.is_school_admin(school_id));
drop policy if exists "branding_settings_update" on public.branding_settings;
create policy "branding_settings_update" on public.branding_settings for update to authenticated
using (public.is_school_admin(school_id))
with check (public.is_school_admin(school_id));
drop policy if exists "branding_settings_delete" on public.branding_settings;
create policy "branding_settings_delete" on public.branding_settings for delete to authenticated
using (public.is_platform_admin());

drop policy if exists "framework_colour_themes_select" on public.framework_colour_themes;
create policy "framework_colour_themes_select" on public.framework_colour_themes for select to authenticated
using (public.can_view_school(school_id));
drop policy if exists "framework_colour_themes_insert" on public.framework_colour_themes;
create policy "framework_colour_themes_insert" on public.framework_colour_themes for insert to authenticated
with check (public.is_school_admin(school_id));
drop policy if exists "framework_colour_themes_update" on public.framework_colour_themes;
create policy "framework_colour_themes_update" on public.framework_colour_themes for update to authenticated
using (public.is_school_admin(school_id))
with check (public.is_school_admin(school_id));
drop policy if exists "framework_colour_themes_delete" on public.framework_colour_themes;
create policy "framework_colour_themes_delete" on public.framework_colour_themes for delete to authenticated
using (public.is_platform_admin());

drop policy if exists "review_cycles_select" on public.review_cycles;
create policy "review_cycles_select" on public.review_cycles for select to authenticated
using (public.can_view_school(school_id));
drop policy if exists "review_cycles_insert" on public.review_cycles;
create policy "review_cycles_insert" on public.review_cycles for insert to authenticated
with check (public.is_school_admin(school_id));
drop policy if exists "review_cycles_update" on public.review_cycles;
create policy "review_cycles_update" on public.review_cycles for update to authenticated
using (public.is_school_admin(school_id))
with check (public.is_school_admin(school_id));
drop policy if exists "review_cycles_delete" on public.review_cycles;
create policy "review_cycles_delete" on public.review_cycles for delete to authenticated
using (public.is_school_admin(school_id));

drop policy if exists "audit_logs_select" on public.audit_logs;
create policy "audit_logs_select" on public.audit_logs for select to authenticated
using (public.is_school_admin(school_id));
drop policy if exists "audit_logs_insert" on public.audit_logs;
create policy "audit_logs_insert" on public.audit_logs for insert to authenticated
with check (public.can_view_school(school_id) and (user_id is null or user_id = auth.uid()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_school_id() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_school_admin(uuid) to authenticated;
grant execute on function public.can_view_school(uuid) to authenticated;
grant execute on function public.can_edit_school(uuid) to authenticated;
grant execute on function public.can_manage_school(uuid) to authenticated;
grant execute on function public.can_manage_school_setup(uuid) to authenticated;
grant execute on function public.can_edit_curriculum_subject(uuid, uuid) to authenticated;
grant execute on function public.can_delete_curriculum_subject(uuid, uuid) to authenticated;

comment on table public.curriculum_entries is 'Curriculum mapping entries only. Do not store pupil data, behaviour data, assessment data, grades, judgement scores, compliance scores or staff ranking data.';
comment on table public.staff_profiles is 'Staff access profile used after Supabase Auth login. Roles are managed by admins, not by users from the client.';

-- First-school bootstrap notes
--
-- 1. Run this schema in the Supabase SQL Editor.
-- 2. Create the first school in SQL Editor, for example:
--    insert into public.schools (slug, name, motto)
--    values ('example-school', 'Example School', 'Curriculum visibility')
--    returning id;
-- 3. Create the first Supabase Auth user from Authentication > Users.
--    Use a placeholder school email such as first.admin@example-school.invalid.
-- 4. Copy that Auth user UUID and the school UUID, then insert the first admin rows:
--    insert into public.users (id, email, display_name)
--    values ('AUTH_USER_UUID_HERE', 'first.admin@example-school.invalid', 'First School Admin');
--
--    insert into public.staff_profiles (id, school_id, email, display_name, role, active)
--    values ('AUTH_USER_UUID_HERE', 'SCHOOL_UUID_HERE', 'first.admin@example-school.invalid', 'First School Admin', 'school_admin', true);
--
--    insert into public.school_users (school_id, user_id, role, active)
--    values ('SCHOOL_UUID_HERE', 'AUTH_USER_UUID_HERE', 'school_admin', true);
--
-- Do not place real pupil, behaviour, assessment, grade, compliance or staff ranking data in this database.
