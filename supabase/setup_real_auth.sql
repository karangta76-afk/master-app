-- =====================================================================
-- MASTER APP - REAL AUTHENTICATION SETUP & ADMIN PROVISIONING
-- =====================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pugqvqlsoqvwwbyajvdm/sql

-- 1. Ensure auth schema extension for password hashing
create extension if not exists pgcrypto;

-- 2. Provision Admin User in auth.users (if not already present)
-- Credentials: admin@masterapp.com / Admin@123
do $$
declare
  admin_user_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
begin
  if not exists (select 1 from auth.users where email = 'admin@masterapp.com') then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'admin@masterapp.com',
      crypt('Admin@123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Master App Admin","role":"admin"}',
      now(),
      now(),
      ''
    );

    -- Insert into auth.identities
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      admin_user_id::text,
      admin_user_id,
      json_build_object('sub', admin_user_id::text, 'email', 'admin@masterapp.com'),
      'email',
      admin_user_id::text,
      now(),
      now(),
      now()
    );
  else
    -- Update existing admin password to Admin@123 and mark confirmed
    update auth.users
    set encrypted_password = crypt('Admin@123', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"admin"')
    where email = 'admin@masterapp.com';
  end if;
end $$;

-- 3. Ensure customers & providers have email unique constraints or indexes
create index if not exists idx_customers_email on public.customers(email);
create index if not exists idx_customers_mobile on public.customers(mobile);
create index if not exists idx_providers_email on public.providers(email);
create index if not exists idx_providers_mobile on public.providers(mobile);

-- 4. Ensure RLS policies allow authenticated and anon operations
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.customers to anon, authenticated;
grant select, insert, update, delete on table public.providers to anon, authenticated;
grant select, insert, update, delete on table public.bookings to anon, authenticated;
grant select, insert, update, delete on table public.reviews to anon, authenticated;
grant select, insert, update, delete on table public.notifications to anon, authenticated;
grant select, insert, update, delete on table public.messages to anon, authenticated;
