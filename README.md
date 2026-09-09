# OpenShelf

A multi-tenant library network — audiobooks and ebooks, OverDrive/Libby-style.
Built with React, Vite, React Router, and Supabase.

## How the network model works

- **OpenShelf Network account** — one signup (`/signup`) creates your platform-wide
  account (`profiles` table). This is *not* a library card.
- **Libraries** — independently run tenants (`libraries` table), each with its own
  logo, name, description, and catalog. Anyone with an OpenShelf account can start
  one at `/admin/create-library`.
- **Library cards** — a `library_members` row joining a user to a library. A user
  can hold cards at as many libraries as they like (`/libraries` to browse and join,
  `/library-card` to see all your cards). The navbar's library switcher sets which
  library's catalog you're currently browsing.
- **Library admin** — a `library_admins` row. Admins manage *only their own*
  library's catalog at `/admin/:libraryId` — they never touch the OpenShelf platform
  itself. The library's owner can add more admins for their team.
- **Books, audiobook tracks, ebook files** — all scoped by `library_id` /
  `book_id`, so each library's collection is private to its own members
  (enforced by the Row Level Security policies in `supabase/schema.sql`).

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
```

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor (or via `supabase db push`) — this
   creates every table, RLS policy, and the `handle_new_user` trigger that turns
   each new `auth.users` row into a `profiles` row automatically.
3. `npm run dev`

The steps above are for local preview only. To make OpenShelf reachable on the
internet — the way Libby/OverDrive are, for anyone with a link, not just on
your machine — see **Deploy** below. Nobody who *uses* the deployed site ever
runs a terminal command; only the one-time setup does, and even that can be
done entirely through GitHub's and Supabase's web dashboards.

## Deploy (public, live on the internet — no local commands)

OpenShelf is a static frontend (this repo) talking to a cloud backend
(Supabase, already internet-hosted the moment you create the project). GitHub
itself doesn't run code — it stores the repo. To go live, connect the repo to
a host that builds and serves it, so every `git push` automatically publishes
a new version. Pick one:

### Option A — GitHub Pages (builds via GitHub Actions, fully "runs from GitHub")

This repo already includes `.github/workflows/deploy.yml`, which builds and
publishes the site on GitHub's own servers every time you push to `main`.
Nothing to install or run locally.

1. Push this repo to GitHub (via the GitHub website's "upload files," GitHub
   Desktop, or `git push` from any machine that already has git — a one-time
   action, not something end users ever do).
2. In the repo: **Settings → Pages → Source → GitHub Actions**.
3. In the repo: **Settings → Secrets and variables → Actions → New repository
   secret**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from your
   Supabase project's Settings → API page).
4. Push to `main` (or open the **Actions** tab and run the workflow manually).
   Your site goes live at `https://<your-username>.github.io/<repo-name>/`.
5. Every future push to `main` redeploys automatically.

### Option B — Vercel or Netlify (recommended for a custom domain)

Both connect straight to your GitHub repo through their website — no local
build step, no CLI required:

1. Push this repo to GitHub.
2. On vercel.com or netlify.com: **New Project → Import from GitHub** → select
   the repo. Both auto-detect the Vite build (`npm run build`, output `dist`)
   from `vercel.json` / `netlify.toml`, which are already included here.
