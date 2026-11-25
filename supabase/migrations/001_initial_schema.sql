-- ============================================================================
-- GN BHARATH - CINEMATIC BIRTHDAY EXPERIENCE
-- Migration 001: Admin Users, Media Items, Controlled Storage Bucket & RLS
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ADMIN USERS TABLE (Strictly limited to TWO authorized admin accounts)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);

-- Enforce strict cap of 2 admin accounts in the database
create or replace function public.enforce_max_two_admins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_count integer;
begin
  select count(*) into admin_count from public.admin_users;
  if admin_count >= 2 then
    raise exception 'Strictly restricted: maximum of two authorized admin accounts allowed.';
  end if;
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists trg_enforce_max_two_admins on public.admin_users;
create trigger trg_enforce_max_two_admins
before insert on public.admin_users
for each row
execute function public.enforce_max_two_admins();

alter table public.admin_users enable row level security;

-- ----------------------------------------------------------------------------
-- 2. SECURITY DEFINER ADMIN VERIFICATION FUNCTION
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.admin_users a
      where
        a.id = auth.uid()
        or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Admin users RLS: only authenticated admins can read their own/admin roster; no public access or self-signup
drop policy if exists "Admins can view admin_users" on public.admin_users;
create policy "Admins can view admin_users"
  on public.admin_users
  for select
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. MEDIA ITEMS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0 and char_length(title) <= 160),
  caption text not null default '' check (char_length(caption) <= 1000),
  media_type text not null check (media_type in ('photo', 'video')),
  mime_type text not null check (
    mime_type in (
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm'
    )
  ),
  storage_path text not null unique,
  file_size bigint not null check (
    file_size > 0
    and (
      (media_type = 'photo' and file_size <= 10485760)
      or (media_type = 'video' and file_size <= 52428800)
    )
  ),
  display_order integer not null default 0,
  is_published boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_media_items_published_order
  on public.media_items (is_published, display_order asc, created_at desc);

alter table public.media_items enable row level security;

-- Public (anon) can ONLY SELECT published rows
drop policy if exists "Public can view published media" on public.media_items;
create policy "Public can view published media"
  on public.media_items
  for select
  to anon
  using (is_published = true);

-- Authenticated users: admins see all; non-admin authenticated users only see published
drop policy if exists "Authenticated read published or admin all" on public.media_items;
create policy "Authenticated read published or admin all"
  on public.media_items
  for select
  to authenticated
  using (is_published = true or public.is_admin());

-- Only admins can INSERT, UPDATE, DELETE media_items
drop policy if exists "Admins can insert media" on public.media_items;
create policy "Admins can insert media"
  on public.media_items
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update media" on public.media_items;
create policy "Admins can update media"
  on public.media_items
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete media" on public.media_items;
create policy "Admins can delete media"
  on public.media_items
  for delete
  to authenticated
  using (public.is_admin());

-- Enable Realtime for live sync between /admin and the 3D birthday experience
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'media_items'
  ) then
    alter publication supabase_realtime add table public.media_items;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4. SUPABASE STORAGE BUCKET: birthday-media (Controlled Bucket + RLS)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'birthday-media',
  'birthday-media',
  false,
  52428800, -- 50 MB max limit
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Optional controlled bucket for custom background music (MP3 / OGG up to 15 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'birthday-audio',
  'birthday-audio',
  false,
  15728640, -- 15 MB max limit
  array[
    'audio/mpeg',
    'audio/ogg'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS for birthday-media:
-- Public (anon) & authenticated can ONLY read files linked to published media_items (admins can read all for drafts)
drop policy if exists "Read published birthday media objects" on storage.objects;
create policy "Read published birthday media objects"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'birthday-media'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.media_items m
        where m.storage_path = name
          and m.is_published = true
      )
    )
  );

-- Only admins can upload, modify, or delete objects in birthday-media
drop policy if exists "Admins can upload birthday media" on storage.objects;
create policy "Admins can upload birthday media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'birthday-media'
    and public.is_admin()
  );

drop policy if exists "Admins can update birthday media" on storage.objects;
create policy "Admins can update birthday media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'birthday-media'
    and public.is_admin()
  )
  with check (
    bucket_id = 'birthday-media'
    and public.is_admin()
  );

drop policy if exists "Admins can delete birthday media" on storage.objects;
create policy "Admins can delete birthday media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'birthday-media'
    and public.is_admin()
  );

-- Storage RLS for birthday-audio
drop policy if exists "Read birthday audio objects" on storage.objects;
create policy "Read birthday audio objects"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'birthday-audio');

drop policy if exists "Admins can manage birthday audio" on storage.objects;
create policy "Admins can manage birthday audio"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'birthday-audio' and public.is_admin())
  with check (bucket_id = 'birthday-audio' and public.is_admin());
