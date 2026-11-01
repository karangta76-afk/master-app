-- Run this in the Supabase SQL Editor after creating the admin Auth user.
-- The app admin login accepts only admin@masterapp.com.
alter table public.service_categories enable row level security;

grant select, insert, update, delete
on table public.service_categories
to authenticated;

drop policy if exists "service_categories_admin_manage"
on public.service_categories;

create policy "service_categories_admin_manage"
on public.service_categories
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'admin@masterapp.com')
with check ((auth.jwt() ->> 'email') = 'admin@masterapp.com');