3. Add the same two environment variables (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`) in the project's dashboard settings.
4. Deploy. You get a public `*.vercel.app` / `*.netlify.app` URL immediately,
   with a custom domain option if you want one.
5. Every future push to the connected branch redeploys automatically.

### The backend is already "on the internet"

Supabase projects are cloud-hosted from creation — there's no server for you
to run or keep alive. Auth, the Postgres database, RLS policies, and the
lending functions all just work as soon as `schema.sql` has been applied,
regardless of which option above serves the frontend.

## Audiobook player

Lives in `src/context/AudioPlayerContext.jsx`, wrapping the whole app in
`App.jsx` so the single `<audio>` element it owns survives route navigation. See
the context file's comments for the seek/speed/chapter-switch invariants it
guarantees (no `src`/`load()` calls on seek or speed change, no cross-chapter
`currentTime` bleed, race-safe rapid chapter switching, etc).

`src/utils/chapterTitle.js` is the single source of truth for turning a track
row into a human label — it never surfaces a raw filename, falling back to
"Chapter N" from `track_number` or array index.

`ProgressBar.jsx` is shared by the main player and the mini player; it attaches
pointer/touch listeners only for the duration of an active drag (not per
render) and clamps all seek targets against `NaN`/`Infinity`/`duration === 0`.

## Lending limits + hold queue

`supabase/schema.sql` now includes the full lending model:

- **`libraries`** gained four configurable policy columns: `lending_limit_per_member`,
  `hold_limit_per_member`, `loan_period_days`, `hold_expiry_days`. Admins edit these
  in `/admin/:libraryId/settings`.
- **`holds`** is the waitlist table (`waiting` → `ready` → `fulfilled`/`expired`/`cancelled`).
- All state changes go through **`SECURITY DEFINER` Postgres functions**, not raw
  client inserts — `borrow_book`, `return_book`, `place_hold`, `cancel_hold`,
  `claim_ready_hold`, `expire_stale_holds`, `admin_set_total_copies`. This is
  deliberate: deciding "is a copy available / has this member hit their limit"
  has to be atomic (row-locked with `for update`) or two members borrowing the
  last copy at the same instant could both succeed. The `checkouts`/`holds`
  RLS policies are read-only for clients for the same reason.
- Returning a book (or an admin adding copies, or a hold expiring) automatically
  promotes the next waiting hold to `ready` and reserves a copy for them, with
  `hold_expiry_days` to claim it before it's offered to the next person.
- `expire_stale_holds()` is called opportunistically from `LendingContext` on
  load; for production, also schedule it via pg_cron or a Supabase scheduled
  Edge Function so expiry isn't dependent on someone having the app open.
- Already deployed the old schema? Run `supabase/migration_002_lending_holds.sql`
  (additive, safe to re-run) instead of the whole file.
- Frontend: `src/context/LendingContext.jsx` wraps the RPC calls and exposes
  `borrowBook`/`returnBook`/`placeHold`/`cancelHold`/`claimReadyHold` plus each
  user's active checkouts/holds. `BookDetails` uses it to show Borrow / Join
  waitlist / Ready-to-claim / Return, and `/listen/:id` and `/read/:id` redirect
  back to the book page if the signed-in user doesn't currently have that title
  checked out. `Dashboard` lists all active loans and holds. Admins adjust
  `total_copies` per book from `/admin/:libraryId` with +/- controls, which also
  immediately tries to satisfy any waiting holds.

## Lending: limits + hold queue

Copy-availability and lending rules live as **Postgres functions** (`supabase/schema.sql`,
"LENDING LIMIT + HOLD QUEUE LOGIC" section) rather than client-side logic — that's
what makes them safe when many members try to borrow the same book at once. All
of them are `security definer` with `for update` row locks on the `books` row,
and every check (membership, "already borrowed", lending limit, hold limit) is
re-derived server-side from `auth.uid()`, never trusted from the client.

- `borrow_book(book_id)` — checks out directly if a copy is free; raises if the
  member's `lending_limit_per_member` (set per library in Library Settings) is
  already reached.
- `place_hold(book_id)` — joins the waitlist when `available_copies = 0`;
  enforces `hold_limit_per_member` too.
- `return_book(checkout_id)` — frees the copy, then immediately promotes the
  next waiting hold (`_promote_next_hold`) instead of leaving it up for grabs.
- `claim_ready_hold(hold_id)` — converts a `ready` hold into a checkout within
  its claim window (`hold_expiry_days`).
- `cancel_hold(hold_id)` — leaves the queue; if the hold had already reserved a
  copy (`ready`), that copy is released and offered to the next person.
- `expire_stale_holds()` — sweeps `ready` holds whose claim window lapsed,
  releasing the copy onward. The client calls this opportunistically
  (`LendingContext` refresh), but for production wire it to a scheduled job
  (Supabase Edge Function cron or `pg_cron`) so it runs even when no one has
  the app open.
- `admin_set_total_copies(book_id, new_total)` — the only way to change a
  title's copy count post-creation (used by the +/- controls in
  `ManageBooks.jsx`); adding copies immediately tries to clear the waitlist.

Frontend side: `src/context/LendingContext.jsx` wraps all of the above as
`borrowBook` / `returnBook` / `placeHold` / `cancelHold` / `claimReadyHold`,
and tracks the signed-in member's own checkouts/holds. `BookDetails.jsx` shows
the right action (Borrow / Join waitlist / Ready to claim / Checked out) per
book, and `/loans` (`src/pages/Loans.jsx`) is the member's full loans + holds
dashboard across every library they belong to.

Per-library lending policy (`lending_limit_per_member`, `hold_limit_per_member`,
`loan_period_days`, `hold_expiry_days`) is editable at
`/admin/:libraryId/settings`.

## Ebook reader

`Read.jsx` picks a renderer based on the `ebook_files.file_type` value and
lazy-loads it (`React.lazy`) so epub.js/pdf.js are only downloaded when
someone actually opens a book — they don't add weight to the rest of the app:

- **`EpubReader.jsx`** — real `.epub` rendering via [epub.js](https://github.com/futurepress/epub.js/),
  in paginated mode. Persists reading position as an EPUB CFI in
  `localStorage` (resumes to the exact spot, not just a page number), has a
  working table-of-contents panel, and a font-size control that re-flows text
  without losing your place.
- **`PdfReader.jsx`** — real `.pdf` rendering via [pdf.js](https://mozilla.github.io/pdf.js/),
  drawing each page to a `<canvas>`. Persists page number + zoom level. The
  pdf.js worker is loaded as its own chunk (`?url` import) rather than bundled
  inline, which is required for pdf.js's architecture and keeps it out of the
  main bundle.
- **`TextReader.jsx`** — the original lightweight paginated reader, for the
  `txt` file type.
- **`PageFlip.jsx`** — a shared "page turning" transition (slide + tilt +
  fade, not a literal 3D paper-curl simulation) that wraps whichever renderer
  is active. Next/Previous trigger the transition; the real page/chapter
  change happens at its midpoint, so the visual turn and the underlying
  content swap land together instead of the page just snapping.

**CORS note:** both epub.js and pdf.js fetch the file directly from
`ebook_files.file_url` in the browser, so that URL needs to serve the file
with permissive CORS headers. Public Supabase Storage buckets do this by
default; if you host files elsewhere, confirm the host sends
`Access-Control-Allow-Origin` for the file, or the reader will fail to open
with a console error rather than a crash.

## Project structure

```
src/
  context/        AuthContext, LibraryContext, AudioPlayerContext
  components/
    AudioPlayer/  AudioPlayer, MiniPlayer, ProgressBar, SlidePanel
    EbookReader/
    Navbar/
  pages/          Home, Browse, Search, Listen, Read, BookDetails, ...
    admin/        CreateLibrary, AdminDashboard, ManageBooks, AddBook, EditBook, LibrarySettings
supabase/
  schema.sql      full schema + RLS policies
```

## Known scaffolding notes

- Ebook file storage assumes URLs (e.g. Supabase Storage public URLs). Wire up
  `supabase.storage` upload calls in `AddBook`/`EditBook` if you want in-app
  file uploads instead of pasting URLs.
- `expire_stale_holds()` needs a real scheduler in production (pg_cron /
  Edge Function cron) — see the lending section above.
