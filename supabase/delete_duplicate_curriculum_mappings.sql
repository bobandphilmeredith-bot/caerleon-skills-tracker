-- Remove duplicate curriculum_mappings parent rows safely.
--
-- Duplicate definition:
-- same school, subject, year group, term, scheme/reference, activity title and activity description.
--
-- The script keeps the earliest created parent row, copies any unique framework/CCT
-- links from duplicate rows onto that kept row, then deletes the duplicate parents.
-- Child rows on deleted parents are removed by existing ON DELETE CASCADE foreign keys.

begin;

drop table if exists public._curriculum_mapping_duplicate_groups;

create table public._curriculum_mapping_duplicate_groups as
with ranked as (
  select
    cm.*,
    first_value(cm.id) over (
      partition by
        cm.school_id,
        cm.subject_id,
        coalesce(cm.year_group, ''),
        coalesce(cm.term, ''),
        lower(trim(coalesce(cm.scheme_reference, ''))),
        lower(trim(coalesce(cm.activity_title, ''))),
        lower(trim(coalesce(cm.activity_description, '')))
      order by cm.created_at asc, cm.id asc
    ) as keep_id,
    row_number() over (
      partition by
        cm.school_id,
        cm.subject_id,
        coalesce(cm.year_group, ''),
        coalesce(cm.term, ''),
        lower(trim(coalesce(cm.scheme_reference, ''))),
        lower(trim(coalesce(cm.activity_title, ''))),
        lower(trim(coalesce(cm.activity_description, '')))
      order by cm.created_at asc, cm.id asc
    ) as duplicate_rank,
    count(*) over (
      partition by
        cm.school_id,
        cm.subject_id,
        coalesce(cm.year_group, ''),
        coalesce(cm.term, ''),
        lower(trim(coalesce(cm.scheme_reference, ''))),
        lower(trim(coalesce(cm.activity_title, ''))),
        lower(trim(coalesce(cm.activity_description, '')))
    ) as duplicate_count
  from public.curriculum_mappings cm
)
select
  id as duplicate_id,
  keep_id,
  duplicate_count
from ranked
where duplicate_count > 1
  and duplicate_rank > 1;

select
  'duplicates_to_delete' as diagnostic,
  count(*) as duplicate_parent_rows
from public._curriculum_mapping_duplicate_groups;

insert into public.curriculum_mapping_framework_links (
  mapping_id,
  framework_id,
  strand_id,
  element_id,
  progression_descriptor_id,
  progression_step,
  notes,
  created_at
)
select distinct on (
  source.keep_id,
  source.framework_id,
  source.strand_id,
  source.element_id,
  source.progression_descriptor_id
)
  source.keep_id,
  source.framework_id,
  source.strand_id,
  source.element_id,
  source.progression_descriptor_id,
  source.progression_step,
  source.notes,
  source.created_at
from (
  select
    d.keep_id,
    f.framework_id,
    f.strand_id,
    f.element_id,
    f.progression_descriptor_id,
    f.progression_step,
    f.notes,
    coalesce(f.created_at, now()) as created_at
  from public._curriculum_mapping_duplicate_groups d
  join public.curriculum_mapping_framework_links f
    on f.mapping_id = d.duplicate_id
) source
where not exists (
  select 1
  from public.curriculum_mapping_framework_links existing
  where existing.mapping_id = source.keep_id
    and existing.framework_id = source.framework_id
    and existing.strand_id = source.strand_id
    and existing.element_id = source.element_id
    and existing.progression_descriptor_id is not distinct from source.progression_descriptor_id
)
order by
  source.keep_id,
  source.framework_id,
  source.strand_id,
  source.element_id,
  source.progression_descriptor_id,
  source.created_at;

insert into public.curriculum_mapping_theme_links (
  mapping_id,
  theme_id,
  theme_element_id,
  notes,
  created_by,
  created_at
)
select distinct on (
  source.keep_id,
  source.theme_id,
  source.theme_element_id
)
  source.keep_id,
  source.theme_id,
  source.theme_element_id,
  source.notes,
  source.created_by,
  source.created_at
from (
  select
    d.keep_id,
    t.theme_id,
    t.theme_element_id,
    t.notes,
    t.created_by,
    coalesce(t.created_at, now()) as created_at
  from public._curriculum_mapping_duplicate_groups d
  join public.curriculum_mapping_theme_links t
    on t.mapping_id = d.duplicate_id
) source
where not exists (
  select 1
  from public.curriculum_mapping_theme_links existing
  where existing.mapping_id = source.keep_id
    and existing.theme_id = source.theme_id
    and existing.theme_element_id is not distinct from source.theme_element_id
)
order by
  source.keep_id,
  source.theme_id,
  source.theme_element_id,
  source.created_at;

delete from public.curriculum_mappings cm
using public._curriculum_mapping_duplicate_groups d
where cm.id = d.duplicate_id;

-- Prevent the same accidental double-save happening again at database level.
create unique index if not exists curriculum_mappings_unique_activity_guard
on public.curriculum_mappings (
  school_id,
  subject_id,
  coalesce(year_group, ''),
  coalesce(term, ''),
  lower(trim(coalesce(scheme_reference, ''))),
  lower(trim(coalesce(activity_title, ''))),
  lower(trim(coalesce(activity_description, '')))
);

select
  'remaining_duplicate_groups' as diagnostic,
  count(*) as duplicate_groups
from (
  select 1
  from public.curriculum_mappings cm
  group by
    cm.school_id,
    cm.subject_id,
    coalesce(cm.year_group, ''),
    coalesce(cm.term, ''),
    lower(trim(coalesce(cm.scheme_reference, ''))),
    lower(trim(coalesce(cm.activity_title, ''))),
    lower(trim(coalesce(cm.activity_description, '')))
  having count(*) > 1
) duplicates;

drop table if exists public._curriculum_mapping_duplicate_groups;

commit;
