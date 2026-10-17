# waypoint

StudentVUE grade fetcher. No UI; testing app. See `../gradecompass-main/studentvue-web-api-handoff.md` for the protocol.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run check      # svelte-check
npm run capture    # dev-only: snapshot of your real data → capture/output/ (add -- --all for every period)
npm run convert    # dev-only: capture/output/ → GradeCompass Gradebook JSON in capture/converted/ + grade self-check
```

`capture/` (the script and its output) is git-ignored and blocked by a local pre-commit hook, so it isn't in the repo. It holds real grades.

`npm install` reads `.npmrc` (`legacy-peer-deps=true`), which works around an npm 10 resolver crash on vitest 5's optional peers.

## Production

`ORIGIN` must be set **at build time** to the URL the browser uses. SvelteKit 3 reads it from `paths.origin`, and production form posts from any other origin are rejected as cross-site.

```bash
ORIGIN=http://localhost:3000 npm run build
PORT=3000 node build
```

Optional runtime env: `DEFAULT_DISTRICT` (`xx-district-psv`, used when the district field is blank), `SESSION_TTL_MINUTES` (30), `PORTAL_TIMEOUT_MS` (20000), `ALLOWED_DISTRICT_HOSTS` (comma-separated).

## Layout

- `src/lib/server/portal/http.ts`: cookie jar, headers, timeout, `PortalError`
- `src/lib/server/portal/extract.ts`: login-form and `PXP.X = {...}` parsers
- `src/lib/server/portal/login.ts`: form login (302 = success)
- `src/lib/server/portal/gradebook.ts`: gradebook page → class list → per class `LoadControl` / `GetClassData` / `LoadWithOptions`, run in order
- `src/lib/server/portal/map.ts`: raw refresh → GradeCompass `Gradebook` shape (handoff §10–11, Option A)
- `src/lib/grades/assignments.ts`, `src/lib/types/Gradebook.ts`: copied from GradeCompass (MIT, see `LICENSE-gradecompass.txt`)
- `src/lib/grades/check.ts`: recomputes each class grade with GradeCompass math and compares it with the portal's
- `src/lib/server/sessions.ts`: in-memory sessions, refresh coalescing, 30 s cache
- `src/routes/login`, `src/routes/data`, `src/routes/logout`

Imports use `#lib/...ts` (Node subpath imports, set in `package.json`), because SvelteKit 3 removed `$lib`.
