-- Quoted camelCase columns so rows match the JSON shape the frontend already uses.
create table announcers (
  name text not null,
  "loginCode" text primary key
);

create table race_results (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
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

-- Only the server (service role key) touches these; no policies = no public access.
alter table announcers enable row level security;
alter table race_results enable row level security;
