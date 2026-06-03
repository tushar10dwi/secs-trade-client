-- ================================================================
--  SECSTRADE — SUPABASE SCHEMA
--  Run this entire file in your Supabase SQL Editor once.
--  Dashboard → SQL Editor → New query → paste → Run
-- ================================================================

-- 1. PROFILES
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  name          text,
  roll_number   text,
  phone         text,
  current_section text,
  wanted_section  text,
  is_blacklisted  boolean default false,
  created_at    timestamptz default now()
);

-- Auto-create profile row when a user signs up via OTP
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. TRADE REQUESTS
create table if not exists public.trade_requests (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at  timestamptz default now(),
  unique(sender_id, receiver_id)
);


-- 3. CHAT ROOMS
create table if not exists public.chat_rooms (
  id      text primary key,   -- sorted user1_user2
  user1   uuid not null references public.profiles(id) on delete cascade,
  user2   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);


-- 4. MESSAGES
create table if not exists public.messages (
  id        uuid primary key default gen_random_uuid(),
  room_id   text not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content   text not null,
  created_at timestamptz default now()
);


-- 5. REPORTS
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  resolved    boolean default false,
  created_at  timestamptz default now()
);


-- 6. FEEDBACKS
create table if not exists public.feedbacks (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  message   text not null,
  created_at timestamptz default now()
);


-- 7. SETTINGS (singleton row, id=1)
create table if not exists public.settings (
  id                    int primary key default 1,
  sections              text[] default '{}',
  max_requests_per_user int default 5,
  updated_at            timestamptz default now()
);

-- Insert default settings row
insert into public.settings (id, sections, max_requests_per_user)
values (1, ARRAY[
  'S1-A1','S1-A2','S1-A3','S1-A4',
  'S1-B1','S1-B2','S1-B3','S1-B4',
  'S1-C1','S1-C2','S1-C3','S1-C4',
  'S1-D1','S1-D2','S1-D3','S1-D4',
  'S1-E1','S1-E2','S1-E3','S1-E4',
  'S1-F1','S1-F2','S1-F3','S1-F4',
  'S1-G1','S1-G2','S1-G3','S1-G4',
  'S2-A1','S2-A2','S2-B1','S2-B2'
], 5)
on conflict (id) do nothing;


-- ================================================================
--  ROW LEVEL SECURITY
-- ================================================================

alter table public.profiles       enable row level security;
alter table public.trade_requests enable row level security;
alter table public.chat_rooms     enable row level security;
alter table public.messages       enable row level security;
alter table public.reports        enable row level security;
alter table public.feedbacks      enable row level security;
alter table public.settings       enable row level security;

-- PROFILES
create policy "Users can read all non-blacklisted profiles"
  on public.profiles for select using (is_blacklisted = false or id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update using (id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles for insert with check (id = auth.uid());


-- TRADE REQUESTS
create policy "Users can see own requests"
  on public.trade_requests for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "Users can create requests"
  on public.trade_requests for insert with check (sender_id = auth.uid());

create policy "Parties can update request status"
  on public.trade_requests for update
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "Sender can delete request"
  on public.trade_requests for delete using (sender_id = auth.uid());


-- CHAT ROOMS
create policy "Parties can see their rooms"
  on public.chat_rooms for select
  using (user1 = auth.uid() or user2 = auth.uid());

create policy "Parties can insert rooms"
  on public.chat_rooms for insert
  with check (user1 = auth.uid() or user2 = auth.uid());


-- MESSAGES
create policy "Room members can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.chat_rooms
      where id = messages.room_id
        and (user1 = auth.uid() or user2 = auth.uid())
    )
  );

create policy "Room members can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.chat_rooms
      where id = messages.room_id
        and (user1 = auth.uid() or user2 = auth.uid())
    )
  );


-- REPORTS
create policy "Users can file reports"
  on public.reports for insert with check (reporter_id = auth.uid());

create policy "Users can see own filed reports"
  on public.reports for select using (reporter_id = auth.uid());


-- FEEDBACKS
create policy "Users can submit feedback"
  on public.feedbacks for insert with check (user_id = auth.uid());


-- SETTINGS (public read, no writes by normal users)
create policy "Anyone can read settings"
  on public.settings for select using (true);


-- ================================================================
--  REALTIME  (enable for messages so chat works live)
-- ================================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.trade_requests;


-- ================================================================
--  ADMIN: grant service_role full access for admin panel
--  (Admin dashboard uses the anon key + admin bypass via RLS policies)
--  For a production setup, create a separate admin Supabase function.
-- ================================================================

-- Allow service role to bypass RLS (already default in Supabase)
-- The admin panel queries bypass RLS via service key if needed.
-- For now, add admin-only policies:

create policy "Service role full access profiles"
  on public.profiles for all using (auth.role() = 'service_role');

create policy "Service role full access reports"
  on public.reports for all using (auth.role() = 'service_role');

create policy "Service role full access feedbacks"
  on public.feedbacks for all using (auth.role() = 'service_role');

create policy "Service role full access settings"
  on public.settings for all using (auth.role() = 'service_role');
