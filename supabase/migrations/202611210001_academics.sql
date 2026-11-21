create extension if not exists pgcrypto;

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    constraint subjects_user_id_fkey
    references auth.users(id) on delete cascade,
  kind text not null default 'subject'
    constraint subjects_kind_check
    check (kind in ('subject', 'lab')),
  name text not null
    constraint subjects_name_check
    check (
      name ~ '[^[:space:]]'
      and char_length(btrim(name)) between 1 and 160
    ),
  credits smallint not null
    constraint subjects_credits_check
    check (credits between 1 and 30),
  description text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_user_id_id_key unique (user_id, id)
);

create unique index subjects_user_kind_name_normalized_key
  on public.subjects (user_id, kind, lower(btrim(name)));

create table public.syllabus_modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    constraint syllabus_modules_user_id_fkey
    references auth.users(id) on delete cascade,
  subject_id uuid not null,
  section text not null
    constraint syllabus_modules_section_check
    check (section in ('theory', 'practical')),
  title text not null
    constraint syllabus_modules_title_check
    check (
      title ~ '[^[:space:]]'
      and char_length(btrim(title)) between 1 and 160
    ),
  description text not null default '',
  position integer not null default 0
    constraint syllabus_modules_position_check
    check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint syllabus_modules_user_id_id_key unique (user_id, id),
  constraint syllabus_modules_user_subject_fkey
    foreign key (user_id, subject_id)
    references public.subjects (user_id, id) on delete cascade
);

create unique index syllabus_modules_title_normalized_key
  on public.syllabus_modules (
    user_id, subject_id, section, lower(btrim(title))
  );

create table public.syllabus_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    constraint syllabus_topics_user_id_fkey
    references auth.users(id) on delete cascade,
  module_id uuid not null,
  title text not null
    constraint syllabus_topics_title_check
    check (
      title ~ '[^[:space:]]'
      and char_length(btrim(title)) between 1 and 200
    ),
  is_complete boolean not null default false,
  position integer not null default 0
    constraint syllabus_topics_position_check
    check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint syllabus_topics_user_module_fkey
    foreign key (user_id, module_id)
    references public.syllabus_modules (user_id, id) on delete cascade
);

create unique index syllabus_topics_title_normalized_key
  on public.syllabus_topics (user_id, module_id, lower(btrim(title)));

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    constraint assignments_user_id_fkey
    references auth.users(id) on delete cascade,
  subject_id uuid not null,
  title text not null
    constraint assignments_title_check
    check (
      title ~ '[^[:space:]]'
      and char_length(btrim(title)) between 1 and 180
    ),
  description text not null default '',
  due_at timestamptz,
  status text not null default 'todo'
    constraint assignments_status_check
    check (status in ('todo', 'in_progress', 'submitted', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignments_user_subject_fkey
    foreign key (user_id, subject_id)
    references public.subjects (user_id, id) on delete cascade
);

-- Supports subject relationship lookups and due-date queries.
create index assignments_subject_due_idx
  on public.assignments (user_id, subject_id, due_at);

-- Supports position-ordered retrieval. The normalized unique indexes also
-- provide leading columns for the module and topic relationship lookups.
create index syllabus_modules_position_idx
  on public.syllabus_modules (user_id, subject_id, section, position);

create index syllabus_topics_position_idx
  on public.syllabus_topics (user_id, module_id, position);

create function public.set_academics_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'subjects',
    'syllabus_modules',
    'syllabus_topics',
    'assignments'
  ] loop
    execute format(
      'create trigger %I before update on public.%I
       for each row execute function public.set_academics_updated_at()',
      table_name || '_updated_at',
      table_name
    );

    execute format(
      'alter table public.%I enable row level security',
      table_name
    );

    execute format(
      'create policy %I on public.%I
       for select to authenticated
       using (user_id = (select auth.uid()))',
      table_name || '_select',
      table_name
    );

    execute format(
      'create policy %I on public.%I
       for insert to authenticated
       with check (user_id = (select auth.uid()))',
      table_name || '_insert',
      table_name
    );

    execute format(
      'create policy %I on public.%I
       for update to authenticated
       using (user_id = (select auth.uid()))
       with check (user_id = (select auth.uid()))',
      table_name || '_update',
      table_name
    );

    execute format(
      'create policy %I on public.%I
       for delete to authenticated
       using (user_id = (select auth.uid()))',
      table_name || '_delete',
      table_name
    );
  end loop;
end
$$;

revoke all privileges on table
  public.subjects,
  public.syllabus_modules,
  public.syllabus_topics,
  public.assignments
from anon, public;

grant select, insert, update, delete
  on table public.subjects,
            public.syllabus_modules,
            public.syllabus_topics,
            public.assignments
  to authenticated;
