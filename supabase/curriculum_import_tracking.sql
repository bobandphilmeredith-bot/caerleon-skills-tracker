create extension if not exists pgcrypto;

create table if not exists public.curriculum_import_batches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  uploaded_by uuid,
  file_name text,
  row_count integer not null default 0,
  grouped_mapping_count integer not null default 0,
  framework_link_count integer not null default 0,
  theme_link_count integer not null default 0,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by uuid
);

create table if not exists public.curriculum_import_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.curriculum_import_batches(id) on delete cascade,
  table_name text not null,
  row_id uuid not null,
  action text not null default 'inserted',
  created_at timestamptz not null default now()
);

create index if not exists curriculum_import_batches_school_created_idx
  on public.curriculum_import_batches(school_id, created_at desc);

create index if not exists curriculum_import_batch_items_batch_idx
  on public.curriculum_import_batch_items(batch_id);

create index if not exists curriculum_import_batch_items_row_idx
  on public.curriculum_import_batch_items(table_name, row_id);

alter table public.curriculum_import_batches enable row level security;
alter table public.curriculum_import_batch_items enable row level security;

drop policy if exists "curriculum_import_batches_select" on public.curriculum_import_batches;
create policy "curriculum_import_batches_select" on public.curriculum_import_batches
for select to authenticated
using (public.is_school_admin(school_id));

drop policy if exists "curriculum_import_batches_insert" on public.curriculum_import_batches;
create policy "curriculum_import_batches_insert" on public.curriculum_import_batches
for insert to authenticated
with check (public.is_school_admin(school_id));

drop policy if exists "curriculum_import_batches_update" on public.curriculum_import_batches;
create policy "curriculum_import_batches_update" on public.curriculum_import_batches
for update to authenticated
using (public.is_school_admin(school_id))
with check (public.is_school_admin(school_id));

drop policy if exists "curriculum_import_batches_delete" on public.curriculum_import_batches;
create policy "curriculum_import_batches_delete" on public.curriculum_import_batches
for delete to authenticated
using (public.is_school_admin(school_id));

drop policy if exists "curriculum_import_batch_items_select" on public.curriculum_import_batch_items;
create policy "curriculum_import_batch_items_select" on public.curriculum_import_batch_items
for select to authenticated
using (
  exists (
    select 1
    from public.curriculum_import_batches batch
    where batch.id = curriculum_import_batch_items.batch_id
      and public.is_school_admin(batch.school_id)
  )
);

drop policy if exists "curriculum_import_batch_items_insert" on public.curriculum_import_batch_items;
create policy "curriculum_import_batch_items_insert" on public.curriculum_import_batch_items
for insert to authenticated
with check (
  exists (
    select 1
    from public.curriculum_import_batches batch
    where batch.id = curriculum_import_batch_items.batch_id
      and public.is_school_admin(batch.school_id)
  )
);

drop policy if exists "curriculum_import_batch_items_update" on public.curriculum_import_batch_items;
create policy "curriculum_import_batch_items_update" on public.curriculum_import_batch_items
for update to authenticated
using (
  exists (
    select 1
    from public.curriculum_import_batches batch
    where batch.id = curriculum_import_batch_items.batch_id
      and public.is_school_admin(batch.school_id)
  )
)
with check (
  exists (
    select 1
    from public.curriculum_import_batches batch
    where batch.id = curriculum_import_batch_items.batch_id
      and public.is_school_admin(batch.school_id)
  )
);

drop policy if exists "curriculum_import_batch_items_delete" on public.curriculum_import_batch_items;
create policy "curriculum_import_batch_items_delete" on public.curriculum_import_batch_items
for delete to authenticated
using (
  exists (
    select 1
    from public.curriculum_import_batches batch
    where batch.id = curriculum_import_batch_items.batch_id
      and public.is_school_admin(batch.school_id)
  )
);
