-- ============================================================
-- OPENSHELF DATABASE SCHEMA
-- Multi-tenant library network (OverDrive/Libby-style)
-- ============================================================
-- Model:
--   OpenShelf Network (the platform itself) -- one signup
--     -> many Libraries (each has its own admin, logo, title)
--         -> Library Members (a user can hold a card at MANY libraries)
--         -> Books (ebooks / audiobooks), scoped to a single library
--             -> audiobook_tracks
--             -> ebook_files
--             -> bookmarks (per user, per book/track)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- PROFILES (extends Supabase auth.users) ----------
-- Every person who creates an OpenShelf account gets a profile.
-- This IS the "OpenShelf Network" signup — one account, many libraries.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  is_platform_admin boolean not null default false, -- OpenShelf staff only
  created_at timestamptz not null default now()
);

-- ---------- LIBRARIES ----------
-- Each library is its own tenant. Created by a user who signs up as
-- a "library admin" (NOT the same as an OpenShelf platform admin).
create table if not exists libraries (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,              -- e.g. "riverside-public"
  name text not null,                     -- displayed title
  description text,
  logo_url text,
  owner_id uuid not null references profiles(id) on delete cascade,
  is_public boolean not null default true, -- discoverable in library directory
  card_signup_mode text not null default 'open'
    check (card_signup_mode in ('open', 'approval_required', 'invite_only')),
  -- Lending policy for this library. Configurable by its admins.
  lending_limit_per_member int not null default 5,   -- max simultaneous active checkouts
  hold_limit_per_member int not null default 5,      -- max simultaneous active holds
  loan_period_days int not null default 21,          -- checkout length
  hold_expiry_days int not null default 3,           -- window to claim a ready hold
  created_at timestamptz not null default now()
);

