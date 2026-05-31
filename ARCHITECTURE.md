# ImliPos — Menu Management System Architecture

A multi-tenant platform for cafe/shop owners to manage digital menus shown on Android TVs. Owners can have multiple TVs and control which menu content appears on each screen.

**Design targets (chosen):** instant real-time updates, offline-capable TVs, low-ops where it counts, small/MVP scale.

**Stack stance:** we use Supabase **only as a hosted Postgres database**. Everything else (auth, realtime, storage, multi-tenancy) is built on our own backend to avoid Supabase's per-feature pricing.

---

## 1. Components

```
                         ┌────────────────────────────────────┐
                         │   Web Admin (owners)                │
                         │   Next.js + shadcn/ui + Supabase     │
                         └──────────────┬──────────────────────┘
                                        │ HTTPS (REST)  +  WSS (Socket.IO)
                                        ▼
        ┌──────────────────────────────────────────────────────────────┐
        │              API Service  —  Node + Express (TypeScript)        │
        │  ┌────────────┐ ┌─────────────┐ ┌────────────┐ ┌────────────┐  │
        │  │ REST (CRUD)│ │ Socket.IO    │ │ Auth verify│ │ media sign │  │
        │  │ + tenant   │ │ (WSS rooms)  │ │ (JWT)      │ │ (uploads)  │  │
        │  │ scoping    │ │              │ │            │ │            │  │
        │  └────────────┘ └─────────────┘ └────────────┘ └────────────┘  │
        └───────┬───────────────────────┬──────────────────────┬─────────┘
                │ SQL (Drizzle)          │ Socket.IO            │ S3 API
                ▼                        │                      ▼
     ┌────────────────────┐             │           ┌────────────────────┐
     │ Supabase Postgres   │             │           │ Supabase Storage     │
     │ (hosted DB only)    │             │           │ (images + video)     │
     └────────────────────┘             │           └─────────┬──────────┘
                                         │                     │ Supabase CDN 
            ┌────────────────────────────┴───────────┐         ▼
            ▼                                          ▼   (served to TVs/web)
 ┌──────────────────────┐                  ┌──────────────────────┐
 │  Android TV App #1   │                  │  Android TV App #2   │
 │  React Native (RNTV) │                  │  React Native (RNTV) │
 │  SQLite offline cache│                  │  SQLite offline cache│
 └──────────────────────┘                  └──────────────────────┘
```

Four surfaces:

- **Web Admin** — Next.js app where owners sign up, build menus, manage screens, assign content per TV, and toggle sold-out state. Auth handled by Supabase Auth.
- **API Service** — a single long-running Node/Express (TypeScript) service that owns all business logic: REST CRUD with tenant scoping, the Socket.IO server for real-time push, JWT verification, and signing Supabase Storage uploads.
- **Supabase Postgres** — used purely as a managed Postgres instance (connection string only). No Supabase Auth/Realtime/Storage/RLS.
- **Supabase Storage + CDN** — object storage for item images and videos, served via Supabase's built-in CDN.
- **Android TV App** — React Native display client per TV; subscribes to its screen's Socket.IO room, caches last good state in SQLite for offline.

---

## 2. Recommended tech stack

| Layer | Choice | Why |
|---|---|---|
| Database | **Supabase Postgres (hosted DB only)** + **Drizzle** ORM | You get a managed, backed-up Postgres without paying for Supabase's bundled features. Drizzle gives type-safe, SQL-like queries with a thin runtime and `drizzle-kit` migrations. |
| Backend | **Node + Express + TypeScript** | Full control over auth, multi-tenancy, and business logic; no per-feature SaaS billing. One service to deploy. |
| Real-time | **Socket.IO (WSS)** | Room-based broadcast maps perfectly to "push this change to the right TVs." Handles reconnection and fallbacks out of the box. |
| Auth (owners) | **Supabase Auth** (email/password) | Owners sign up/in via the Supabase client in the browser; Supabase issues the access token. The Express API validates it via `auth.getUser()` (cached). Reuses the Supabase project — no separate auth service. |
| Auth (TVs) | **Device tokens** (long-lived JWT issued at pairing) | TVs never use owner credentials; they authenticate with a per-device token. |
| Web admin | **Next.js + shadcn/ui (Tailwind)** | SSR/routing + a clean, accessible component kit. shadcn gives you forms, tables, dialogs fast. |
| Storage + CDN | **Supabase Storage** (+ built-in CDN) | Reuses the Supabase subscription you already pay for — no extra vendor or card. Backend mints signed upload URLs so the browser uploads directly; media served from the bucket's public CDN URL. |
| Multi-tenancy | **App-layer scoping** (every query filtered by `shop_id` from the auth token) | Since the backend is the only DB client, we enforce isolation in middleware instead of RLS. |

