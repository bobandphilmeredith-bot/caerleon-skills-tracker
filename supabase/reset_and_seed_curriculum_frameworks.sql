-- Reset and seed clean curriculum framework references for the test database.
-- This script intentionally clears test mapping/link rows before replacing
-- prototype framework labels with the required active reference data.

create extension if not exists pgcrypto;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  motto text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.schools (slug, name, motto)
values ('caerleon', 'Caerleon Comprehensive School', 'Maximising Potential')
on conflict (slug) do update set name = excluded.name, motto = excluded.motto, active = true;

create table if not exists public.frameworks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  short_name text,
  description text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name),
  unique (id, school_id)
);

alter table public.frameworks alter column short_name drop not null;

create table if not exists public.strands (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  framework_id uuid not null,
  name text not null,
  short_name text,
  description text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (framework_id, name),
  unique (id, school_id),
  foreign key (framework_id, school_id) references public.frameworks(id, school_id) on delete cascade
);

alter table public.strands add column if not exists short_name text;
alter table public.strands add column if not exists description text;

create table if not exists public.elements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  strand_id uuid not null,
  name text not null,
  description text,
  official_wording text,
  teacher_friendly_explanation text,
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

alter table public.elements add column if not exists description text;
alter table public.elements alter column teacher_friendly_explanation drop not null;

create table if not exists public.progression_descriptors (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  element_id uuid not null,
  progression_step integer not null,
  descriptor_text text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (element_id, progression_step),
  unique (id, school_id),
  foreign key (element_id, school_id) references public.elements(id, school_id) on delete cascade
);

alter table public.progression_descriptors add column if not exists descriptor_text text;
alter table public.progression_descriptors add column if not exists display_order integer not null default 0;
alter table public.progression_descriptors add column if not exists active boolean not null default true;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'progression_descriptors'
      and column_name = 'descriptor'
  ) then
    update public.progression_descriptors
    set descriptor_text = coalesce(descriptor_text, descriptor);
    alter table public.progression_descriptors alter column descriptor drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'progression_descriptors'
      and column_name = 'progression_step'
      and data_type <> 'integer'
  ) then
    delete from public.progression_descriptors;
    alter table public.progression_descriptors
      alter column progression_step type integer
      using nullif(regexp_replace(progression_step::text, '[^0-9]', '', 'g'), '')::integer;
  end if;
end $$;

alter table public.progression_descriptors alter column descriptor_text set not null;

create table if not exists public.curriculum_mappings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  subject_id uuid,
  year_group text,
  term text,
  scheme_reference text,
  activity_title text,
  activity_description text,
  task_description text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curriculum_mapping_framework_links (
  id uuid primary key default gen_random_uuid(),
  mapping_id uuid not null references public.curriculum_mappings(id) on delete cascade,
  framework_id uuid not null references public.frameworks(id),
  strand_id uuid not null references public.strands(id),
  element_id uuid not null references public.elements(id),
  progression_descriptor_id uuid references public.progression_descriptors(id),
  progression_step integer,
  notes text,
  created_at timestamptz not null default now(),
  unique (mapping_id, framework_id, strand_id, element_id, progression_descriptor_id)
);

