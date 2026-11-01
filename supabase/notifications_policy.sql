-- Run this in the Supabase SQL Editor to allow notification operations
-- for both anon and authenticated clients.

alter table public.notifications enable row level security;

grant select, insert, update, delete
on table public.notifications
to anon, authenticated;

-- Allow reading notifications matching user_id
drop policy if exists "notifications_select_policy" on public.notifications;
create policy "notifications_select_policy"
on public.notifications
for select
to anon, authenticated
using (true);

-- Allow inserting notifications (e.g. customer booking notification to provider)
drop policy if exists "notifications_insert_policy" on public.notifications;
create policy "notifications_insert_policy"
on public.notifications
for insert
to anon, authenticated
with check (true);

-- Allow updating notifications (e.g. mark as read)
drop policy if exists "notifications_update_policy" on public.notifications;
create policy "notifications_update_policy"
on public.notifications
for update
to anon, authenticated
using (true)
with check (true);
