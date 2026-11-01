-- =====================================================================
-- MASTER APP - QUICK SQL FIX FOR PERMISSIONS & CHAT COLUMNS
-- =====================================================================
-- Paste and run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pugqvqlsoqvwwbyajvdm/sql

-- 1. Ensure booking_id column exists on messages
alter table public.messages add column if not exists booking_id text;

-- 2. Grant table permissions to anon (public frontend) and authenticated roles
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.reviews to anon, authenticated;
grant select, insert, update, delete on table public.notifications to anon, authenticated;
grant select, insert, update, delete on table public.messages to anon, authenticated;

-- 3. Configure Row Level Security (RLS) policies
alter table public.reviews enable row level security;
drop policy if exists "reviews_access" on public.reviews;
create policy "reviews_access" on public.reviews for all to anon, authenticated using (true) with check (true);

alter table public.notifications enable row level security;
drop policy if exists "notifications_access" on public.notifications;
create policy "notifications_access" on public.notifications for all to anon, authenticated using (true) with check (true);

alter table public.messages enable row level security;
drop policy if exists "messages_access" on public.messages;
create policy "messages_access" on public.messages for all to anon, authenticated using (true) with check (true);
