-- Testimonials for the homepage carousel (Supabase-backed).
-- Public can read approved testimonials; all writes go through the service role
-- (server functions), so no insert/update/delete policies are created here.

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'IconVault User',
  text text not null,
  rating int not null default 5 check (rating >= 1 and rating <= 5),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

drop policy if exists "Public can read approved testimonials" on public.testimonials;
create policy "Public can read approved testimonials"
  on public.testimonials for select
  using (is_approved = true);

-- Seed the 6 existing homepage reviews as approved.
insert into public.testimonials (name, role, text, rating, is_approved) values
  ('Marta Ilves', 'IconVault User', 'We standardised our whole design system on one collection in an afternoon. The token export dropped straight into our Tailwind config.', 5, true),
  ('Dev Prakash', 'IconVault User', 'The CLI is the part I did not know I needed. iconvault add lucide:rocket and it is in my repo, correctly named.', 5, true),
  ('Sasha Renn', 'IconVault User', 'Comparing four candidate icons side by side stopped a week of Slack debate. That feature alone earned the Pro seat.', 5, true),
  ('Arjun Mehta', 'IconVault User', 'I replaced three bookmark folders with one IconVault collection. Finding the right icon now takes seconds, not minutes.', 5, true),
  ('Priya Sharma', 'IconVault User', 'The background remover saved my product listings. Clean cutouts in one click, no Photoshop needed.', 5, true),
  ('Rahul Verma', 'IconVault User', '579 tools and I keep discovering new ones. The QR generator and JSON formatter are part of my daily workflow now.', 5, true);
