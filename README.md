# Waypoint

A self-hosted StudentVUE grade viewer and calculator. Log in with your district account to see your grades, try hypothetical scores and track changes.

## Features

- **Grades list** for each grading period: letter grade, percentage, period, room and teacher per class.
- **Class pages** with a grade-history chart, assignment cards showing how each one moved your grade, category weights and a category breakdown.
- **Hypothetical mode**: edit scores or add made-up assignments and see your grade change, plus a target-grade calculator ("what do I need on the next test?").
- **Auto-refresh** every 60 seconds while the tab is open, with a "Last updated" indicator.
- **0–4 rubric classes** shown as a letter and value (e.g. "A 3.8") instead of a percentage.
- **Stays logged in**: your login is saved in your browser, so the app reconnects by itself when its server session expires.
- **Demo mode** with made-up grades, no account needed.

## Quick start

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173, then log in with your district (the part before `.edupoint.com` in your portal's address, or the full portal link), username and password. Or choose **Try the demo**.

## Running with Docker

```bash
docker compose up -d --build
```

Waypoint then listens on port 3000. `docker-compose.yml` lists the optional settings. Without Compose:

```bash
docker build -t waypoint .
docker run -d -p 3000:3000 --restart unless-stopped waypoint
```

- For anything beyond your own computer, put it behind an **HTTPS** reverse proxy (for example Caddy, nginx or Traefik). The session cookie is marked Secure, which browsers only accept over HTTPS or at `http://localhost`. On a trusted home network without HTTPS, set `SECURE_COOKIE=false` instead.
- The container reports its health at `/healthz`.
- Everything is held in memory: restarting the container ends all sessions, and the browser then logs in again on its own.
- Each account can attempt a login at most once every 3 seconds; extra attempts get HTTP 429 and never reach the district portal.

## Running without Docker

```bash
npm ci
npm run build
PORT=3000 node build
```

The same notes apply. Optionally set `ORIGIN` at build time to the public URL (SvelteKit 3 reads it from `paths.origin` when building); the app has no HTML form posts, so it isn't required.

## Configuration

Runtime environment variables, all optional:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `DEFAULT_DISTRICT` | (none) | District to use when the login form's district field is left blank, e.g. `xx-district-psv` |
| `SESSION_TTL_MINUTES` | `30` | Ends sessions idle for this long |
| `PORTAL_TIMEOUT_MS` | `20000` | Timeout for each request to the district portal |
| `ALLOWED_DISTRICT_HOSTS` | (any) | Comma-separated portal hosts to allow, e.g. `xx-district-psv.edupoint.com` |
| `SECURE_COOKIE` | (automatic) | Set to `false` only when serving over plain HTTP on a trusted network |

## Privacy

Waypoint has no database, analytics or tracking. The server uses your login to fetch grades from your district's portal and keeps them in memory only while your session is active. Your browser saves your login (including the password, in plain text) and your latest grades so the app can reopen instantly and reconnect; **Log Out** removes them. The full explanation is on the app's `/privacy` page.

Whoever runs a copy of Waypoint can see what passes through their server. It's meant for personal or household use.

## Development

```bash
npm test           # unit tests (Vitest)
npm run check      # type check (svelte-check)
npm run build      # production build into build/
npm run capture    # dev-only: save your real portal data to capture/output/ (add -- --all for every grading period)
npm run convert    # dev-only: convert capture/output/ and check every class grade against the portal's
```

- `capture/` holds the capture scripts and your real grades. It is git-ignored, and a local pre-commit hook refuses to commit it.
- `npm install` reads `.npmrc` (`legacy-peer-deps=true`), which works around an npm 10 resolver crash on Vitest 5's optional peer dependencies.
- Imports use `#lib/...ts` (Node subpath imports, set in `package.json`), because SvelteKit 3 removed `$lib`.

## Project layout

- `src/lib/server/portal/`: the StudentVUE portal client
  - `login.ts`: form login (a redirect means success)
  - `gradebook.ts`: grading periods, class list, then each class's scores and assignment list, one class at a time
  - `schedule.ts`: period, room and teacher email from the class schedule
  - `map.ts`: converts a refresh into GradeCompass's `Gradebook` format
- `src/lib/server/sessions.ts`: in-memory sessions, a 30-second cache per grading period, one portal refresh at a time per session
- `src/lib/server/demo.ts`: the made-up demo gradebook
- `src/lib/grades/`: the grade calculation engine (`assignments.ts`, from GradeCompass), the browser's grade cache and auto-refresh (`catalog*.ts`) and a self-check against the portal's grades (`check.ts`)
- `src/routes/(authed)/grades/`: the grades list and class pages
- `src/routes/login`, `src/routes/privacy`, `src/routes/api/`: login page, privacy page and the JSON endpoints (`/api/login`, `/api/gradebook`, `/api/demo/gradebook`)
- `src/routes/healthz`: health check used by Docker
- `Dockerfile`, `docker-compose.yml`: container build and setup

## Credits and license

Waypoint is MIT-licensed (see `LICENSE`).

It builds on [GradeCompass](https://github.com/PurelyAnecdotal/gradecompass) by The GradeCompass Authors (MIT). Its grade calculation engine, grades pages, theme and several components are reused or adapted here. It also includes UI components from [shadcn-svelte](https://github.com/huntabyte/shadcn-svelte) (MIT). See `THIRD_PARTY_NOTICES.md` for details, and `LICENSE-gradecompass.txt` and `LICENSE-shadcn-svelte.txt` for their licenses.

Waypoint is an independent, unofficial tool. It is not affiliated with or endorsed by GradeCompass or Edupoint Educational Systems LLC. StudentVUE and Synergy are trademarks of Edupoint.
