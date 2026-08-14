# Inkhel — Project Instructions for AI Agents

- Use TypeScript with strict mode. Prefer functional React components with hooks.
- Do not introduce unnecessary dependencies. Verify a library is already in `package.json` before using it.
- Follow the feature-based structure: routes, components, services, db, lib, types.
- Keep business logic OUT of UI components — everything goes through `src/services/*`.
- Never trust client-side scores, timers, `isCorrect` flags, or ranks. The service layer is the source of truth.
- Never expose secrets in client code. `.env` values marked server-only must never reach the bundle.
- Protect admin routes in the router AND enforce authorization in the service layer.
- Validate user input (admin forms use the built-in field validation; keep it consistent).
- Write tests for important business logic (see the scoring/attempt flow in services — keep those functions pure).
- Do not break existing features when adding new ones.
- Before changing the database shape, update `src/types`, `src/db/database.ts` (DBShape), the seed in `src/db/seed.ts`, and persist migrations documentation.
- Seasons, rounds and questions are fully editable and deletable. Deletion is a hard cascade
  (round → questions/options/attempts/answers; season → months → rounds → everything below),
  so always warn the admin before calling `deleteSeason`/`deleteRound`.
- Rounds are gated by their month window (see `roundService.roundAvailability` / `monthService`) — never bypass it.
- A round must have at least 10 valid questions before it can be published (`MIN_QUESTIONS_PER_ROUND`).
- Run `npm run typecheck` and `npm run build` after changes; fix all errors before finishing.
- The timer, scoring, and leaderboards are the core product. Prioritize reliability over visual effects.
