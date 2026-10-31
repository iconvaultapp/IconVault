-- IconVault v55 — Community Showcase submissions.
-- ============================================================================
-- FOUNDER ACTION REQUIRED: run this migration on the LIVE Supabase database
-- before showcase submissions work. Until it is run, the submission form will
-- return an error (the API route cannot insert into a table that does not
-- exist) and the gallery will stay on its honest empty state.
-- ============================================================================
-- Approval model (no admin UI in v55): submissions land with status =
-- 'pending' and are INVISIBLE publicly. The founder approves by flipping a
-- row's status to 'approved' in the Supabase dashboard (Table Editor) — or
-- rejects with status = 'rejected'. Only 'approved' rows are readable.
-- ============================================================================

create table if not exists public.showcase_projects (
  id uuid primary key default gen_random_uuid(),
  project_name text not null check (char_length(project_name) between 1 and 120),
  creator_name text not null check (char_length(creator_name) between 1 and 120),
  creator_site text not null check (char_length(creator_site) between 1 and 500),
  description text not null check (char_length(description) between 1 and 500),
  icons_used text not null check (char_length(icons_used) between 1 and 300),
  contact_email text check (char_length(contact_email) <= 200),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.showcase_projects enable row level security;

-- Public (anonymous) reads: approved rows only. Nothing pending is visible.
create policy "showcase_public_read_approved"
  on public.showcase_projects for select
  to anon, authenticated
  using (status = 'approved');

-- Submissions go through the server API route (service role), which bypasses
-- RLS — so no anonymous INSERT policy is granted here on purpose. Direct
-- browser inserts are blocked; the API route enforces the rate limit and
-- field validation, and always forces status = 'pending'.
