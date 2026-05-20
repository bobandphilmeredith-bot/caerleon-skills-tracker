-- Skills Tracker Wales
-- Caerleon-only reference/setup seed.
--
-- Run this after schema.sql and after the real Caerleon school row exists.
-- This file uses the existing school where slug = 'caerleon'.
-- It does not create users, staff profiles, school memberships, curriculum
-- mapping entries, audit logs, or other activity/history data.

with caerleon_school as (
  select id as school_id
  from public.schools
  where slug = 'caerleon'
),
aole_rows(name, display_order) as (
  values
    ('Expressive Arts', 1),
    ('Health and Well-being', 2),
    ('Humanities', 3),
    ('Languages, Literacy and Communication', 4),
    ('Mathematics and Numeracy', 5),
    ('Science and Technology', 6)
)
insert into public.aoles (school_id, name, display_order, active)
select caerleon_school.school_id, aole_rows.name, aole_rows.display_order, true
from caerleon_school
cross join aole_rows
on conflict (school_id, name) do update
set
  display_order = excluded.display_order,
  active = excluded.active;

with caerleon_school as (
  select id as school_id
  from public.schools
  where slug = 'caerleon'
),
subject_rows(name, aole_name, display_order) as (
  values
    ('Art', 'Expressive Arts', 1),
    ('Biology', 'Science and Technology', 2),
    ('Business', 'Humanities', 3),
    ('Chemistry', 'Science and Technology', 4),
    ('DT', 'Science and Technology', 5),
    ('English', 'Languages, Literacy and Communication', 6),
    ('French', 'Languages, Literacy and Communication', 7),
    ('Geography', 'Humanities', 8),
    ('German', 'Languages, Literacy and Communication', 9),
    ('History', 'Humanities', 10),
    ('ICT', 'Science and Technology', 11),
    ('King''s Trust', null, 12),
    ('Maths', 'Mathematics and Numeracy', 13),
    ('Music', 'Expressive Arts', 14),
    ('PE', 'Health and Well-being', 15),
    ('PSE', 'Health and Well-being', 16),
    ('Physics', 'Science and Technology', 17),
    ('RSE', 'Health and Well-being', 18),
    ('Skills', null, 19),
    ('Sociology', 'Humanities', 20),
    ('Welsh', 'Languages, Literacy and Communication', 21)
)
insert into public.subjects (school_id, aole_id, name, display_order, active, appears_in_mapping_dropdowns)
select
  caerleon_school.school_id,
  aoles.id,
  subject_rows.name,
  subject_rows.display_order,
  true,
  true
from caerleon_school
cross join subject_rows
left join public.aoles
  on aoles.school_id = caerleon_school.school_id
 and aoles.name = subject_rows.aole_name
on conflict (school_id, name) do update
set
  aole_id = excluded.aole_id,
  display_order = excluded.display_order,
  active = excluded.active,
  appears_in_mapping_dropdowns = excluded.appears_in_mapping_dropdowns;

with caerleon_school as (
  select id as school_id
  from public.schools
  where slug = 'caerleon'
),
framework_rows(name, short_name, description, display_order) as (
  values
    ('Literacy', 'Literacy', 'Reading, writing and oracy opportunities across subjects.', 1),
    ('Numeracy', 'Numeracy', 'Number, measurement, data and numerical reasoning opportunities.', 2),
    ('Digital Competence Framework', 'DCF', 'Digital competence opportunities across curriculum planning.', 3),
    ('Cross-cutting Themes', 'Themes', 'RSE, human rights, diversity and careers-related learning.', 4)
)
insert into public.frameworks (school_id, name, short_name, description, display_order, active)
select
  caerleon_school.school_id,
  framework_rows.name,
  framework_rows.short_name,
  framework_rows.description,
  framework_rows.display_order,
  true
from caerleon_school
cross join framework_rows
on conflict (school_id, name) do update
set
  short_name = excluded.short_name,
  description = excluded.description,
  display_order = excluded.display_order,
  active = excluded.active;

with caerleon_school as (
  select id as school_id
  from public.schools
  where slug = 'caerleon'
),
strand_rows(framework_name, name, display_order) as (
  values
    ('Literacy', 'Oracy', 1),
    ('Literacy', 'Reading', 2),
    ('Literacy', 'Writing', 3),
    ('Numeracy', 'Using number skills', 1),
    ('Numeracy', 'Using measuring skills', 2),
    ('Numeracy', 'Using data skills', 3),
    ('Numeracy', 'Developing numerical reasoning', 4),
    ('Digital Competence Framework', 'Citizenship', 1),
    ('Digital Competence Framework', 'Interacting and collaborating', 2),
    ('Digital Competence Framework', 'Producing', 3),
    ('Digital Competence Framework', 'Data and computational thinking', 4),
    ('Cross-cutting Themes', 'Relationships and sexuality education', 1),
    ('Cross-cutting Themes', 'Human rights', 2),
    ('Cross-cutting Themes', 'Diversity', 3),
    ('Cross-cutting Themes', 'Careers and work-related experiences', 4)
)
insert into public.strands (school_id, framework_id, name, display_order, active)
select
  caerleon_school.school_id,
  frameworks.id,
  strand_rows.name,
  strand_rows.display_order,
  true
