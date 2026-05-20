-- Skills Tracker Wales starter seed data.
-- Run after schema.sql.
-- This inserts clean setup data only: no curriculum entries, mappings,
-- sample activity data, audit logs, or review history.

insert into public.schools (id, slug, name, motto, subdomain, active)

values

  (

    '657f5a77-ae52-48ea-b459-290f86bbd2f0',

    'caerleon',

    'Caerleon Comprehensive School',

    'Maximising Potential',

    'caerleon',

    true

  )

on conflict (slug) do update

set

  name = excluded.name,

  motto = excluded.motto,

  subdomain = excluded.subdomain,

  active = excluded.active

returning id, slug, name;

insert into public.aoles (id, school_id, name, display_order, active)
values
  ('00000000-0000-4000-8300-000000000001', '657f5a77-ae52-48ea-b459-290f86bbd2f0', 'Expressive Arts', 1, true),
  ('00000000-0000-4000-8300-000000000002', '657f5a77-ae52-48ea-b459-290f86bbd2f0', 'Health and Well-being', 2, true),
  ('00000000-0000-4000-8300-000000000003', '657f5a77-ae52-48ea-b459-290f86bbd2f0', 'Humanities', 3, true),
  ('00000000-0000-4000-8300-000000000004', '657f5a77-ae52-48ea-b459-290f86bbd2f0', 'Languages, Literacy and Communication', 4, true),
  ('00000000-0000-4000-8300-000000000005', '657f5a77-ae52-48ea-b459-290f86bbd2f0', 'Mathematics and Numeracy', 5, true),
  ('00000000-0000-4000-8300-000000000006', '657f5a77-ae52-48ea-b459-290f86bbd2f0', 'Science and Technology', 6, true),
  ('00000000-0000-4000-8300-000000000101', '00000000-0000-4000-8000-000000000002', 'Expressive Arts', 1, true),
  ('00000000-0000-4000-8300-000000000102', '00000000-0000-4000-8000-000000000002', 'Health and Well-being', 2, true),
  ('00000000-0000-4000-8300-000000000103', '00000000-0000-4000-8000-000000000002', 'Humanities', 3, true),
  ('00000000-0000-4000-8300-000000000104', '00000000-0000-4000-8000-000000000002', 'Languages, Literacy and Communication', 4, true),
  ('00000000-0000-4000-8300-000000000105', '00000000-0000-4000-8000-000000000002', 'Mathematics and Numeracy', 5, true),
  ('00000000-0000-4000-8300-000000000106', '00000000-0000-4000-8000-000000000002', 'Science and Technology', 6, true)
on conflict (id) do nothing;

