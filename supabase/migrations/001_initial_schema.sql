-- ============================================================
-- UYF Management System – Initial Schema + RLS + Seed Data
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────

-- Branches (created first; no FK dependencies)
create table if not exists branches (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  leader_id  uuid,                  -- FK added after profiles
  contact    text,
  created_at timestamptz default now()
);

-- Profiles (extends auth.users)
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  role        text not null default 'area_leader'
                check (role in ('super_admin', 'committee', 'area_leader')),
  branch_id   uuid references branches(id) on delete set null,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Now add the FK for branches.leader_id
alter table branches
  add constraint fk_branches_leader
  foreign key (leader_id) references profiles(id) on delete set null;

-- Goals
create table if not exists goals (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text,
  category      text not null default 'active'
                  check (category in ('active', 'completed', 'upcoming')),
  branch_id     uuid references branches(id) on delete set null,
  target_metric text,
  progress      integer default 0 check (progress >= 0 and progress <= 100),
  deadline      date,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Events / Schedule
create table if not exists events (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  start_at    timestamptz not null,
  end_at      timestamptz,
  location    text,
  branch_id   uuid references branches(id) on delete set null,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- Branch Reports
create table if not exists reports (
  id           uuid primary key default uuid_generate_v4(),
  branch_id    uuid not null references branches(id) on delete cascade,
  period_type  text not null check (period_type in ('weekly', 'monthly')),
  period_start date not null,
  period_end   date not null,
  attendance   integer default 0 check (attendance >= 0),
  sessions     integer default 0 check (sessions >= 0),
  charity_bhd  decimal(10, 3) default 0 check (charity_bhd >= 0),
  subjects     text,
  notes        text,
  submitted_by uuid references profiles(id) on delete set null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- App Settings (singleton row — only id = 1 allowed)
create table if not exists app_settings (
  id            integer primary key default 1 check (id = 1),
  app_name      text not null default 'United Youth Forum',
  logo_url      text,
  primary_color text default '#16a34a',
  accent_color  text default '#d97706',
  tagline       text default 'Empowering Youth Through Islamic Knowledge',
  contact_email text,
  updated_at    timestamptz default now()
);

-- Insert default app settings
insert into app_settings (id, app_name, primary_color, accent_color, tagline)
values (1, 'United Youth Forum', '#16a34a', '#d97706', 'Empowering Youth Through Islamic Knowledge')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- SEED DATA – 10 Branches
-- ─────────────────────────────────────────────────────────────

insert into branches (name) values
  ('Manama'), ('Salmabad'), ('Muharraq'), ('Riffa'),
  ('Isa Town'), ('Hamad Town'), ('Budaiya'), ('Jidhafs'),
  ('Seef'), ('Adliya')
on conflict (name) do nothing;

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

alter table profiles     enable row level security;
alter table branches     enable row level security;
alter table goals        enable row level security;
alter table events       enable row level security;
alter table reports      enable row level security;
alter table app_settings enable row level security;

-- Helper: get the current user's role
create or replace function get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- Helper: get the current user's branch_id
create or replace function get_my_branch_id()
returns uuid
language sql
security definer
stable
as $$
  select branch_id from profiles where id = auth.uid();
$$;

-- ── PROFILES policies ─────────────────────────────────────────
-- Any user can read their own profile
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

-- Committee / admin can see all profiles
create policy "profiles_select_elevated" on profiles
  for select using (get_my_role() in ('super_admin', 'committee'));

-- Users can update their own profile (but not change role)
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- Admin can update any profile (including role assignments)
create policy "profiles_update_admin" on profiles
  for update using (get_my_role() = 'super_admin');

-- Admin/committee can create profiles for new users
create policy "profiles_insert_elevated" on profiles
  for insert with check (get_my_role() in ('super_admin', 'committee'));

-- ── BRANCHES policies ─────────────────────────────────────────
create policy "branches_select_all" on branches
  for select using (auth.uid() is not null);

create policy "branches_insert_admin" on branches
  for insert with check (get_my_role() in ('super_admin', 'committee'));

create policy "branches_update_admin" on branches
  for update using (get_my_role() in ('super_admin', 'committee'));

create policy "branches_delete_superadmin" on branches
  for delete using (get_my_role() = 'super_admin');

-- ── GOALS policies ────────────────────────────────────────────
create policy "goals_select_all" on goals
  for select using (auth.uid() is not null);

create policy "goals_insert_elevated" on goals
  for insert with check (get_my_role() in ('super_admin', 'committee'));

create policy "goals_update_elevated" on goals
  for update using (get_my_role() in ('super_admin', 'committee'));

create policy "goals_delete_elevated" on goals
  for delete using (get_my_role() in ('super_admin', 'committee'));

-- ── EVENTS policies ───────────────────────────────────────────
create policy "events_select_all" on events
  for select using (auth.uid() is not null);

create policy "events_insert_elevated" on events
  for insert with check (get_my_role() in ('super_admin', 'committee'));

create policy "events_update_elevated" on events
  for update using (get_my_role() in ('super_admin', 'committee'));

create policy "events_delete_elevated" on events
  for delete using (get_my_role() in ('super_admin', 'committee'));

-- ── REPORTS policies ──────────────────────────────────────────
-- Leaders can see only their branch; committee/admin see all
create policy "reports_select" on reports
  for select using (
    get_my_role() in ('super_admin', 'committee')
    or (get_my_role() = 'area_leader' and branch_id = get_my_branch_id())
  );

-- Leaders can submit reports for their own branch
create policy "reports_insert" on reports
  for insert with check (
    get_my_role() in ('super_admin', 'committee')
    or (get_my_role() = 'area_leader' and branch_id = get_my_branch_id())
  );

-- Leaders can update only their own submissions
create policy "reports_update" on reports
  for update using (
    get_my_role() in ('super_admin', 'committee')
    or (
      get_my_role() = 'area_leader'
      and branch_id = get_my_branch_id()
      and submitted_by = auth.uid()
    )
  );

create policy "reports_delete_elevated" on reports
  for delete using (get_my_role() in ('super_admin', 'committee'));

-- ── APP_SETTINGS policies ─────────────────────────────────────
create policy "app_settings_select_all" on app_settings
  for select using (auth.uid() is not null);

create policy "app_settings_upsert_superadmin" on app_settings
  for all using (get_my_role() = 'super_admin')
  with check (get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: auto-create profile on new user sign-up
-- ─────────────────────────────────────────────────────────────

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'area_leader')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 5242880, array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Storage policies
create policy "logos_public_read" on storage.objects
  for select using (bucket_id = 'logos');

create policy "logos_admin_write" on storage.objects
  for insert with check (bucket_id = 'logos' and get_my_role() = 'super_admin');

create policy "logos_admin_update" on storage.objects
  for update using (bucket_id = 'logos' and get_my_role() = 'super_admin');

create policy "logos_admin_delete" on storage.objects
  for delete using (bucket_id = 'logos' and get_my_role() = 'super_admin');

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_auth_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid() is not null);

create policy "avatars_auth_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid() is not null);
