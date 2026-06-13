-- =====================================================================
-- Migration: wear tracking + saved outfits
-- Run this once in: Supabase Dashboard > SQL Editor > New query > Run
-- Safe to re-run (uses "if not exists" everywhere).
-- =====================================================================

-- Wear tracking columns on items
alter table public.items add column if not exists last_worn_at timestamptz;
alter table public.items add column if not exists wear_count integer not null default 0;

-- Status: ready | laundry | repair
alter table public.items add column if not exists status text not null default 'ready';

-- Saved outfits (Stylist favorites)
create table if not exists public.saved_outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  occasion    text not null,
  pieces      jsonb not null default '[]',
  note        text default '',
  created_at  timestamptz default now()
);

create index if not exists saved_outfits_user_idx on public.saved_outfits(user_id);

alter table public.saved_outfits enable row level security;

drop policy if exists "own saved outfits - select" on public.saved_outfits;
create policy "own saved outfits - select" on public.saved_outfits
  for select using (auth.uid() = user_id);

drop policy if exists "own saved outfits - insert" on public.saved_outfits;
create policy "own saved outfits - insert" on public.saved_outfits
  for insert with check (auth.uid() = user_id);

drop policy if exists "own saved outfits - delete" on public.saved_outfits;
create policy "own saved outfits - delete" on public.saved_outfits
  for delete using (auth.uid() = user_id);