from caerleon_school
join public.frameworks
  on frameworks.school_id = caerleon_school.school_id
join strand_rows
  on strand_rows.framework_name = frameworks.name
on conflict (framework_id, name) do update
set
  display_order = excluded.display_order,
  active = excluded.active;

with caerleon_school as (
  select id as school_id
  from public.schools
  where slug = 'caerleon'
),
element_rows(framework_name, strand_name, name, explanation, examples, keywords, connections, display_order) as (
  values
    ('Literacy', 'Oracy', 'Listening for meaning', 'Learners listen actively and identify key points in spoken ideas.', ARRAY['Structured seminar','Peer explanation','Debate preparation']::text[], ARRAY['oracy','listening','discussion']::text[], ARRAY['Collaborative discussion','Presenting information']::text[], 1),
    ('Literacy', 'Oracy', 'Collaborative discussion', 'Learners build on contributions and use talk to shape shared understanding.', ARRAY['Group enquiry roles','Think-pair-share','Project critique circle']::text[], ARRAY['oracy','collaboration','talk']::text[], ARRAY['Listening for meaning','Presenting information']::text[], 2),
    ('Literacy', 'Oracy', 'Presenting information', 'Learners organise and communicate information clearly for a chosen audience.', ARRAY['Short presentation','Podcast script','Exhibition talk']::text[], ARRAY['oracy','presentation','audience']::text[], ARRAY['Audience and purpose']::text[], 3),
    ('Literacy', 'Reading', 'Locating information', 'Learners find relevant details from texts, diagrams, sources and digital materials.', ARRAY['Source investigation','Information hunt','Research note taking']::text[], ARRAY['reading','sources','research']::text[], ARRAY['Comparing sources']::text[], 1),
    ('Literacy', 'Reading', 'Inference and deduction', 'Learners use evidence to read beyond obvious information and justify interpretations.', ARRAY['Character evidence grid','Historical source inference','Scientific explanation reading']::text[], ARRAY['reading','inference','evidence']::text[], ARRAY['Comparing sources']::text[], 2),
    ('Literacy', 'Reading', 'Comparing sources', 'Learners compare viewpoints, reliability and purpose across sources.', ARRAY['News comparison','Primary and secondary source check','Website reliability review']::text[], ARRAY['reading','viewpoint','reliability']::text[], ARRAY['Inference and deduction']::text[], 3),
    ('Literacy', 'Writing', 'Planning writing', 'Learners plan structure, content and sequence before producing written work.', ARRAY['Writing frame','Storyboard','Report plan']::text[], ARRAY['writing','planning','structure']::text[], ARRAY['Technical accuracy','Audience and purpose']::text[], 1),
    ('Literacy', 'Writing', 'Technical accuracy', 'Learners edit spelling, punctuation, grammar and vocabulary choices.', ARRAY['Redrafting checklist','Peer editing','Subject vocabulary focus']::text[], ARRAY['writing','editing','accuracy']::text[], ARRAY['Planning writing']::text[], 2),
    ('Literacy', 'Writing', 'Audience and purpose', 'Learners adapt tone, register and form to suit the intended reader.', ARRAY['Campaign leaflet','Formal report','Museum label']::text[], ARRAY['writing','audience','purpose']::text[], ARRAY['Presenting information']::text[], 3),
    ('Numeracy', 'Using number skills', 'Use of calculation', 'Learners choose and apply calculations in meaningful subject contexts.', ARRAY['Budget comparison','Recipe scaling','Science formula practice']::text[], ARRAY['numeracy','calculation','number']::text[], ARRAY['Justifying decisions']::text[], 1),
    ('Numeracy', 'Using data skills', 'Collecting data', 'Learners gather data fairly and record it in usable forms.', ARRAY['Survey design','Fieldwork tally','Experiment results table']::text[], ARRAY['data','collecting','tables']::text[], ARRAY['Representing data','Interpreting trends']::text[], 1),
    ('Numeracy', 'Using data skills', 'Interpreting trends', 'Learners describe patterns, anomalies and relationships in data.', ARRAY['Climate trend discussion','Performance data story','Population graph analysis']::text[], ARRAY['data','trends','graphs']::text[], ARRAY['Collecting data','Evaluating accuracy']::text[], 2),
    ('Digital Competence Framework', 'Producing', 'Creating digital content', 'Learners combine media and tools to create purposeful digital outcomes.', ARRAY['Video explainer','Interactive poster','System portfolio']::text[], ARRAY['digital','content','media']::text[], ARRAY['Planning digital products','Evaluating outputs']::text[], 1),
    ('Digital Competence Framework', 'Producing', 'Evaluating outputs', 'Learners review digital work against purpose and make improvements.', ARRAY['Usability review','Audience feedback','Iteration notes']::text[], ARRAY['digital','evaluation','review']::text[], ARRAY['Creating digital content']::text[], 2),
    ('Cross-cutting Themes', 'Diversity', 'Culture and community', 'Learners investigate cultures, languages and communities in Wales and beyond.', ARRAY['Community research','Cultural celebration analysis','Place-name enquiry']::text[], ARRAY['diversity','culture','community']::text[], ARRAY['Identity','Challenging stereotypes']::text[], 1)
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
  caerleon_school.school_id,
  strands.id,
  element_rows.name,
  null,
  element_rows.explanation,
  element_rows.examples,
  element_rows.keywords,
  element_rows.connections,
  element_rows.display_order,
  true
from caerleon_school
join public.frameworks
  on frameworks.school_id = caerleon_school.school_id
join public.strands
  on strands.school_id = caerleon_school.school_id
 and strands.framework_id = frameworks.id
join element_rows
  on element_rows.framework_name = frameworks.name
 and element_rows.strand_name = strands.name
on conflict (strand_id, name) do update
set
  official_wording = excluded.official_wording,
  teacher_friendly_explanation = excluded.teacher_friendly_explanation,
  example_classroom_opportunities = excluded.example_classroom_opportunities,
  search_keywords = excluded.search_keywords,
  related_connections = excluded.related_connections,
  display_order = excluded.display_order,
  active = excluded.active;

with caerleon_school as (
  select id as school_id
  from public.schools
  where slug = 'caerleon'
),
descriptor_rows(element_name, progression_step, descriptor) as (
  values
    ('Inference and deduction', 'Step 1', 'Learners identify simple implied meaning with support.'),
    ('Inference and deduction', 'Step 2', 'Learners use clues from familiar texts to explain simple inference.'),
    ('Inference and deduction', 'Step 3', 'Learners infer meaning using evidence from increasingly varied texts.'),
    ('Inference and deduction', 'Step 4', 'Learners infer meaning and recognise viewpoint, bias and purpose in increasingly complex texts.'),
    ('Inference and deduction', 'Step 5', 'Learners evaluate subtle inference and explain how writers shape interpretation.'),
    ('Comparing sources', 'Step 3', 'Learners compare information from more than one source.'),
    ('Comparing sources', 'Step 4', 'Learners compare viewpoint, reliability and purpose across sources.'),
    ('Comparing sources', 'Step 5', 'Learners evaluate source reliability and explain how evidence is selected.'),
    ('Interpreting trends', 'Step 3', 'Learners describe clear trends from familiar data displays.'),
    ('Interpreting trends', 'Step 4', 'Learners interpret trends, anomalies and relationships in data.'),
    ('Interpreting trends', 'Step 5', 'Learners evaluate data patterns and explain limits in conclusions.'),
    ('Creating digital content', 'Step 3', 'Learners create digital content for a clear audience and purpose.'),
    ('Creating digital content', 'Step 4', 'Learners combine digital tools and media to communicate purposeful outcomes.'),
    ('Creating digital content', 'Step 5', 'Learners refine digital products for audience, purpose and usability.')
)
insert into public.progression_descriptors (school_id, element_id, progression_step, descriptor)
select
  caerleon_school.school_id,
  elements.id,
  descriptor_rows.progression_step::public.progression_reference,
  descriptor_rows.descriptor
from caerleon_school
join public.elements
  on elements.school_id = caerleon_school.school_id
join descriptor_rows
  on descriptor_rows.element_name = elements.name
on conflict (element_id, progression_step) do update
set descriptor = excluded.descriptor;

with caerleon_school as (
  select id as school_id
  from public.schools
  where slug = 'caerleon'
)
insert into public.branding_settings (
  school_id,
  school_name,
  motto,
  logo_url,
  primary_colour,
  secondary_colour
)
select
  caerleon_school.school_id,
  'Caerleon Comprehensive School',
  'Maximising Potential',
  '/schlogo.png',
  '#741B47',
  '#571435'
from caerleon_school
on conflict (school_id) do update
set
  school_name = excluded.school_name,
  motto = excluded.motto,
  logo_url = excluded.logo_url,
  primary_colour = excluded.primary_colour,
  secondary_colour = excluded.secondary_colour;
