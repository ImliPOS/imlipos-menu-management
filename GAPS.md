# Known gaps & half-finished parts

Living checklist of what's incomplete or inconsistent, so nothing gets lost on
the way to prod. Tick items off (and prune sections) as they land; add new ones
when a PR knowingly leaves something unfinished.

## Billing / PhonePe

- [ ] **PhonePe dashboard setup** — obtain production `client_id` /
      `client_secret` / `client_version` from PhonePe Business (Developer
      Settings) and register the webhook URL
      `https://<api-host>/billing/webhook/phonepe` with the same
      username/password set in `PHONEPE_WEBHOOK_USERNAME/PASSWORD`. Until then
      the integration can only run against sandbox (UAT) credentials.
- [ ] **End-to-end sandbox test** — run a real UAT payment (checkout →
      hosted page → redirect back → webhook/reconcile → licence activated).
      The adapter is built from PhonePe's v2 docs but has not yet been
      exercised against the live sandbox.
- [ ] **Refunds** — no refund API or handling. The webhook ignores
      `pg.refund.completed` / `pg.refund.failed` events; there is no way to
      refund an order or revoke the licence it created.
- [ ] **Renewal / expiry enforcement** — `subscriptions.ends_at` is written
      (start + 1 year) but nothing enforces it: no cron/job marks subscriptions
      `expired`, and `getDeviceEntitlement` filters on `status` only. An
      expired licence keeps entitling a display until a super-admin flips it.
- [ ] **Downloadable invoices** — Billing UI says "available once the payment
      gateway is connected" (`BillingSection.tsx`); still not implemented.
- [ ] **`price_monthly` naming** — column/field say monthly, but fulfillment
      grants 1 year and the UI + terms say ₹3,500/yr. Rename to `price_yearly`
      (migration + contracts + UI) or actually bill monthly.
- [ ] **Unused limit fields** — `plans.device_limit` and
      `subscriptions.device_limit_override` are settable from the admin console
      but ignored by entitlement math (limit = count of live licences). Either
      wire them in or remove them.
- [ ] **`subscription_orders.metadata`** — column exists, never written.
      Candidate for storing raw gateway payloads for audit/debugging.

## Devices / limits

- [ ] **Free-tier contradiction** — comment at `apps/api/src/routes/devices.ts`
      ("Free tier (no subscription) = 1 display") disagrees with
      `billing/limits.ts` (no licence → limit 0, new shops can pair nothing).
      Decide the intended behaviour and fix code or comment.
- [ ] **Rate limiting** — `/devices/code` + `/devices/pair` have a NOTE to add
      rate limiting; nothing is in place.
- [ ] **Item/category/screen limits** — Usage screen says limits are
      "informational for now"; only the device limit is enforced.

## Before promoting dev → main (prod)

- [ ] **Remove the temporary test-credentials banner** on the sign-in page
      (`apps/web/src/app/signin/page.tsx`, commit `333cee2`) — added only for
      PhonePe Business merchant verification.
- [ ] **Run billing migrations on prod DB** — main is at migration `0005`;
      the plans/subscriptions/orders tables (`0006`–`0008`) exist only on the
      dev database so far.
- [ ] **Set `BILLING_PROVIDER=phonepe` + prod PhonePe env vars** on the prod
      API service (Render dashboard); dev/test can stay on `mock` or sandbox.
- [ ] **Seed the Standard plan on prod** (`apps/api/src/db/seedPlans.ts`).
