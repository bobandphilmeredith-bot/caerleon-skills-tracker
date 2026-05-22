-- Skills Tracker Wales framework reference correction
-- Safe to run more than once.
--
-- Purpose:
-- - Correct the three cross-curricular framework hierarchies used for mapping:
--   Literacy Framework, Numeracy Framework and Digital Competence Framework.
-- - Preserve existing curriculum_entries.
-- - Do not hard-delete old/prototype labels.
-- - Mark old/prototype strands/elements inactive only when no curriculum_entries use them.

alter table public.curriculum_entries
  add column if not exists progression_descriptor_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'progression_descriptors_id_school_unique'
  ) then
    alter table public.progression_descriptors
      add constraint progression_descriptors_id_school_unique
      unique (id, school_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'curriculum_entries_progression_descriptor_fk'
  ) then
    alter table public.curriculum_entries
      add constraint curriculum_entries_progression_descriptor_fk
      foreign key (progression_descriptor_id, school_id)
      references public.progression_descriptors(id, school_id)
      on delete set null;
  end if;
end
$$;

create index if not exists curriculum_entries_progression_descriptor_idx
  on public.curriculum_entries(school_id, progression_descriptor_id);

-- Keep mappings attached to the same framework row where possible by renaming
-- older short labels if the official label does not already exist.
update public.frameworks old_framework
set name = 'Literacy Framework',
    short_name = 'Literacy',
    description = 'Literacy framework progression references for curriculum mapping.'
where old_framework.name = 'Literacy'
  and not exists (
    select 1
    from public.frameworks official
    where official.school_id = old_framework.school_id
      and official.name = 'Literacy Framework'
  );

update public.frameworks old_framework
set name = 'Numeracy Framework',
    short_name = 'Numeracy',
    description = 'Numeracy framework progression references for curriculum mapping.'
where old_framework.name = 'Numeracy'
  and not exists (
    select 1
    from public.frameworks official
    where official.school_id = old_framework.school_id
      and official.name = 'Numeracy Framework'
  );

with school_scope as (
  select id as school_id
  from public.schools
  where active = true
),
framework_rows(name, short_name, description, display_order) as (
  values
    ('Literacy Framework', 'Literacy', 'Literacy framework progression references for curriculum mapping.', 1),
    ('Numeracy Framework', 'Numeracy', 'Numeracy framework progression references for curriculum mapping.', 2),
    ('Digital Competence Framework', 'DCF', 'Digital competence framework progression references for curriculum mapping.', 3)
)
insert into public.frameworks (school_id, name, short_name, description, display_order, active)
select school_scope.school_id, framework_rows.name, framework_rows.short_name, framework_rows.description, framework_rows.display_order, true
from school_scope
cross join framework_rows
on conflict (school_id, name) do update
set short_name = excluded.short_name,
    description = excluded.description,
    display_order = excluded.display_order,
    active = true;

with strand_rows(framework_name, strand_name, display_order) as (
  values
    ('Literacy Framework', 'Translanguaging', 1),
    ('Literacy Framework', 'Listening', 2),
    ('Literacy Framework', 'Reading', 3),
    ('Literacy Framework', 'Speaking', 4),
    ('Literacy Framework', 'Writing', 5),
    ('Numeracy Framework', 'Developing mathematical proficiency', 1),
    ('Numeracy Framework', 'Understanding the number system helps us to represent and compare relationships between numbers and quantities', 2),
    ('Numeracy Framework', 'Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world', 3),
    ('Numeracy Framework', 'Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions', 4),
    ('Digital Competence Framework', 'Citizenship', 1),
    ('Digital Competence Framework', 'Interacting and collaborating', 2),
    ('Digital Competence Framework', 'Producing', 3),
    ('Digital Competence Framework', 'Data and computational thinking', 4)
)
insert into public.strands (school_id, framework_id, name, display_order, active)
select frameworks.school_id, frameworks.id, strand_rows.strand_name, strand_rows.display_order, true
from public.frameworks
join strand_rows on strand_rows.framework_name = frameworks.name
on conflict (framework_id, name) do update
set display_order = excluded.display_order,
    active = true;

