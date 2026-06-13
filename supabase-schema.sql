-- =====================================================================
-- THE WARDROBE — Supabase schema
-- Run this in: Supabase Dashboard > SQL Editor > New query > Run
-- =====================================================================

-- 1. Items table
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  brand       text default '',
  color       text default '',
  material    text default '',
  notes       text default '',
  tags        text[] default '{}',
  photo_url   text default '',
  created_at  timestamptz default now()
);

create index if not exists items_user_idx on public.items(user_id);

-- 2. Row-Level Security: each user sees only their own pieces
alter table public.items enable row level security;

drop policy if exists "own items - select" on public.items;
create policy "own items - select" on public.items
  for select using (auth.uid() = user_id);

drop policy if exists "own items - insert" on public.items;
create policy "own items - insert" on public.items
  for insert with check (auth.uid() = user_id);

drop policy if exists "own items - update" on public.items;
create policy "own items - update" on public.items
  for update using (auth.uid() = user_id);

drop policy if exists "own items - delete" on public.items;
create policy "own items - delete" on public.items
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- 3. Storage bucket for photos
--    Easiest path: create the bucket in the dashboard (Storage > New
--    bucket > name it "item-photos" > make it PUBLIC), then run the
--    policies below. If you prefer SQL, the insert here also works.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

drop policy if exists "photos - public read" on storage.objects;
create policy "photos - public read" on storage.objects
  for select using (bucket_id = 'item-photos');

drop policy if exists "photos - own upload" on storage.objects;
create policy "photos - own upload" on storage.objects
  for insert with check (
    bucket_id = 'item-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "photos - own update" on storage.objects;
create policy "photos - own update" on storage.objects
  for update using (
    bucket_id = 'item-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "photos - own delete" on storage.objects;
create policy "photos - own delete" on storage.objects
  for delete using (
    bucket_id = 'item-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================================
-- 4. Wear tracking
-- =====================================================================
alter table public.items add column if not exists last_worn_at timestamptz;
alter table public.items add column if not exists wear_count integer not null default 0;

-- Status: ready | laundry | repair
alter table public.items add column if not exists status text not null default 'ready';

-- =====================================================================
-- 5. Saved outfits (Stylist favorites)
-- =====================================================================
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

-- =====================================================================
-- 6. Cost-per-wear, seasonal storage, wear log
-- =====================================================================
alter table public.items add column if not exists price numeric;
alter table public.items add column if not exists in_storage boolean not null default false;

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
