-- =====================================================================
-- MASTER APP - FULL SUPABASE DATABASE SCHEMA & POLICIES
-- =====================================================================
-- Run this entire script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- to provision or update all tables, views, RLS policies, and role grants.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. SERVICE CATEGORIES TABLE
-- ---------------------------------------------------------------------
create table if not exists public.service_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  icon text,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- 2. CUSTOMERS TABLE
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id text primary key,
  name text not null,
  mobile text not null unique,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  area text,
  alternative_mobile text,
  latitude double precision,
  longitude double precision,
  account_status text default 'Active',
  auth_user_id uuid,
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- 3. PROVIDERS TABLE
-- ---------------------------------------------------------------------
create table if not exists public.providers (
  id text primary key,
  name text not null,
  mobile text not null unique,
  email text,
  service text not null,
  city text not null,
  address text,
  experience text,
  price text,
  description text,
  availability text default 'Available',
  account_status text default 'Pending',
  custom_service_name text,
  custom_service_description text,
  service_category_id uuid references public.service_categories(id) on delete set null,
  category_request_status text,
  state text,
  pincode text,
  area text,
  alternative_mobile text,
  latitude double precision,
  longitude double precision,
  service_radius integer default 15,
  profile_image text,
  auth_user_id uuid,
  deletion_requested_at timestamp with time zone,
  previous_account_status text,
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- 4. PROVIDER PUBLIC VIEW (Excludes sensitive contact info before booking)
-- ---------------------------------------------------------------------
create or replace view public.providers_public
with (security_invoker = true) as
select
  id,
  name,
  service,
  city,
  address,
  experience,
  price,
  description,
  availability,
  custom_service_name,
  custom_service_description,
  service_category_id,
  state,
  pincode,
  latitude,
  longitude,
  service_radius,
  area,
  profile_image,
  created_at
from public.providers
where account_status = 'Approved';

-- ---------------------------------------------------------------------
-- 5. PROVIDER SKILLS TABLE
-- ---------------------------------------------------------------------
create table if not exists public.provider_skills (
  id uuid primary key default uuid_generate_v4(),
  provider_id text references public.providers(id) on delete cascade,
  skill_name text not null,
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- 6. BOOKINGS TABLE
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id text primary key,
  customer_id text not null,
  provider_id text not null,
  customer_name text,
  customer_mobile text,
  provider_name text,
  provider_service text,
  service text not null,
  booking_date text not null,
  booking_time text,
  address text,
  requirement text,
  status text default 'Pending',
  cancellation_reason text,
  customer_latitude double precision,
  customer_longitude double precision,
  customer_address text,
  customer_city text,
  customer_pincode text,
  customer_area text,
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- 7. REVIEWS TABLE
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id text primary key,
  booking_id text,
  customer_id text,
  provider_id text,
  rating numeric not null check (rating >= 1 and rating <= 5),
  comment text,
  status text default 'Published',
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- 8. NOTIFICATIONS TABLE
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  title text not null,
  message text not null,
  type text default 'info',
  read boolean default false,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- 9. MESSAGES TABLE
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  booking_id text,
  sender_id text not null,
  receiver_id text not null,
  sender_type text not null check (sender_type in ('customer', 'provider')),
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) & GRANTS
-- ---------------------------------------------------------------------
-- Enable RLS across all tables
alter table public.service_categories enable row level security;
alter table public.customers enable row level security;
alter table public.providers enable row level security;
alter table public.provider_skills enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;

-- Grant permissions to anon and authenticated roles
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.service_categories to anon, authenticated;
grant select, insert, update, delete on table public.customers to anon, authenticated;
grant select, insert, update, delete on table public.providers to anon, authenticated;
grant select, insert, update, delete on table public.provider_skills to anon, authenticated;
grant select, insert, update, delete on table public.bookings to anon, authenticated;
grant select, insert, update, delete on table public.reviews to anon, authenticated;
grant select, insert, update, delete on table public.notifications to anon, authenticated;
grant select, insert, update, delete on table public.messages to anon, authenticated;

-- Policies for anon & authenticated clients (Permissive for demo/hybrid architecture)
drop policy if exists "service_categories_access" on public.service_categories;
create policy "service_categories_access" on public.service_categories for all to anon, authenticated using (true) with check (true);

drop policy if exists "customers_access" on public.customers;
create policy "customers_access" on public.customers for all to anon, authenticated using (true) with check (true);

drop policy if exists "providers_access" on public.providers;
create policy "providers_access" on public.providers for all to anon, authenticated using (true) with check (true);

drop policy if exists "provider_skills_access" on public.provider_skills;
create policy "provider_skills_access" on public.provider_skills for all to anon, authenticated using (true) with check (true);

drop policy if exists "bookings_access" on public.bookings;
create policy "bookings_access" on public.bookings for all to anon, authenticated using (true) with check (true);

drop policy if exists "reviews_access" on public.reviews;
create policy "reviews_access" on public.reviews for all to anon, authenticated using (true) with check (true);

drop policy if exists "notifications_access" on public.notifications;
create policy "notifications_access" on public.notifications for all to anon, authenticated using (true) with check (true);

drop policy if exists "messages_access" on public.messages;
create policy "messages_access" on public.messages for all to anon, authenticated using (true) with check (true);
