# Inkhel — Competitive Quiz Platform

A fast-paced, competitive quiz platform: seasons → episodes → questions → participants → attempts → rankings.

> Beat the clock. Own the leaderboard.

## Stack

- **Vite + React 18 + TypeScript**
- **TanStack Router** — code-based routing, route guards for `/admin/*`
- **TanStack Query** — server-state management
- **Tailwind CSS v4** — design system, no UI library
- **Zod** — form validation (admin forms)
- **Lucide React** — icons
- **Supabase-ready** — service layer mirrors the Supabase schema (PostgreSQL, RLS, Storage, Auth) so a real backend can be plugged in without redesigning the app. See `ARCHITECTURE.md`.

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

Players enter a player name on their first quiz (the identity model is designed for Google Sign-In later — one stable participant across every episode).

## Scripts

| Command             | What it does                      |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start the Vite dev server         |
| `npm run build`     | Typecheck + production build      |
| `npm run typecheck` | Run `tsc --noEmit`                |
| `npm run preview`   | Preview the production build      |

## What's inside

- **Public:** Home, Episodes (search/filter), Episode detail, Quiz gameplay, Results, Overall leaderboard, Seasons
- **Admin:** Login, Dashboard (stats), Season CRUD, Episode CRUD, Banner themes + image upload, Question builder (duplicate/reorder/collapse, validation, publish gates), Episode leaderboard
- **Engine (server-authoritative):** attempts, server timestamps, deadline-based timers, server-side scoring (10 pts per correct + speed bonus up to 20), tie-breaking, automatic expiry, duplicate-submission protection, one-attempt-per-episode policy

## Demo datastore

The app ships with a seeded local datastore (localStorage) mirroring the production schema: 2 seasons, 5 episodes (43 questions), 8 fictional participants and 24 attempts. Your own plays are persisted per browser. To reset demo data, clear `localStorage` (keys `inkhel_db_v2`, `inkhel_admin_token`, `inkhel_participant_id`).

## Environment

Copy `.env.example` → `.env` to configure Supabase later. The demo runs fully without any credentials.

- Public: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_AUTH_SECRET` — never in frontend code

## Security model

- Scores, timers, correctness and ranks are **derived server-side only**; the client never receives `isCorrect` during play.
- The attempt deadline is computed from the server start timestamp; refresh, clock changes and DevTools can't reset it.
- Published episodes with attempts are content-locked until unpublished.
- Admin routes are guarded both in the router and enforced by the service layer.

See `ARCHITECTURE.md` for the full breakdown.
