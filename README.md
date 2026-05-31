# ImliPos — Digital Menu Management

Multi-tenant platform for cafe/shop owners to manage menus shown on Android TVs.
See `ARCHITECTURE.md` for the full design.

## Monorepo layout

```
apps/
  api/        Express + Socket.IO + Drizzle  (the only DB client)
  web/        Next.js + shadcn/ui + Supabase Auth  (owner admin)
  tv/         Expo + react-native-tvos        (TV display client)
packages/
  contracts/  Shared TS types, zod schemas, Socket.IO event contracts
  config/     Shared tsconfig
```

Stack: Supabase Postgres (DB only) · Node/Express (TS) · Drizzle ORM ·
Socket.IO · Supabase Auth · Next.js + shadcn · Supabase Storage (+ CDN) · React Native (RNTV).

## Prerequisites

- Node >= 20, pnpm >= 9
- A Supabase project (used only for its hosted Postgres)
- A Supabase Storage bucket named `menu-media` (public, with a file-size limit)

## Setup

```bash
pnpm install
cp .env.example .env            # fill in values
pnpm db:generate                # generate SQL from Drizzle schema
pnpm db:migrate                 # apply migrations to Supabase Postgres
pnpm dev                        # runs api + web (tv started separately)
```

### Run the TV app

```bash
pnpm --filter @imlipos/tv start
```

## Apps & ports

- `web`  → http://localhost:3000  (Next.js admin)
- `api`  → http://localhost:4000  (REST + Socket.IO)
- `tv`   → Expo dev server (run on an Android TV / emulator)

## Auth model

- **Owners**: Supabase Auth (email/password) in `web`; the API validates the access token via `auth.getUser()` and resolves the owner's shop.
- **TVs**: device tokens issued at pairing (OAuth device-grant style), signed with `DEVICE_JWT_SECRET`.
