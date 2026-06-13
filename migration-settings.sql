-- =====================================================================
-- THE WARDROBE — Settings module migration
-- Run this in: Supabase Dashboard > SQL Editor > New query > Run
-- =====================================================================

create table if not exists public.user_settings (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  currency             text not null default 'PKR',
  theme                text not null default 'light',
  ai_identify          boolean not null default true,
  ai_stylist           boolean not null default true,
  ai_packing           boolean not null default true,
  ai_pairings          boolean not null default true,
  ai_shopping_gaps     boolean not null default true,
  reminders_enabled    boolean not null default true,
  reminder_days        integer not null default 14,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "own settings - select" on public.user_settings;
create policy "own settings - select" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "own settings - insert" on public.user_settings;
create policy "own settings - insert" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "own settings - update" on public.user_settings;
create policy "own settings - update" on public.user_settings
  for update using (auth.uid() = user_id);
