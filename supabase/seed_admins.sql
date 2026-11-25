-- ============================================================================
-- Seed Authorized Admin Accounts (Maximum 2 Allowed)
-- Instructions:
-- 1. Create these two users in Supabase Dashboard -> Authentication -> Users
--    (Disable public "Allow new users to sign up" in Auth -> Providers -> Email).
-- 2. Replace the placeholder emails below and run this script in SQL Editor.
-- ============================================================================

insert into public.admin_users (email, role)
values
  ('admin1@example.com', 'super_admin'),
  ('admin2@example.com', 'admin')
on conflict (email) do nothing;
