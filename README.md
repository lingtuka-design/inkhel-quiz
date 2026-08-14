# Inkhel — Competitive Quiz Platform

A fast-paced, competitive quiz platform built around **Seasons → Months → Rounds**.

> Beat the clock. Own the leaderboard.

## Structure

```
Season (10 months, e.g. Aug 2026 – May 2027)
 └── Month (1 calendar month, e.g. "August 2026")
      └── Round (any number, 10+ questions each)
           └── Questions → options A–D, one correct
```

- **Rounds** inside the current month stay open until the month ends, then close automatically.
- Every **Round** has its own leaderboard; every **Month** has a monthly ranking (sum of round
  scores); every **Season** has an overall ranking across all its months.

## Stack

- **Vite + React 18 + TypeScript**
- **TanStack Router** — code-based routing, route guards for `/admin/*`
- **TanStack Query** — server-state management
- **Tailwind CSS v4** — design system, no UI library
- **Zod** — form validation (admin forms)
- **Lucide React** — icons
- **Supabase-ready** — the service layer mirrors the Supabase schema (PostgreSQL, RLS, Storage,
  Auth) so a real backend can be plugged in without redesigning the app. See `ARCHITECTURE.md`.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173

### Demo admin

| Field    | Value    |
| -------- | -------- |
| Username | `admin`  |
| Password | `admin123` |

Login at `/admin/login`. Passwords are stored as SHA-256 hashes — never plain text, never in client code.

### Players

Players enter a player name on their first round (the identity model is designed for Google
Sign-In later — one stable participant across every round).

## Scripts

| Command             | What it does                            |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Start the Vite dev server               |
| `npm run build`     | Typecheck + production build            |
| `npm run typecheck` | Run `tsc --noEmit`                      |
| `npm run preview`   | Preview the production build            |
| `npm run deploy`    | Build + deploy to Cloudflare Pages      |

## What's inside

- **Public:** Home (this month's live rounds), Rounds (search/filter by month), Round detail,
  Quiz gameplay, Results, Leaderboard (Round / Month / Season tabs), Seasons (month grid per season)
- **Admin:** Login, Dashboard, Season management (auto-generates 10 monthly periods), Month
  management (rounds per month), Round CRUD, Banner themes + image upload, Question builder
  (duplicate/reorder/collapse, min 10 questions to publish), Round leaderboard
- **Engine (server-authoritative):** attempts, server timestamps, deadline-based timers,
  server-side scoring (10 pts per correct + speed bonus up to 20), tie-breaking, automatic
  expiry, duplicate-submission protection, one-attempt-per-round policy, month-window gating

## Demo datastore

The app ships with a seeded local datastore (localStorage) mirroring the production schema:

- **Season 1** (active): August 2026 – May 2027, 10 months auto-created
- **August 2026** (current): 3 published rounds (General Knowledge, Football, Movies) + 1 draft —
  playable until August ends, then closed
- **Season 2** (completed): historical months with closed rounds, for month/season ranking history
- 8 fictional participants and 27 attempts

Your own plays persist per browser. To reset demo data, clear `localStorage` (keys
`inkhel_db_v3`, `inkhel_admin_token`, `inkhel_participant_id`).

## Environment

Copy `.env.example` → `.env` to configure Supabase later. The demo runs fully without credentials.

- Public: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_AUTH_SECRET` — never in frontend code

## Security model

- Scores, timers, correctness and ranks are **derived server-side only**; the client never
  receives `isCorrect` during play.
- The attempt deadline is computed from the server start timestamp; refresh, clock changes and
  DevTools can't reset it.
- Rounds in a closed month reject new attempts server-side.
- Published rounds with attempts are content-locked until unpublished.
- Admin routes are guarded in the router and enforced by the service layer.

See `ARCHITECTURE.md` for the full breakdown.
