-- =====================================================================
-- Migration: price, seasonal storage, wear log
-- Run this once in: Supabase Dashboard > SQL Editor > New query > Run
-- Safe to re-run (uses "if not exists" everywhere).
-- =====================================================================

-- Cost-per-wear: optional purchase price (in Rs)
alter table public.items add column if not exists price numeric;

-- Seasonal storage: separate from status (ready | laundry | repair).
-- Items marked in_storage are excluded from the Stylist.
alter table public.items add column if not exists in_storage boolean not null default false;

-- =====================================================================
-- Wear log (outfit calendar / history)
-- =====================================================================
create table if not exists public.wear_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  worn_on     date not null default current_date,
  items       jsonb not null default '[]', -- [{ id, name }]
  note        text default '',
  created_at  timestamptz default now()
);

create index if not exists wear_log_user_idx on public.wear_log(user_id);
create index if not exists wear_log_date_idx on public.wear_log(worn_on);

alter table public.wear_log enable row level security;

drop policy if exists "own wear log - select" on public.wear_log;
create policy "own wear log - select" on public.wear_log
  for select using (auth.uid() = user_id);

drop policy if exists "own wear log - insert" on public.wear_log;
create policy "own wear log - insert" on public.wear_log
  for insert with check (auth.uid() = user_id);

drop policy if exists "own wear log - delete" on public.wear_log;
create policy "own wear log - delete" on public.wear_log
  for delete using (auth.uid() = user_id);
