
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles viewable by authenticated" on public.profiles for select to authenticated using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Auto-create profile trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  lead_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;

-- Project members
create type public.member_role as enum ('lead','admin','member','viewer');
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
alter table public.project_members enable row level security;

-- Security definer: is member of project
create or replace function public.is_project_member(_project uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_members where project_id = _project and user_id = _user);
$$;

create or replace function public.is_project_admin(_project uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_members where project_id = _project and user_id = _user and role in ('lead','admin'));
$$;

-- Projects RLS
create policy "Members view projects" on public.projects for select to authenticated using (public.is_project_member(id, auth.uid()));
create policy "Authenticated create projects" on public.projects for insert to authenticated with check (auth.uid() = lead_id);
create policy "Admins update projects" on public.projects for update to authenticated using (public.is_project_admin(id, auth.uid()));
create policy "Lead deletes projects" on public.projects for delete to authenticated using (lead_id = auth.uid());

-- Project members RLS
create policy "Members view members" on public.project_members for select to authenticated using (public.is_project_member(project_id, auth.uid()));
create policy "Admins manage members" on public.project_members for insert to authenticated with check (public.is_project_admin(project_id, auth.uid()) or not exists(select 1 from public.project_members where project_id = project_members.project_id));
create policy "Admins update members" on public.project_members for update to authenticated using (public.is_project_admin(project_id, auth.uid()));
create policy "Admins delete members" on public.project_members for delete to authenticated using (public.is_project_admin(project_id, auth.uid()) or user_id = auth.uid());

-- Sprints
create type public.sprint_status as enum ('planned','active','completed');
create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  goal text,
  status public.sprint_status not null default 'planned',
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default now()
);
alter table public.sprints enable row level security;
create policy "Members view sprints" on public.sprints for select to authenticated using (public.is_project_member(project_id, auth.uid()));
create policy "Members manage sprints" on public.sprints for all to authenticated using (public.is_project_member(project_id, auth.uid())) with check (public.is_project_member(project_id, auth.uid()));

-- Issues
create type public.issue_type as enum ('story','task','bug','epic');
create type public.issue_status as enum ('backlog','todo','in_progress','in_review','done');
create type public.issue_priority as enum ('lowest','low','medium','high','highest');

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sprint_id uuid references public.sprints(id) on delete set null,
  key text not null,
  title text not null,
  description text,
  type public.issue_type not null default 'task',
  status public.issue_status not null default 'backlog',
  priority public.issue_priority not null default 'medium',
  assignee_id uuid references auth.users(id) on delete set null,
  reporter_id uuid not null references auth.users(id),
  story_points int,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, key)
);
create index on public.issues(project_id);
create index on public.issues(sprint_id);
alter table public.issues enable row level security;
create policy "Members view issues" on public.issues for select to authenticated using (public.is_project_member(project_id, auth.uid()));
create policy "Members manage issues" on public.issues for all to authenticated using (public.is_project_member(project_id, auth.uid())) with check (public.is_project_member(project_id, auth.uid()));

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger issues_touch before update on public.issues for each row execute function public.touch_updated_at();

-- Auto-assign issue key like PROJ-1
create or replace function public.assign_issue_key()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pkey text;
  next_num int;
begin
  if new.key is null or new.key = '' then
    select key into pkey from public.projects where id = new.project_id;
    select coalesce(max((regexp_match(key, '-(\d+)$'))[1]::int), 0) + 1
      into next_num from public.issues where project_id = new.project_id;
    new.key := pkey || '-' || next_num;
  end if;
  return new;
end; $$;
create trigger issues_assign_key before insert on public.issues for each row execute function public.assign_issue_key();

-- Comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
create policy "Members view comments" on public.comments for select to authenticated using (
  exists (select 1 from public.issues i where i.id = issue_id and public.is_project_member(i.project_id, auth.uid()))
);
create policy "Members add comments" on public.comments for insert to authenticated with check (
  author_id = auth.uid() and exists (select 1 from public.issues i where i.id = issue_id and public.is_project_member(i.project_id, auth.uid()))
);
create policy "Authors update comments" on public.comments for update to authenticated using (author_id = auth.uid());
create policy "Authors delete comments" on public.comments for delete to authenticated using (author_id = auth.uid());

-- Activity log
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  issue_id uuid references public.issues(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
create index on public.activities(project_id, created_at desc);
alter table public.activities enable row level security;
create policy "Members view activity" on public.activities for select to authenticated using (public.is_project_member(project_id, auth.uid()));
create policy "Members create activity" on public.activities for insert to authenticated with check (actor_id = auth.uid() and public.is_project_member(project_id, auth.uid()));

-- Auto-add creator as project lead member
create or replace function public.add_project_lead_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_members (project_id, user_id, role) values (new.id, new.lead_id, 'lead')
  on conflict do nothing;
  return new;
end; $$;
create trigger projects_add_lead after insert on public.projects for each row execute function public.add_project_lead_member();
