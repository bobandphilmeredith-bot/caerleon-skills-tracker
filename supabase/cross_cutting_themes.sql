-- Cross-cutting themes are tagging/reference data, not progression frameworks.
-- Safe to run more than once.

create table if not exists public.cross_cutting_themes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name),
  unique (id, school_id)
);

create table if not exists public.curriculum_activity_theme_links (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  mapping_id uuid not null,
  theme_id uuid not null,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (mapping_id, theme_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'curriculum_activity_theme_links_mapping_fk') then
    alter table public.curriculum_activity_theme_links
      add constraint curriculum_activity_theme_links_mapping_fk
      foreign key (mapping_id, school_id) references public.curriculum_entries(id, school_id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'curriculum_activity_theme_links_theme_fk') then
    alter table public.curriculum_activity_theme_links
      add constraint curriculum_activity_theme_links_theme_fk
      foreign key (theme_id, school_id) references public.cross_cutting_themes(id, school_id) on delete restrict;
  end if;
end
$$;

create index if not exists cross_cutting_themes_school_idx on public.cross_cutting_themes(school_id);
create index if not exists curriculum_activity_theme_links_school_idx on public.curriculum_activity_theme_links(school_id);
create index if not exists curriculum_activity_theme_links_mapping_idx on public.curriculum_activity_theme_links(mapping_id);
create index if not exists curriculum_activity_theme_links_theme_idx on public.curriculum_activity_theme_links(theme_id);

alter table public.cross_cutting_themes enable row level security;
alter table public.curriculum_activity_theme_links enable row level security;

drop policy if exists "cross_cutting_themes_select" on public.cross_cutting_themes;
create policy "cross_cutting_themes_select" on public.cross_cutting_themes for select to authenticated
using (school_id is null or public.can_view_school(school_id));
drop policy if exists "cross_cutting_themes_insert" on public.cross_cutting_themes;
create policy "cross_cutting_themes_insert" on public.cross_cutting_themes for insert to authenticated
with check (school_id is not null and public.can_manage_school_setup(school_id));
drop policy if exists "cross_cutting_themes_update" on public.cross_cutting_themes;
create policy "cross_cutting_themes_update" on public.cross_cutting_themes for update to authenticated
using (school_id is not null and public.can_manage_school_setup(school_id))
with check (school_id is not null and public.can_manage_school_setup(school_id));

drop policy if exists "curriculum_activity_theme_links_select" on public.curriculum_activity_theme_links;
create policy "curriculum_activity_theme_links_select" on public.curriculum_activity_theme_links for select to authenticated
using (public.can_view_school(school_id));
drop policy if exists "curriculum_activity_theme_links_insert" on public.curriculum_activity_theme_links;
create policy "curriculum_activity_theme_links_insert" on public.curriculum_activity_theme_links for insert to authenticated
with check (
  exists (
    select 1 from public.curriculum_entries entry
    where entry.id = mapping_id
      and entry.school_id = school_id
      and public.can_edit_curriculum_subject(entry.school_id, entry.subject_id)
  )
);
drop policy if exists "curriculum_activity_theme_links_delete" on public.curriculum_activity_theme_links;
create policy "curriculum_activity_theme_links_delete" on public.curriculum_activity_theme_links for delete to authenticated
using (
  exists (
    select 1 from public.curriculum_entries entry
    where entry.id = mapping_id
      and entry.school_id = school_id
      and public.can_edit_curriculum_subject(entry.school_id, entry.subject_id)
  )
);

with school_scope as (
  select id as school_id from public.schools where active = true
),
theme_rows(name, description, display_order) as (
  values
    ('Relationships and sexuality education', 'Reference where curriculum activity supports relationships and sexuality education.', 1),
    ('Human rights education', 'Reference where curriculum activity supports understanding of rights, responsibilities and equity.', 2),
    ('Diversity', 'Reference where curriculum activity supports understanding of diversity, identity and inclusion.', 3),
    ('Careers and work-related experiences', 'Reference where curriculum activity links learning to careers, employability or the world of work.', 4),
    ('Local, national and international contexts', 'Reference where curriculum activity connects learning to local, national or international contexts.', 5)
)
insert into public.cross_cutting_themes (school_id, name, description, display_order, active)
select school_scope.school_id, theme_rows.name, theme_rows.description, theme_rows.display_order, true
from school_scope
cross join theme_rows
on conflict (school_id, name) do update
set description = excluded.description,
    display_order = excluded.display_order,
    active = true;

update public.frameworks
set active = false
where name in ('Cross-cutting Themes', 'Cross-cutting themes', 'Themes');
