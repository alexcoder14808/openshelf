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

`supabase/schema.sql` includes the full lending model:

- **`libraries`** has four configurable policy columns: `lending_limit_per_member`,
  `hold_limit_per_member`, `loan_period_days`, `hold_expiry_days`. Admins edit these
  in `/admin/:libraryId/settings`.
- **`holds`** is the waitlist table (`waiting` → `ready` → `fulfilled`/`expired`/`cancelled`).
- All state changes go through **`SECURITY DEFINER` Postgres functions**, not raw
  client inserts — `borrow_book`, `return_book`, `place_hold`, `cancel_hold`,
  `claim_ready_hold`, `expire_stale_holds`, `admin_set_total_copies`. This is
  deliberate: deciding "is a copy available / has this member hit their limit"
  has to be atomic (row-locked with `for update`) or two members borrowing the
  last copy at the same instant could both succeed. `checkouts`/`holds` RLS is
  read-only for clients for the same reason — every check (membership,
  "already borrowed", lending limit, hold limit) is re-derived server-side
  from `auth.uid()`, never trusted from the client.
- `borrow_book(book_id)` checks out directly if a copy is free; `place_hold(book_id)`
  joins the waitlist when none are; `return_book(checkout_id)` frees the copy
  and immediately promotes the next waiting hold; `claim_ready_hold(hold_id)`
  converts a `ready` hold into a checkout within its claim window;
  `cancel_hold(hold_id)` releases a reserved copy back to the next person if
  needed; `admin_set_total_copies(book_id, new_total)` is the only way to
  change a title's copy count post-creation (the +/- controls in
  `ManageBooks.jsx`), and immediately tries to clear the waitlist if copies
  were added.
- `expire_stale_holds()` is called opportunistically from `LendingContext` on
  load; for production, also schedule it via pg_cron or a Supabase scheduled
  Edge Function so expiry isn't dependent on someone having the app open.
- Frontend: `src/context/LendingContext.jsx` wraps the RPC calls and exposes
  `borrowBook`/`returnBook`/`placeHold`/`cancelHold`/`claimReadyHold` plus each
  user's active checkouts/holds. `BookDetails.jsx` shows the right action
  (Borrow / Join waitlist / Ready to claim / Checked out) per book, and
  `/listen/:id` / `/read/:id` redirect back to the book page if the signed-in
  user doesn't currently have that title checked out. `/loans`
  (`src/pages/Loans.jsx`) is the member's full loans + holds dashboard across
  every library they belong to.

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

## File uploads (covers, audio, ebooks)

Admins upload files straight from their computer in `AddBook.jsx`/`EditBook.jsx`
— no pasting URLs. Three public Supabase Storage buckets back this:
`covers`, `audio`, `ebooks`. `src/lib/storageUpload.js` handles the upload and
returns the public URL that gets saved into `books.cover_url` /
`audiobook_tracks.audio_url` / `ebook_files.file_url`.

Every file is stored at `{library_id}/{book_id}/{random-filename}` — the
original filename is discarded (replaced with a random UUID, extension kept)
and the storage RLS policies check that first path segment against
`library_admins`, so an admin can only write into their own library's folder.
Reads are public on all three buckets (needed for playback/reading), since
book content in this scaffold isn't otherwise access-controlled at the
storage layer — RLS on the `books`/`audiobook_tracks`/`ebook_files` tables
already restricts who can *discover* a file's URL in the first place via the
normal library-membership checks.

## Library cards: numeric card numbers, PINs, and card+PIN login

- **Card numbers** are generated server-side by `_generate_card_number()` —
  12 digits, numbers only, collision-checked against a unique index. Members
  never see or choose them.
- **PINs** are chosen by the member (4–6 digits) when they request a card
  (`ChoosePinModal` in `LibraryDirectory.jsx`), and stored **encrypted**
  (`pgcrypto`'s `pgp_sym_encrypt`, not a one-way hash) in
  `library_members.pin_encrypted` — encrypted rather than hashed
  specifically because the virtual card's flip-to-reveal needs to show the
  PIN back to its owner later, not just confirm a guess. `reveal_my_card_pin(member_id)`
  decrypts it, and only succeeds if `auth.uid()` owns that card.
- **`LibraryCardFlip.jsx`** is the virtual card: tap to flip, front shows
  library branding + member name + status, back shows the card number and a
  masked/revealable PIN (fetched fresh via `reveal_my_card_pin` on first
  flip). `/library-card` renders one per membership.
- **Two separate login paths**, both live on `/login` as tabs:
  - *Email + password* — the normal OpenShelf Network account login
    (`supabase.auth.signInWithPassword`).
  - *Library card + PIN* — pick a library, enter card number + PIN. This
    does **not** touch the account's real password at all; see the Edge
    Function section below for how it works.

⚠️ **Security note on the encryption key**: PINs are encrypted with a fixed
passphrase (`'openshelf-card-pin-v1'`) hardcoded into the SQL functions in
`schema.sql`. That's meaningfully better than storing PINs in plaintext, but
weaker than proper secret management. For real production, move that
passphrase into Supabase Vault and reference it via `vault.decrypted_secrets`
instead of a literal string in the function body.

## Card+PIN login — the one manual deployment step

Logging in with a card number + PIN (instead of email/password) requires a
Supabase **Edge Function** (`supabase/functions/card-login/index.ts`), because
minting a real login session for a chosen account has to happen server-side
with the service role key — it can't happen in the browser. Deploying Edge
Functions wasn't something this build's tooling could push automatically, so
it's the one piece you deploy yourself. No CLI needed — it's copy, paste, and
a couple of clicks in the Supabase Dashboard:

1. In your Supabase project, go to **Edge Functions** in the left sidebar →
   **Deploy a new function**.
2. Name it exactly `card-login` (the frontend calls this URL by name).
3. Open `supabase/functions/card-login/index.ts` from this repo, copy its
   entire contents, and paste them into the function editor in the dashboard.
4. Before deploying, find the function's settings and **turn off "Verify JWT"**
   — this function is called by signed-out visitors trying to log in, so it
   can't require a valid session token to even run. (This is safe: the
   function itself never trusts anything except a correct card number + PIN
   pair, checked server-side.)
5. Click **Deploy**. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
   injected automatically by the platform — you don't set those yourself.
6. Test it: on your live site, go to `/login` → "Library card & PIN" tab →
   enter a real library + card number + PIN you've set up. If it fails, check
   the function's Logs tab in the dashboard for the actual error.

Until this is deployed, the "Library card & PIN" login tab will show an
error when submitted — everything else in the app (including requesting a
card, viewing/flipping it, and email+password login) works without it.

## Manage People (membership approval)

When a library's `card_signup_mode` is `approval_required`, a card request
lands as `pending` via `request_library_card()` and does **not** count as an
active member — they can't browse or borrow yet. `/admin/:libraryId/members`
(`ManageMembers.jsx`) lists pending requests with Approve/Decline, and shows
current active members with a Remove action. Both actions go through
`approve_member()`/`reject_member()`, which check the caller is actually an
admin of that library server-side. A library's own owner always lands
`active` immediately regardless of this setting — there's no one else to
approve them.

The `is_public` toggle in `/admin/:libraryId/settings` is the separate
"hide this library from the public directory" control — it only affects
whether `/libraries` lists the library, not who can join it.

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
