---
name: preview
description: Screenshot one or more routes (desktop + mobile) with the dev server and send the images to the user. Use before shipping any visible UI change so the user approves the picture, not the deploy.
---

# Preview routes as screenshots

Goal: the user sees the change at desktop and mobile sizes and reacts before
anything ships. Done when the screenshots are sent and the user has responded.

Arguments: routes to shoot (default `/`). Admin routes can't render in this
sandbox (no Supabase or auth env), so only marketing pages work.

1. Start the dev server in the scratchpad, in the background, and wait until
   its log shows it's ready:
   `(npm run dev > "$SCRATCHPAD/dev.log" 2>&1 &)`.
2. Playwright is installed globally, not in node_modules, so import it by
   absolute path in a .mjs script:
   ```js
   import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
   ```
   Shoot each route at 1280×900 and 390×844, `waitUntil: 'networkidle'`.
3. Gotchas learned the hard way:
   - `locator('footer')` and similar can match two nodes, because the Next
     dev error overlay adds its own. Prefer `getByRole(...)` or scope to `main`.
   - A red "N Issues" bubble in the shots is the dev overlay's CSP/eval
     warning, not a site error. Say so in the caption.
4. Stop the server with `pkill -f "next dev"` as its own command. *Why: it
   exits 144, which aborts any `&&` chain it's part of.*
5. Send the screenshots with SendUserFile (`display: render`) and wait for
   the user's reaction.
