# ARCHITECTURE.md

> Multi-tenant supplement inventory management platform for local businesses, with a public stock catalog.
> Status: draft v0.1. This document is the source of truth for the architecture; data details live in `DOMAIN-MODEL.md` and individual decisions in `docs/adr/`.

---

## 1. Vision and scope

### Goal
Give several local businesses (tenants) a simple tool to control their supplement inventory and publish a catalog with real-time stock.

### In the MVP
- Multi-tenant with a single database (`tenant_id`).
- Global product catalog shared across tenants, with categories.
- Per-tenant management dashboard (owners only): product creation, prices, stock.
- Fast product entry by barcode (GTIN) with a USB scanner or camera. It is an internal module of the dashboard.
- Per-tenant customization: name, logo, color palette.
- Per-tenant public catalog: search, filters, detail and stock.
- Single login: the user types the tenant, then email and password. No MFA.

### Out of the MVP (but planned)
- Point of sale (a sale will be one more movement in the ledger).
- Ecommerce, cart, payments, orders.
- Expiration dates and lots (explicit decision: simple stock per product).
- Mobile app.
- MFA, roles beyond "owner".

---

## 2. Overview

```
                    ┌──────────────────────────────┐
                    │  frontend (Next.js + TS)     │
                    │  repo: suplementos-frontend  │
                    │                              │
   Owner ─────────► │  (dashboard) /app/*          │
                    │  (public)    /catalog/[slug] │ ◄───── End customer
                    │  (auth)      /login          │
                    └──────────────┬───────────────┘
                                   │ HTTPS / JSON
                    ┌──────────────▼───────────────┐
                    │  backend (Fastify + TS)      │
                    │  repo: suplementos-backend   │
                    │                              │
                    │  /api/auth  /api/admin/*     │
                    │  /api/public/*               │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │  PostgreSQL                  │
                    └──────────────────────────────┘
```

Two repositories, no monorepo:

| Repo | Contents | Deployment |
|------|----------|------------|
| `suplementos-backend` | Fastify REST API, domain logic, data access, migrations | Railway (service) |
| `suplementos-frontend` | A single Next.js app with route groups: dashboard, public catalog and login | Railway (service) |

> Repo names are provisional.

### Why a single frontend
The dashboard and the catalog share the design system, per-tenant theming and the API client. The public catalog needs SSR for SEO, and Next handles it the same way as the dashboard. If the catalog grows or needs a different deployment cycle, it can be split later without touching the backend, because it already consumes `/api/public/*`.

---

## 3. Stack

### Backend
- **Node.js (LTS) + TypeScript**, strict.
- **Fastify** as the HTTP framework.
- **Drizzle ORM** + **drizzle-kit** for schema and migrations.
- **Zod** for input validation (with `fastify-type-provider-zod`) and to generate contract types.
- **argon2** for password hashing.
- **Vitest** for unit tests; integration tests against Postgres in Docker.

### Frontend
- **Next.js (App Router) + TypeScript**.
- Styles: CSS variables for per-tenant theming. Tailwind is optional, to be decided in the frontend ADR.
- Barcode reading: keyboard input for USB scanners and `html5-qrcode` or ZXing for the camera.
- **Vitest + Testing Library** for components. Playwright later.

### Data and infrastructure
- **PostgreSQL**.
- **Docker / docker compose** for local.
- **Railway** for production.
- **Cloudflare R2** (S3-compatible) for logos and product images.

---

## 4. Multi-tenancy

**Model:** shared database, shared schema, `tenant_id` column in every table that belongs to a business.

- **Global data (no `tenant_id`):** `categories`, `global_products`.
- **Per-tenant data (with `tenant_id`):** `tenant_settings`, `users`, `tenant_products`, `stock_movements`, `stock_levels`.

### Isolation rules
1. All per-tenant data access goes through a repository layer that **requires** the `tenant_id`. No SQL or tenant queries are written outside that layer.
2. The `tenant_id` **always comes from the authenticated session** (dashboard) or from the slug resolved on the server (public catalog). It is never accepted from the body or from a client parameter in admin routes.
3. Candidate second line of defense: Postgres **Row Level Security**. To be evaluated in an ADR; it does not block the MVP.

