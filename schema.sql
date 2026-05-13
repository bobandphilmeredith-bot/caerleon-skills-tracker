-- Caerleon Skills Tracker
-- Supabase-ready PostgreSQL schema for curriculum mapping visibility.
-- No pupil, assessment, behaviour, grade, or personnel evaluation tables are included.

create extension if not exists pgcrypto;

create table public.faculties (
  id text primary key,
  name text not null unique,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id text primary key,
  faculty_id text not null references public.faculties(id) on update cascade on delete restrict,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (faculty_id, name)
);

create table public.aoles (
  id text primary key,
  name text not null unique,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id text primary key,
  department_id text references public.departments(id) on update cascade on delete set null,
  aole_id text references public.aoles(id) on update cascade on delete set null,
  name text not null unique,
  display_order integer not null default 0,
  is_active boolean not null default true,
  appears_in_mapping_dropdowns boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_years (
  id text primary key,
  name text not null unique,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.terms (
  id text primary key,
  name text not null unique,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.frameworks (
  id text primary key,
  name text not null unique,
  short_name text not null,
  colour_key text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.strands (
  id text primary key,
  framework_id text not null references public.frameworks(id) on update cascade on delete cascade,
  name text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (framework_id, name)
);

create table public.elements (
  id text primary key,
  strand_id text not null references public.strands(id) on update cascade on delete cascade,
  name text not null,
  teacher_friendly_explanation text not null,
  example_classroom_opportunities text not null default '',
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (strand_id, name)
);

create table public.curriculum_entries (
  id text primary key,
  subject_id text not null references public.subjects(id) on update cascade on delete restrict,
  academic_year_id text not null references public.academic_years(id) on update cascade on delete restrict,
  term_id text not null references public.terms(id) on update cascade on delete restrict,
  framework_id text not null references public.frameworks(id) on update cascade on delete restrict,
  strand_id text not null references public.strands(id) on update cascade on delete restrict,
  element_id text not null references public.elements(id) on update cascade on delete restrict,
  unit_topic text not null,
  learning_activity_description text not null,
  scheme_of_learning_reference text not null,
  optional_note text,
  last_mapped_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_entries_activity_length check (
    char_length(trim(learning_activity_description)) between 20 and 250
  ),
  constraint curriculum_entries_no_blank_unit check (char_length(trim(unit_topic)) > 0),
  constraint curriculum_entries_no_blank_scheme check (char_length(trim(scheme_of_learning_reference)) > 0)
);

create index curriculum_entries_subject_idx on public.curriculum_entries(subject_id);
create index curriculum_entries_framework_idx on public.curriculum_entries(framework_id);
create index curriculum_entries_strand_idx on public.curriculum_entries(strand_id);
create index curriculum_entries_element_idx on public.curriculum_entries(element_id);
create index curriculum_entries_year_term_idx on public.curriculum_entries(academic_year_id, term_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_faculties_updated_at
before update on public.faculties
for each row execute function public.set_updated_at();

create trigger set_departments_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

create trigger set_aoles_updated_at
before update on public.aoles
for each row execute function public.set_updated_at();

create trigger set_subjects_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

create trigger set_academic_years_updated_at
before update on public.academic_years
for each row execute function public.set_updated_at();

create trigger set_terms_updated_at
before update on public.terms
for each row execute function public.set_updated_at();

create trigger set_frameworks_updated_at
before update on public.frameworks
for each row execute function public.set_updated_at();

create trigger set_strands_updated_at
before update on public.strands
for each row execute function public.set_updated_at();

create trigger set_elements_updated_at
before update on public.elements
for each row execute function public.set_updated_at();

create trigger set_curriculum_entries_updated_at
before update on public.curriculum_entries
for each row execute function public.set_updated_at();

create view public.curriculum_entry_details as
select
  ce.id,
  s.name as subject,
  ao.name as aole,
  ay.name as academic_year,
  t.name as term,
  f.name as framework,
  st.name as strand,
  e.name as element,
  e.teacher_friendly_explanation,
  e.example_classroom_opportunities,
  ce.unit_topic,
  ce.learning_activity_description,
  ce.scheme_of_learning_reference,
  ce.optional_note,
  ce.last_mapped_date
from public.curriculum_entries ce
join public.subjects s on s.id = ce.subject_id
left join public.aoles ao on ao.id = s.aole_id
join public.academic_years ay on ay.id = ce.academic_year_id
join public.terms t on t.id = ce.term_id
join public.frameworks f on f.id = ce.framework_id
join public.strands st on st.id = ce.strand_id
join public.elements e on e.id = ce.element_id;
