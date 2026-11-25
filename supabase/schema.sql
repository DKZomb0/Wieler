-- Results belong to a group; people see and edit them through group membership.
-- Users live in Supabase Auth (auth.users). Quoted camelCase columns match the JSON the frontend uses.
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  can_write boolean not null default false, -- false = read only
  primary key (group_id, user_id)
);

create table race_results (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  "racerName" text not null,
  "raceName" text not null,
  score int not null,
  "raceDate" text not null,
  categorie text,
  team text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz
);
create index on race_results (group_id, "raceDate" desc);

alter table groups enable row level security;
alter table group_members enable row level security;
alter table race_results enable row level security;

create policy "members see their groups" on groups for select to authenticated
  using (id in (select group_id from group_members where user_id = (select auth.uid())));
create policy "users see their own memberships" on group_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy "members read results" on race_results for select to authenticated
  using (group_id in (select group_id from group_members where user_id = (select auth.uid())));
create policy "writers add results" on race_results for insert to authenticated
  with check (group_id in (select group_id from group_members where user_id = (select auth.uid()) and can_write));
create policy "writers change results" on race_results for update to authenticated
  using (group_id in (select group_id from group_members where user_id = (select auth.uid()) and can_write))
  with check (group_id in (select group_id from group_members where user_id = (select auth.uid()) and can_write));
create policy "writers delete results" on race_results for delete to authenticated
  using (group_id in (select group_id from group_members where user_id = (select auth.uid()) and can_write));

grant select on groups, group_members to authenticated;
grant select, insert, update, delete on race_results to authenticated;
-- Add people with: insert into group_members (group_id, user_id) select g.id, u.id from groups g, auth.users u where g.name = '...' and u.email = '...';
