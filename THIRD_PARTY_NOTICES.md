# Third-party notices

This app includes code copied or adapted from the projects below. Their license
texts are in this repository and must stay with the code.

## GradeCompass

- Source: https://github.com/PurelyAnecdotal/gradecompass
- License: MIT, Copyright (c) 2026 The GradeCompass Authors. See `LICENSE-gradecompass.txt`.
- Used for: the grade calculation engine (`src/lib/grades/assignments.ts`), the `Gradebook`
  data types, the grades pages and their components, the login page layout, shared
  components, the theme (`src/app.css`) and helpers. Each such file says so in its header.
- This app is not affiliated with or endorsed by GradeCompass.

## shadcn-svelte

- Source: https://github.com/huntabyte/shadcn-svelte
- License: MIT, Copyright (c) 2023 Hunter Johnston, CokaKoala and shadcn. See
  `LICENSE-shadcn-svelte.txt`.
- Used for: the UI components in `src/lib/components/ui/` (copied in via GradeCompass,
  imports adapted for SvelteKit 3).

## npm dependencies

Packages installed from npm (for example bits-ui, layerchart, mode-watcher, svelte-sonner,
@number-flow/svelte, Lucide icons (ISC) and the Inter font via @fontsource (SIL OFL 1.1))
are not copied into this repository. Each ships its own license in `node_modules`; keep
those files when distributing a build or Docker image.

## Edupoint

StudentVUE and Synergy are trademarks of Edupoint Educational Systems LLC. This app is an
independent, unofficial tool and is not affiliated with or endorsed by Edupoint.
