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
