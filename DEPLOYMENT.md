# Deployment — Cloudflare Pages

## Workflow

```text
1. Pull latest code        git pull
2. Make changes            edit → verify: npm run typecheck
3. Deploy to Cloudflare    npm run deploy
4. Push updates back       git add/commit/push
```

## Commands

| Action            | Command                                                        |
| ----------------- | -------------------------------------------------------------- |
| Build             | `npm run build` (typecheck + Vite production build → `dist/`)  |
| Deploy to Pages   | `npm run deploy`                                               |
| Preview locally   | `npm run preview` (serves `dist/` on http://localhost:4173)    |

`npm run deploy` = `npm run build && wrangler pages deploy`. The project is configured in
`wrangler.toml`:

```toml
name = "quiz"                       # Cloudflare Pages project
compatibility_date = "2026-08-14"
pages_build_output_dir = "dist"
```

### Live URL

`https://quiz-3rp.pages.dev`

## Requirements

- Wrangler authenticated: `npx wrangler whoami` (OAuth token for the `inkhel` account).
- `dist/` is git-ignored; the deploy always builds fresh from source.
- SPA routing: `public/_redirects` (`/* /index.html 200`) is copied into the build by Vite —
  deep links like `/episodes/...` work in production.

## Notes

- Every `npm run deploy` creates a new immutable Pages deployment; previous deployments
  remain available in the Cloudflare dashboard.
- Preview deployments are created automatically if you connect the GitHub repo to the Pages
  project later (dashboard → Workers & Pages → quiz → Create deployment).
