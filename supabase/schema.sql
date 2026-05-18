-- Skills Tracker Wales
-- Production-ready Supabase/PostgreSQL schema.
-- Curriculum visibility only: no pupil data, assessment data, behaviour data,
-- grades, judgement scores, compliance scores, or staff ranking data.

create extension if not exists pgcrypto;

create type public.school_user_role as enum (
  'platform_admin',
  'school_admin',
  'teacher',
  'subject_lead',
  'viewer'
);

create type public.progression_reference as enum (
  'Step 1',
  'Step 2',
  'Step 3',
  'Step 4',
  'Step 5',
  'Step 3–4',
  'Step 4–5',
  'Not specified'
);

create type public.audit_action as enum (
  'create',
  'update',
  'delete',
  'import',
  'export',
  'login',
  'review'
);

create table public.schools (
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

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_users (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.school_user_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, user_id)
);

create table public.staff_profiles (
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

create table public.aoles (
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

create table public.subjects (
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

create table public.frameworks (
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

create table public.strands (
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

create table public.elements (
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

create table public.progression_descriptors (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  element_id uuid not null,
  progression_step public.progression_reference not null,
  descriptor text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (element_id, progression_step),
  foreign key (element_id, school_id) references public.elements(id, school_id) on delete cascade,
  constraint progression_descriptors_steps_only check (
    progression_step in ('Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5')
  )
);

create table public.curriculum_entries (
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
  constraint curriculum_entries_year_group_check check (year_group in ('Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11')),
  constraint curriculum_entries_term_check check (term in ('Autumn', 'Spring', 'Summer')),
  constraint curriculum_entries_unit_not_blank check (char_length(trim(unit_topic)) > 0),
  constraint curriculum_entries_scheme_not_blank check (char_length(trim(scheme_reference)) > 0),
  constraint curriculum_entries_activity_length check (char_length(trim(learning_activity_description)) between 10 and 1000)
);

create table public.branding_settings (
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

create table public.framework_colour_themes (
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

create table public.review_cycles (
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

create table public.audit_logs (
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

create index school_users_school_idx on public.school_users(school_id);
create index school_users_user_idx on public.school_users(user_id);
create index staff_profiles_school_idx on public.staff_profiles(school_id);
create index staff_profiles_role_idx on public.staff_profiles(role);
create index subjects_school_idx on public.subjects(school_id);
create index subjects_aole_idx on public.subjects(aole_id);
create index aoles_school_idx on public.aoles(school_id);
create index frameworks_school_idx on public.frameworks(school_id);
create index strands_school_framework_idx on public.strands(school_id, framework_id);
create index elements_school_strand_idx on public.elements(school_id, strand_id);
create index progression_descriptors_school_element_idx on public.progression_descriptors(school_id, element_id);
create index curriculum_entries_school_idx on public.curriculum_entries(school_id);
create index curriculum_entries_subject_idx on public.curriculum_entries(subject_id);
create index curriculum_entries_framework_idx on public.curriculum_entries(framework_id);
create index curriculum_entries_element_idx on public.curriculum_entries(element_id);
create index curriculum_entries_year_term_idx on public.curriculum_entries(school_id, year_group, term);
create index curriculum_entries_progression_idx on public.curriculum_entries(school_id, progression_reference);
create index review_cycles_school_idx on public.review_cycles(school_id);
create index audit_logs_school_created_idx on public.audit_logs(school_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_schools_updated_at before update on public.schools for each row execute function public.set_updated_at();
create trigger set_users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger set_school_users_updated_at before update on public.school_users for each row execute function public.set_updated_at();
create trigger set_aoles_updated_at before update on public.aoles for each row execute function public.set_updated_at();
create trigger set_subjects_updated_at before update on public.subjects for each row execute function public.set_updated_at();
create trigger set_frameworks_updated_at before update on public.frameworks for each row execute function public.set_updated_at();
create trigger set_strands_updated_at before update on public.strands for each row execute function public.set_updated_at();
create trigger set_elements_updated_at before update on public.elements for each row execute function public.set_updated_at();
create trigger set_progression_descriptors_updated_at before update on public.progression_descriptors for each row execute function public.set_updated_at();
create trigger set_curriculum_entries_updated_at before update on public.curriculum_entries for each row execute function public.set_updated_at();
create trigger set_branding_settings_updated_at before update on public.branding_settings for each row execute function public.set_updated_at();
create trigger set_framework_colour_themes_updated_at before update on public.framework_colour_themes for each row execute function public.set_updated_at();
create trigger set_review_cycles_updated_at before update on public.review_cycles for each row execute function public.set_updated_at();

comment on table public.curriculum_entries is 'Curriculum mapping entries only. This table must not store pupil data, assessment data, behaviour data, grades, judgement scores, compliance scores, or staff ranking data.';