insert into public.subjects (id, school_id, aole_id, name, display_order, active, appears_in_mapping_dropdowns)
values
  ('00000000-0000-4000-8200-000000000001', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000005', 'Maths', 1, true, true),
  ('00000000-0000-4000-8200-000000000002', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000004', 'English', 2, true, true),
  ('00000000-0000-4000-8200-000000000003', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000004', 'French', 3, true, true),
  ('00000000-0000-4000-8200-000000000004', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000004', 'German', 4, true, true),
  ('00000000-0000-4000-8200-000000000005', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000004', 'Welsh', 5, true, true),
  ('00000000-0000-4000-8200-000000000006', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000003', 'Geography', 6, true, true),
  ('00000000-0000-4000-8200-000000000007', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000003', 'History', 7, true, true),
  ('00000000-0000-4000-8200-000000000008', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000002', 'PE', 8, true, true),
  ('00000000-0000-4000-8200-000000000009', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000003', 'Business', 9, true, true),
  ('00000000-0000-4000-8200-000000000010', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000006', 'Chemistry', 10, true, true),
  ('00000000-0000-4000-8200-000000000011', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000006', 'Biology', 11, true, true),
  ('00000000-0000-4000-8200-000000000012', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000006', 'Physics', 12, true, true),
  ('00000000-0000-4000-8200-000000000013', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000003', 'Sociology', 13, true, true),
  ('00000000-0000-4000-8200-000000000014', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000002', 'RSE', 14, true, true),
  ('00000000-0000-4000-8200-000000000015', '657f5a77-ae52-48ea-b459-290f86bbd2f0', null, 'Skills', 15, true, true),
  ('00000000-0000-4000-8200-000000000016', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000006', 'DT', 16, true, true),
  ('00000000-0000-4000-8200-000000000017', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000006', 'ICT', 17, true, true),
  ('00000000-0000-4000-8200-000000000018', '657f5a77-ae52-48ea-b459-290f86bbd2f0', null, 'King''s Trust', 18, true, true),
  ('00000000-0000-4000-8200-000000000019', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000002', 'PSE', 19, true, true),
  ('00000000-0000-4000-8200-000000000020', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000001', 'Art', 20, true, true),
  ('00000000-0000-4000-8200-000000000021', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8300-000000000001', 'Music', 21, true, true),
  ('00000000-0000-4000-8200-000000000101', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8300-000000000105', 'Maths', 1, true, true),
  ('00000000-0000-4000-8200-000000000102', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8300-000000000104', 'English', 2, true, true),
  ('00000000-0000-4000-8200-000000000103', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8300-000000000103', 'Geography', 3, true, true),
  ('00000000-0000-4000-8200-000000000104', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8300-000000000106', 'Science', 4, true, true),
  ('00000000-0000-4000-8200-000000000105', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8300-000000000101', 'Art', 5, true, true),
  ('00000000-0000-4000-8200-000000000106', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8300-000000000106', 'Technology', 6, true, true)
on conflict (id) do nothing;

insert into public.frameworks (id, school_id, name, short_name, description, display_order, active)
values
  ('00000000-0000-4000-8400-000000000001', '657f5a77-ae52-48ea-b459-290f86bbd2f0', 'Literacy', 'Literacy', 'Reading, writing and oracy opportunities across subjects.', 1, true),
  ('00000000-0000-4000-8400-000000000002', '657f5a77-ae52-48ea-b459-290f86bbd2f0', 'Numeracy', 'Numeracy', 'Number, measurement, data and numerical reasoning opportunities.', 2, true),
  ('00000000-0000-4000-8400-000000000003', '657f5a77-ae52-48ea-b459-290f86bbd2f0', 'Digital Competence Framework', 'DCF', 'Digital competence opportunities across curriculum planning.', 3, true),
  ('00000000-0000-4000-8400-000000000004', '657f5a77-ae52-48ea-b459-290f86bbd2f0', 'Cross-cutting Themes', 'Themes', 'RSE, human rights, diversity and careers-related learning.', 4, true),
  ('00000000-0000-4000-8400-000000000101', '00000000-0000-4000-8000-000000000002', 'Literacy', 'Literacy', 'Reading, writing and oracy opportunities across subjects.', 1, true),
  ('00000000-0000-4000-8400-000000000102', '00000000-0000-4000-8000-000000000002', 'Numeracy', 'Numeracy', 'Number, measurement, data and numerical reasoning opportunities.', 2, true),
  ('00000000-0000-4000-8400-000000000103', '00000000-0000-4000-8000-000000000002', 'Digital Competence Framework', 'DCF', 'Digital competence opportunities across curriculum planning.', 3, true),
  ('00000000-0000-4000-8400-000000000104', '00000000-0000-4000-8000-000000000002', 'Cross-cutting Themes', 'Themes', 'RSE, human rights, diversity and careers-related learning.', 4, true)
on conflict (id) do nothing;

insert into public.strands (id, school_id, framework_id, name, display_order, active)
values
  ('00000000-0000-4000-8500-000000000001', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000001', 'Oracy', 1, true),
  ('00000000-0000-4000-8500-000000000002', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000001', 'Reading', 2, true),
  ('00000000-0000-4000-8500-000000000003', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000001', 'Writing', 3, true),
  ('00000000-0000-4000-8500-000000000004', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000002', 'Using number skills', 1, true),
  ('00000000-0000-4000-8500-000000000005', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000002', 'Using measuring skills', 2, true),
  ('00000000-0000-4000-8500-000000000006', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000002', 'Using data skills', 3, true),
  ('00000000-0000-4000-8500-000000000007', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000002', 'Developing numerical reasoning', 4, true),
  ('00000000-0000-4000-8500-000000000008', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000003', 'Citizenship', 1, true),
  ('00000000-0000-4000-8500-000000000009', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000003', 'Interacting and collaborating', 2, true),
  ('00000000-0000-4000-8500-000000000010', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000003', 'Producing', 3, true),
  ('00000000-0000-4000-8500-000000000011', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000003', 'Data and computational thinking', 4, true),
  ('00000000-0000-4000-8500-000000000012', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000004', 'Relationships and sexuality education', 1, true),
  ('00000000-0000-4000-8500-000000000013', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000004', 'Human rights', 2, true),
  ('00000000-0000-4000-8500-000000000014', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000004', 'Diversity', 3, true),
  ('00000000-0000-4000-8500-000000000015', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000004', 'Careers and work-related experiences', 4, true),
  ('00000000-0000-4000-8500-000000000101', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8400-000000000101', 'Oracy', 1, true),
  ('00000000-0000-4000-8500-000000000102', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8400-000000000101', 'Reading', 2, true),
  ('00000000-0000-4000-8500-000000000103', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8400-000000000101', 'Writing', 3, true),
  ('00000000-0000-4000-8500-000000000104', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8400-000000000102', 'Using data skills', 1, true),
  ('00000000-0000-4000-8500-000000000105', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8400-000000000103', 'Producing', 1, true),
  ('00000000-0000-4000-8500-000000000106', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8400-000000000104', 'Diversity', 1, true)
on conflict (id) do nothing;

insert into public.elements (id, school_id, strand_id, name, official_wording, teacher_friendly_explanation, example_classroom_opportunities, search_keywords, related_connections, display_order, active)
values
  ('00000000-0000-4000-8600-000000000001', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000001', 'Listening for meaning', null, 'Learners listen actively and identify key points in spoken ideas.', ARRAY['Structured seminar','Peer explanation','Debate preparation'], ARRAY['oracy','listening','discussion'], ARRAY['Collaborative discussion','Presenting information'], 1, true),
  ('00000000-0000-4000-8600-000000000002', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000001', 'Collaborative discussion', null, 'Learners build on contributions and use talk to shape shared understanding.', ARRAY['Group enquiry roles','Think-pair-share','Project critique circle'], ARRAY['oracy','collaboration','talk'], ARRAY['Listening for meaning','Presenting information'], 2, true),
  ('00000000-0000-4000-8600-000000000003', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000001', 'Presenting information', null, 'Learners organise and communicate information clearly for a chosen audience.', ARRAY['Short presentation','Podcast script','Exhibition talk'], ARRAY['oracy','presentation','audience'], ARRAY['Audience and purpose'], 3, true),
  ('00000000-0000-4000-8600-000000000004', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000002', 'Locating information', null, 'Learners find relevant details from texts, diagrams, sources and digital materials.', ARRAY['Source investigation','Information hunt','Research note taking'], ARRAY['reading','sources','research'], ARRAY['Comparing sources'], 1, true),
  ('00000000-0000-4000-8600-000000000005', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000002', 'Inference and deduction', null, 'Learners use evidence to read beyond obvious information and justify interpretations.', ARRAY['Character evidence grid','Historical source inference','Scientific explanation reading'], ARRAY['reading','inference','evidence'], ARRAY['Comparing sources'], 2, true),
  ('00000000-0000-4000-8600-000000000006', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000002', 'Comparing sources', null, 'Learners compare viewpoints, reliability and purpose across sources.', ARRAY['News comparison','Primary and secondary source check','Website reliability review'], ARRAY['reading','viewpoint','reliability'], ARRAY['Inference and deduction'], 3, true),
  ('00000000-0000-4000-8600-000000000007', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000003', 'Planning writing', null, 'Learners plan structure, content and sequence before producing written work.', ARRAY['Writing frame','Storyboard','Report plan'], ARRAY['writing','planning','structure'], ARRAY['Technical accuracy','Audience and purpose'], 1, true),
  ('00000000-0000-4000-8600-000000000008', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000003', 'Technical accuracy', null, 'Learners edit spelling, punctuation, grammar and vocabulary choices.', ARRAY['Redrafting checklist','Peer editing','Subject vocabulary focus'], ARRAY['writing','editing','accuracy'], ARRAY['Planning writing'], 2, true),
  ('00000000-0000-4000-8600-000000000009', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000003', 'Audience and purpose', null, 'Learners adapt tone, register and form to suit the intended reader.', ARRAY['Campaign leaflet','Formal report','Museum label'], ARRAY['writing','audience','purpose'], ARRAY['Presenting information'], 3, true),
  ('00000000-0000-4000-8600-000000000010', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000004', 'Use of calculation', null, 'Learners choose and apply calculations in meaningful subject contexts.', ARRAY['Budget comparison','Recipe scaling','Science formula practice'], ARRAY['numeracy','calculation','number'], ARRAY['Justifying decisions'], 1, true),
  ('00000000-0000-4000-8600-000000000011', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000006', 'Collecting data', null, 'Learners gather data fairly and record it in usable forms.', ARRAY['Survey design','Fieldwork tally','Experiment results table'], ARRAY['data','collecting','tables'], ARRAY['Representing data','Interpreting trends'], 1, true),
  ('00000000-0000-4000-8600-000000000012', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000006', 'Interpreting trends', null, 'Learners describe patterns, anomalies and relationships in data.', ARRAY['Climate trend discussion','Performance data story','Population graph analysis'], ARRAY['data','trends','graphs'], ARRAY['Collecting data','Evaluating accuracy'], 2, true),
  ('00000000-0000-4000-8600-000000000013', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000010', 'Creating digital content', null, 'Learners combine media and tools to create purposeful digital outcomes.', ARRAY['Video explainer','Interactive poster','System portfolio'], ARRAY['digital','content','media'], ARRAY['Planning digital products','Evaluating outputs'], 1, true),
  ('00000000-0000-4000-8600-000000000014', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000010', 'Evaluating outputs', null, 'Learners review digital work against purpose and make improvements.', ARRAY['Usability review','Audience feedback','Iteration notes'], ARRAY['digital','evaluation','review'], ARRAY['Creating digital content'], 2, true),
  ('00000000-0000-4000-8600-000000000015', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8500-000000000014', 'Culture and community', null, 'Learners investigate cultures, languages and communities in Wales and beyond.', ARRAY['Community research','Cultural celebration analysis','Place-name enquiry'], ARRAY['diversity','culture','community'], ARRAY['Identity','Challenging stereotypes'], 1, true),
  ('00000000-0000-4000-8600-000000000101', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8500-000000000101', 'Listening for meaning', null, 'Learners listen actively and identify key points in spoken ideas.', ARRAY['Structured seminar','Peer explanation','Debate preparation'], ARRAY['oracy','listening','discussion'], ARRAY['Collaborative discussion'], 1, true),
  ('00000000-0000-4000-8600-000000000102', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8500-000000000102', 'Comparing sources', null, 'Learners compare viewpoints, reliability and purpose across sources.', ARRAY['News comparison','Primary and secondary source check','Website reliability review'], ARRAY['reading','viewpoint','reliability'], ARRAY['Inference and deduction'], 1, true),
  ('00000000-0000-4000-8600-000000000103', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8500-000000000104', 'Interpreting trends', null, 'Learners describe patterns, anomalies and relationships in data.', ARRAY['Climate trend discussion','Performance data story','Population graph analysis'], ARRAY['data','trends','graphs'], ARRAY['Collecting data'], 1, true),
  ('00000000-0000-4000-8600-000000000104', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8500-000000000105', 'Creating digital content', null, 'Learners combine media and tools to create purposeful digital outcomes.', ARRAY['Video explainer','Interactive poster','System portfolio'], ARRAY['digital','content','media'], ARRAY['Evaluating outputs'], 1, true),
  ('00000000-0000-4000-8600-000000000105', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8500-000000000106', 'Culture and community', null, 'Learners investigate cultures, languages and communities in Wales and beyond.', ARRAY['Community research','Cultural celebration analysis','Place-name enquiry'], ARRAY['diversity','culture','community'], ARRAY['Identity'], 1, true)
on conflict (id) do nothing;

insert into public.progression_descriptors (id, school_id, element_id, progression_step, descriptor)
values
  ('00000000-0000-4000-8700-000000000001', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8600-000000000005', 'Step 1', 'Learners identify simple implied meaning with support.'),
  ('00000000-0000-4000-8700-000000000002', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8600-000000000005', 'Step 2', 'Learners use clues from familiar texts to explain simple inference.'),
  ('00000000-0000-4000-8700-000000000003', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8600-000000000005', 'Step 3', 'Learners infer meaning using evidence from increasingly varied texts.'),
  ('00000000-0000-4000-8700-000000000004', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8600-000000000005', 'Step 4', 'Learners infer meaning and recognise viewpoint, bias and purpose in increasingly complex texts.'),
  ('00000000-0000-4000-8700-000000000005', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8600-000000000005', 'Step 5', 'Learners evaluate subtle inference and explain how writers shape interpretation.'),
  ('00000000-0000-4000-8700-000000000006', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8600-000000000012', 'Step 3', 'Learners describe clear trends from familiar data displays.'),
  ('00000000-0000-4000-8700-000000000007', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8600-000000000012', 'Step 4', 'Learners interpret trends, anomalies and relationships in data.'),
  ('00000000-0000-4000-8700-000000000008', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8600-000000000012', 'Step 5', 'Learners evaluate data patterns and explain limits in conclusions.'),
  ('00000000-0000-4000-8700-000000000009', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8600-000000000013', 'Step 3', 'Learners create digital content for a clear audience and purpose.'),
  ('00000000-0000-4000-8700-000000000010', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8600-000000000013', 'Step 4', 'Learners combine digital tools and media to communicate purposeful outcomes.'),
  ('00000000-0000-4000-8700-000000000011', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8600-000000000013', 'Step 5', 'Learners refine digital products for audience, purpose and usability.'),
  ('00000000-0000-4000-8700-000000000101', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8600-000000000102', 'Step 3', 'Learners compare information from more than one source.'),
  ('00000000-0000-4000-8700-000000000102', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8600-000000000102', 'Step 4', 'Learners compare viewpoint, reliability and purpose across sources.'),
  ('00000000-0000-4000-8700-000000000103', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8600-000000000102', 'Step 5', 'Learners evaluate source reliability and explain how evidence is selected.')
on conflict (id) do nothing;

insert into public.branding_settings (id, school_id, school_name, motto, logo_url, primary_colour, secondary_colour)
values
  ('00000000-0000-4000-8100-000000000001', '657f5a77-ae52-48ea-b459-290f86bbd2f0', 'Caerleon Comprehensive School', 'Maximising Potential', '/schlogo.png', '#741B47', '#571435'),
  ('00000000-0000-4000-8100-000000000002', '00000000-0000-4000-8000-000000000002', 'Newport Sample School', 'Curriculum visibility', '/schlogo.png', '#1D3557', '#0F2238')
on conflict (id) do nothing;

insert into public.framework_colour_themes (id, school_id, framework_id, primary_colour, pale_colour, badge_colour, chart_colour)
values
  ('00000000-0000-4000-8800-000000000001', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000001', '#EA580C', '#FFF7ED', '#9A3412', '#EA580C'),
  ('00000000-0000-4000-8800-000000000002', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000002', '#2563EB', '#EFF6FF', '#1E3A8A', '#2563EB'),
  ('00000000-0000-4000-8800-000000000003', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000003', '#CA8A04', '#FEFCE8', '#854D0E', '#CA8A04'),
  ('00000000-0000-4000-8800-000000000004', '657f5a77-ae52-48ea-b459-290f86bbd2f0', '00000000-0000-4000-8400-000000000004', '#15803D', '#F0FDF4', '#166534', '#15803D'),
  ('00000000-0000-4000-8800-000000000101', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8400-000000000101', '#EA580C', '#FFF7ED', '#9A3412', '#EA580C'),
  ('00000000-0000-4000-8800-000000000102', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8400-000000000102', '#2563EB', '#EFF6FF', '#1E3A8A', '#2563EB'),
  ('00000000-0000-4000-8800-000000000103', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8400-000000000103', '#CA8A04', '#FEFCE8', '#854D0E', '#CA8A04'),
  ('00000000-0000-4000-8800-000000000104', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8400-000000000104', '#15803D', '#F0FDF4', '#166534', '#15803D')
on conflict (id) do nothing;
