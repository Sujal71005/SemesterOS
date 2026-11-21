-- Corrective migration for 202611210001_academics.sql.
-- Assumes the original migration has been applied unchanged. Run only after
-- reviewing the preflight results against the actual database migration history.
-- Apply through Supabase CLI migration tooling, which provides the transaction.
-- Do not add BEGIN/COMMIT here: embedded transaction commands can break the
-- runner's transaction wrapper. On statement failure, the runner rolls back.
-- Checks precede schema/data changes. Locks below prevent preflight/write races.

lock table public.subjects, public.syllabus_modules, public.syllabus_topics, public.assignments
  in share row exclusive mode;

-- PREFLIGHT 1: verify expected tables, absence of prior kind column, required
-- NOT NULL fields, and every original constraint name inferred from the source.
-- The original file omits explicit names for inline constraints; these are the
-- PostgreSQL-generated names and must be confirmed against the live catalog.
do $$
declare
  missing text;
  bad_columns text;
  bad_definitions text;
begin
  if to_regclass('public.subjects') is null
     or to_regclass('public.syllabus_modules') is null
     or to_regclass('public.syllabus_topics') is null
     or to_regclass('public.assignments') is null then
    raise exception 'Academics migration blocked: expected table is missing.';
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='subjects' and column_name='kind') then
    raise exception 'Academics migration blocked: subjects.kind already exists; inspect migration history.';
  end if;

  with expected(table_name, constraint_name) as (
    values
      ('subjects','subjects_pkey'), ('subjects','subjects_user_id_fkey'),
      ('subjects','subjects_name_check'), ('subjects','subjects_credits_check'),
      ('subjects','subjects_user_id_name_key'),
      ('syllabus_modules','syllabus_modules_pkey'), ('syllabus_modules','syllabus_modules_user_id_fkey'),
      ('syllabus_modules','syllabus_modules_subject_id_fkey'), ('syllabus_modules','syllabus_modules_section_check'),
      ('syllabus_modules','syllabus_modules_title_check'), ('syllabus_modules','syllabus_modules_position_check'),
      ('syllabus_modules','syllabus_modules_user_id_subject_id_section_title_key'),
      ('syllabus_topics','syllabus_topics_pkey'), ('syllabus_topics','syllabus_topics_user_id_fkey'),
      ('syllabus_topics','syllabus_topics_module_id_fkey'), ('syllabus_topics','syllabus_topics_title_check'),
      ('syllabus_topics','syllabus_topics_position_check'),
      ('assignments','assignments_pkey'), ('assignments','assignments_user_id_fkey'),
      ('assignments','assignments_subject_id_fkey'), ('assignments','assignments_title_check'),
      ('assignments','assignments_status_check')
  )
  select string_agg(format('%I.%I', e.table_name, e.constraint_name), ', ')
    into missing
  from expected e
  left join pg_constraint c
    on c.conrelid = format('public.%I', e.table_name)::regclass and c.conname=e.constraint_name
  where c.oid is null;
  if missing is not null then
    raise exception 'Academics migration blocked: expected original constraints missing: %', missing;
  end if;

  -- Compare definitions, not merely names/types: this verifies exact unique
  -- columns and all six original FK targets, columns, and ON DELETE actions.
  with expected(table_name,constraint_name,definition) as (
    values
      ('subjects','subjects_user_id_name_key','UNIQUE (user_id, name)'),
      ('syllabus_modules','syllabus_modules_user_id_subject_id_section_title_key',
        'UNIQUE (user_id, subject_id, section, title)'),
      ('subjects','subjects_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('syllabus_modules','syllabus_modules_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('syllabus_topics','syllabus_topics_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('assignments','assignments_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('syllabus_modules','syllabus_modules_subject_id_fkey','FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE'),
      ('assignments','assignments_subject_id_fkey','FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE'),
      ('syllabus_topics','syllabus_topics_module_id_fkey','FOREIGN KEY (module_id) REFERENCES public.syllabus_modules(id) ON DELETE CASCADE')
  )
  select string_agg(format('%I.%I expected %s but found %s', e.table_name, e.constraint_name,
                           e.definition, coalesce(pg_get_constraintdef(c.oid), 'MISSING')),
                    '; ')
    into bad_definitions
  from expected e
  left join pg_constraint c on c.conrelid=format('public.%I',e.table_name)::regclass
                            and c.conname=e.constraint_name
  where c.oid is null
     or lower(regexp_replace(regexp_replace(pg_get_constraintdef(c.oid), 'public\.', '', 'g'),
                             '[[:space:]]+', '', 'g'))
        <> lower(regexp_replace(regexp_replace(e.definition, 'public\.', '', 'g'),
                                 '[[:space:]]+', '', 'g'));
  if bad_definitions is not null then
    raise exception 'Academics migration blocked: original constraint definitions differ: %', bad_definitions;
  end if;

  with required(table_name,column_name) as (
    values ('subjects','id'),('subjects','user_id'),
      ('syllabus_modules','id'),('syllabus_modules','user_id'),('syllabus_modules','subject_id'),
      ('syllabus_topics','id'),('syllabus_topics','user_id'),('syllabus_topics','module_id'),
      ('assignments','id'),('assignments','user_id'),('assignments','subject_id')
  )
  select string_agg(format('%I.%I', r.table_name, r.column_name), ', ')
    into bad_columns
  from required r left join information_schema.columns c
    on c.table_schema='public' and c.table_name=r.table_name and c.column_name=r.column_name
  where c.column_name is null or c.is_nullable <> 'NO';
  if bad_columns is not null then
    raise exception 'Academics migration blocked: required columns missing or nullable: %', bad_columns;
  end if;
end
$$;

-- PREFLIGHT 2: check orphaned relationships, ownership, blank titles,
-- normalized duplicates, and RLS before any DDL.
do $$
declare
  n bigint;
  bad_policies text;
  tbl text;
  op text;
begin
  select count(*) into n from public.syllabus_modules m
    left join public.subjects s on s.id=m.subject_id where s.id is null;
  if n>0 then raise exception 'Academics migration blocked: % orphaned syllabus_modules.', n; end if;
  select count(*) into n from public.assignments a
    left join public.subjects s on s.id=a.subject_id where s.id is null;
  if n>0 then raise exception 'Academics migration blocked: % orphaned assignments.', n; end if;
  select count(*) into n from public.syllabus_topics t
    left join public.syllabus_modules m on m.id=t.module_id where m.id is null;
  if n>0 then raise exception 'Academics migration blocked: % orphaned syllabus_topics.', n; end if;

  if exists (select 1 from public.subjects where name !~ '[^[:space:]]') then
    raise exception 'Academics migration blocked: blank or whitespace-only subject names exist; resolve them explicitly without deleting or rewriting records.';
  end if;
  if exists (select 1 from public.syllabus_modules where title !~ '[^[:space:]]') then
    raise exception 'Academics migration blocked: blank or whitespace-only module titles exist; resolve them explicitly without deleting or rewriting records.';
  end if;
  if exists (select 1 from public.syllabus_topics where title !~ '[^[:space:]]') then
    raise exception 'Academics migration blocked: blank or whitespace-only topic titles exist; resolve them explicitly without deleting or rewriting records.';
  end if;

  select count(*) into n from public.syllabus_modules m join public.subjects s on s.id=m.subject_id
    where m.user_id is distinct from s.user_id;
  raise notice 'Preflight found % module owner mismatches; child ownership will be aligned to the referenced subject.', n;
  select count(*) into n from public.assignments a join public.subjects s on s.id=a.subject_id
    where a.user_id is distinct from s.user_id;
  raise notice 'Preflight found % assignment owner mismatches; child ownership will be aligned to the referenced subject.', n;
  select count(*) into n from public.syllabus_topics t join public.syllabus_modules m on m.id=t.module_id
    where t.user_id is distinct from m.user_id;
  raise notice 'Preflight found % topic owner mismatches; child ownership will be aligned to the referenced module.', n;

  if exists (select 1 from public.subjects group by user_id,lower(btrim(name)) having count(*)>1) then
    raise exception 'Academics migration blocked: normalized subject name duplicates exist; resolve without deleting records.';
  end if;
  if exists (select 1 from public.syllabus_modules m join public.subjects s on s.id=m.subject_id
    group by s.user_id,m.subject_id,m.section,lower(btrim(m.title)) having count(*)>1) then
    raise exception 'Academics migration blocked: normalized module title duplicates exist; resolve without deleting records.';
  end if;
  if exists (select 1 from public.syllabus_topics t join public.syllabus_modules m on m.id=t.module_id
    group by m.user_id,t.module_id,lower(btrim(t.title)) having count(*)>1) then
    raise exception 'Academics migration blocked: normalized topic title duplicates exist; resolve without deleting records.';
  end if;
  -- Assignment titles are intentionally repeatable; no assignment title
  -- duplicate check or unique constraint is introduced.

  foreach tbl in array array['subjects','syllabus_modules','syllabus_topics','assignments'] loop
    if not coalesce((select c.relrowsecurity from pg_class c
      where c.oid=format('public.%I',tbl)::regclass),false) then
      raise exception 'Academics migration blocked: RLS disabled on public.%',tbl;
    end if;
    foreach op in array array['SELECT','INSERT','UPDATE','DELETE'] loop
      if not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=tbl
        and exists (select 1 from unnest(p.roles) as role_entry(role_name)
          where case when role_entry.role_name='public'::name then true
                     else pg_has_role('authenticated',role_entry.role_name,'MEMBER') end)
        and (p.cmd=op or p.cmd='ALL')) then
        raise exception 'Academics migration blocked: no % policy applies to authenticated users on public.%',op,tbl;
      end if;
      if not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=tbl
        and p.permissive='PERMISSIVE'
        and exists (select 1 from unnest(p.roles) as role_entry(role_name)
          where case when role_entry.role_name='public'::name then true
                     else pg_has_role('authenticated',role_entry.role_name,'MEMBER') end)
        and (p.cmd=op or p.cmd='ALL')) then
        raise exception 'Academics migration blocked: no permissive % policy grants authenticated users access to public.%.',op,tbl;
      end if;
      -- PostgreSQL ORs permissive policies. Check every policy applicable to
      -- authenticated/PUBLIC users, including inherited role memberships and
      -- additional policies, by behavior rather than policy name. The anchored
      -- predicate accepts formatting/parenthesis variation and equality reversal,
      -- but rejects OR/broader expressions. Expressions outside these recognized
      -- equivalent forms require manual live-database review and fail closed.
      select string_agg(p.policyname,', ') into bad_policies
      from pg_policies p where p.schemaname='public' and p.tablename=tbl
        and p.permissive='PERMISSIVE'
        and exists (select 1 from unnest(p.roles) as role_entry(role_name)
          where case when role_entry.role_name='public'::name then true
                     else pg_has_role('authenticated',role_entry.role_name,'MEMBER') end)
        and (p.cmd=op or p.cmd='ALL')
        and case op
          when 'SELECT' then coalesce(p.qual,'') !~* '^\s*\(*\s*(user_id\s*=\s*\(*\s*(select\s+)?auth\.uid\(\)(\s+as\s+uid)?\s*\)*|\(*\s*(select\s+)?auth\.uid\(\)(\s+as\s+uid)?\s*\)*\s*=\s*user_id)\s*\)*\s*$'
          when 'DELETE' then coalesce(p.qual,'') !~* '^\s*\(*\s*(user_id\s*=\s*\(*\s*(select\s+)?auth\.uid\(\)(\s+as\s+uid)?\s*\)*|\(*\s*(select\s+)?auth\.uid\(\)(\s+as\s+uid)?\s*\)*\s*=\s*user_id)\s*\)*\s*$'
          when 'INSERT' then coalesce(p.with_check,'') !~* '^\s*\(*\s*(user_id\s*=\s*\(*\s*(select\s+)?auth\.uid\(\)(\s+as\s+uid)?\s*\)*|\(*\s*(select\s+)?auth\.uid\(\)(\s+as\s+uid)?\s*\)*\s*=\s*user_id)\s*\)*\s*$'
          when 'UPDATE' then coalesce(p.qual,'') !~* '^\s*\(*\s*(user_id\s*=\s*\(*\s*(select\s+)?auth\.uid\(\)(\s+as\s+uid)?\s*\)*|\(*\s*(select\s+)?auth\.uid\(\)(\s+as\s+uid)?\s*\)*\s*=\s*user_id)\s*\)*\s*$'
            or coalesce(p.with_check,'') !~* '^\s*\(*\s*(user_id\s*=\s*\(*\s*(select\s+)?auth\.uid\(\)(\s+as\s+uid)?\s*\)*|\(*\s*(select\s+)?auth\.uid\(\)(\s+as\s+uid)?\s*\)*\s*=\s*user_id)\s*\)*\s*$'
          else true end;
      if bad_policies is not null then
        raise exception 'Academics migration blocked: permissive % policies on public.% lack required auth.uid() ownership checks: %',op,tbl,bad_policies;
      end if;
    end loop;
  end loop;
