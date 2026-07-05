---
name: preview
description: Screenshot one or more routes (desktop + mobile) with the dev server and send the images to the user. Use BEFORE shipping any visible UI change so the user approves the picture, not the deploy.
---

# Preview routes as screenshots

Arguments: routes to shoot (default `/`). Admin routes can't render here
(no Supabase/auth env) — only marketing pages work.

1. Start the dev server in the scratchpad, backgrounded:
   ```bash
   (npm run dev > "$SCRATCHPAD/dev.log" 2>&1 &) && sleep 8 && tail -2 "$SCRATCHPAD/dev.log"
   ```
2. Playwright is installed **globally**, not in node_modules. Import it by
   absolute path in a .mjs script:
   ```js
   import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
   ```
   Shoot each route at 1280×900 and 390×844, `waitUntil: 'networkidle'`.
3. Gotchas learned the hard way:
   - `locator('footer')` etc. can hit TWO nodes because the Next dev error
     overlay adds its own — prefer `getByRole(...)` or scope to `main`.
   - A red "N Issues" bubble in shots is the dev overlay's CSP/eval warning,
     NOT a site error; say so in the caption.
4. Kill the server when done — `pkill -f "next dev"` returns exit 144, which
   **aborts an `&&` chain**; run it as its own command.
5. Send the screenshots with SendUserFile (display: render) and wait for the
   user's reaction before shipping UI changes.