---

## 3. Auth model

Two distinct identities:

**Owners (web admin)** — handled by **Supabase Auth**. The browser uses the Supabase client (anon key) to sign up / sign in; Supabase holds the session and issues an access token. The browser sends that token as a Bearer to the Express API and in the Socket.IO handshake. The API validates each token with `supabaseAdmin.auth.getUser(token)` (cached ~30s) — correct regardless of legacy or new asymmetric signing keys — then resolves the owner's `shopId` from the `shops` table for tenant scoping. Owner accounts live in Supabase's managed `auth.users`; we don't model that table, we just store the auth user id in `shops.owner_id`.

**TVs (device tokens)** — a TV never logs in as the owner. During pairing (see §6) the backend issues a long-lived **device JWT** scoped to one `deviceId` + `screenId`. The TV sends it as a Bearer token on REST calls and in the Socket.IO handshake. Tokens can be revoked by flipping the device's status in the DB.

```
Owner browser ──Supabase token─► Express REST  ─┐
                                                ├─ getUser() → resolve shopId → scope queries
Owner browser ──Supabase token─► Socket.IO      ─┘

TV device     ──device JWT────► Express REST  ─┐
                                                ├─ verify → attach deviceId/screenId
TV device     ──device JWT────► Socket.IO      ─┘  → join room screen:{screenId}
```

---

## 4. Data model

```
auth.users  (managed by Supabase Auth — not modeled here)
    │ 1
    ▼ *
shops
  id
  owner_id (FK users)
  name
    │ 1
    ├──────────────► categories
    │                  id, shop_id (FK)
    │                  name, sort_order
    │                  is_available  ◄── sold-out toggle
    │                     │ 1
    │                     ▼ *
    │                  items
    │                    id, shop_id (FK), category_id (FK)
    │                    name, description, price
    │                    media_url     (Supabase Storage public URL: image or video)
    │                    media_type    (image | video)
    │                    is_available  ◄── sold-out toggle
    │                    sort_order
    │
    ├──────────────► screens
    │                  id, shop_id (FK)
    │                  name        (e.g. "Counter Left")
    │                  location, orientation, theme
    │
    ├──────────────► screen_categories   (what content shows on which screen)
    │                  screen_id (FK), category_id (FK), sort_order
    │
    └──────────────► devices
                       id, shop_id (FK), screen_id (FK, nullable)
                       pairing_code, device_token_id
                       status (pending | active | revoked)
                       last_seen_at
```

