-- Users live in Supabase Auth (auth.users); each user owns their own races.
-- Quoted camelCase columns so rows match the JSON shape the frontend uses.
create table race_results (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  "racerName" text not null,
  "raceName" text not null,
  score int not null,
  "raceDate" text not null,
  categorie text,
  team text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz
);
create index on race_results (owner, "raceDate" desc);

-- Only the API (service role key) touches this table; no policies = no direct public access.
alter table race_results enable row level security;
