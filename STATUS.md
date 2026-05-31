# Build status & next steps

This is a working **scaffold** of the full monorepo. The architecture, data model,
auth wiring, real-time path, pairing flow, and offline cache are all in place and
consistent across the three apps via `packages/contracts`.

## What's implemented

- **Monorepo**: pnpm workspaces + Turborepo (`apps/*`, `packages/*`).
- **contracts**: zod schemas + TS types + Socket.IO event contracts (typechecks clean).
- **api**: Express + Drizzle schema + Socket.IO rooms; routes for categories, items
  (incl. sold-out toggle → live broadcast), screens + screen↔category assignment,
  device pairing (register / pair / status / heartbeat / reassign / revoke), and Supabase Storage signed uploads.
- **web**: Next.js + Supabase Auth (sign-up / sign-in / onboarding), client-side
  auth guard, dashboard with live sold-out toggle, device-pairing page, API client.
- **tv**: Expo + `react-native-tvos`, pairing screen, live menu board, Socket.IO
  client, SQLite offline cache, Metro monorepo config.

## Verified

- `@imlipos/contracts` passes `tsc --noEmit`.
- All cross-package imports resolve to real exports.
- No Supabase SDK / Prisma usage (Postgres-only, Drizzle, as designed).

## Known gaps / TODO (intentionally out of scope for the scaffold)

1. **Category/item creation UI** — the dashboard lists + toggles menu items but has no
   create/edit forms yet; the API endpoints exist (`POST /categories`, `/items`).
2. **Rate limiting** — `POST /devices/register` and `/devices/pair` must be rate-limited
   (brute-force protection on the 6-digit code). Add `express-rate-limit`.
3. **shadcn/ui** — UI uses plain Tailwind; run `npx shadcn@latest init` in `apps/web`
   to adopt the component kit.
4. **Shared DB schema** — auth tables are duplicated in `apps/web/src/lib/schema.ts`;
   promote to a `packages/db` package to remove drift.
5. **Socket.IO scaling** — add the Redis adapter before running multiple API instances.
6. **price type** — API returns `numeric` as a string; coerce to number at the edge if
   strict typing across the wire is desired.
7. **On-device media caching** — cache Supabase Storage images/videos on the TV for full offline visuals.

## Run

```bash
pnpm install
cp .env.example .env     # fill in DATABASE_URL (pooled), secrets, SUPABASE_* storage
pnpm db:generate && pnpm db:migrate
pnpm dev                 # api + web
pnpm --filter @imlipos/tv start
```