end
$$;

-- No preflight has changed data/schema. Begin corrective DDL and safe backfill.
alter table public.subjects add column kind text not null default 'subject'
  check (kind in ('subject','lab'));
alter table public.subjects add constraint subjects_name_not_blank_check
  check (name ~ '[^[:space:]]');
alter table public.syllabus_modules add constraint syllabus_modules_title_not_blank_check
  check (title ~ '[^[:space:]]');
alter table public.syllabus_topics add constraint syllabus_topics_title_not_blank_check
  check (title ~ '[^[:space:]]');

alter table public.subjects drop constraint subjects_user_id_name_key;
create unique index subjects_user_kind_name_normalized_key
  on public.subjects(user_id,kind,lower(btrim(name)));

alter table public.syllabus_modules drop constraint syllabus_modules_user_id_subject_id_section_title_key;
create unique index syllabus_modules_title_normalized_key
  on public.syllabus_modules(user_id,subject_id,section,lower(btrim(title)));
create unique index syllabus_topics_title_normalized_key
  on public.syllabus_topics(user_id,module_id,lower(btrim(title)));

-- Ensure the child-side FK lookup prefixes exist, creating only those that are
-- actually missing. The new normalized module unique index starts with
-- (user_id,subject_id), so it supports module relationship lookups. The original
-- assignments_subject_due_idx starts with (user_id,subject_id), so its trailing
-- due_at column does not prevent PostgreSQL from using that prefix. The new
-- normalized topic unique index starts with (user_id,module_id), so it supports
-- topic relationship lookups. These indexes are reused rather than duplicated.
do $$
begin
  if not exists (
    select 1 from pg_index i
    where i.indrelid='public.syllabus_modules'::regclass
      and i.indisvalid and i.indpred is null and i.indnkeyatts>=2
      and (select array_agg(a.attname::text order by k.ordinality)
           from unnest(i.indkey) with ordinality k(attnum,ordinality)
           join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum
           where k.ordinality<=2) = array['user_id','subject_id']::text[]
  ) then
    execute 'create index syllabus_modules_subject_fk_idx on public.syllabus_modules(user_id,subject_id)';
  end if;

  if not exists (
    select 1 from pg_index i
    where i.indrelid='public.assignments'::regclass
      and i.indisvalid and i.indpred is null and i.indnkeyatts>=2
      and (select array_agg(a.attname::text order by k.ordinality)
           from unnest(i.indkey) with ordinality k(attnum,ordinality)
           join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum
           where k.ordinality<=2) = array['user_id','subject_id']::text[]
  ) then
    execute 'create index assignments_subject_fk_idx on public.assignments(user_id,subject_id)';
  end if;

  if not exists (
    select 1 from pg_index i
    where i.indrelid='public.syllabus_topics'::regclass
      and i.indisvalid and i.indpred is null and i.indnkeyatts>=2
      and (select array_agg(a.attname::text order by k.ordinality)
           from unnest(i.indkey) with ordinality k(attnum,ordinality)
           join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum
           where k.ordinality<=2) = array['user_id','module_id']::text[]
  ) then
    execute 'create index syllabus_topics_module_fk_idx on public.syllabus_topics(user_id,module_id)';
  end if;