with element_rows(framework_name, strand_name, element_name, display_order) as (
  values
    ('Literacy Framework', 'Translanguaging', 'Translanguaging', 1),
    ('Literacy Framework', 'Listening', 'Listening for meaning', 1),
    ('Literacy Framework', 'Listening', 'Developing vocabulary', 2),
    ('Literacy Framework', 'Listening', 'Listening to understand', 3),
    ('Literacy Framework', 'Listening', 'Listening as part of collaborative talk', 4),
    ('Literacy Framework', 'Reading', 'Phonological and phonemic awareness', 1),
    ('Literacy Framework', 'Reading', 'Reading strategies', 2),
    ('Literacy Framework', 'Reading', 'Understanding, response and analysis', 3),
    ('Literacy Framework', 'Speaking', 'Clarity and vocabulary', 1),
    ('Literacy Framework', 'Speaking', 'Purpose', 2),
    ('Literacy Framework', 'Speaking', 'Collaborative talk', 3),
    ('Literacy Framework', 'Speaking', 'Questioning', 4),
    ('Literacy Framework', 'Writing', 'Vocabulary, spelling, grammar', 1),
    ('Literacy Framework', 'Writing', 'Connectives and syntax', 2),
    ('Literacy Framework', 'Writing', 'Punctuation', 3),
    ('Literacy Framework', 'Writing', 'Planning and organising for different purposes, audiences and context', 4),
    ('Literacy Framework', 'Writing', 'Proofreading, editing and improving', 5),
    ('Numeracy Framework', 'Developing mathematical proficiency', 'Conceptual understanding', 1),
    ('Numeracy Framework', 'Developing mathematical proficiency', 'Communication using symbols', 2),
    ('Numeracy Framework', 'Developing mathematical proficiency', 'Fluency', 3),
    ('Numeracy Framework', 'Developing mathematical proficiency', 'Logical reasoning', 4),
    ('Numeracy Framework', 'Developing mathematical proficiency', 'Strategic competence', 5),
    ('Numeracy Framework', 'Understanding the number system helps us to represent and compare relationships between numbers and quantities', 'The number system', 1),
    ('Numeracy Framework', 'Understanding the number system helps us to represent and compare relationships between numbers and quantities', 'Relationships within the number system', 2),
    ('Numeracy Framework', 'Understanding the number system helps us to represent and compare relationships between numbers and quantities', 'Calculation', 3),
    ('Numeracy Framework', 'Understanding the number system helps us to represent and compare relationships between numbers and quantities', 'Financial literacy', 4),
    ('Numeracy Framework', 'Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world', 'Measurement', 1),
    ('Numeracy Framework', 'Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world', 'Shape and space', 2),
    ('Numeracy Framework', 'Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world', 'Position', 3),
    ('Numeracy Framework', 'Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world', 'Angle', 4),
    ('Numeracy Framework', 'Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions', 'Collecting data', 1),
    ('Numeracy Framework', 'Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions', 'Representing data', 2),
    ('Numeracy Framework', 'Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions', 'Interpreting data', 3),
    ('Digital Competence Framework', 'Citizenship', 'Identity, image and reputation', 1),
    ('Digital Competence Framework', 'Citizenship', 'Health and well-being', 2),
    ('Digital Competence Framework', 'Citizenship', 'Digital rights, licensing and ownership', 3),
    ('Digital Competence Framework', 'Citizenship', 'Online behaviour and cyberbullying', 4),
    ('Digital Competence Framework', 'Interacting and collaborating', 'Communication', 1),
    ('Digital Competence Framework', 'Interacting and collaborating', 'Collaboration', 2),
    ('Digital Competence Framework', 'Interacting and collaborating', 'Storing and sharing', 3),
    ('Digital Competence Framework', 'Producing', 'Sourcing, searching and planning digital content', 1),
    ('Digital Competence Framework', 'Producing', 'Creating digital content', 2),
    ('Digital Competence Framework', 'Producing', 'Evaluating and improving digital content', 3),
    ('Digital Competence Framework', 'Data and computational thinking', 'Problem solving and modelling', 1),
    ('Digital Competence Framework', 'Data and computational thinking', 'Data and information literacy', 2)
)
insert into public.elements (
  school_id,
  strand_id,
  name,
  official_wording,
  teacher_friendly_explanation,
  example_classroom_opportunities,
  search_keywords,
  related_connections,
  display_order,
  active
)
select
  frameworks.school_id,
  strands.id,
  element_rows.element_name,
  'Official framework reference for ' || element_rows.element_name || '.',
  'Learners develop ' || lower(element_rows.element_name) || ' through planned curriculum opportunities.',
  array['Classroom discussion','Subject task','Reflection activity']::text[],
  regexp_split_to_array(lower(element_rows.element_name), '[^a-z0-9]+'),
  array[]::text[],
  element_rows.display_order,
  true
from element_rows
join public.frameworks on frameworks.name = element_rows.framework_name
join public.strands on strands.framework_id = frameworks.id and strands.name = element_rows.strand_name
on conflict (strand_id, name) do update
set official_wording = excluded.official_wording,
    teacher_friendly_explanation = excluded.teacher_friendly_explanation,
    example_classroom_opportunities = excluded.example_classroom_opportunities,
    search_keywords = excluded.search_keywords,
    display_order = excluded.display_order,
    active = true;

