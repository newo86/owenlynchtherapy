---
name: check
description: One-shot verification gate - typecheck, unit tests, lint and production build, with pre-existing lint debt told apart from new failures. Run before every ship.
---

# Verify the working tree

Goal: know whether the change is safe to ship, with a verdict you can state in
one line. Run with output pre-filtered (full logs are noise); install
dependencies first if `node_modules` is missing (`npm ci`).

```bash
npx tsc --noEmit && echo TSC-CLEAN
npm test 2>&1 | tail -8
npx eslint <changed dirs> 2>&1 | tail -5
npm run build 2>&1 | grep -E "Compiled|Finished TypeScript|Failed|Error" | head -6
```

`npm test` includes the guard that stops "ghost" calendar sessions from
emailing clients (`calendarSync.test.ts`). CI (`.github/workflows/ci.yml`,
the `verify` check) runs typecheck and tests too, so a failure here will
fail the PR anyway.

## Done looks like

Typecheck clean, tests passing, no new lint errors, and the build reporting
`Compiled successfully` with page data collected and zero errors. The build
has no network dependencies, so any build failure is real.

## Lint baseline

`npm run lint` carries pre-existing `react-hooks/set-state-in-effect` errors
(sync-props-to-state patterns in the admin components). They are known debt:
leave them alone unless asked, and don't count them as new failures. Errors
of any other kind are failures.