create table if not exists public.cross_cutting_themes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create table if not exists public.curriculum_mapping_theme_links (
  id uuid primary key default gen_random_uuid(),
  mapping_id uuid not null references public.curriculum_mappings(id) on delete cascade,
  theme_id uuid not null references public.cross_cutting_themes(id),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (mapping_id, theme_id)
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'curriculum_mapping_theme_links',
    'curriculum_entry_theme_links',
    'curriculum_activity_theme_links',
    'curriculum_mapping_framework_links',
    'curriculum_entry_framework_links',
    'curriculum_mappings',
    'curriculum_entries'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('delete from public.%I', table_name);
    end if;
  end loop;
end $$;

delete from public.progression_descriptors;
delete from public.elements;
delete from public.strands;
delete from public.frameworks
where name in ('Literacy Framework', 'Numeracy Framework', 'Digital Competence Framework', 'Cross-cutting Themes')
   or name in ('Developing numerical reasoning', 'Using number skills', 'Using measuring skills', 'Using data skills', 'Use of calculation')
   or name in ('Oracy', 'Identity and wellbeing', 'Culture and community', 'Evaluating outputs');

delete from public.cross_cutting_themes
where name not in (
  'Relationships and sexuality education',
  'Human rights education',
  'Diversity',
  'Careers and work-related experiences',
  'Local, national and international contexts'
);

do $$
declare
  school record;
  v_framework_id uuid;
  v_strand_id uuid;
  v_element_id uuid;
  item record;
  step integer;
begin
  for school in select id from public.schools loop
    for item in
      select * from (values
        ('Literacy Framework', 'Literacy', 1),
        ('Numeracy Framework', 'Numeracy', 2),
        ('Digital Competence Framework', 'DCF', 3)
      ) as v(name, short_name, display_order)
    loop
      insert into public.frameworks (school_id, name, short_name, display_order, active)
      values (school.id, item.name, item.short_name, item.display_order, true)
      on conflict (school_id, name) do update
        set short_name = excluded.short_name,
            display_order = excluded.display_order,
            active = true
      returning id into v_framework_id;
    end loop;

    for item in
      select * from (values
        ('Literacy Framework', 'Translanguaging', 'Translanguaging', 1, 'Translanguaging', 1),
        ('Literacy Framework', 'Listening', 'Listening', 2, 'Listening for meaning', 1),
        ('Literacy Framework', 'Listening', 'Listening', 2, 'Developing vocabulary', 2),
        ('Literacy Framework', 'Listening', 'Listening', 2, 'Listening to understand', 3),
        ('Literacy Framework', 'Listening', 'Listening', 2, 'Listening as part of collaborative talk', 4),
        ('Literacy Framework', 'Reading', 'Reading', 3, 'Phonological and phonemic awareness', 1),
        ('Literacy Framework', 'Reading', 'Reading', 3, 'Reading strategies', 2),
        ('Literacy Framework', 'Reading', 'Reading', 3, 'Understanding, response and analysis', 3),
        ('Literacy Framework', 'Speaking', 'Speaking', 4, 'Clarity and vocabulary', 1),
        ('Literacy Framework', 'Speaking', 'Speaking', 4, 'Purpose', 2),
        ('Literacy Framework', 'Speaking', 'Speaking', 4, 'Collaborative talk', 3),
        ('Literacy Framework', 'Speaking', 'Speaking', 4, 'Questioning', 4),
        ('Literacy Framework', 'Writing', 'Writing', 5, 'Vocabulary, spelling, grammar', 1),
        ('Literacy Framework', 'Writing', 'Writing', 5, 'Connectives and syntax', 2),
        ('Literacy Framework', 'Writing', 'Writing', 5, 'Punctuation', 3),
        ('Literacy Framework', 'Writing', 'Writing', 5, 'Planning and organising for different purposes, audiences and context', 4),
        ('Literacy Framework', 'Writing', 'Writing', 5, 'Proofreading, editing and improving', 5),
        ('Numeracy Framework', 'Developing mathematical proficiency', 'Mathematical proficiency', 1, 'Conceptual understanding', 1),
        ('Numeracy Framework', 'Developing mathematical proficiency', 'Mathematical proficiency', 1, 'Logical reasoning', 2),
        ('Numeracy Framework', 'Developing mathematical proficiency', 'Mathematical proficiency', 1, 'Fluency', 3),
        ('Numeracy Framework', 'Developing mathematical proficiency', 'Mathematical proficiency', 1, 'Strategic competence', 4),
        ('Numeracy Framework', 'Developing mathematical proficiency', 'Mathematical proficiency', 1, 'Communicating with symbols', 5),
        ('Numeracy Framework', 'Understanding the number system helps us to represent and compare relationships between numbers and quantities', 'Number system', 2, 'The number system', 1),
        ('Numeracy Framework', 'Understanding the number system helps us to represent and compare relationships between numbers and quantities', 'Number system', 2, 'Relationships within the number system', 2),
        ('Numeracy Framework', 'Understanding the number system helps us to represent and compare relationships between numbers and quantities', 'Number system', 2, 'Calculation', 3),
        ('Numeracy Framework', 'Understanding the number system helps us to represent and compare relationships between numbers and quantities', 'Number system', 2, 'Financial literacy', 4),
        ('Numeracy Framework', 'Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world', 'Geometry and measurement', 3, 'Measurement', 1),
        ('Numeracy Framework', 'Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world', 'Geometry and measurement', 3, 'Shape and space', 2),
        ('Numeracy Framework', 'Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world', 'Geometry and measurement', 3, 'Position', 3),
        ('Numeracy Framework', 'Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world', 'Geometry and measurement', 3, 'Angle', 4),
        ('Numeracy Framework', 'Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions', 'Statistics and probability', 4, 'Collecting data', 1),
        ('Numeracy Framework', 'Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions', 'Statistics and probability', 4, 'Representing data', 2),
        ('Numeracy Framework', 'Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions', 'Statistics and probability', 4, 'Interpreting data', 3),
        ('Digital Competence Framework', 'Citizenship', 'Citizenship', 1, 'Identity, image and reputation', 1),
        ('Digital Competence Framework', 'Citizenship', 'Citizenship', 1, 'Health and well-being', 2),
        ('Digital Competence Framework', 'Citizenship', 'Citizenship', 1, 'Digital rights, licensing and ownership', 3),
        ('Digital Competence Framework', 'Citizenship', 'Citizenship', 1, 'Online behaviour and online bullying', 4),
        ('Digital Competence Framework', 'Interacting and collaborating', 'Interacting and collaborating', 2, 'Communication', 1),
        ('Digital Competence Framework', 'Interacting and collaborating', 'Interacting and collaborating', 2, 'Collaboration', 2),
        ('Digital Competence Framework', 'Interacting and collaborating', 'Interacting and collaborating', 2, 'Storing and sharing', 3),
        ('Digital Competence Framework', 'Producing', 'Producing', 3, 'Sourcing, searching and planning digital content', 1),
        ('Digital Competence Framework', 'Producing', 'Producing', 3, 'Creating digital content', 2),
        ('Digital Competence Framework', 'Producing', 'Producing', 3, 'Evaluating and improving digital content', 3),
        ('Digital Competence Framework', 'Data and computational thinking', 'Data and computational thinking', 4, 'Problem-solving and modelling', 1),
        ('Digital Competence Framework', 'Data and computational thinking', 'Data and computational thinking', 4, 'Data and information literacy', 2)
      ) as v(framework_name, strand_name, strand_short_name, strand_order, element_name, element_order)
    loop
      select id into v_framework_id from public.frameworks where school_id = school.id and name = item.framework_name;
      insert into public.strands (school_id, framework_id, name, short_name, display_order, active)
      values (school.id, v_framework_id, item.strand_name, item.strand_short_name, item.strand_order, true)
      on conflict (framework_id, name) do update
        set short_name = excluded.short_name,
            display_order = excluded.display_order,
            active = true
      returning id into v_strand_id;

      insert into public.elements (school_id, strand_id, name, description, official_wording, teacher_friendly_explanation, display_order, active)
      values (
        school.id,
        v_strand_id,
        item.element_name,
        'Reference element for curriculum mapping.',
        'Reference element for curriculum mapping.',
        'Use the official progression descriptor selected for this element.',
        item.element_order,
        true
      )
      on conflict (strand_id, name) do update
        set display_order = excluded.display_order,
            active = true
      returning id into v_element_id;

    end loop;

    for item in
      select * from (values
        ('Relationships and sexuality education', 'RSE coverage tag.', 1),
        ('Human rights education', 'Human rights education coverage tag.', 2),
        ('Diversity', 'Diversity coverage tag.', 3),
        ('Careers and work-related experiences', 'Careers and work-related experiences coverage tag.', 4),
        ('Local, national and international contexts', 'Local, national and international contexts coverage tag.', 5)
      ) as v(name, description, display_order)
    loop
      insert into public.cross_cutting_themes (school_id, name, description, display_order, active)
      values (school.id, item.name, item.description, item.display_order, true)
      on conflict (school_id, name) do update
        set description = excluded.description,
            display_order = excluded.display_order,
            active = true;
    end loop;
  end loop;
end $$;

insert into public.progression_descriptors (school_id, element_id, progression_step, descriptor_text, display_order, active)
select e.school_id, e.id, d.progression_step, d.descriptor_text, d.progression_step, true
from public.elements e
join public.strands s on s.id = e.strand_id
join public.frameworks f on f.id = s.framework_id
join (
  values
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Conceptual understanding$seed0$, 1, $seed0$I can make connections so that basic mathematical concepts can be transferred during play and classroom activities. I can understand and use basic mathematical concepts in a variety of ways. I can explore answers within the context of the problem and I am beginning to consider whether answers are sensible.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Conceptual understanding$seed0$, 2, $seed0$I can make connections so that mathematical concepts can be transferred during play and classroom activities. I can represent a concept in different ways, flowing between different representations including verbal, concrete, visual, digital and abstract. I can interpret answers within the context of the problem and consider whether answers are sensible.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Conceptual understanding$seed0$, 3, $seed0$I can make connections so that mathematical concepts can be built on and deepened. I can draw on my understanding of the basic structures of mathematics and can apply them in different contexts. I can explain and express concepts, and find examples (or non-examples). I can represent a concept in different ways, flowing between different representations including verbal, concrete, visual, digital and abstract. I can interpret answers within the context of the problem and consider whether answers, including calculator, analogue and digital displays, are sensible.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Conceptual understanding$seed0$, 4, $seed0$I can make connections so that mathematical concepts can be built on and deepened. I can draw on my understanding of the basic structures of mathematics and can apply them in different contexts. I can explain and express concepts, and find examples (or non-examples). I can represent a concept in different ways, flowing between different representations including verbal, concrete, visual, digital and abstract. I can interpret answers within the context of the problem and consider whether answers, including calculator, analogue and digital displays, are sensible.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Conceptual understanding$seed0$, 5, $seed0$I can make connections so that mathematical concepts can be built on and deepened. I can draw on my understanding of the basic structures of mathematics and can apply them in different contexts. I can explain and express concepts, and find examples (or non-examples). I can represent a concept in different ways, flowing between different representations including verbal, concrete, visual, digital and abstract. I can interpret answers within the context of the problem and consider whether answers, including calculator, analogue and digital displays, are sensible.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Logical reasoning$seed0$, 1, $seed0$I can use everyday and mathematical language to talk about my own ideas and choices.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Logical reasoning$seed0$, 2, $seed0$I can use everyday and mathematical language to talk about and explain my own ideas and choices. I can verify results and solutions.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Logical reasoning$seed0$, 3, $seed0$I can construct and develop a mathematical argument. I can justify my procedures and predictions. I can verify results and solutions. I can explain results and procedures precisely using appropriate mathematical language.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Logical reasoning$seed0$, 4, $seed0$I can construct and develop a mathematical argument. I can justify my procedures, predictions and conjectures. I can verify and prove results and solutions. I can explain results and procedures precisely using appropriate mathematical language.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Logical reasoning$seed0$, 5, $seed0$I can construct and develop a mathematical argument. I can justify my procedures, predictions and conjectures. I can verify and prove results and solutions. I can explain results and procedures precisely using appropriate mathematical language.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Fluency$seed0$, 1, $seed0$I am beginning to apply relevant facts and techniques.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Fluency$seed0$, 2, $seed0$I can identify relevant facts and techniques in order to apply an efficient method. I can use checking strategies to decide if answers are reasonable.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Fluency$seed0$, 3, $seed0$I can use firmly established, memorable and usable facts and techniques in order to apply the most efficient methods. I can select and apply appropriate checking strategies. I can use a calculator effectively and efficiently to carry out calculations.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Fluency$seed0$, 4, $seed0$I can use firmly established, memorable and usable facts and techniques in order to apply the most efficient methods. I can select and apply appropriate checking strategies. I can use a scientific calculator effectively and efficiently to carry out calculations using the available range of function keys.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Fluency$seed0$, 5, $seed0$I can use firmly established, memorable and usable facts and techniques in order to apply the most efficient methods. I can select and apply appropriate checking strategies. I can use a scientific calculator effectively and efficiently to carry out calculations using the available range of function keys.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Strategic competence$seed0$, 1, $seed0$I can select the appropriate equipment and resources to help me. I can suggest what I might need to do to complete the task or reach a solution. I can explore appropriate mathematics and techniques to use.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Strategic competence$seed0$, 2, $seed0$I can identify the required information, and select appropriate equipment and resources. I can identify steps to complete the task or reach a solution. I can select appropriate mathematics and techniques to use. I can choose an appropriate mental or written strategy and know when it is appropriate to use a calculator.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Strategic competence$seed0$, 3, $seed0$I can recognise, model and apply the underlying mathematical structures and ideas within problems, in order to formulate and solve them. I can identify, measure or obtain required information to complete the task. I can identify what further information might be required and select what information is most appropriate. I can select, trial and evaluate a variety of possible approaches and break problems into a series of tasks. I can prioritise and organise the relevant steps needed to complete the task or reach a solution. I can choose an appropriate mental or written strategy and know when it is appropriate to use a calculator.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Strategic competence$seed0$, 4, $seed0$I can recognise, model and apply the underlying mathematical structures and ideas within problems, in order to formulate and solve them. I can identify, measure or obtain required information to complete the task. I can identify what further information might be required and select what information is most appropriate. I can select, trial and evaluate a variety of possible approaches and break complex problems into a series of tasks. I can prioritise and organise the relevant steps needed to complete the task or reach a solution. I can choose an appropriate mental or written strategy and know when it is appropriate to use a calculator.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Strategic competence$seed0$, 5, $seed0$I can recognise, model and apply the underlying mathematical structures and ideas within problems, in order to formulate and solve them. I can identify, measure or obtain required information to complete the task. I can identify what further information might be required and select what information is most appropriate. I can select, trial and evaluate a variety of possible approaches and break complex problems into a series of tasks. I can prioritise and organise the relevant steps needed to complete the task or reach a solution. I can choose an appropriate mental or written strategy and know when it is appropriate to use a calculator.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Communicating with symbols$seed0$, 1, $seed0$I can explore informal, personal methods of recording, moving towards using symbols.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Communicating with symbols$seed0$, 2, $seed0$I can use appropriate notation, symbols and units of measurement. I can devise and refine informal, personal methods of recording, moving to using words and symbols in number sentences.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Communicating with symbols$seed0$, 3, $seed0$I can communicate my answers using correct mathematical form. I can use appropriate notation, symbols and units of measurement. I can refine methods of recording calculations.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Communicating with symbols$seed0$, 4, $seed0$I can communicate my answers using correct mathematical form. I can use appropriate notation, symbols and units of measurement, including compound measures. I can refine methods of recording calculations.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Developing mathematical proficiency$seed0$, $seed0$Mathematical proficiency$seed0$, $seed0$Communicating with symbols$seed0$, 5, $seed0$I can communicate my answers using correct mathematical form. I can use appropriate notation, symbols and units of measurement, including compound measures. I can refine methods of recording calculations.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$The number system$seed0$, 1, $seed0$I can count reliably, forwards and backwards, to beyond 10. I can notice, read and write numbers from 0 to beyond 10, and relate a number to its respective quantity. I can compare and order numbers beyond 10. I can demonstrate an understanding of one-to-one correspondence by matching pairs of objects or pictures. I can use my visual sense of number to make estimates and comparisons. I can explore estimates by using counting or measuring.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$The number system$seed0$, 2, $seed0$I can read, write and interpret numbers using figures and words up to at least 1000. I can compare, round and estimate with numbers up to 100. I can count in different steps of uniform size, and recognise odd and even numbers. I can check subtraction using addition. I can check halving using doubling.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$The number system$seed0$, 3, $seed0$I can read and write numbers to 1 million and numbers to 3 decimal places. I can use the terms square and square root. I can estimate by rounding to the nearest 10, 100, 1000 or whole number.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$The number system$seed0$, 4, $seed0$I can read and write numbers of any size. I can use the terms cube, cube root and reciprocal. I can show awareness of the need for standard form and its representation on a calculator. I can use and interpret numbers in standard form within calculations. I can use rounding to estimate and check answers. I can present answers to a given number of decimal places or significant figures. I can make and justify estimates and approximations of calculations. I can choose the appropriate degree of accuracy to present answers.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$The number system$seed0$, 5, $seed0$I can recognise and define limitations on accuracy of measurements, e.g. upper and lower bounds.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Relationships within the number system$seed0$, 2, $seed0$I can use halves and quarters. I can halve 2-digit numbers in the context of number, money and measures. I can find fractional quantities linked to known multiplication facts, e.g. 1/3 of 18, 1/5 of 15.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Relationships within the number system$seed0$, 3, $seed0$I can use understanding of simple fraction, decimal and percentage equivalences, e.g. find 25% of 60cm and know that this is equivalent to ¼ of 60cm. I can simplify a calculation by using fractions in their simplest terms. I can use and interpret different representations of fractions, e.g. mixed numbers and improper fractions. I can use equivalence of fractions, decimals and percentages to compare proportions.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Relationships within the number system$seed0$, 4, $seed0$I can use equivalence of fractions, decimals and percentages to select the most appropriate one for a calculation. I can recognise that some fractions are recurring decimals, e.g. 1/3 is 0.333. I can use powers and understand the importance of powers of 10.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Calculation$seed0$, 1, $seed0$I can understand and use the concept of ‘one more’ in my play. I can understand and use the concept of ‘one less’ in my play. I can combine two groups of objects to find ‘how many altogether?’. I can take away objects to find ‘how many are left?’. I can find and use number facts to compose a number (up to 10) in different ways.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Calculation$seed0$, 2, $seed0$I can find differences within at least 100. I can use mental strategies to add and subtract at least 2-digit numbers. I can use partitioning to double and halve 2-digit numbers. I can use mental strategies to recall number facts within 20. I can recall 2, 3, 4, 5 and 10 multiplication tables and use to solve multiplication and division problems. I can multiply numbers by 10. I can check multiplication using repeated addition.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Calculation$seed0$, 3, $seed0$I can use mental strategies to recall multiplication tables up to 10 x 10 and use to solve division problems. I can multiply numbers and decimals by a multiple of 10, e.g. 15 x 30, 1.4cm x 20. I can halve 3-digit numbers in the context of number, money and measures. I can calculate a percentage, fraction and decimal of any quantity with a calculator where appropriate. I can use ratio and proportion to calculate quantities. I can calculate percentage quantities based on 10%, e.g. 20%, 5%, 15%. I can add and subtract numbers using whole numbers and decimals. I can multiply 2- and 3-digit numbers by a 2-digit number. I can divide 3-digit numbers by a 2-digit number. I can use a range of strategies to check calculations including the use of inverse operations, equivalent calculations and the rules of divisibility.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Calculation$seed0$, 4, $seed0$I can use the four operations and the connections between them, e.g. apply division as the inverse of multiplication. I can use efficient written methods to add and subtract numbers and decimals of any size, including a mixture of large and small numbers with differing numbers of decimal places. I can use appropriate strategies for multiplication and division, including application of known facts to derive others, e.g. use 7 x 6 to derive 0.7 x 6. I can use efficient methods for multiplication and division of whole numbers and decimals, including decimals such as 0.6 or 0.06. I can use the order of operations including brackets and powers. I can calculate a percentage increase or decrease. I can express one quantity as a percentage of another. I can calculate percentages of quantities using non-calculator methods where appropriate. I can use ratio and proportion including map scales.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Calculation$seed0$, 5, $seed0$I can use multipliers as an efficient method when working with percentages, e.g. multiply by 1.2 to increase an amount by 20%. I can use and understand the idea of reverse percentage to find an original quantity.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Financial literacy$seed0$, 1, $seed0$I can exchange money for items and use the language of money. I can demonstrate an awareness of the purpose of money through role play and in real-life situations.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Financial literacy$seed0$, 2, $seed0$I can use different combinations of money to pay for items up to at least £2 and calculate the change. I can order and compare items up to £10.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Financial literacy$seed0$, 3, $seed0$I can add and subtract totals less than £100 using correct notation, e.g. £28.18 + £33.45. I can manage money, compare costs from different retailers and determine what can be bought within a given budget. I can make comparisons between prices and understand which is best value for money. I can use profit and loss in buying and selling calculations. I can realise that budgeting is important. I can understand the advantages and disadvantages of using bank accounts. I can plan and track money and savings by keeping accurate records.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Financial literacy$seed0$, 4, $seed0$I can calculate using foreign money and exchange rates. I can make informed decisions relating to discounts and special offers. I can carry out calculations relating to VAT, saving and borrowing. I can appreciate the basic principles of budgeting, saving (including understanding compound interest) and borrowing. I can understand the advantages and disadvantages of using bank accounts, including bank cards. I can understand the risks involved in different ways of saving and investing. I can use and understand efficient methods of calculating compound interest. I can describe why insurance is important and understand the impact of not being insured.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Understanding the number system helps us to represent and compare relationships between numbers and quantities$seed0$, $seed0$Number system$seed0$, $seed0$Financial literacy$seed0$, 5, $seed0$I can understand and demonstrate the real-life process of foreign exchange. I can understand and calculate income tax and understand the implications of taxation.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Measurement$seed0$, 1, $seed0$I can use non-standard units of measure to discuss my sense of size. I can use direct comparisons with: • length, height and distance, e.g. longer/shorter than • weight/mass, e.g. heavier/lighter than • capacity, e.g. holds more/less than. I can anticipate events related to elements of daily routines and use the terms ‘before’ and ‘after’. I can use the basic concept of time in terms of my daily activities. I can demonstrate a developing sense of how long tasks and everyday events take.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Measurement$seed0$, 2, $seed0$I can use non-standard units to measure. I can progress to use standard units of measure: • length: I can measure on a ruler to the nearest 0.5cm • weight/mass: I can use 5g, 10g and 100g weights to measure and compare the mass of objects • capacity: I can read scale to to the nearest 100ml. I can use the concept of time in terms of my daily and weekly activities and the seasons of the year. I can use standard units of time to read ‘o’clock’, ‘half past’, ‘quarter past’ and ‘quarter to’ using both analogue and 12-hour digital clocks.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Measurement$seed0$, 3, $seed0$I can read and interpret scales or divisions on a range of measuring instruments. I can record measurements in different ways, e.g. 1.3kg = 1kg 300g, 4.2cm = 4cm 2mm. I can convert metric units of length to smaller units, e.g. cm to mm, m to cm, km to m. I can use the language of imperial units in daily use, e.g. miles, pints. I can read and use analogue and digital clocks. I can use and interpret calendars, timetables and schedules to plan events and activities, and make calculations as part of the planning journey. I can carry out practical activities involving timed events and explain which unit of time is the most appropriate. I can time events in minutes and seconds, and order the results. I can estimate how long a journey takes. I can measure and record temperatures involving positive and negative readings.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Measurement$seed0$, 4, $seed0$I can represent and use compound measures, using standard units. I can read and interpret scales on a range of measuring instruments. I can demonstrate an understanding of the relationship between a formula representing a measurement and the units used. I can use the common units of measure, convert between related units of the metric system and carry out calculations. I can use rough metric equivalents of imperial units in daily use. I can interpret fractions of a second appropriately. I can use timetables and time zones to calculate travel time. I can convert temperatures between appropriate temperature scales.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Measurement$seed0$, 5, $seed0$I can understand and use a variety of compound measures.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Shape and space$seed0$, 1, $seed0$I can discuss the properties of shapes that I use in my everyday learning.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Shape and space$seed0$, 2, $seed0$I can discuss the properties of two-dimensional and three-dimensional shapes that I use in my everyday learning.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Shape and space$seed0$, 3, $seed0$I can recognise that perimeter is the distance around a shape. I can measure and calculate perimeter. I can find areas by counting squares, progressing to calculating the area of squares and rectangles using formulae. I can use mathematical language to accurately describe two-dimensional and three-dimensional shapes. I can find volumes by counting and other practical methods.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Shape and space$seed0$, 4, $seed0$I can find circumferences of circles using my understanding of π. I can calculate the areas of two-dimensional simple and compound shapes, including circles. I can apply the formulae for the volume of simple prisms.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Shape and space$seed0$, 5, $seed0$I can apply proportional change to two-dimensional designs.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Position$seed0$, 1, $seed0$I can explore movements and directions. I can describe position.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Position$seed0$, 2, $seed0$I can use the language of position. I can use the four compass points to describe directions.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Position$seed0$, 3, $seed0$I can use grid references to specify location. I can use coordinates to find position.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Angle$seed0$, 2, $seed0$I can recognise half and quarter turns, clockwise and anti-clockwise.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Angle$seed0$, 3, $seed0$I can use angle as a measure of rotation.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Angle$seed0$, 4, $seed0$I can measure and draw angles. I can apply understanding of bearings and scale to interpret maps and plans, and to create plans and drawings to scale.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world$seed0$, $seed0$Geometry and measurement$seed0$, $seed0$Angle$seed0$, 5, $seed0$I can measure and draw angles.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Collecting data$seed0$, 1, $seed0$I have collected data found in my environment.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Collecting data$seed0$, 2, $seed0$I can collect information by voting or sorting.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Collecting data$seed0$, 3, $seed0$I can collect relevant data to answer posed questions.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Collecting data$seed0$, 4, $seed0$I can collect own data for a survey, e.g. through designing a questionnaire. I can plan how to collect data to test a simple hypotheses. I can collect both quantitative and qualitative data.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Collecting data$seed0$, 5, $seed0$I can collect data in a suitable way according to my hypothesis.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Representing data$seed0$, 1, $seed0$I can sort and match sets of objects or pictures by recognising similarities and can communicate my choices. I can present work orally, pictorially and in written form, and use a variety of ways to represent collected data. I can use mark-making to begin to record collections.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Representing data$seed0$, 2, $seed0$I can sort and classify objects using more than one criterion. I can present work orally, in objects, pictorially and in written form, and use a variety of ways to represent collected data with suitable scales including: • lists, tally charts, tables and diagrams • bar charts and bar line graphs labelled in 2s, 5s and 10s • pictograms where one symbol represents more than one unit using a key • Venn and Carroll diagrams.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Representing data$seed0$, 3, $seed0$I can select and construct appropriate charts, diagrams and graphs with suitable scales. I can represent data using: • lists, tally charts, tables, diagrams and frequency tables • bar charts, grouped data charts, line graphs and conversion graphs • pictograms where one symbol represents more than one unit using a key • Venn and Carroll diagrams.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Representing data$seed0$, 4, $seed0$I can select and construct appropriate charts, diagrams and graphs with suitable scales. I can construct frequency tables for sets of data in equal class intervals, selecting groups as appropriate. I can construct and interpret graphs and diagrams (including pie charts) to represent discrete or continuous data, choosing an appropriate scale. I can construct graphs to represent data including scatter diagrams to investigate correlation.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Representing data$seed0$, 5, $seed0$I can select and construct appropriate charts, diagrams and graphs with suitable scales.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Interpreting data$seed0$, 1, $seed0$I can interpret information presented in charts and diagrams, and draw appropriate conclusions.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Interpreting data$seed0$, 2, $seed0$I can extract and interpret information presented in charts, timetables, diagrams and graphs. I can draw conclusions from data and recognise that some conclusions may be misleading or uncertain.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Interpreting data$seed0$, 3, $seed0$I can extract and interpret information from an increasing range of diagrams, timetables and graphs (including pie charts). I can draw conclusions from data and recognise that some conclusions may be misleading or uncertain. I can use mean to interpret a simple data set.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Interpreting data$seed0$, 4, $seed0$I can interpret graphs that describe real-life situations, including those used in the media, recognising that some graphs may be misleading. I can interpret mathematical information; drawing inferences from graphs, diagrams and data, including discussion on limitations of data. I can draw conclusions from data and recognise that some conclusions may be misleading or uncertain. I can use mean, median, mode and range to compare data (continuous and discrete), and can choose the most appropriate average. I can explore trends and extreme values (outliers) for data sets. I can examine results critically, select and justify choice of statistics, recognising the limitations of any assumptions and their effect on the conclusions drawn.$seed0$),
  ($seed0$Numeracy Framework$seed0$, $seed0$Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions$seed0$, $seed0$Statistics and probability$seed0$, $seed0$Interpreting data$seed0$, 5, $seed0$I can interpret graphs that describe real-life situations, including those used in the media, recognising that some graphs may be misleading. I can interpret mathematical information; drawing inferences from graphs, diagrams and data, including discussion on limitations of data. I can draw conclusions from data and recognise that some conclusions may be misleading or uncertain.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Translanguaging$seed0$, $seed0$Translanguaging$seed0$, $seed0$Translanguaging$seed0$, 2, $seed0$I am beginning to draw on information presented in one language and convey it in my own words in another.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Translanguaging$seed0$, $seed0$Translanguaging$seed0$, $seed0$Translanguaging$seed0$, 3, $seed0$I can receive information in one language and adapt it for various purposes in another language.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Translanguaging$seed0$, $seed0$Translanguaging$seed0$, $seed0$Translanguaging$seed0$, 4, $seed0$I can apply my translanguaging skills to support my learning in familiar and new languages.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Translanguaging$seed0$, $seed0$Translanguaging$seed0$, $seed0$Translanguaging$seed0$, 5, $seed0$I can independently identify translanguaging opportunities to enhance my learning and communication in my languages.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening for meaning$seed0$, 1, $seed0$I can listen to, understand and use basic concepts in language, e.g. position and comparison. Welsh medium statement: I can show awareness that some sounds change at the beginning of words, e.g. dau gi, y gath.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening for meaning$seed0$, 2, $seed0$I can listen to, understand and infer the gist of what I hear. Welsh-medium statement: I can understand that some words have different forms, e.g. plural forms (car>ceir), verb forms (gweld>gwelais), prepositions (ar hi> arni hi), the question and answer system (Ydy? Ydy/Nac ydy), and mutations.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening for meaning$seed0$, 3, $seed0$I can listen to, understand, infer, interpret and recall the general meaning of what I have heard.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening for meaning$seed0$, 4, $seed0$I can understand and analyse general meaning and implied ideas.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening for meaning$seed0$, 5, $seed0$I can employ a range of strategies to understand, predict and evaluate meaning and implied ideas in a wide range of situations.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Developing vocabulary$seed0$, 1, $seed0$I can discriminate sounds in my environment and in words.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Developing vocabulary$seed0$, 2, $seed0$I can develop and adapt my vocabulary through listening, and use these new words in a variety of situations.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Developing vocabulary$seed0$, 3, $seed0$I can listen to build my vocabulary, develop my pronunciation, intonation/accents and sentence structure, and use these in my own communication. I can listen to, identify and use key words to understand the general meaning and ideas which are implied.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Developing vocabulary$seed0$, 4, $seed0$I can listen to build my vocabulary and sentence structure, and use these in my own communication. I have experienced a range of area of learning and experience/discipline-specific and general academic vocabulary, and can use them in my own communication.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Developing vocabulary$seed0$, 5, $seed0$I have experienced a range of discipline-specific and general academic vocabulary, and can use them precisely in different contexts.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening to understand$seed0$, 1, $seed0$I can listen to others with growing attention. I can recognise and follow information and multi-step instructions pictorially and/or verbally on familiar topics and routines.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening to understand$seed0$, 2, $seed0$I can listen to, understand and recall what I have heard later. I can listen to others and understand that they may have a different perspective to my own. I can listen to and understand information about a variety of topics, identifying main points. I can listen to, understand and respond to a range of questions and multi-step instructions in a variety of familiar and unfamiliar contexts. I can use a variety of cues to predict the general meaning in a variety of familiar and unfamiliar spoken contexts. I can make connections between what I have heard/seen and what I know.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening to understand$seed0$, 3, $seed0$I can listen to others’ ideas/presentations, and understand that they may have a different perspective to my own, in order to respond appropriately. I can listen to and understand information about a variety of topics, summarising the main points. I can use techniques to remember the main points of presentations, e.g. make notes, summarising, reviewing.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening to understand$seed0$, 4, $seed0$I can listen to gain different people’s views and ideas on various subjects, using them to arrive at my own conclusions. I can listen to information and ideas, and identify and explain how they are presented to promote a particular viewpoint (bias and objectivity). I can listen to and consider the relevance and significance of information and ideas presented to me. I can use different techniques to help me remember, record and respond to what I hear.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening to understand$seed0$, 5, $seed0$I can listen to, critically evaluate and respect different people’s perspectives, using them to arrive at my own considered conclusions. I can listen to a range of information and ideas from different perspectives, analysing and evaluating how different speakers present specific points of view. I can listen to and consider the relevance and significance of information and ideas presented to me. I can use different techniques to help me remember, record and respond to what I hear.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening as part of collaborative talk$seed0$, 1, $seed0$I am beginning to ask and answer questions to clarify my understanding of what has been said/heard/seen (including audio-visual material). I can join in with, repeat or memorise familiar songs, rhymes, stories and poems.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening as part of collaborative talk$seed0$, 2, $seed0$I can check understanding of what I have heard/seen (including audio-visual material) by asking relevant questions or making relevant comments. I can listen to group talk and interactions purposefully to contribute to group discussion.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening as part of collaborative talk$seed0$, 3, $seed0$I can listen to and respond to others with questions and comments which focus on reasons, implications and next steps. I can listen in order to show agreement and disagreement in collaborative discussion and situations.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening as part of collaborative talk$seed0$, 4, $seed0$I can listen to and respond to others with questions, comments and suggestions in order to develop collaborative talk and reach compromise/consensus.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Listening$seed0$, $seed0$Listening$seed0$, $seed0$Listening as part of collaborative talk$seed0$, 5, $seed0$I can respond with confidence and sensitivity to the ideas of others in different collaborative situations, reflecting on information and ideas and asking relevant questions.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Reading$seed0$, $seed0$Reading$seed0$, $seed0$Phonological and phonemic awareness$seed0$, 1, $seed0$I can discriminate, play and manipulate sounds in my environment and in words. I can use rhythm, rhyme, alliteration, syllables, and onset and rime to learn to read. I am beginning to discriminate phonemes aurally in different positions, e.g. initial sounds, medial vowels, final sounds in spoken words. I am beginning to develop my knowledge of grapheme (written letters)–phoneme (speech sounds) correspondence. I am beginning to blend phonemes together aloud. I can articulate phonemes when I see the corresponding graphemes.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Reading$seed0$, $seed0$Reading$seed0$, $seed0$Phonological and phonemic awareness$seed0$, 2, $seed0$I can blend phonemes together automatically and silently. I can use grapheme–phoneme correspondences when reading.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Reading$seed0$, $seed0$Reading$seed0$, $seed0$Reading strategies$seed0$, 1, $seed0$I can show an interest in books and other reading materials, and enjoy sharing and handling them as a reader, e.g. hold books the correct way up and turn pages. I can segment combinations of known letters orally. I can understand there is a one-to-one relationship between the printed and spoken word. I am beginning to recognise and read high-frequency words. I can recognise familiar words, e.g. own name, and print in the environment.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Reading$seed0$, $seed0$Reading$seed0$, $seed0$Reading strategies$seed0$, 2, $seed0$I can select my own reading material according to interest or purpose. I can read different texts using a range of strategies to make meaning, including: • phonics • word roots and families • sentence structure and punctuation • text structure and organisation • prior knowledge of content and context. I can use a range of strategies to read with increasing fluency, including recognition of high-frequency words, context cues, prior knowledge, graphic and syntactic cues and self-correction (re-reading and reading ahead). I can deduce ideas and information by linking explicit statements, e.g. cause and effect, sequence. I can infer meaning from text and images, which is not explicitly stated, e.g. What might happen next? Why did the character do that?$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Reading$seed0$, $seed0$Reading$seed0$, $seed0$Reading strategies$seed0$, 3, $seed0$I can read complex texts independently for sustained periods. I can read words and sentences from different texts using a range of strategies to make meaning. I can use a range of strategies to make meaning from words and sentences, including: • knowledge of phonics • word roots • word families • syntax • text organisation • prior knowledge of context. I can use a range of strategies for finding information, e.g. skimming for gist, scanning for detail. I can use inference and deduction to understand the text, and can consider the reliability of what I read. I can infer ideas which are not explicitly stated, e.g. writer’s viewpoints or attitudes.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Reading$seed0$, $seed0$Reading$seed0$, $seed0$Reading strategies$seed0$, 4, $seed0$I can read, with concentration, printed and digital texts that are new to me and update, broaden and deepen my understanding of information, ideas and issues. I can use my knowledge of: • word roots and families • grammar, sentence and whole-text structure • content and context to make sense of words, sentences and whole texts. I can use a range of strategies, e.g. speed reading, close reading, annotation, prediction, to skim texts for gist, key ideas and themes, and scan for detailed information. I can use inference and deduction to understand more complex texts, and can consider the reliability and impact of what I read. I can gain a full understanding of texts using inference, deduction and analysis.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Reading$seed0$, $seed0$Reading$seed0$, $seed0$Reading strategies$seed0$, 5, $seed0$I can read and analyse a range of unseen, printed and digital texts with concentration and independence. I can use my knowledge of: • word roots and families • grammar, sentence and whole-text structure • content and context to make sense of words, sentences and whole texts. I can use a range of strategies, e.g. speed reading, close reading, annotation, prediction, to skim texts for gist, key ideas and themes, and scan for detailed information, extracting and commenting maturely on key ideas and themes. I can gain full understanding of texts using inference, deduction and analysis, understanding the context of the texts that influence the reader. I can analyse and respond to texts and sub-texts, confidently understanding, interpreting and evaluating meaning.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Reading$seed0$, $seed0$Reading$seed0$, $seed0$Understanding, response and analysis$seed0$, 1, $seed0$I am beginning to read back my own writing. I am beginning to show an awareness of full stops when reading. I can use context and pictures to help me understand what I read, adding detail to my explanations. I can develop my vocabulary through reading, and use these new words in a variety of situations. I can respond to what I hear, view and read. I can recall details of a story or text by answering open-ended questions or referring to prompts. I have experienced a range of different reading materials and literature, and I can follow texts read to me and respond appropriately. I can choose different types of reading materials, including books. I can relate information and ideas from reading material and literature to personal experiences. I can talk about the literature I hear, view or read, and express simple opinions and respond to their content.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Reading$seed0$, $seed0$Reading$seed0$, $seed0$Understanding, response and analysis$seed0$, 2, $seed0$I can read aloud with expression, paying attention to punctuation, including full stops, question marks, exclamation marks and speech marks, varying intonation, voice and pace. I can identify the topic/theme and show my understanding of the main ideas of the text. I can develop my vocabulary through my own reading and being read to. I can respond to what I view and read, asking questions and expressing viewpoints and preferences. I can find and use information from different materials that I read, including skimming to gain an overview of a text and scanning to identify specific information. I can recognise the features of different types of text in terms of language, structure and presentation, and use appropriate language to talk about them, e.g. a news article. I can use the features of texts to look for information, including contents, indexes, glossaries, titles, photographs, illustrations, diagrams, tables and charts. I can identify the purposes and intended audiences of different texts, e.g. to instruct, to explain. I can identify how texts are organised, e.g. lists, numbered points, diagrams with arrows, tables and bullet points. I can make links between what I read and what I already know and believe about the topic. I can make links between different types of reading material and literature, e.g. identifying similarities and differences. I can understand that texts change when they are adapted for different media and audiences, e.g. a written text and a film version. I can use my imagination to respond to literature and create my own.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Reading$seed0$, $seed0$Reading$seed0$, $seed0$Understanding, response and analysis$seed0$, 3, $seed0$I can read a wide range of texts aloud with expression, varying intonation, voice and pace. I can understand how punctuation can vary and so affect sentence structure and meaning, e.g. I had an apple, cracker and cheese for tea. I can identify ideas and information that interest me to develop further understanding. I can read to build my vocabulary and develop sentence structures, and use these in my own communication. I can read to identify different people’s viewpoints on various subjects and develop empathy. I can distinguish between facts, theories and opinions. I can show understanding of and use the main ideas and significant details in different texts on the same topic. I can read closely, identifying and noting features of texts, e.g. introduction, sequence, illustrations, formality, key vocabulary. I can use my knowledge of language construction and text organisation to support my understanding. I can use my understanding of different kinds of texts to consider whether a text is effective in conveying information, ideas and views. I can make use of reference/digital sources to select, summarise and synthesise information, referencing as appropriate. I can collate and make connections, e.g. prioritising, categorising, between information and ideas from different sources including digital and audio-visual texts.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Reading$seed0$, $seed0$Reading$seed0$, $seed0$Understanding, response and analysis$seed0$, 4, $seed0$I can read a range of challenging and authentic texts aloud with expression, varying intonation, voice and pace to convey meaning. I can research a wide range of reference and digital sources to develop a full understanding of a topic or issue. I can read to build my vocabulary and develop sentence structures, and use these effectively in my own communication. I can read to identify different people’s viewpoints on various subjects, using them to arrive at my own conclusions. I can distinguish between facts/evidence and bias/arguments. I can identify different interpretations of text and information and evaluate their relative merits. I can read closely, follow up and use additional material in texts to extend my understanding. I can use my knowledge of how different texts are structured, organised and linked to support my understanding of a topic, e.g. use of hyperlinks in a printed/digital text to extend my research and understanding. I can evaluate the usefulness and reliability of texts. I can summarise, synthesise and analyse information to gain in-depth understanding, e.g. of causes, consequences, patterns, using different sources. I can compare the viewpoint of different writers on the same topic, e.g. rats are fascinating or a menace. I can compare and contrast themes and issues across a range of texts including digital and audio-visual texts.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Reading$seed0$, $seed0$Reading$seed0$, $seed0$Understanding, response and analysis$seed0$, 5, $seed0$I can read a range of challenging and authentic texts aloud with expression, varying intonation, voice and pace to convey meaning. I can independently research a wide range of sources to develop an understanding of an increasingly complex topic or issue. I can use my knowledge of different reading strategies to make sense of unfamiliar words in new contexts and sentences in complex texts, and apply these in my own communication. I can read empathetically to respect and critically evaluate different people’s perspectives, using them to arrive at my own considered conclusions. I can understand and explore in detail how texts may be interpreted, distinguishing between facts/evidence and bias/arguments. I can explore in detail different interpretations of issues and ideas, using the text/a range of sources to support opinions. I can read closely, analysing the content, language and impact of texts to deepen my understanding. I can use printed and digital texts to search selectively, assessing the reliability, significance and accuracy of what I find. I can confidently evaluate the purpose, impact and reliability of texts. I can synthesise and analyse information to gain a broad and balanced understanding from sources which may have conflicting views. I can confidently compare and contrast themes and ideas in a range of texts, including digital and audio-visual texts, exploring how they vary in purpose and effect.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Clarity and vocabulary$seed0$, 1, $seed0$I can produce many speech sounds accurately. I can discriminate sounds, play with sounds and manipulate sounds in my environment and in words. I can use familiar words and phrases and experiment with newly learned vocabulary. I can communicate meaning using extended speech and/or gesture.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Clarity and vocabulary$seed0$, 2, $seed0$I can speak clearly, varying expression and gestures to communicate my ideas and help listeners. I can develop and adapt my vocabulary through listening and reading, and use these new words in a variety of situations. I can communicate using an increasingly varied and precise vocabulary. I can vary the types of sentences I use in my spoken language. Welsh-medium statement: I can identify the sounds that often change at the beginning of words and apply those changes in some mutatable contexts, e.e. yn gyflym, digon o le.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Clarity and vocabulary$seed0$, 3, $seed0$I can speak clearly, recognising the appropriate language for different audiences and purposes, and varying my expression, vocabulary, tone and gestures to engage the audience. I can reflect on the quality of my expression and use a range of strategies to ensure greater clarity in my spoken communication, including in formal situations. I can make appropriate choices about vocabulary, idiomatic language and syntax in order to express myself with fluency and clarity. I can express issues and ideas clearly using area of learning and experience/discipline-specific vocabulary and examples. Welsh-medium statement: I can identify when a word has undergone mutation, and can apply those same changes in many obligatory contexts, including: • soft mutation after ‘ei’ masculine, e.g. ei goes ef, and after numerous prepositions • soft mutation (but not ll or rh) when a noun or an adjective follows ‘yn’, e.g. yn gyflym • nasal mutation after ‘fy’, e.g. fy nghoes i, and after the spatial preposition ‘yn’, e.g. yng Nghaerffili • aspirate mutation after ‘ei’ feminine, e.g. ei choes hi, and for nouns with human referents.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Clarity and vocabulary$seed0$, 4, $seed0$I can speak clearly, selecting and adapting my language appropriately for a range of audiences and purposes, conveying meaning effectively to the audience. I can convey meaning convincingly in a range of contexts so that the audience is fully engaged. I can reflect on my use of strategies to improve the quality, accuracy and effects of my spoken communication, including in formal situations. I can make informed choices about vocabulary, idiomatic language and syntax in order to express myself with fluency, accuracy and clarity. I have experienced a range of area of learning and experience/discipline-specific and general academic vocabulary, and can use them in my own communication. Welsh-medium statement: I can identify the use of mutations, and recognise omissions and/or the use of the inappropriate mutation type when another type is expected. Welsh-medium statement: I can begin to mark feminine nouns for inanimate objects and non-human referents through mutation, e.g. ysgol gynradd (ysgolion cynradd), cadair goch (cadeiriau coch).$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Clarity and vocabulary$seed0$, 5, $seed0$I can speak fluently and confidently, using a range of techniques, expressions and gestures. I can present ideas and issues to meet the demands of different audiences. I can reflect critically on my language use and consider the effects of my spoken communication objectively. I can use a range of discipline-specific and general academic vocabulary in my own communication. I can use sophisticated idiomatic language and appropriate register in a range of contexts. Welsh-medium statement: I can identify the various uses of mutation and apply all three processes (soft mutation, nasal mutation and aspirate mutation) in a wide range of mutatable contexts. Welsh-medium statement: I can show a continued development in my ability to mark gender through mutation where appropriate, e.g. the noun itself (y gath), associated adjectives (y gath fach, lwyd), and in agreement patterns involving distant reference, e.g.Cafodd y gath fach, lwyd, ei chipio o’i chynefin. Druan ohoni.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Purpose$seed0$, 1, $seed0$I can share ideas and feelings and express what I like and dislike. I can understand and use basic concepts in language, e.g. up/down, more/less, happy/sad. I can express interest and enjoyment. I can retell events or experiences in simple terms. I can describe objects and events, building and extending vocabulary. I am beginning to use appropriate language to talk about events in the past and future.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Purpose$seed0$, 2, $seed0$I can explain information and share ideas, opinions and feelings using relevant vocabulary. I can use spoken language/ communicate for different purposes, e.g. to explain, persuade, question and negotiate. I can organise what I say so that listeners can understand, e.g. emphasising key points, sequencing an explanation.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Purpose$seed0$, 3, $seed0$I can share, talk and write about my thoughts, feelings and opinions using a range of techniques to show impact. I can organise talk so that different audiences in different contexts can follow what is being said, including using formal language.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Purpose$seed0$, 4, $seed0$I can share, talk and write about my thoughts, feelings and opinions showing empathy and respect. I can organise talk effectively to respond to how listeners are reacting by adapting what I say and how I say it.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Purpose$seed0$, 5, $seed0$I can share, talk and write about my thoughts, feelings and opinions in increasingly challenging and contentious contexts. I can organise talk effectively to critically evaluate and respond to what I have heard, read or seen.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Collaborative talk$seed0$, 1, $seed0$I am beginning to take turns in a conversation, following the topic. I am beginning to talk with my peers in the language of the setting/school.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Collaborative talk$seed0$, 2, $seed0$I can use talk purposefully to contribute to group discussion sharing ideas and information. I can adopt a range of roles and manage my contributions appropriately. I have experienced speaking with different people in a variety of authentic contexts. I can change how I communicate depending on where I am and who I am with, including formal situations.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Collaborative talk$seed0$, 3, $seed0$I can contribute to group discussion in different roles, taking responsibility for completing the task well. I have experienced speaking with different people in a variety of authentic contexts. I can explore challenging or contentious issues through a variety of authentic contexts, including sustaining a role.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Collaborative talk$seed0$, 4, $seed0$I can undertake a range of responsibilities to structure and develop group talk, including in more formal situations. I can recognise a range of options for action and reach agreement to achieve the aims of the group. I have experienced speaking with different people in a variety of authentic contexts. I can use talk in a range of authentic contexts to explore challenging or contentious issues.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Collaborative talk$seed0$, 5, $seed0$I can use a range of options and strategies to enable the group to progress and reach consensus. I can respond confidently to how listeners react, adapting my language in a wide range of contexts and for different purposes. I have experienced speaking with different people in a variety of authentic contexts. I can confidently and consistently explore challenging or contentious issues through sustaining roles in formal situations, contexts and purposes. I can present ideas and issues to meet the demands of different audiences.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Questioning$seed0$, 1, $seed0$I am beginning to ask and answer questions to clarify my understanding.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Questioning$seed0$, 2, $seed0$I can ask and answer questions and exchange ideas and information on topics (familiar to new). I can express opinions, giving reasons, and provide appropriate answers to questions.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Questioning$seed0$, 3, $seed0$I can ask and answer questions, building on and developing the ideas of others in group discussions. I can respond to others’ points of view by seeking clarity, summarising and explaining what I have heard, read or seen.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Questioning$seed0$, 4, $seed0$I can sustain a convincing point of view, anticipating and responding to other perspectives. I can respond to others’ points of view with confidence and sensitivity, summarising and evaluating what I have heard, read or seen.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Speaking$seed0$, $seed0$Speaking$seed0$, $seed0$Questioning$seed0$, 5, $seed0$I can speak from a range of convincing perspectives to meet the demands of different situations, contexts and purposes. I can respond to others’ points of view using a range of techniques, e.g. rhetorical questions, gestures. I can make informed choices to enhance my communication skills.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Vocabulary, spelling, grammar$seed0$, 1, ($seed0$I can communicate by making marks, drawing symbols or writing letters and words in a range of contexts. I am beginning to sequence symbols, signs or words appropriately. I can recognise the alphabetic nature of writing and understand that written symbols have meaning. I can write from left to right. I can discriminate between letters. I can distinguish between upper- and lower-case letters. I can form letters. I can write words and phrases by using knowledge of letters and the sounds they represent. I can segment words into syllables and sounds to help me spell. I am beginning to write using$seed0$ || $seed0$ familiar words and phrases. I am beginning to form letters correctly using an appropriate grip. Welsh-medium statement: I can show awareness that some letters change at the beginning of words, e.g. dau gi, y gath.$seed0$)),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Vocabulary, spelling, grammar$seed0$, 2, $seed0$I can write using an increasingly imaginative, varied and precise vocabulary. I can use standard forms of language, including standard forms of verbs, e.g. I see/he saw, I go/he went, and subject–verb agreement, e.g. I was/we were. I can use my knowledge of letter sounds and patterns accurately in my spelling, including: • consonant–vowel–consonant • common digraphs, e.g. th, ck • simple roots, e.g. tele, sub, fair • suffixes, e.g. -ly, -ation, -ous • plural forms correctly in context, e.g. -s, -es, -ies • past tense of verbs consistently, e.g. consonant doubling before -ed. I can attempt to spell more difficult words plausibly using a range of strategies, including: • word families • roots • morphology • graphic knowledge • phonic knowledge, e.g. segmenting a word into its individual phonemes. I can spell high-frequency irregular words correctly. I can write legibly. Welsh-medium statement: I can identify the letters that often change at the beginning of words and apply those changes in some mutatable contexts. Welsh-medium statement: I can form plural versions of concrete, familiar nouns. Welsh-medium statement: I can spell some words applying the appropriate vowel y/u/I, e.g. tyˆ, llun, and diphthongs, e.g. coed.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Vocabulary, spelling, grammar$seed0$, 3, $seed0$I can use varied, appropriate and precise vocabulary including area of learning and experience/discipline-specific words for different purposes. I can make appropriate choices about vocabulary, idiomatic language and syntax in order to express myself with fluency and clarity for different audiences and purposes. I can use language appropriate to writing, including standard forms, e.g. nouns, pronouns, adjectives, adverbs, prepositions, connectives and verb tenses. I can use the standard form of a variety of words, e.g. present, past and negative forms. I can use my knowledge of letter sounds and patterns accurately in my spelling, including: • roots, e.g. light, geo, appear • suffixes, e.g. -able, -cious/tious, -ful • plural forms correctly in context, e.g. -s, -es, -ies. I can use strategies to correctly spell polysyllabic, complex and irregular words in the context of each area of learning and experience. I can write legibly and fluently. I can present my work appropriately in digital contexts. Welsh-medium statement: I can apply mutations in many obligatory contexts, including: • soft mutation after ‘ei’ masculine, e.g. ei goes ef, and when nouns and adjectives follow ‘yn’, e.g. yn gyflym • nasal mutation after ‘fy’, e.g. fy nghoes i, or special preposition ‘yn’, e.g. yng Nghaerffili • aspirate mutation after ‘ei’ feminine, e.g. ei choes hi, and for nouns with human referents. Welsh-medium statement: I can form plurals, e.g. by adding a suffix (merch>merched), changing the stem (bachgen>bechgyn), a combination of both (braich>breichiau) and removing a suffix (coeden>coed). Welsh-medium statement: I can switch between vowels and diphthongs appropriately while modifying words for meaning changing between singular and plural or marking feminine noun gender with a feminine adjective, e.g. taflen werdd, cath wen.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Vocabulary, spelling, grammar$seed0$, 4, $seed0$I have experienced a range of area of learning and experience/discipline-specific and general academic vocabulary, and can use them in my own communication. I can make informed choices about vocabulary, idiomatic and figurative language, and syntax in order to express myself with fluency, accuracy and clarity. I can use a variety of strategies and resources to spell familiar and unfamiliar vocabulary and area of learning and experience/discipline-specific words correctly. I can write legibly and fluently. I can present my work appropriately in digital contexts using appropriate digital conventions, e.g. thumbnails, language preferences. Welsh-medium statement: I can identify the use of mutations, and recognise omissions in obligatory contexts, and/or the use of the inappropriate mutation type when another type is expected. Welsh-medium statement: I can mark feminine nouns for inanimate objects and non-human referents through mutation, e.g. ysgol gynradd (ysgolion cynradd), cadair goch (cadeiriau coch). Welsh-medium statement: I can produce the appropriate form of plural with the appropriate vowel/diphthong change, e.g. car>ceir. Welsh-medium statement: I can write grammatically accurate sentences with attention to conjugated verbs, verb tense, and person correspondence and gender agreement.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Vocabulary, spelling, grammar$seed0$, 5, ($seed0$I can use a range of discipline-specific and general academic vocabulary accurately and precisely. I can use sophisticated idiomatic language and appropriate register in a range of contexts. I can use strategies to spell discipline-specific and general academic words in appropriate contexts. I can understand and use$seed0$ || $seed0$ formal conventions of language in a range of purposes, making effective use of reference tools and accuracy aids. Welsh-medium statement: I can identify the various uses of mutation and apply all three processes (soft mutation, nasal mutation and aspirate mutation) in a wide range of mutatable contexts. Welsh-medium statement: I can show a continued development in my ability to mark gender through mutation where appropriate both on the noun, e.g. the noun itself (y gath), associated adjectives (y gath fach, lwyd), and in agreement patterns involving distant reference, e.g. Cafodd y gath fach, lwyd, ei chipio o’i chynefin. Druan ohoni. Welsh-medium statement: I can write grammatically accurate sentences conjugating prepositions, and ensuring verb tense and person correspondence and gender agreement.$seed0$)),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Connectives and syntax$seed0$, 2, $seed0$I can compose single and multi-clause sentences, making choices to meet the intended audience and purpose, including: • connectives to expand a point • connectives to write compound sentences • connectives for causation and consequence, e.g. because, after • starting sentences a variety of ways • adjectives and adverbs.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Connectives and syntax$seed0$, 3, $seed0$I can use simple, compound and complex sentence structures for emphasis and effect. I can use an increasing range of connectives to organise my ideas in sentences, paragraphs and whole texts.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Connectives and syntax$seed0$, 4, $seed0$I can select and use a variety of different sentence structures (simple, compound and complex sentences) with grammatical accuracy in my writing. I can use a range of connectives specifically when organising my ideas in whole texts for different purposes.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Connectives and syntax$seed0$, 5, $seed0$I can show sustained awareness of different readers by selecting from a range of styles and structures, and adapting my use of language confidently. I can vary sentence structures to engage and sustain the reader’s interest and write with grammatical accuracy.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Punctuation$seed0$, 1, $seed0$I have an awareness of how words are separated by spaces. I am beginning to have an awareness of how capital letters and full stops demarcate sentences.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Punctuation$seed0$, 2, $seed0$I can use familiar punctuation, including capital letters, full stops, question marks, exclamation marks, commas for lists, and apostrophes for omission. I can begin to use commas to mark clauses and phrases, e.g. after a fronted adverbial ‘Later that morning, we visited the castle’.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Punctuation$seed0$, 3, $seed0$I can use a range of punctuation accurately (including apostrophe for possession) to clarify and expand meaning.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Punctuation$seed0$, 4, $seed0$I can use the full range of punctuation accurately (including colons, semicolons and parenthesis) to clarify, organise and expand meaning.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Punctuation$seed0$, 5, $seed0$I can use the full range of punctuation in order to vary pace, clarify meaning, avoid ambiguity and create deliberate effects.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Planning and organising for different purposes, audiences and context$seed0$, 1, $seed0$I am beginning to understand that writing can be for different purposes and audiences. I can respond creatively to the range of literature I hear, view or read. I am beginning to communicate using text, image, sound, animation and video. I can contribute to shared writing for different audiences and purposes.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Planning and organising for different purposes, audiences and context$seed0$, 2, $seed0$I can write for different purposes and authentic audiences, real or imagined. I can use talk to plan writing and note down my ideas to use in writing. I can organise my writing into a logical sequence, e.g. write using an introduction to the topic and a conclusion, present information as a process, use ordering words. I can begin to structure my writing using paragraphs.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Planning and organising for different purposes, audiences and context$seed0$, 3, $seed0$I can adapt my writing style and structure to suit the audience, purpose and context, e.g. suitable balance between facts and viewpoints, a precise conclusion. I can write a comprehensive account of a topic, theme or viewpoint. I can use and adapt different structures within my writing, e.g. reporting an event, investigation or experiment. I can write about my thoughts, feelings and opinions, showing empathy and respect. I can explore different ways to plan, draft and present my work appropriately. I can write an effective introduction that establishes context and purpose, a suitable balance between facts and viewpoints, and a precise conclusion. I can use paragraphs and make links between them.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Planning and organising for different purposes, audiences and context$seed0$, 4, $seed0$I can adapt my writing style, choosing and using the best structures for different contexts and purposes, e.g. to successfully describe, explain, persuade, discuss. I can use summary, discussion of issues, detailed explanations and logic when covering a topic. I can write about my thoughts, feelings and opinions using a range of techniques, e.g. emotive language, hyperbole, choice of pronouns (you, we), to show impact. I can select and use appropriate strategies to plan and develop my writing for different purposes and audiences. I can organise and construct my writing effectively, connecting and developing my ideas for a range of different contexts. I can use paragraphs and sections to give coherence to longer pieces of writing.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Planning and organising for different purposes, audiences and context$seed0$, 5, $seed0$I can write extended pieces which include detailed evidence and information for different purposes and audiences within and across different disciplines. I can summarise confidently, adapting style and form for the reader or intended audience and purpose for writing. I can write with maturity about my thoughts, feelings and opinions in increasingly challenging and contentious contexts. I can convey objectivity and impartiality on complex topics, using a range of linguistic devices. I can select and use appropriate strategies to plan and develop my writing for a challenging range of different purposes and audiences. I can organise writing in an appropriate form, ensuring content is detailed within and between paragraphs or sections, developing and sustaining ideas coherently.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Proofreading, editing and improving$seed0$, 2, $seed0$I can read over my work and am beginning to use a range of familiar strategies and tools to improve my writing. I can explain where and why I have made any changes or corrections.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Proofreading, editing and improving$seed0$, 3, $seed0$I can reflect on, edit and redraft to improve the quality of my expression, and use a range of strategies to ensure greater clarity.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Proofreading, editing and improving$seed0$, 4, $seed0$I can improve writing through independent review and redrafting.$seed0$),
  ($seed0$Literacy Framework$seed0$, $seed0$Writing$seed0$, $seed0$Writing$seed0$, $seed0$Proofreading, editing and improving$seed0$, 5, $seed0$I can improve the content, structure and accuracy of my writing through critical reflection, review and editing, responding constructively to feedback.$seed0$)
) as d(framework_name, strand_name, strand_short_name, element_name, progression_step, descriptor_text)
  on d.framework_name = f.name
 and d.strand_name = s.name
 and coalesce(d.strand_short_name, '') = coalesce(s.short_name, '')
 and d.element_name = e.name
