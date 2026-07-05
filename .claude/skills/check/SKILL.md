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

## Reading the build result

Since the Sanity removal (Jul 2026) the build has NO network dependencies and
must pass fully, everywhere. Pass = `Compiled successfully` + TypeScript
finished + page data collected with zero errors. Any failure is real.

## Lint baseline

`npm run lint` carries ~10 pre-existing `react-hooks/set-state-in-effect`
errors (sync-props-to-state patterns in the admin components). They are known
debt — do not fix them drive-by and do not count them as new failures. New
errors of any other kind ARE failures.