Every tenant-owned table carries `shop_id`. There is **no RLS** — instead, Express middleware reads `shopId` from the verified token and every Drizzle query is filtered by it (a shared helper enforces this so it can't be forgotten). `media_url` points at a Supabase Storage public (CDN) URL.

**Connection pooling:** the Express service connects to Supabase Postgres through the **pooled (Supavisor/pgBouncer) connection string**, so a busy backend doesn't exhaust Postgres connections.

---

## 5. Real-time with Socket.IO

Rooms are the mechanism: each TV joins `screen:{screenId}`. When an owner changes data, the backend broadcasts to exactly the affected rooms.

**Sold-out toggle (core live path):**

```
Owner taps "Sold out" in web
   → PATCH /items/:id  { is_available:false }   (Express)
   → Drizzle UPDATE in Postgres
   → Express resolves which screens show this item (via screen_categories)
   → io.to("screen:{id}").emit("item.updated", {...})   for each affected screen
   → Each TV in that room receives it (<1s), updates UI, writes to SQLite
```

TVs only join the room(s) for the screen they're assigned to, so they ignore irrelevant changes. The web admin can also join its shop's room to keep multiple admin tabs in sync.

---

## 6. Offline behavior (TV)

- On boot and on every change, the TV writes the current menu to **local SQLite** (op-sqlite or WatermelonDB).
- If the network drops, the TV keeps rendering from the local cache — the menu stays up.
- On reconnect, the TV does one REST fetch to get the authoritative current state, replaces the cache, then re-joins its Socket.IO room. This "fetch-then-subscribe" avoids missing events during the disconnect.
- Item images/videos are cached on-device too, so visuals survive offline.

---

## 7. Screen & device management

1. Owner creates **screens** in the web app and assigns content via `screen_categories` (plus layout/theme).
2. A new TV opens the app with no screen → shows a **6-digit pairing code** (backend creates a `devices` row, `status=pending`).
3. Owner opens "Screens → Pair a device", enters the code, and picks the screen.
4. Backend binds `device.screen_id`, sets `status=active`, and issues the **device JWT**. The TV (polling pairing status or notified over a temporary socket) receives the token and loads that screen's content.
5. Re-assigning a TV to a different screen is an update + a `screen.reassigned` socket event — content switches live. Revoking a device flips `status=revoked` and invalidates its token.

---

## 8. Storage & CDN (Supabase Storage)

Images and videos live in **Supabase Storage** and are served through Supabase's built-in CDN. This reuses the existing Supabase project (no separate storage vendor or payment method).

**Upload flow (from web admin):**

```
Web admin asks backend for an upload URL
   → POST /media/presign  { contentType, size }   (Express, authed)
   → backend mints a Supabase signed upload URL (+ validates type/size)
   → browser PUTs the file directly to Supabase (bypasses the API server)
   → backend stores the public CDN URL on the item (media_url)
```

Signed uploads keep large files off the API server while access stays controlled (the service-role key never leaves the backend). Use a **public bucket** with a file-size limit so the TVs can pull media from the CDN URL directly. (For heavy video — transcoding/adaptive bitrate — revisit a dedicated video service later.)

---

## 9. API surface (Express)

Owner-authed (Supabase access token), all tenant-scoped by `shopId`:

- Sign-up / sign-in — handled by Supabase Auth in the browser (not an API route).
- `GET /shops/me` — current user + their shop (drives onboarding).
- `POST /shops` — create the owner's shop (onboarding).
- `GET/POST/PATCH/DELETE /categories` and `/items` — menu CRUD.
- `PATCH /items/:id` / `PATCH /categories/:id` — sold-out toggle (`is_available`).
- `GET/POST/PATCH/DELETE /screens`, `/screen-categories` — screen config.
- `POST /media/presign` — get a Supabase Storage signed upload URL.
- `POST /devices/pair` — validate pairing code, bind device→screen, issue device token.
- `GET /devices` — list TVs + online status.

Device-authed (device JWT):

- `GET /screens/:id/content` — full menu payload for that screen (used on boot + reconnect).
- `POST /devices/heartbeat` — update `last_seen_at`.

Real-time events (Socket.IO): `item.updated`, `category.updated`, `screen.reassigned`, `menu.refresh`.

---

## 10. Deployment / hosting

- **Web admin (Next.js):** Vercel (or any Node host).
- **API service (Express + Socket.IO):** a **persistent** host — Railway, Render, or Fly.io. Socket.IO needs a long-running process, so it can't go on serverless functions. For MVP, a single instance is fine.
- **Database:** Supabase Postgres (pooled connection string).
- **Storage/CDN:** Supabase Storage (+ built-in CDN).
- **Secrets:** Supabase **anon key** in the web app (public); Supabase **service-role key** and `DEVICE_JWT_SECRET` only on the backend.

---

## 11. MVP build order

1. Provision Supabase Postgres; set up Drizzle schema + `drizzle-kit` migrations.
2. Next.js admin shell + Supabase Auth sign-up/sign-in + onboarding (name your shop).
3. Express API: JWT verify middleware + tenant scoping helper.
4. Menu CRUD (categories/items) end to end, including sold-out toggle.
5. Supabase Storage signed uploads + public CDN URLs on items.
6. Screens + `screen_categories` management in web.
7. Socket.IO server + rooms; wire sold-out toggle to live broadcast.
8. React Native TV app (Expo + `react-native-tvos`): render a screen's content, then join its room.
9. Device pairing flow (web + backend + TV pairing screen + device token).
10. Offline cache (SQLite) + media caching + reconnect/refetch.
11. Online/last-seen indicators.

---

## 12. What to revisit as you grow

- **Scaling Socket.IO:** one instance is fine for MVP. To run multiple API instances, add the **Socket.IO Redis adapter** (or sticky sessions) so room broadcasts reach clients across instances.
- **Multi-tenancy hardening:** app-layer scoping is enforced by a shared query helper; add integration tests that assert no cross-`shop_id` leakage. If you ever expose the DB to other clients, revisit RLS.
- **Connection limits:** keep using the pooled Postgres string; watch pool saturation as TV/admin counts grow.
- **Video:** for heavier video needs (transcoding, adaptive streaming), add a dedicated video service (e.g. Mux/Cloudflare Stream) — Supabase Storage serves raw files only.
- **Menu scheduling / dayparting:** breakfast vs. dinner per screen — model as time-ranged `screen_categories`.
- **Multi-location chains:** add an `organizations` layer above `shops`.
- **Observability:** structured logs + uptime/heartbeat monitoring so you can see which TVs are offline.
- **TV perf fallback:** if React Native struggles on low-end TV boxes, drop the TV client to native Kotlin + Compose for TV (Room for cache) — the backend contract stays identical.
