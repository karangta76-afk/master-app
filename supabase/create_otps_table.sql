-- =====================================================================
-- MASTER APP - REAL DYNAMIC OTP VERIFICATION TABLE
-- =====================================================================
-- Run this script in Supabase SQL Editor (Dashboard > SQL Editor) to
-- enable cloud-stored OTPs for Mobile SMS and Email verification.

create table if not exists public.otps (
  id uuid primary key default uuid_generate_v4(),
  target text not null,               -- Mobile (+91...) or Email (user@...)
  channel text not null default 'sms',-- 'sms' or 'email'
  otp_code text not null,             -- 6-digit cryptographic verification code
  expires_at timestamp with time zone not null,
  attempts integer default 0,
  is_verified boolean default false,
  created_at timestamp with time zone default now()
);

-- Index for instant lookup & expiry checks
create index if not exists idx_otps_target on public.otps(target, is_verified);

-- Enable RLS
alter table public.otps enable row level security;

-- Policies for public anonymous verification
drop policy if exists "Allow anon insert otps" on public.otps;
create policy "Allow anon insert otps" on public.otps for insert with check (true);

drop policy if exists "Allow anon select otps" on public.otps;
create policy "Allow anon select otps" on public.otps for select using (true);

drop policy if exists "Allow anon update otps" on public.otps;
create policy "Allow anon update otps" on public.otps for update using (true);

grant all on public.otps to anon, authenticated, service_role;
