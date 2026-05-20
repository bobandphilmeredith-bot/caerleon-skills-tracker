-- Skills Tracker Wales optional example seed.
--
-- Run this only after:
-- 1. supabase/schema.sql has completed successfully.
-- 2. The first Supabase Auth user has been created.
--
-- Replace AUTH_USER_UUID_HERE and first.admin@example-school.invalid before running.
-- This is example setup data only. Do not add pupil data, assessment data,
-- behaviour data, grades, judgement scores, compliance scores or staff rankings.

with first_school as (
  insert into public.schools (slug, name, motto, subdomain, active)
  values ('example-school', 'Example School', 'Curriculum visibility', 'example-school', true)
  on conflict (slug) do update
    set name = excluded.name,
        motto = excluded.motto,
        subdomain = excluded.subdomain,
        active = excluded.active
  returning id
),
first_admin as (
  select
    'AUTH_USER_UUID_HERE'::uuid as user_id,
    'first.admin@example-school.invalid'::text as email,
    'First School Admin'::text as display_name
),
user_profile as (
  insert into public.users (id, email, display_name)
  select user_id, email, display_name
  from first_admin
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name
  returning id
),
staff_profile as (
  insert into public.staff_profiles (id, school_id, email, display_name, role, assigned_subjects, active)
  select
    first_admin.user_id,
    first_school.id,
    first_admin.email,
    first_admin.display_name,
    'school_admin',
    '{}'::text[],
    true
  from first_school, first_admin
  on conflict (id) do update
    set school_id = excluded.school_id,
        email = excluded.email,
        display_name = excluded.display_name,
        role = excluded.role,
        active = excluded.active
  returning id
),
school_membership as (
  insert into public.school_users (school_id, user_id, role, active)
  select first_school.id, first_admin.user_id, 'school_admin', true
  from first_school, first_admin
  on conflict (school_id, user_id) do update
    set role = excluded.role,
        active = excluded.active
  returning id
),
branding as (
  insert into public.branding_settings (school_id, school_name, motto, logo_url, primary_colour, secondary_colour)
  select id, 'Example School', 'Curriculum visibility', null, '#741B47', '#571435'
  from first_school
  on conflict (school_id) do update
    set school_name = excluded.school_name,
        motto = excluded.motto,
        logo_url = excluded.logo_url,
        primary_colour = excluded.primary_colour,
        secondary_colour = excluded.secondary_colour
  returning id
),
aole_rows as (
  insert into public.aoles (school_id, name, display_order, active)
  select first_school.id, aole.name, aole.display_order, true
  from first_school
  cross join (
    values
      ('Expressive Arts', 1),
      ('Health and Well-being', 2),
      ('Humanities', 3),
      ('Languages, Literacy and Communication', 4),
      ('Mathematics and Numeracy', 5),
      ('Science and Technology', 6)
  ) as aole(name, display_order)
  on conflict (school_id, name) do update
    set display_order = excluded.display_order,
        active = excluded.active
  returning id, school_id, name
),
subject_rows as (
  insert into public.subjects (school_id, aole_id, name, display_order, active, appears_in_mapping_dropdowns)
  select
    first_school.id,
    aole_rows.id,
    subject.name,
    subject.display_order,
    true,
    true
  from first_school
  join (
    values
      ('Maths', 'Mathematics and Numeracy', 1),
      ('English', 'Languages, Literacy and Communication', 2),
      ('Science', 'Science and Technology', 3),
      ('Art', 'Expressive Arts', 4),
      ('Geography', 'Humanities', 5)
  ) as subject(name, aole_name, display_order) on true
  left join aole_rows
    on aole_rows.school_id = first_school.id
   and aole_rows.name = subject.aole_name
  on conflict (school_id, name) do update
    set aole_id = excluded.aole_id,
        display_order = excluded.display_order,
        active = excluded.active,
        appears_in_mapping_dropdowns = excluded.appears_in_mapping_dropdowns
  returning id
),
framework_rows as (
  insert into public.frameworks (school_id, name, short_name, description, display_order, active)
  select first_school.id, framework.name, framework.short_name, framework.description, framework.display_order, true
  from first_school
  cross join (
    values
      ('Literacy', 'Literacy', 'Reading, writing and oracy opportunities across subjects.', 1),
      ('Numeracy', 'Numeracy', 'Number, measurement, data and numerical reasoning opportunities.', 2),
      ('Digital Competence Framework', 'DCF', 'Digital competence opportunities across curriculum planning.', 3),
      ('Cross-cutting Themes', 'Themes', 'RSE, human rights, diversity and careers-related learning.', 4)
  ) as framework(name, short_name, description, display_order)
  on conflict (school_id, name) do update
    set short_name = excluded.short_name,
        description = excluded.description,
        display_order = excluded.display_order,
        active = excluded.active
  returning id, school_id, name, short_name
),
strand_rows as (
  insert into public.strands (school_id, framework_id, name, display_order, active)
  select framework_rows.school_id, framework_rows.id, strand.name, strand.display_order, true
  from framework_rows
  join (
    values
      ('Literacy', 'Oracy', 1),
      ('Literacy', 'Reading', 2),
      ('Literacy', 'Writing', 3),
      ('Numeracy', 'Using data skills', 1),
      ('DCF', 'Producing', 1),
      ('Themes', 'Diversity', 1)
  ) as strand(framework_short_name, name, display_order)
    on strand.framework_short_name = framework_rows.short_name
  on conflict (framework_id, name) do update
    set display_order = excluded.display_order,
        active = excluded.active
  returning id, school_id, name
),
element_rows as (
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
    strand_rows.school_id,
    strand_rows.id,
    element.name,
    null,
    element.explanation,
    element.examples,
    element.keywords,
    '{}'::text[],
    element.display_order,
    true
  from strand_rows
  join (
    values
      ('Reading', 'Comparing sources', 'Learners compare viewpoints, reliability and purpose across sources.', ARRAY['News comparison','Primary and secondary source check','Website reliability review']::text[], ARRAY['reading','sources','viewpoint']::text[], 1),
      ('Using data skills', 'Interpreting trends', 'Learners describe patterns, anomalies and relationships in data.', ARRAY['Graph analysis','Survey review','Fieldwork data discussion']::text[], ARRAY['data','graphs','trends']::text[], 1),
      ('Producing', 'Creating digital content', 'Learners combine media and tools to create purposeful digital outcomes.', ARRAY['Video explainer','Digital poster','Portfolio evidence']::text[], ARRAY['digital','media','content']::text[], 1),
      ('Diversity', 'Culture and community', 'Learners investigate cultures, languages and communities in Wales and beyond.', ARRAY['Community research','Identity discussion','Place-name enquiry']::text[], ARRAY['diversity','culture','community']::text[], 1)
  ) as element(strand_name, name, explanation, examples, keywords, display_order)
    on element.strand_name = strand_rows.name
  on conflict (strand_id, name) do update
    set teacher_friendly_explanation = excluded.teacher_friendly_explanation,
        example_classroom_opportunities = excluded.example_classroom_opportunities,
        search_keywords = excluded.search_keywords,
        display_order = excluded.display_order,
        active = excluded.active
  returning id, school_id, name
)
insert into public.progression_descriptors (school_id, element_id, progression_step, descriptor)
select
  element_rows.school_id,
  element_rows.id,
  descriptor.progression_step::public.progression_reference,
  descriptor.descriptor
from element_rows
join (
  values
    ('Comparing sources', 'Step 3', 'Learners compare information from more than one source.'),
    ('Comparing sources', 'Step 4', 'Learners compare viewpoint, reliability and purpose across sources.'),
    ('Comparing sources', 'Step 5', 'Learners evaluate source reliability and explain how evidence is selected.'),
    ('Interpreting trends', 'Step 3', 'Learners describe clear trends from familiar data displays.'),
    ('Interpreting trends', 'Step 4', 'Learners interpret trends, anomalies and relationships in data.'),
    ('Interpreting trends', 'Step 5', 'Learners evaluate data patterns and explain limits in conclusions.')
) as descriptor(element_name, progression_step, descriptor)
  on descriptor.element_name = element_rows.name
on conflict (element_id, progression_step) do update
  set descriptor = excluded.descriptor;
