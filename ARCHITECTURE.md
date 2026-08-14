# Architecture

## Overview

Clean modular monolith. All business logic lives in the **service layer**; React components only
render and orchestrate. The datastore is a typed in-browser database (`src/db`) shaped exactly
like the planned Supabase schema, so swapping in Supabase means reimplementing the service
functions — not the UI.

```
Season (10 months)
 └── Month (calendar month — open window)
      └── Rounds (any number, 10+ questions)
           └── Questions → Options
                    ↘
Users → Attempts → Attempt Answers → Round / Month / Season rankings
```

## Structure

```
src/
├── app entry:   main.tsx, router.tsx
├── routes/      public/ + admin/ page components
├── components/
│   ├── ui/        Button, Card, Input, Badge, Modal, Toaster, StatCard…
│   ├── layout/    PublicLayout (header/footer), AdminLayout (sidebar)
│   ├── quiz/      QuizTimer, QuestionCard, AnswerOption, QuizProgress
│   ├── leaderboard/  Podium, LeaderboardTable, RankingTable, RankBadge
│   ├── rounds/    RoundCard, RoundBanner, ShareButtons
│   └── admin/     SeasonForm, RoundForm, QuestionEditor
├── services/    auth, season, month, round, question, attempt, leaderboard, share, scoring
├── db/          typed datastore (localStorage) + seed data
├── lib/         utils, crypto (hashing), banners (theme presets), query client
└── types/       domain model
```

## Domain model (`src/types`)

`Season` · `Month` (calendar period, status derived from dates) · `Round` · `Question` ·
`QuestionOption` (keys A–D, one `isCorrect`) · `Participant` · `Attempt` (status:
`in_progress | completed | expired | abandoned`) · `AttemptAnswer` · `AdminUser`

## Key services

| Service | Responsibility |
| --- | --- |
| `authService` | Admin login (hashed passwords, session tokens), participant identity |
| `seasonService` | Season CRUD, active-season exclusivity, end-date from duration |
| `monthService` | Month auto-generation from a season (calendar months), open/closed status |
| `roundService` | Round CRUD, slug generation, publish validation (≥10 questions), month-window availability |
| `questionService` | Question/option editor persistence, publish-safe question fetch (no `isCorrect` exposed) |
| `attemptService` | Server-authoritative attempts: start, resume, idempotent answers, deadline enforcement, month gating, finalize |
| `scoring` | Pure scoring + tie-breaking — unit-testable |
| `leaderboardService` | Round leaderboard, month ranking, season ranking, overall ranking, tie-break ordering |
| `shareService` | Social share URLs, page titles/meta |

## Availability model

- A **month** is `open` when `now` is within `[start_date, end_date]` of its calendar window.
- A **round** is playable when `published` AND its month is open.
- When the month ends, all its rounds close automatically — `startAttempt` rejects new attempts
  with a clear message; existing in-progress attempts still finish on their own timer.
- Months derive `upcoming | open | completed` from the clock; no manual status maintenance.

## Scoring

```
Base      = correct × 10
Bonus     = round(20 × remaining_time / time_limit)   ← only if completed in time, nothing unanswered
Final     = base + bonus                               ← max 120 for 10 questions
Ordering  = final_score DESC, correct DESC, time ASC, completed_at ASC
```

## Rankings (3 levels)

1. **Round leaderboard** — every attempt on that round.
2. **Month ranking** — Σ `final_score` per participant across the month's rounds
   (tie-break: correct answers, then time).
3. **Season ranking** — Σ across all months of the season. `getOverallRanking()` combines all
   seasons.

## Timing & anti-cheat

- `attempt.startedAt` and every `answeredAt` are server timestamps (`Date.now()` in the service
  layer).
- Deadline = `startedAt + time_limit`. The client only renders a countdown from the deadline.
- Answers arriving after the deadline are rejected and the attempt is finalized as `expired`.
- Duplicate answers are idempotent per `(attempt, question)`.
- Refresh/multi-tab resumes the same in-progress attempt.
- One valid attempt per round per participant (server-enforced; policy is data-driven so
  unlimited/practice modes can be added later).

## Routing

- Code-based TanStack Router with two layouts: `public` and `admin`.
- `adminLayout.beforeLoad` redirects unauthenticated users to `/admin/login` — the same check is
  enforced in the service layer (defense in depth).
- Admin hierarchy: `seasons → season detail (months) → month detail (rounds) → round edit /
  questions / leaderboard`.

## Migrating to Supabase

1. Fill `.env` (URL + anon key; service role key stays server-side).
2. Reimplement each service in `src/services/*` against `supabase-js` queries.
3. Apply migrations (schema mirrors `DBShape` in `src/db/database.ts`), enable RLS per table,
   add Storage bucket `quiz-banners`.
4. Replace the admin `loginAdmin` with Supabase Auth (Google) while keeping the same service
   signatures.

## Extensibility

- Future features (unlimited attempts, practice mode, round versioning, admin roles, analytics)
  fit the existing model without rewriting: constraints are policy-driven, not hard-coded.
- `isTestAttempt` on attempts keeps admin test runs off public leaderboards.
- New rounds inside the current month go live instantly; future months schedule automatically.
