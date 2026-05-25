create table if not exists public.scholarship_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  person_type text not null check (person_type in ('self', 'referral')),
  name text not null,
  whatsapp text not null,
  city text not null,
  course text,
  consent boolean not null default false,
  match_slug text not null,
  team_voted text,
  source text not null default 'fan_arena_finals'
);

alter table public.scholarship_leads enable row level security;

create policy "Anyone can create scholarship leads"
  on public.scholarship_leads
  for insert
  to anon, authenticated
  with check (consent = true);