where f.name in ('Literacy Framework', 'Numeracy Framework')
  and nullif(trim(d.descriptor_text), '') is not null
on conflict (element_id, progression_step) do update
  set descriptor_text = excluded.descriptor_text,
      display_order = excluded.display_order,
      active = true;

insert into public.progression_descriptors (school_id, element_id, progression_step, descriptor_text, display_order, active)
select e.school_id, e.id, d.progression_step, d.descriptor_text, d.progression_step, true
from public.elements e
join public.strands s on s.id = e.strand_id
join public.frameworks f on f.id = s.framework_id
join (
  values
  ('Identity, image and reputation', 3, $dcf$I can understand how to protect myself from online identity theft, e.g. identifying secure sites, phishing, scam websites. I can identify the benefits and risks of mobile devices broadcasting the location of the user/device. I can think critically about infomation shared online, e.g. the impact of sharing images and videos, metadata of images and videos. I can identify the benefits and risks of giving personal information and device access to different software.$dcf$),
  ('Identity, image and reputation', 4, $dcf$I can understand that I have a digital footprint and that this information can be searched, copied and passed on. I can discuss the benefits and risks of presenting myself in different ways online. I can use strategies for guarding myself against identity theft and online scams that try to access my personal information.$dcf$),
  ('Identity, image and reputation', 5, $dcf$I can build a positive reputation in the context of employment prospects, e.g. use social media responsibly. I can explain the ethical issues of corporate encryption, e.g. building in a bypass system. I can identify and describe the data protection policies of a variety of organisations located in different countries, and how this affects the way that they work. I can recognise the risks and the uses of data/services on personal devices, within the terms and conditions of a range of software and web services, and identify how organisations become data compliant when using multi-national products.$dcf$),
  ('Health and well-being', 3, $dcf$I can understand the importance of balancing game and screen time with other parts of my life, e.g. explore the reasons why I might be tempted to spend more time playing games or find it difficult to stop playing and the effect this has on my well-being. I can identify the wider positive and negative influences of technology, e.g. on my life, on society, on the environment. I can identify marketing elements designed to draw my attention.$dcf$),
  ('Health and well-being', 4, $dcf$I can reflect on the role of digital media in my life and habits. I can demonstrate healthy online behaviours and identify unacceptable behaviour. I can identify ways of reporting unacceptable online behaviour. I can identify stereotypes and their impact in a range of media. I can make informed choices while making online choices, including making in-app purchases and clicking on adverts.$dcf$),
  ('Health and well-being', 5, $dcf$I can think critically about the different purposes and contexts of digital image editing, e.g. explore the benefits and negative points of photograph manipulation, evaluate digitally edited images in terms of context and purpose. I can take reasonable steps to avoid health problems caused by the use of technology and suggest strategies to prevent or reduce the problems, both physical and psychological. I can understand the legal responsibilities for disposal of technology and the environmental impact of doing so.$dcf$),
  ('Digital rights, licensing and ownership', 3, $dcf$I can understand that copying the work of others and presenting it as my own is plagiarism. I can cite sources when researching and explain the importance of this, e.g create simple lists for the referencing of digital and offline sources. I can understand that images can be edited digitally and can discuss rights and permissions associated with this.$dcf$),
  ('Digital rights, licensing and ownership', 4, $dcf$I can understand copyright and can explain the legal and ethical dimensions of respecting creative work, e.g. exploring the ethical and legal ramifications of piracy and plagiarism and know that they are irresponsible and disrespectful,and I can apply my understanding of the rules and regulations to different scenarios. I can act responsibly as creator and user of creative work, e.g. exploring decisions that creators make when exercising their creative rights and responsibilities, giving consideration to ethical, real-life issues.$dcf$),
  ('Digital rights, licensing and ownership', 5, $dcf$I can identify the key points required for creative work to be considered fair use and comply with data protection laws by exploring the legal and ethical considerations involved in using the creative work of others. I can understand and reflect on the differences between taking inspiration from the creative work of others and appropriating that work without permission. I can understand individuals' rights and responsibilities as creators and consumers of content, and I can think critically and make ethical decisions about the use of creative works in relation to fair use and reference using formal citation conventions, e.g. Harvard and Oxford. I can understand the legal and ethical debates that surround using other people’s creative work; and I consider the points of view of the original creator, potential audiences, and the broader community when using materials belonging to others.$dcf$),
  ('Online behaviour and online bullying', 3, $dcf$I can demonstrate appropriate online behaviour and apply a range of strategies to protect myself and others from possible online dangers, bullying and inappropriate behaviour, e.g. turn off comments on digital media, reporting, block users. I can understand the risks and legal consequences of sending intimate images and content/sexting. I can recognise language that could be deemed to be offensive (including racist, sexist, homophobic and transphobic language) in online activities.$dcf$),
  ('Online behaviour and online bullying', 4, $dcf$I can act appropriately online, keeping myself safe and behaving in a responsible manner. I can understand the implications of online actions, including my digital footprint and the legal implications of sharing inappropriate material. I can understand that photographs, locations and tags can be tracked and can make informed decisions accordingly.$dcf$),
  ('Online behaviour and online bullying', 5, $dcf$I can apply appropriate strategies to protect the rights, identity, privacy and emotional safety of both myself and others in online communities. I can continuously evaluate online behaviour, taking into consideration the consequences of actions; take action to minimise risk to safety and security; consider global and cultural perspectives and adapt behaviour accordingly.$dcf$),
  ('Communication', 3, $dcf$I can exchange online communications, making use of a growing range of available features, e.g. add attachments or hyperlinks, change formatting. I can show an understanding of the advantages and disadvantages of different forms of communication and when it is appropriate to use each, e.g. explain when video conferencing may be more appropriate than e-mail, and vice versa; explain the pros and cons of using instant messaging in social contexts; talk about purpose and audience.$dcf$),
  ('Communication', 4, $dcf$I can select and use different online communication tools for specific purposes with higher levels of competence, e.g. set up and manage an address book, organise contacts, use advanced features of e-mail provider (signature, auto reply, read receipt, widgets).$dcf$),
  ('Communication', 5, $dcf$I can make use of and reflect on available online communication services for specific purposes, justifying selections made based on their appropriateness for delivery of information. I can use mail merge for a relevant purpose to combine data from multiple sources.$dcf$),
  ('Collaboration', 3, $dcf$I can work with others to create an online collaborative project for a specific purpose, sharing and appropriately setting permissions for other group members, e.g. editing, commenting, viewing.$dcf$),
  ('Collaboration', 4, $dcf$I can independently select and use a range of online collaboration tools to create a project with others in one or more languages, e.g.making use of online technology to share and present ideas to others.$dcf$),
  ('Collaboration', 5, $dcf$I can reflect on choices of collaboration solutions, use them appropriately and comment on how this could be improved to meet aims of tasks.$dcf$),
  ('Storing and sharing', 3, $dcf$I can create and share hyperlinks to local, network and online files. I can manage files and folders locally or online, e.g. move files to a folder. I can search for specific files. I can upload files from a local drive to online storage.$dcf$),
  ('Storing and sharing', 4, $dcf$I can use appropriate advanced file management techniques, e.g. version history, restore previous version, tagging, compression. I can show an awareness of simple encryption and its purpose, e.g. to send sensitive data more securely. I can manage links to files, taking permissions and file locations into account, e.g. some file storage systems will utilise dynamic hyperlinks so that if a file location is changed the links remain intact, whereas changing file location could result in a broken hyperlink.$dcf$),
  ('Storing and sharing', 5, $dcf$I can use online services to share appropriate content with a global audience, e.g. uploading content to public websites to share with specific audiences. I can make informed choices about file types and understand compatibility issues, e.g. the difficulties of editing PDFs, differences between sound files.$dcf$),
  ('Sourcing, searching and planning digital content', 3, $dcf$I can independently create and plan work before beginning a digital task. I can adjust keywords and search techniques to find relevant information. I can begin to reference sources used in my work, and consider if content is reliable. I can store search results for future use, e.g. bookmark, add to favourites.$dcf$),
  ('Sourcing, searching and planning digital content', 4, $dcf$I can select and effectively use a variety of planning techniques. I can search a variety of sources using relevant search techniques with increased complexity. I can independently use a range of complex searches, e.g. and/or/+/-/not. I can evaluate the reliability of sources of information, justify my opinions and reasons for choices, and reference using appropriate methods.$dcf$),
  ('Sourcing, searching and planning digital content', 5, $dcf$I can plan my digital work effectively and with increasing complexity. I can consider the benefits and limitations of digital tools and information sources and of the results I produce and use these results to inform future judgements about the quality of my digital work. I can search efficiently for information for my digital work and evaluate the reliability of sources of information, justifying opinions and reasons for choices, and I can reference work using appropriate methods.$dcf$),
  ('Creating digital content', 3, $dcf$I can use a range of software to select, produce and edit a range of multimedia components for a purpose, such as: ● text and images, e.g. format text (bold, underline, italics, highlight); insert and edit text boxes; columns; use refine tools (spellchecker, find and replace); word wrap; crop; alter size and shape; alter images; add effects; trim and split sound and video clips; transitions; onion skin ● presentation, e.g. page orientation; animations; transitions; remove and alter images; use background; use action buttons to create hyperlink; embed objects. I can use keyboard commands such as shortcuts. I can use software tools to enhance the outcomes for specific audiences.$dcf$),
  ('Creating digital content', 4, $dcf$I can select and use a variety of appropriate software, tools and techniques to create, modify and combine multimedia components for a range of audiences and purposes such as: ● text and images, e.g. explore and use effectively image manipulation techniques; explore and use appropriately the many aspects of document layout; use animation, video and audio effects such as echo, tempo, envelope, layering, frame rate, key frames ● presentation, e.g. use design tools; adapt themes and colours to suit the purpose; create master templates. I can explore and develop a range of formal text document structures for different audiences and purposes.$dcf$),
  ('Creating digital content', 5, $dcf$I can use a variety of software, tools and techniques to create a professional, individual or collaborative project outcome incorporating a range of multimedia components. I can create formal text documents for a professional audience, incorporating the use of collaborative review tools into activities. I can use appropriate indexing and referencing tools to enhance documents.$dcf$),
  ('Evaluating and improving digital content', 3, $dcf$I can explain reasons for layout and content of my own work and the work of others. I can ensure my output is appropriate for specific purposes. I can comment on reasons for layout and content. I can invite feedback/responses from others, e.g. use 'comment' in online platforms, asking questions or adding suggestions. I can create groups and share work between them to allow review of digital content.$dcf$),
  ('Evaluating and improving digital content', 4, $dcf$I can justify the reasons for choices and explain the advantages and disadvantages of the different digital outputs I create. I can suggest and make improvements that are relevant for audience and purpose, based on feedback and self-evaluation of my digital work.$dcf$),
  ('Evaluating and improving digital content', 5, $dcf$I can justify reasoning to critical audiences in terms of layout and content of my digital work. I can refer appropriately to sources of information used in my digital work. I can make detailed and specific changes to my digital work, based upon feedback and self-evaluation, as relevant.$dcf$),
  ('Problem-solving and modelling', 3, $dcf$I can create and refine algorithms and flowcharts to solve problems, making use of features such as loops, Boolean values and formulae. I can understand the importance of the order of statements within algorithms.$dcf$),
  ('Problem-solving and modelling', 4, $dcf$I can create a simple model or self-contained algorithm. I can identify the different parts of an algorithm to determine their purpose. I can identify repeating patterns within an algorithm and use iteration to make the algorithm more efficient. I can detect and correct errors in algorithms.$dcf$),
  ('Problem-solving and modelling', 5, $dcf$I can independently create and design models, and explain how they represent real-world problems, e.g. selecting and correctly using an appropriate method for illustrating a problem, such as a flowchart or spreadsheet. I can develop logical solutions to determine the input, outputs and processes of a program, e.g. following pseudocode or a flowchart to come to an outcome, developing a written sequence of steps that could be followed. I can demonstrate the benefits of compartmentalising sections of a problem (using functions/procedures).$dcf$),
  ('Data and information literacy', 3, $dcf$I can construct, refine and interrogate data sets within tables, charts, spreadsheets and databases to test or support an investigation. I can use a range of spreadsheet formulae, e.g. + - / x, sum, average, max, min.$dcf$),
  ('Data and information literacy', 4, $dcf$I can create a data capture form, capture data, search data and create a database and spreadsheet with appropriate data input method. I can perform analysis on simple data sets including grouping data as appropriate. I can analyse large data sets and identify trends where appropriate.$dcf$),
  ('Data and information literacy', 5, $dcf$I can use appropriate programs to produce statistical evidence based on my own collected data/identified scenario and justify reasoning. I can use my data to explain and add validity to conclusions and, where possible, modify conclusions and/or hypothesis.$dcf$)
) as d(element_name, progression_step, descriptor_text) on d.element_name = e.name
where f.name = 'Digital Competence Framework'
  and nullif(trim(d.descriptor_text), '') is not null
on conflict (element_id, progression_step) do update
  set descriptor_text = excluded.descriptor_text,
      display_order = excluded.display_order,
      active = true;

create index if not exists curriculum_mappings_school_idx on public.curriculum_mappings(school_id);
create index if not exists curriculum_mapping_framework_links_mapping_idx on public.curriculum_mapping_framework_links(mapping_id);
create index if not exists curriculum_mapping_framework_links_element_idx on public.curriculum_mapping_framework_links(element_id);
create unique index if not exists curriculum_mapping_framework_links_no_duplicates_idx
  on public.curriculum_mapping_framework_links (
    mapping_id,
    framework_id,
    strand_id,
    element_id,
    coalesce(progression_descriptor_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
create index if not exists curriculum_mapping_theme_links_mapping_idx on public.curriculum_mapping_theme_links(mapping_id);
create index if not exists curriculum_mapping_theme_links_theme_idx on public.curriculum_mapping_theme_links(theme_id);

-- Diagnostics: these queries should return zero rows after this script runs.
select 'old_active_label' as diagnostic, label
from (
  select name as label, active from public.frameworks
  union all
  select name as label, active from public.strands
  union all
  select name as label, active from public.elements
) labels
where active = true
  and label in (
    'Using number skills',
    'Use of calculation',
    'Using measuring skills',
    'Using data skills',
    'Developing numerical reasoning',
    'Oracy',
    'Collaborative discussion',
    'Locating information',
    'Planning writing',
    'Technical accuracy',
    'Audience and purpose',
    'Comparing sources',
    'Presenting information',
    'Inference and deduction',
    'Identity and wellbeing',
    'Evaluating outputs',
    'Culture and community'
  );


select 'blank_descriptor' as diagnostic, f.name as framework, s.name as strand, e.name as element, pd.progression_step
from public.progression_descriptors pd
join public.elements e on e.id = pd.element_id
join public.strands s on s.id = e.strand_id
join public.frameworks f on f.id = s.framework_id
where pd.active = true
  and nullif(trim(pd.descriptor_text), '') is null;

select 'bad_fraction_text' as diagnostic, f.name as framework, s.name as strand, e.name as element, pd.progression_step, pd.descriptor_text
from public.progression_descriptors pd
join public.elements e on e.id = pd.element_id
join public.strands s on s.id = e.strand_id
join public.frameworks f on f.id = s.framework_id
where pd.descriptor_text ilike '%1/ of 3%'
   or pd.descriptor_text ilike '%1/ of 15%'
   or pd.descriptor_text ilike '%. recurring decimals%'
   or pd.descriptor_text ilike '%exchange rates. .%'
   or pd.descriptor_text ilike '%timetables and schedules to plan%quarter to%';