with official_elements as (
  select elements.id, elements.school_id, elements.name
  from public.elements
  join public.strands on strands.id = elements.strand_id and strands.school_id = elements.school_id
  join public.frameworks on frameworks.id = strands.framework_id and frameworks.school_id = elements.school_id
  where frameworks.name in ('Literacy Framework', 'Numeracy Framework', 'Digital Competence Framework')
),
steps(progression_step) as (
  values ('Step 1'::public.progression_reference), ('Step 2'), ('Step 3'), ('Step 4'), ('Step 5')
)
insert into public.progression_descriptors (school_id, element_id, progression_step, descriptor)
select
  official_elements.school_id,
  official_elements.id,
  steps.progression_step,
  steps.progression_step::text || ': curriculum opportunities linked to ' || official_elements.name || '.'
from official_elements
cross join steps
on conflict (element_id, progression_step) do update
set descriptor = excluded.descriptor;

-- Migrate known old/prototype mapping references to official DCF targets.
with target as (
  select frameworks.school_id, frameworks.id as framework_id, strands.id as strand_id, elements.id as element_id
  from public.frameworks
  join public.strands on strands.framework_id = frameworks.id and strands.school_id = frameworks.school_id
  join public.elements on elements.strand_id = strands.id and elements.school_id = frameworks.school_id
  where frameworks.name = 'Digital Competence Framework'
    and strands.name = 'Citizenship'
    and elements.name = 'Identity, image and reputation'
)
update public.curriculum_entries entry
set framework_id = target.framework_id,
    strand_id = target.strand_id,
    element_id = target.element_id,
    updated_at = now()
from target
join public.elements old_element on old_element.id = entry.element_id and old_element.school_id = entry.school_id
where entry.school_id = target.school_id
  and old_element.name = 'Identity and wellbeing';

with target as (
  select frameworks.school_id, frameworks.id as framework_id, strands.id as strand_id, elements.id as element_id
  from public.frameworks
  join public.strands on strands.framework_id = frameworks.id and strands.school_id = frameworks.school_id
  join public.elements on elements.strand_id = strands.id and elements.school_id = frameworks.school_id
  where frameworks.name = 'Digital Competence Framework'
    and strands.name = 'Producing'
    and elements.name = 'Evaluating and improving digital content'
)
update public.curriculum_entries entry
set framework_id = target.framework_id,
    strand_id = target.strand_id,
    element_id = target.element_id,
    updated_at = now()
from target
join public.elements old_element on old_element.id = entry.element_id and old_element.school_id = entry.school_id
where entry.school_id = target.school_id
  and old_element.name = 'Evaluating outputs';

-- Link existing entries to a progression descriptor where the column is available.
update public.curriculum_entries entry
set progression_descriptor_id = descriptor.id
from public.progression_descriptors descriptor
where descriptor.school_id = entry.school_id
  and descriptor.element_id = entry.element_id
  and descriptor.progression_step = entry.progression_reference
  and entry.progression_reference in ('Step 1','Step 2','Step 3','Step 4','Step 5');

-- Inactivate old/prototype labels only when no mapping still references them.
update public.elements element
set active = false
where element.name in (
    'Identity and wellbeing',
    'Evaluating outputs',
    'Planning digital products',
    'Problem solving',
    'Data handling',
    'Modelling'
  )
  and not exists (
    select 1
    from public.curriculum_entries entry
    where entry.element_id = element.id
      and entry.school_id = element.school_id
  );

update public.strands strand
set active = false
where strand.name in (
    'Oracy',
    'Using number skills',
    'Using measuring skills',
    'Using data skills',
    'Developing numerical reasoning'
  )
  and not exists (
    select 1
    from public.curriculum_entries entry
    where entry.strand_id = strand.id
      and entry.school_id = strand.school_id
  );

-- Diagnostic queries to run after this script:
-- 1. Current framework hierarchy
-- select f.name as framework, s.name as strand, e.name as element, e.active
-- from public.frameworks f
-- join public.strands s on s.framework_id = f.id and s.school_id = f.school_id
-- join public.elements e on e.strand_id = s.id and e.school_id = f.school_id
-- where f.name in ('Literacy Framework','Numeracy Framework','Digital Competence Framework')
-- order by f.display_order, s.display_order, e.display_order;
--
-- 2. Orphan checks
-- select * from public.strands s where not exists (select 1 from public.frameworks f where f.id = s.framework_id and f.school_id = s.school_id);
-- select * from public.elements e where not exists (select 1 from public.strands s where s.id = e.strand_id and s.school_id = e.school_id);
-- select * from public.progression_descriptors pd where not exists (select 1 from public.elements e where e.id = pd.element_id and e.school_id = pd.school_id);