-- ---------- LIBRARY ADMINS ----------
-- A library can have more than one admin/staff account managing its
-- catalog. The owner is always an admin; others can be added.
create table if not exists library_admins (
  id uuid primary key default uuid_generate_v4(),
  library_id uuid not null references libraries(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now(),
  unique (library_id, user_id)
);

-- ---------- LIBRARY MEMBERS (the "library card") ----------
-- A user can hold a card at MANY libraries at once. This is the join
-- table that represents "member signed up to a specific library".
create table if not exists library_members (
  id uuid primary key default uuid_generate_v4(),
  library_id uuid not null references libraries(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  card_number text not null default substr(replace(uuid_generate_v4()::text, '-', ''), 1, 12),
  status text not null default 'active' check (status in ('pending', 'active', 'suspended')),
  joined_at timestamptz not null default now(),
  unique (library_id, user_id)
);

-- ---------- BOOKS ----------
-- Every book belongs to exactly one library's private collection.
create table if not exists books (
  id uuid primary key default uuid_generate_v4(),
  library_id uuid not null references libraries(id) on delete cascade,
  title text not null,
  author text,
  description text,
  cover_url text,
  format text not null check (format in ('ebook', 'audiobook', 'both')),
  genre text,
  published_year int,
  total_copies int not null default 1,     -- for lending-limit simulation
  available_copies int not null default 1,
  added_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- AUDIOBOOK TRACKS ----------
create table if not exists audiobook_tracks (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references books(id) on delete cascade,
  track_number int not null,
  title text,               -- optional human title; NEVER the filename
  chapter_title text,       -- optional alt field, same rule
  duration_seconds numeric,
  audio_url text,           -- storage path/URL (internal use only, never rendered)
  file_url text,
  url text,
  created_at timestamptz not null default now(),
  unique (book_id, track_number)
);

-- ---------- EBOOK FILES ----------
create table if not exists ebook_files (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references books(id) on delete cascade,
  file_type text not null default 'epub' check (file_type in ('epub', 'pdf', 'txt')),
  file_url text not null,
  page_count int,
  created_at timestamptz not null default now()
);

-- ---------- CHECKOUTS (borrowing) ----------
create table if not exists checkouts (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references books(id) on delete cascade,
  library_id uuid not null references libraries(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  checked_out_at timestamptz not null default now(),
  due_at timestamptz not null default (now() + interval '21 days'),
  returned_at timestamptz
);

-- Fast "does this user already have this book out" / "how many active
-- checkouts does this user have" lookups.
create index if not exists idx_checkouts_user_active on checkouts (user_id) where returned_at is null;
create index if not exists idx_checkouts_book_active on checkouts (book_id) where returned_at is null;

-- ---------- HOLDS (waitlist queue) ----------
-- Placed when a member wants a book that has zero available_copies.
-- Lifecycle: waiting -> ready (a copy has been reserved for you, claim it
-- before expires_at) -> fulfilled (converted into a checkout) OR expired /
-- cancelled (the reserved copy, if any, is released back to the queue).
create table if not exists holds (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references books(id) on delete cascade,
  library_id uuid not null references libraries(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting', 'ready', 'fulfilled', 'expired', 'cancelled')),
  queue_position int,               -- 1-based position among 'waiting' holds for this book
  placed_at timestamptz not null default now(),
  ready_at timestamptz,             -- when a copy was reserved for this hold
  expires_at timestamptz            -- deadline to claim a 'ready' hold
);

create index if not exists idx_holds_book_waiting on holds (book_id, placed_at) where status = 'waiting';
create index if not exists idx_holds_user_active on holds (user_id) where status in ('waiting', 'ready');

-- ---------- BOOKMARKS ----------
-- Server-backed bookmarks (mirrors the localStorage shape used client-side
-- as an offline-first fallback; the client should prefer this table when
-- the user is signed in, and fall back to localStorage when signed out).
create table if not exists bookmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  track_id uuid references audiobook_tracks(id) on delete cascade,
  chapter_index int,
  chapter_label text,
  time_seconds numeric not null,
  created_at timestamptz not null default now()
);

-- ---------- PLAYBACK PROGRESS (per chapter, per user) ----------
create table if not exists playback_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  track_id uuid not null references audiobook_tracks(id) on delete cascade,
  position_seconds numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table libraries enable row level security;
alter table library_admins enable row level security;
alter table library_members enable row level security;
alter table books enable row level security;
alter table audiobook_tracks enable row level security;
alter table ebook_files enable row level security;
alter table checkouts enable row level security;
alter table bookmarks enable row level security;
alter table playback_progress enable row level security;

-- Profiles: user can read/update their own profile; anyone signed in can
-- read basic public fields (needed to show "owner" names on libraries).
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- Libraries: public libraries are readable by everyone; owners/admins can
-- manage their own library.
create policy "libraries_select_public" on libraries for select using (is_public = true or owner_id = auth.uid());
create policy "libraries_insert_own" on libraries for insert with check (owner_id = auth.uid());
create policy "libraries_update_admins" on libraries for update using (
  owner_id = auth.uid() or exists (
    select 1 from library_admins la where la.library_id = id and la.user_id = auth.uid()
  )
);

-- Library admins: readable by members of that admin team; writable by owner.
create policy "library_admins_select" on library_admins for select using (
  user_id = auth.uid() or exists (
    select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid()
  )
);
create policy "library_admins_insert_owner" on library_admins for insert with check (
  exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid())
);

-- Library members ("library cards"): a user can see/manage their own
-- memberships; library admins can see/manage members of their library.
create policy "library_members_select_own_or_admin" on library_members for select using (
  user_id = auth.uid() or exists (
    select 1 from library_admins la where la.library_id = library_id and la.user_id = auth.uid()
  )
);
create policy "library_members_insert_self" on library_members for insert with check (user_id = auth.uid());
create policy "library_members_update_admin" on library_members for update using (
  exists (select 1 from library_admins la where la.library_id = library_id and la.user_id = auth.uid())
);

-- Books: readable by anyone who holds an active card at that library,
-- or by that library's admins. Writable only by that library's admins.
create policy "books_select_members_or_admin" on books for select using (
  exists (
    select 1 from library_members lm
    where lm.library_id = books.library_id and lm.user_id = auth.uid() and lm.status = 'active'
  )
  or exists (
    select 1 from library_admins la where la.library_id = books.library_id and la.user_id = auth.uid()
  )
);
create policy "books_write_admin" on books for all using (
  exists (
    select 1 from library_admins la where la.library_id = books.library_id and la.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from library_admins la where la.library_id = books.library_id and la.user_id = auth.uid()
  )
);

-- Audiobook tracks / ebook files inherit access via their book's library.
create policy "tracks_select" on audiobook_tracks for select using (
  exists (
    select 1 from books b
    join library_members lm on lm.library_id = b.library_id and lm.user_id = auth.uid() and lm.status = 'active'
    where b.id = audiobook_tracks.book_id
  )
  or exists (
    select 1 from books b
    join library_admins la on la.library_id = b.library_id and la.user_id = auth.uid()
    where b.id = audiobook_tracks.book_id
  )
);
create policy "tracks_write_admin" on audiobook_tracks for all using (
  exists (
    select 1 from books b
    join library_admins la on la.library_id = b.library_id and la.user_id = auth.uid()
    where b.id = audiobook_tracks.book_id
  )
);

create policy "ebooks_select" on ebook_files for select using (
  exists (
    select 1 from books b
    join library_members lm on lm.library_id = b.library_id and lm.user_id = auth.uid() and lm.status = 'active'
    where b.id = ebook_files.book_id
  )
  or exists (
    select 1 from books b
    join library_admins la on la.library_id = b.library_id and la.user_id = auth.uid()
    where b.id = ebook_files.book_id
  )
);
create policy "ebooks_write_admin" on ebook_files for all using (
  exists (
    select 1 from books b
    join library_admins la on la.library_id = b.library_id and la.user_id = auth.uid()
    where b.id = ebook_files.book_id
  )
);

-- Checkouts: strictly per-user, READ ONLY from the client. All writes
-- (borrow / return) must go through the SECURITY DEFINER functions below,
-- which enforce lending limits and copy-availability atomically — a raw
-- client-side insert/update would race against other members and could
-- oversell copies, so it's intentionally not permitted here. Library
-- admins can also read checkouts for their own library (for a future
-- "manage loans" screen).
create policy "checkouts_select_own" on checkouts for select using (
  user_id = auth.uid()
  or exists (select 1 from library_admins la where la.library_id = checkouts.library_id and la.user_id = auth.uid())
);

-- Holds: same reasoning — read only, writes go through place_hold /
-- cancel_hold / claim_ready_hold.
alter table holds enable row level security;
create policy "holds_select_own" on holds for select using (
  user_id = auth.uid()
  or exists (select 1 from library_admins la where la.library_id = holds.library_id and la.user_id = auth.uid())
);

-- Bookmarks / progress: strictly per-user, full read/write (no scarcity
-- constraints here, so ordinary RLS is sufficient).
create policy "bookmarks_own" on bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress_own" on playback_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- LENDING LIMIT + HOLD QUEUE LOGIC
-- ============================================================
-- All of these are SECURITY DEFINER: they run with elevated privileges so
-- they can update `books.available_copies` (which ordinary members have no
-- UPDATE grant on) and insert/update `checkouts`/`holds` rows for the
-- calling user. Every function re-derives the calling user from auth.uid()
-- and re-checks membership/limits itself — never trust arguments alone.
-- Row-level locking (`for update`) on the `books` row is what makes
-- concurrent borrow/return/hold-promotion requests for the same title
-- safe instead of racy.

-- ---------- internal: renumber the waiting queue for a book ----------
create or replace function public._recompute_hold_positions(p_book_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with ordered as (
    select id, row_number() over (order by placed_at asc) as rn
    from holds
    where book_id = p_book_id and status = 'waiting'
  )
  update holds h
  set queue_position = ordered.rn
  from ordered
  where h.id = ordered.id;
end;
$$;

-- ---------- internal: promote the next waiting hold, if any ----------
-- Reserves ONE available copy for the earliest waiting hold, moving it to
-- 'ready' with an expiry window. Assumes the caller already holds a lock
-- on the books row for p_book_id. Returns true if a hold was promoted.
create or replace function public._promote_next_hold(p_book_id uuid, p_hold_expiry_days int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold holds%rowtype;
begin
  select * into v_hold
  from holds
  where book_id = p_book_id and status = 'waiting'
  order by placed_at asc
  limit 1
  for update;

  if not found then
    return false;
  end if;

  update holds
  set status = 'ready',
      ready_at = now(),
      expires_at = now() + make_interval(days => p_hold_expiry_days),
      queue_position = null
  where id = v_hold.id;

  -- The reserved copy leaves the "available" pool until claimed or the
  -- hold expires/is cancelled (see expire_stale_holds / cancel_hold).
  update books set available_copies = greatest(available_copies - 1, 0) where id = p_book_id;

  perform public._recompute_hold_positions(p_book_id);
  return true;
end;
$$;

-- ---------- borrow_book: direct checkout when a copy is available ----------
create or replace function public.borrow_book(p_book_id uuid)
returns checkouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_book books%rowtype;
  v_library libraries%rowtype;
  v_active_count int;
  v_checkout checkouts%rowtype;
begin
  if v_user is null then
    raise exception 'Not signed in.';
  end if;

  select * into v_book from books where id = p_book_id for update;
  if not found then
    raise exception 'This book no longer exists.';
  end if;

  select * into v_library from libraries where id = v_book.library_id;

  if not exists (
    select 1 from library_members
    where library_id = v_book.library_id and user_id = v_user and status = 'active'
  ) then
    raise exception 'You need an active card at this library to borrow this title.';
  end if;

  if exists (select 1 from checkouts where book_id = p_book_id and user_id = v_user and returned_at is null) then
    raise exception 'You already have this title checked out.';
  end if;

  if exists (select 1 from holds where book_id = p_book_id and user_id = v_user and status in ('waiting', 'ready')) then
    raise exception 'You already have a hold on this title — claim or cancel it first.';
  end if;

  if v_book.available_copies <= 0 then
    raise exception 'No copies available — join the waitlist instead.';
  end if;

  select count(*) into v_active_count from checkouts where user_id = v_user and returned_at is null;
  if v_active_count >= v_library.lending_limit_per_member then
    raise exception 'You have reached your % simultaneous checkout limit.', v_library.lending_limit_per_member;
  end if;

  update books set available_copies = available_copies - 1 where id = p_book_id;

  insert into checkouts (book_id, library_id, user_id, due_at)
  values (p_book_id, v_book.library_id, v_user, now() + make_interval(days => v_library.loan_period_days))
  returning * into v_checkout;

  return v_checkout;
end;
$$;

-- ---------- return_book: end a loan early or manually ----------
create or replace function public.return_book(p_checkout_id uuid)
returns checkouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_checkout checkouts%rowtype;
  v_library libraries%rowtype;
begin
  select * into v_checkout from checkouts where id = p_checkout_id for update;
  if not found or v_checkout.user_id <> v_user then
    raise exception 'Checkout not found.';
  end if;
  if v_checkout.returned_at is not null then
    raise exception 'This title was already returned.';
  end if;

  update checkouts set returned_at = now() where id = p_checkout_id returning * into v_checkout;

  -- Lock the book row, release the copy, then immediately try to hand it
  -- to the next person in the hold queue instead of leaving it "available"
  -- to whoever browses the catalog first.
  perform 1 from books where id = v_checkout.book_id for update;
  update books set available_copies = available_copies + 1 where id = v_checkout.book_id;

  select * into v_library from libraries where id = v_checkout.library_id;
  perform public._promote_next_hold(v_checkout.book_id, v_library.hold_expiry_days);

  return v_checkout;
end;
$$;

-- ---------- place_hold: join the waitlist ----------
create or replace function public.place_hold(p_book_id uuid)
returns holds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_book books%rowtype;
  v_library libraries%rowtype;
  v_active_holds int;
  v_hold holds%rowtype;
begin
  if v_user is null then
    raise exception 'Not signed in.';
  end if;

  select * into v_book from books where id = p_book_id for update;
  if not found then
    raise exception 'This book no longer exists.';
  end if;
  select * into v_library from libraries where id = v_book.library_id;

  if not exists (
    select 1 from library_members
    where library_id = v_book.library_id and user_id = v_user and status = 'active'
  ) then
    raise exception 'You need an active card at this library to place a hold.';
  end if;

  if v_book.available_copies > 0 then
    raise exception 'Copies are available — borrow it directly instead of joining the waitlist.';
  end if;

  if exists (select 1 from checkouts where book_id = p_book_id and user_id = v_user and returned_at is null) then
    raise exception 'You already have this title checked out.';
  end if;

  if exists (select 1 from holds where book_id = p_book_id and user_id = v_user and status in ('waiting', 'ready')) then
    raise exception 'You already have a hold on this title.';
  end if;

  select count(*) into v_active_holds from holds where user_id = v_user and status in ('waiting', 'ready');
  if v_active_holds >= v_library.hold_limit_per_member then
    raise exception 'You have reached your % simultaneous hold limit.', v_library.hold_limit_per_member;
  end if;

  insert into holds (book_id, library_id, user_id, status, placed_at)
  values (p_book_id, v_book.library_id, v_user, 'waiting', now())
  returning * into v_hold;

  perform public._recompute_hold_positions(p_book_id);
  select * into v_hold from holds where id = v_hold.id;
  return v_hold;
end;
$$;

-- ---------- cancel_hold: leave the waitlist, or give up a ready copy ----------
create or replace function public.cancel_hold(p_hold_id uuid)
returns holds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_hold holds%rowtype;
  v_library libraries%rowtype;
  v_was_ready boolean;
begin
  select * into v_hold from holds where id = p_hold_id for update;
  if not found or v_hold.user_id <> v_user then
    raise exception 'Hold not found.';
  end if;
  if v_hold.status not in ('waiting', 'ready') then
    raise exception 'This hold is no longer active.';
  end if;

  v_was_ready := v_hold.status = 'ready';

  update holds set status = 'cancelled' where id = p_hold_id returning * into v_hold;

  if v_was_ready then
    -- The copy reserved for this hold goes back into circulation and is
    -- immediately offered to the next person in line.
    perform 1 from books where id = v_hold.book_id for update;
    update books set available_copies = available_copies + 1 where id = v_hold.book_id;
    select * into v_library from libraries where id = v_hold.library_id;
    perform public._promote_next_hold(v_hold.book_id, v_library.hold_expiry_days);
  else
    perform public._recompute_hold_positions(v_hold.book_id);
  end if;

  return v_hold;
end;
$$;

-- ---------- claim_ready_hold: turn a 'ready' hold into a checkout ----------
create or replace function public.claim_ready_hold(p_hold_id uuid)
returns checkouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_hold holds%rowtype;
  v_library libraries%rowtype;
  v_active_count int;
  v_checkout checkouts%rowtype;
begin
  select * into v_hold from holds where id = p_hold_id for update;
  if not found or v_hold.user_id <> v_user then
    raise exception 'Hold not found.';
  end if;
  if v_hold.status <> 'ready' then
    raise exception 'This hold is not ready to claim yet.';
  end if;
  if v_hold.expires_at is not null and v_hold.expires_at < now() then
    raise exception 'This hold has expired.';
  end if;

  select * into v_library from libraries where id = v_hold.library_id;

  select count(*) into v_active_count from checkouts where user_id = v_user and returned_at is null;
  if v_active_count >= v_library.lending_limit_per_member then
    raise exception 'You have reached your % simultaneous checkout limit — return something first.', v_library.lending_limit_per_member;
  end if;

  update holds set status = 'fulfilled' where id = p_hold_id;

  -- The copy was already reserved (removed from available_copies) when the
  -- hold became 'ready', so borrowing it here does NOT decrement again.
  insert into checkouts (book_id, library_id, user_id, due_at)
  values (v_hold.book_id, v_hold.library_id, v_user, now() + make_interval(days => v_library.loan_period_days))
  returning * into v_checkout;

  return v_checkout;
end;
$$;

-- ---------- expire_stale_holds: sweep 'ready' holds past their deadline ----------
-- Not triggered automatically by Postgres — call this periodically (a
-- Supabase scheduled Edge Function or pg_cron job calling
-- `select public.expire_stale_holds();` once every few minutes is enough).
-- The client also calls it opportunistically on Dashboard/BookDetails load
-- as a best-effort fallback so demo/dev setups work without a scheduler.
create or replace function public.expire_stale_holds()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold record;
  v_library libraries%rowtype;
  v_count int := 0;
begin
  for v_hold in
    select * from holds where status = 'ready' and expires_at < now()
  loop
    update holds set status = 'expired' where id = v_hold.id;
    perform 1 from books where id = v_hold.book_id for update;
    update books set available_copies = available_copies + 1 where id = v_hold.book_id;
    select * into v_library from libraries where id = v_hold.library_id;
    perform public._promote_next_hold(v_hold.book_id, v_library.hold_expiry_days);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------- admin_set_total_copies: admin adds/removes physical/license copies ----------
create or replace function public.admin_set_total_copies(p_book_id uuid, p_new_total int)
returns books
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_book books%rowtype;
  v_library libraries%rowtype;
  v_delta int;
  v_promotions int;
begin
  select * into v_book from books where id = p_book_id for update;
  if not found then
    raise exception 'Book not found.';
  end if;

  if not exists (
    select 1 from library_admins where library_id = v_book.library_id and user_id = v_user
  ) then
    raise exception 'Only this library''s admins can change copy counts.';
  end if;

  if p_new_total < 0 then
    raise exception 'Copy count cannot be negative.';
  end if;

  v_delta := p_new_total - v_book.total_copies;

  update books
  set total_copies = p_new_total,
      available_copies = greatest(available_copies + v_delta, 0)
  where id = p_book_id
  returning * into v_book;

  -- If copies were ADDED, immediately try to satisfy waiting holds with
  -- the newly available inventory.
  if v_delta > 0 then
    select * into v_library from libraries where id = v_book.library_id;
    for v_promotions in 1..v_delta loop
      exit when not public._promote_next_hold(p_book_id, v_library.hold_expiry_days);
    end loop;
    select * into v_book from books where id = p_book_id;
  end if;

  return v_book;
end;
$$;

grant execute on function public.borrow_book(uuid) to authenticated;
grant execute on function public.return_book(uuid) to authenticated;
grant execute on function public.place_hold(uuid) to authenticated;
grant execute on function public.cancel_hold(uuid) to authenticated;
grant execute on function public.claim_ready_hold(uuid) to authenticated;
grant execute on function public.expire_stale_holds() to authenticated;
grant execute on function public.admin_set_total_copies(uuid, int) to authenticated;

-- ------------------------------------------------------------
-- IMPORTANT: Supabase applies `alter default privileges ... grant execute
-- on functions to anon, authenticated` at the project level, so every
-- function above is created with EXECUTE already granted to BOTH of those
-- roles — including the two internal-only helpers and handle_new_user,
-- which should never be callable directly by a client. The explicit grants
-- above are therefore not sufficient by themselves; the revokes below are
-- what actually lock this down, and must run AFTER every create/replace in
-- this file (a `create or replace function` does not reset privileges, but
-- a fresh `create function` on a brand new database will re-apply the
-- default privilege grant, so keep this block last).
-- ------------------------------------------------------------
revoke all on function public._promote_next_hold(uuid, int) from anon, authenticated, public;
revoke all on function public._recompute_hold_positions(uuid) from anon, authenticated, public;
revoke all on function public.handle_new_user() from anon, authenticated, public;
revoke all on function public.borrow_book(uuid) from anon, public;
revoke all on function public.return_book(uuid) from anon, public;
revoke all on function public.place_hold(uuid) from anon, public;
revoke all on function public.cancel_hold(uuid) from anon, public;
revoke all on function public.claim_ready_hold(uuid) from anon, public;
revoke all on function public.expire_stale_holds() from anon, public;
revoke all on function public.admin_set_total_copies(uuid, int) from anon, public;

-- Stop this from silently recurring on functions added later — each new
-- function's client privileges should be granted explicitly from now on.
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- ============================================================
-- HELPER: auto-create a profile row when a new auth user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