### Tenant resolution
- **Dashboard and login:** the tenant is chosen by typing its slug at `/login`; it is stored in the session.
- **Public catalog:** `/catalog/[slug]` in the MVP. Subdomains (`slug.domain.com`) remain a possible improvement if a wildcard domain is purchased.

### Theming
`tenant_settings` stores name, logo and palette. The frontend layout injects them as CSS variables (`--color-primary`, etc.) on each tenant's root container.

---

## 5. Authentication and authorization

- **In-house auth**, encapsulated in a module (`auth`) so it can be migrated to a provider later.
- Flow: `/login` asks for the tenant slug → email and password screen → session.
- Passwords with **argon2id**.
- Server-side session (`sessions` table in Postgres) with an `httpOnly`, `secure`, `sameSite=lax` cookie. Avoids JWT to keep revocation simple.
- A single role in the MVP: tenant **owner**.
- Basic protection: rate limiting on login (`@fastify/rate-limit`) and generic error messages.
- The public catalog does not require authentication.

---

## 6. Domain: inventory

Summary; details are in `DOMAIN-MODEL.md`.

- **Global catalog:** product identified by GTIN, with status `approved` or `pending`.
- **Tenant catalog:** `tenant_products` references the global product and adds price, the tenant's own SKU and public visibility.
- **Stock:** `stock_movements` is a ledger (in, out, adjustment). `stock_levels` holds the current quantity and is updated **in the same transaction** as the movement.
- No lots or expiration dates at this stage.

### Global catalog governance
- Tenants **do not edit** global products; only their own fields.
- A new product created by a tenant stays `pending` and is visible only to that tenant until a platform administrator approves it.

### Fast entry by barcode
1. The owner scans the GTIN in the capture module.
2. The backend looks it up in `global_products`.
3. If it exists: quantity and price are requested and the `tenant_product` is created with its stock entry.
4. If it does not exist: short form (name, brand, category, photo) and it is created as `pending`.
5. Optional later: prefill with Open Food Facts.

---

## 7. Public catalog and stock

- Routes `/api/public/:slug/products` (paginated list, search, category filter) and `/api/public/:slug/products/:id`.
- Only exposes products with `visible = true` and non-sensitive data.
- Pages rendered with **SSR** for SEO.
- **Near real-time stock**, without WebSockets in the MVP:
  - The stock figure is requested from the backend by the client with a short query.
  - Optional: the backend calls a frontend revalidation endpoint when stock changes.
- If traffic demands it, a short cache is added in the backend. Not before.

### Images and files
- Storage in **Cloudflare R2**: the free tier covers 10 GB of storage, 1 million write operations and 10 million read operations per month, and egress is free. Enough for the catalog of several local businesses.
- Upload **through the backend**: validates type and size, resizes and converts to webp with `sharp`, and stores in R2 with the S3 SDK.
- Keys: `tenants/{tenantId}/logo.webp` and `products/{globalProductId}.webp`. The database stores the public URL.
- Public reads through a custom domain connected to the bucket (the `r2.dev` development subdomain is not for production).
- Two environments, two buckets: one for local and one for production.

### Same origin for frontend and API
Frontend and API live on different domains in Railway, and `sameSite=lax` cookies do not travel across sites. That is why the browser always calls `/api/*` on the frontend domain and Next forwards it to the backend with `rewrites`. The session cookie stays on the frontend domain. SSR calls the backend directly, preferably over Railway's private network.

---

## 8. API contract

- REST + JSON, `/api` prefix.
- Three zones: `/api/auth/*`, `/api/admin/*` (requires a session) and `/api/public/*` (no session).
- Zod validation on every route; schemas are the source of the types.
- Uniform error format: `{ "error": { "code": "...", "message": "..." } }`. The `code` is the stable contract; the `message` is in English and is not meant to be shown to end users (the frontend maps `code` to Spanish UI text).
- Pagination with `page` and `pageSize`, with a maximum cap.
- Versioning: no version prefix for now; `/v1` is introduced if there are external clients.

---

## 9. Environments

Only two:

| Environment | Where | Notes |
|-------------|-------|-------|
| `local` | Docker Compose | Postgres and API in containers |
| `production` | Railway | Backend, frontend and Postgres services |

