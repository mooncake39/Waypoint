# waypoint

StudentVUE grade fetcher. No UI; testing app. See `../gradecompass-main/studentvue-web-api-handoff.md` for the protocol.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run check      # svelte-check
```

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
- `src/lib/server/sessions.ts`: in-memory sessions, refresh coalescing, 30 s cache
- `src/routes/login`, `src/routes/data`, `src/routes/logout`

Imports use `#lib/...ts` (Node subpath imports, set in `package.json`), because SvelteKit 3 removed `$lib`.
