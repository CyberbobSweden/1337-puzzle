-- ══════════════════════════════════════════════════════════
-- 1337/42 PUZZLE — Supabase Schema
-- Paste this in: Supabase Dashboard → SQL Editor → Run
-- ══════════════════════════════════════════════════════════

-- PROFILES (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  max_level int default 1,
  max_stage int default 1,
  is_admin boolean default false,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Anyone can read profiles" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- BANS
create table public.bans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  banned_by uuid references public.profiles(id),
  reason text,
  banned_until timestamptz,
  created_at timestamptz default now()
);
alter table public.bans enable row level security;
create policy "Users see own bans, admins see all" on public.bans for select
  using (auth.uid() = user_id or exists(select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Admins insert bans" on public.bans for insert
  with check (exists(select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Admins delete bans" on public.bans for delete
  using (exists(select 1 from public.profiles where id = auth.uid() and is_admin));

-- AUTO-CREATE PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, new.email = 'richard.x.bostrom@gmail.com');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