### Local and the 2019 Intel MacBook
Docker Desktop is fairly heavy on that machine. By default **Postgres and the API** are dockerized; the Next frontend can run on the host with `npm run dev` if it is slow. The backend's `docker-compose.yml` starts Postgres and exposes the port.

### Configuration
- Environment variables, with `.env.example` committed and `.env` ignored.
- Variables are validated at startup (Zod); the process fails fast if any is missing.
- Migrations: run as a deployment step, not when the app starts.

### Production on Railway
- One service per repo plus the Postgres plugin.
- Environment variables in Railway; never secrets in the repo.
- Database backups: enable them and test a restore before loading real data.

---

## 10. Testing

- **Backend:** Vitest. Unit tests for domain logic (stock movements and levels, tenant resolution). Integration tests for repositories and routes against Postgres in Docker.
- **Frontend:** Vitest + Testing Library for key components (product entry form, barcode reader, inventory table).
- **E2E:** Playwright, later, with the flow scan → register → see in public catalog.
- Coverage priority: tenant isolation and stock consistency.

---

## 11. Folder structure (proposal)

### Backend
```
suplementos-backend/
├── src/
│   ├── config/          # env, constants
│   ├── db/              # Drizzle schema, migrations, client
│   ├── modules/
│   │   ├── auth/
│   │   ├── tenants/
│   │   ├── catalog/     # global_products, categories
│   │   ├── inventory/   # tenant_products, stock
│   │   └── public/      # public catalog routes
│   ├── plugins/         # Fastify plugins (db, auth, rate limit)
│   ├── shared/          # errors, utilities
│   └── server.ts
├── tests/
├── docker-compose.yml
├── CLAUDE.md
└── ARCHITECTURE.md  (copy of or link to this document)
```

### Frontend
```
suplementos-frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/app/      # tenant dashboard
│   │   │   ├── inventory/
│   │   │   ├── capture/
│   │   │   ├── products/
│   │   │   └── settings/
│   │   └── (public)/catalog/[slug]/
│   ├── components/
│   ├── lib/             # API client, theming, utilities
│   └── styles/
├── tests/
├── CLAUDE.md
└── ARCHITECTURE.md  (copy or link)
```

Each backend module has its routes, service, repository and Zod schemas.

---

## 12. Recorded decisions

| # | Decision | Status |
|---|----------|--------|
| 1 | PostgreSQL instead of MongoDB (relational data, stock transactions) | Decided |
| 2 | Multi-tenant with a shared database and `tenant_id` | Decided |
| 3 | Backend in Node + TypeScript with **Fastify** | Decided |
| 4 | In-house auth with server-side sessions, behind a module | Decided |
| 5 | Two repos; a single Next.js app with route groups for dashboard and catalog | Decided |
| 6 | No lots or expiration dates in the MVP | Decided |
| 7 | Movement ledger + `stock_levels` in the same transaction | Decided |
| 8 | Drizzle as the ORM | Proposed |
| 9 | Row Level Security as an additional defense | Pending |
| 10 | Tailwind vs CSS Modules in the frontend | Pending |
| 11 | Tenant in the public catalog by path vs subdomain | Path in MVP |
| 12 | Cloudflare R2 for images, upload through the backend | Decided |
| 13 | Browser calls the API on the same origin (Next rewrites) | Decided |
| 14 | Language policy: everything in English except the frontend UI text (Spanish) | Decided |

Each relevant decision will have a short ADR in `docs/adr/NNNN-title.md`.

---

## 13. Phases

1. **Foundation:** repos, Docker, base schema, auth, tenants and theming.
2. **Catalog and inventory:** categories, barcode entry, stock.
3. **Public catalog:** list, search, detail, stock.
4. **Point of sale:** sales as stock movements.
5. **Ecommerce** (optional): orders, cart, payments.

---

## 14. Risks and considerations

- **Cross-tenant leaks:** the biggest risk of the model. Mitigation: mandatory repository layer, isolation tests and, perhaps, RLS.
- **Polluting the global catalog:** mitigated with the `pending` status and manual approval.
- **Stock concurrency:** update movement and level in one transaction, with a constraint that prevents negative stock.
- **MacBook resources:** keep the local stack minimal.
- **Supplement data coverage in open APIs:** do not depend on them for product entry.
