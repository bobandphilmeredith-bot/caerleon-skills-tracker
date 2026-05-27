-- Allow one curriculum mapping to link to multiple CCT elements under the same parent theme.
--
-- Why this is needed:
-- The previous uniqueness rule was unique(mapping_id, theme_id). That allowed only
-- one element per parent CCT theme for a piece of work, even though the link table
-- now stores theme_element_id.
--
-- Safe to run more than once.

alter table public.curriculum_mapping_theme_links
  add column if not exists theme_element_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'curriculum_mapping_theme_links_theme_element_fk'
      and conrelid = 'public.curriculum_mapping_theme_links'::regclass
  ) then
    alter table public.curriculum_mapping_theme_links
      add constraint curriculum_mapping_theme_links_theme_element_fk
      foreign key (theme_element_id)
      references public.cross_cutting_theme_elements(id)
      on delete restrict;
  end if;
end
$$;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.curriculum_mapping_theme_links'::regclass
      and c.contype = 'u'
      and array_length(c.conkey, 1) = 2
      and exists (
        select 1
        from unnest(c.conkey) as key(attnum)
        join pg_attribute a
          on a.attrelid = c.conrelid
         and a.attnum = key.attnum
        where a.attname = 'mapping_id'
      )
      and exists (
        select 1
        from unnest(c.conkey) as key(attnum)
        join pg_attribute a
          on a.attrelid = c.conrelid
         and a.attnum = key.attnum
        where a.attname = 'theme_id'
      )
  loop
    execute format(
      'alter table public.curriculum_mapping_theme_links drop constraint %I',
      v_constraint.conname
    );
  end loop;
end
$$;

drop index if exists public.curriculum_mapping_theme_links_mapping_id_theme_id_key;

create unique index if not exists curriculum_mapping_theme_links_mapping_theme_element_unique
  on public.curriculum_mapping_theme_links (mapping_id, theme_id, theme_element_id)
  where theme_element_id is not null;

create unique index if not exists curriculum_mapping_theme_links_mapping_theme_legacy_unique
  on public.curriculum_mapping_theme_links (mapping_id, theme_id)
  where theme_element_id is null;

create index if not exists curriculum_mapping_theme_links_theme_element_idx
  on public.curriculum_mapping_theme_links (theme_element_id);

-- Diagnostics: this should return zero rows after the old unique constraint has gone.
select
  'old_mapping_theme_unique_constraint_still_present' as diagnostic,
  c.conname
from pg_constraint c
where c.conrelid = 'public.curriculum_mapping_theme_links'::regclass
  and c.contype = 'u'
  and array_length(c.conkey, 1) = 2
  and exists (
    select 1
    from unnest(c.conkey) as key(attnum)
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = key.attnum
    where a.attname = 'mapping_id'
  )
  and exists (
    select 1
    from unnest(c.conkey) as key(attnum)
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = key.attnum
    where a.attname = 'theme_id'
  );
