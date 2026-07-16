-- ─────────────────────────────────────────────────────────────────────────────
-- Test stubs
--
-- The schema targets Supabase, which supplies `auth` and `storage` out of the
-- box. A plain PostgreSQL instance does not, so the tests recreate the minimum
-- surface the schema depends on: the users table, auth.uid(), the storage
-- tables, and the anon / authenticated roles PostgREST connects as.
--
-- auth.uid() reads the same GUC that Supabase's PostgREST sets per request, so
-- a test can impersonate a user with set_config('request.jwt.claim.sub', ...).
-- ─────────────────────────────────────────────────────────────────────────────

create schema if not exists auth;
create schema if not exists storage;

do $$ begin create role anon;          exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table if not exists storage.buckets (
  id text primary key, name text, public boolean
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text
);

alter table storage.objects enable row level security;

grant usage on schema public, auth, storage to anon, authenticated;
