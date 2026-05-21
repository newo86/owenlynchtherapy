# Custom domain go-live checklist

For when `owenlynchtherapy.com` replaces `owenlynchtherapy.vercel.app`.

## 1. Vercel env vars

Settings → Environment Variables. Update these two (Production at minimum,
Preview/Development optional):

| Key | New value |
|---|---|
| `GOOGLE_REDIRECT_URI` | `https://owenlynchtherapy.com/api/auth/google/callback` |
| `NEXT_PUBLIC_SITE_URL` | `https://owenlynchtherapy.com` |

`NEXT_PUBLIC_SITE_URL` drives intake form links in the welcome email and the
Stripe `after_completion.redirect.url`, so this one matters for clients as
well as for the admin.

## 2. Redeploy

Either:
- Vercel → Deployments → ⋯ → **Redeploy** the latest, or
- Push any commit (env vars get picked up automatically on the next build).

## 3. Reconnect Google Calendar

`https://owenlynchtherapy.com/admin/intake` → click **Connect** on the gold
banner. Google checks the redirect URI against the four already registered
in Cloud Console (localhost, vercel.app, apex, www) and grants fresh tokens.
The old tokens in Supabase get overwritten in place.

## 4. Update Stripe webhook

Stripe dashboard → **Developers → Webhooks** → edit the existing endpoint:
- Old URL: `https://owenlynchtherapy.vercel.app/api/webhooks/stripe`
- New URL: `https://owenlynchtherapy.com/api/webhooks/stripe`

The `STRIPE_WEBHOOK_SECRET` env var doesn't change — same endpoint, just
moved.

## 5. Smoke test

- Generate a fresh intake link via the admin → confirm the email link points
  at `owenlynchtherapy.com`.
- Pay via the Stripe payment link → confirm you land on
  `owenlynchtherapy.com/payment-confirmed`.
- In Stripe → Webhooks, confirm the most recent delivery succeeded (200).
- In `/admin/intake`, confirm the **Calendar Connected** chip is still
  showing — if not, click Connect once more.

## Things you can leave alone

- Google Cloud Console redirect URIs — already include
  `owenlynchtherapy.com` and `www.owenlynchtherapy.com`.
- The `vercel.app` URL — keep it working; Vercel doesn't force you to drop
  it when you add a custom domain.
- Supabase URL / keys — unaffected by the domain change.
