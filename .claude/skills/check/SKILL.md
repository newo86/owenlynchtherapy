---
name: check
description: One-shot verification gate - typecheck, lint, and production build with this repo's known sandbox failure handled. Run before every ship.
---

# Verify the working tree

Run, in order, with output pre-filtered (full logs are noise):

```bash
npx tsc --noEmit && echo TSC-CLEAN
npx eslint <changed dirs> 2>&1 | tail -5
npm run build 2>&1 | grep -E "Compiled|Finished TypeScript|Failed|Error" | head -6
```

## Reading the build result — IMPORTANT

In this sandbox the build **always** dies at "Collecting page data" for
`/articles` or `/articles/[slug]` with `Configuration must contain 'projectId'`
— Sanity is unreachable here by network policy. That exact failure is a **PASS**
(it builds fully on Vercel). Any OTHER failure is real.

Pass = `Compiled successfully` + `Finished TypeScript` + only the Sanity
page-data error. Report one verdict line, not logs.

## Lint baseline

`npm run lint` carries ~10 pre-existing `react-hooks/set-state-in-effect`
errors (sync-props-to-state patterns in the admin components). They are known
debt — do not fix them drive-by and do not count them as new failures. New
errors of any other kind ARE failures.
