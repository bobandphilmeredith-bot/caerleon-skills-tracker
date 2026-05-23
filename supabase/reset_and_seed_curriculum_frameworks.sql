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
        'Learners develop ' || lower(item.element_name) || ' through planned curriculum opportunities.',
        item.element_order,
        true
      )
      on conflict (strand_id, name) do update
        set display_order = excluded.display_order,
            active = true
      returning id into v_element_id;

      if item.framework_name <> 'Digital Competence Framework' then
        for step in 1..5 loop
          insert into public.progression_descriptors (school_id, element_id, progression_step, descriptor_text, display_order, active)
          values (school.id, v_element_id, step, 'Step ' || step || ': curriculum opportunities linked to ' || item.element_name || '.', step, true)
          on conflict (element_id, progression_step) do update
            set descriptor_text = excluded.descriptor_text,
                display_order = excluded.display_order,
                active = true;
        end loop;
      end if;
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