end
$$;

-- Backfill only child owner IDs from their existing parent. No rows or
-- relationships are deleted or merged; prior checks reject orphan/conflict cases.
update public.syllabus_modules m set user_id=s.user_id from public.subjects s
  where s.id=m.subject_id and m.user_id is distinct from s.user_id;
update public.assignments a set user_id=s.user_id from public.subjects s
  where s.id=a.subject_id and a.user_id is distinct from s.user_id;
update public.syllabus_topics t set user_id=m.user_id from public.syllabus_modules m
  where m.id=t.module_id and t.user_id is distinct from m.user_id;

alter table public.subjects add constraint subjects_user_id_id_key unique(user_id,id);
alter table public.syllabus_modules add constraint syllabus_modules_user_id_id_key unique(user_id,id);

-- Confirm the referenced composite unique keys exist before adding FKs.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.subjects'::regclass
    and conname='subjects_user_id_id_key' and contype='u') then
    raise exception 'Academics migration blocked: subjects(user_id,id) unique key missing.';
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.syllabus_modules'::regclass
    and conname='syllabus_modules_user_id_id_key' and contype='u') then
    raise exception 'Academics migration blocked: syllabus_modules(user_id,id) unique key missing.';
  end if;
end
$$;

alter table public.syllabus_modules drop constraint syllabus_modules_subject_id_fkey,
  add constraint syllabus_modules_user_subject_fkey foreign key(user_id,subject_id)
  references public.subjects(user_id,id) on delete cascade;
alter table public.assignments drop constraint assignments_subject_id_fkey,
  add constraint assignments_user_subject_fkey foreign key(user_id,subject_id)
  references public.subjects(user_id,id) on delete cascade;
alter table public.syllabus_topics drop constraint syllabus_topics_module_id_fkey,
  add constraint syllabus_topics_user_module_fkey foreign key(user_id,module_id)
  references public.syllabus_modules(user_id,id) on delete cascade;

-- Preserve position ordering without requiring unique position values.
create index syllabus_modules_position_idx
  on public.syllabus_modules(user_id,subject_id,section,position);
create index syllabus_topics_position_idx
  on public.syllabus_topics(user_id,module_id,position);

