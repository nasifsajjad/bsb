-- ============================================================
-- Migration 002: Improvements for invite flow & security
-- Run in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- 1. Update handle_new_user trigger to read full_name from metadata
--    This ensures invited users get their name set correctly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'area_leader'   -- default; overridden immediately by the invite API
  )
  on conflict (id) do update
    set full_name = excluded.full_name;
  return new;
end;
$$;

-- Re-attach the trigger (safe to run on existing setup)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Add email column to profiles view so admins can see user emails in the app
--    (read from auth.users via a security-definer view accessible to service role)
create or replace view public.user_emails as
  select id, email from auth.users;

-- Grant access to authenticated users with super_admin role via RLS on profiles
-- (The view is read via the admin client / API route, not directly via RLS)


-- 3. Ensure RLS is tight on app_settings — only super_admin can update
drop policy if exists "super_admin can upsert settings" on app_settings;
create policy "super_admin can upsert settings"
  on app_settings
  for all
  using (get_my_role() = 'super_admin')
  with check (get_my_role() = 'super_admin');


-- 4. Add index on goals.deadline for fast deadline-query performance
create index if not exists idx_goals_deadline on goals(deadline)
  where deadline is not null and category != 'completed';


-- 5. Add index on reports for branch + period queries
create index if not exists idx_reports_branch_period
  on reports(branch_id, period_start desc);


-- 6. Ensure branches RLS allows committee to update (leader + contact only)
drop policy if exists "committee can update branches" on branches;
create policy "committee can update branches"
  on branches
  for update
  using (get_my_role() in ('super_admin', 'committee'))
  with check (get_my_role() in ('super_admin', 'committee'));


-- ============================================================
-- FIRST SUPER ADMIN SETUP (run manually after first sign-up)
-- ============================================================
-- After the first user signs up via the login page, promote them:
--
--   UPDATE profiles
--   SET role = 'super_admin'
--   WHERE id = (
--     SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1
--   );
--
-- Or by email (copy the user's UUID from Supabase Auth → Users):
--
--   UPDATE profiles SET role = 'super_admin'
--   WHERE id = '<paste-user-uuid-here>';
--
-- Once you have one super_admin, you can invite all other users
-- through the web app at /dashboard/users (Invite User button).
-- ============================================================
