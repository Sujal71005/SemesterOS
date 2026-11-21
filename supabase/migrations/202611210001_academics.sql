create extension if not exists pgcrypto;

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  credits smallint not null check (credits between 1 and 30),
  description text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.syllabus_modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  section text not null check (section in ('theory', 'practical')),
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '',
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, subject_id, section, title)
);

create table public.syllabus_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  module_id uuid not null references public.syllabus_modules(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  is_complete boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 180),
  description text not null default '',
  due_at timestamptz,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'submitted', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index syllabus_modules_subject_idx on public.syllabus_modules(user_id, subject_id);
create index syllabus_topics_module_idx on public.syllabus_topics(user_id, module_id);
create index assignments_subject_due_idx on public.assignments(user_id, subject_id, due_at);

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ declare t text; begin
  foreach t in array array['subjects','syllabus_modules','syllabus_topics','assignments'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I_select on public.%I for select to authenticated using (user_id = (select auth.uid()))', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t, t);
  end loop;
end $$;
