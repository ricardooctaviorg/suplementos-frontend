# DOMAIN-MODEL.md

> Data model and domain rules of the supplement inventory platform.
> Complements `ARCHITECTURE.md`. Status: draft v0.1.
> Engine: PostgreSQL. ORM: Drizzle. The whole schema is defined in `src/db/schema/`.

---

## 1. General conventions

- **IDs:** `uuid` with `default gen_random_uuid()`. Exception: `sessions.id` is a token hash (text).
- **Timestamps:** `timestamptz`, always in UTC. `created_at` and `updated_at` on every mutable table.
- **Money:** `numeric(12,2)`. Never `float`. The currency lives in `tenant_settings.currency` (default `MXN`).
- **Stock quantities:** `integer`.
- **Naming:** tables and columns in English, `snake_case`. User-facing UI text is in Spanish and lives in the frontend.
- **Deletion:** soft delete (`is_active = false`) for business entities. Stock movements are **never** deleted or edited.
- **Enums:** Drizzle `pgEnum` (or `text` with `CHECK`, if easier migrations are preferred).
- **Isolation:** every table with `tenant_id` requires it `NOT NULL`, with an index that starts with `tenant_id`.
- **Foreign keys:** `ON DELETE NO ACTION` and `ON UPDATE NO ACTION` everywhere; no cascades. Tenants are suspended and business entities deactivated, never deleted.
- **Emails:** stored lowercase, enforced with `CHECK (email = lower(email))`.

---

## 2. Entity overview

```
categories (global) ◄──── global_products (global) ◄──── tenant_products ────► stock_levels
   │ parent_id                    ▲                           │  ▲                  ▲
   └──► categories                │                           │  │                  │
                                  │ created_by_tenant_id      │  └──── stock_movements
                                  │                           │
tenants ──┬── tenant_settings (1:1)                            │
          ├── users ──── sessions                              │
          └───────────────────────────────────────────────────┘
platform_admins (independent of tenants)
```

**Global** (no `tenant_id`): `categories`, `global_products`, `platform_admins`.
**Per tenant** (with `tenant_id`): `tenant_settings`, `users`, `sessions`, `tenant_products`, `stock_levels`, `stock_movements`.

---

## 3. Tables

### 3.1 `tenants`
A client business.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `slug` | text | Unique. Lowercase, `a-z0-9-`, 3 to 40 characters. It is what the user types at login and goes in the catalog URL. |
| `name` | text | Business name |
| `status` | enum `active` \| `suspended` | A suspended tenant cannot log in and its public catalog stops responding |
| `created_at`, `updated_at` | timestamptz | |

Constraints: `UNIQUE (slug)`, `CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`, `CHECK (char_length(slug) BETWEEN 3 AND 40)`.
Reserved slugs, validated in the application layer (`src/modules/tenants/slug.ts`): `admin`, `api`, `app`, `auth`, `catalog`, `dashboard`, `internal`, `login`, `public`, `static`, `www`.

### 3.2 `tenant_settings`
Customization and visual identity. 1:1 relationship with `tenants`.

| Column | Type | Notes |
|--------|------|-------|
| `tenant_id` | uuid PK, FK → tenants | |
| `display_name` | text | Name shown in the catalog (may differ from `tenants.name`) |
| `logo_url` | text null | |
| `color_primary` | text | Hex `#RRGGBB` |
| `color_secondary` | text | Hex `#RRGGBB` |
| `color_accent` | text | Hex `#RRGGBB` |
| `color_background` | text | Hex `#RRGGBB` |
| `color_text` | text | Hex `#RRGGBB` |
| `currency` | char(3) | Default `MXN`. ISO 4217 code |
| `show_exact_stock` | boolean | Default `false`. If `false`, the catalog shows a stock status (in stock / low stock / out of stock) instead of the number |
| `low_stock_threshold` | integer | Default `5`. Threshold for "low stock" |
| `contact_phone` | text null | Useful for a local catalog (WhatsApp, phone) |
| `address` | text null | |
| `updated_at` | timestamptz | |

Colors are injected as CSS variables in the frontend. They are validated against strict hex to prevent style injection.
The five colors are `NOT NULL` without defaults: creating a tenant must supply the full palette.
Constraints: `CHECK (color_* ~ '^#[0-9A-Fa-f]{6}$')` on each of the five colors, `CHECK (currency ~ '^[A-Z]{3}$')`, `CHECK (low_stock_threshold >= 0)`.

### 3.3 `users`
Owners of a tenant. No MFA in the MVP.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `tenant_id` | uuid FK → tenants | |
| `email` | text | Stored normalized to lowercase |
| `password_hash` | text | argon2id |
| `name` | text | |
| `role` | enum `owner` | A single value for now; the enum leaves room for `staff` |
| `is_active` | boolean | |
| `last_login_at` | timestamptz null | |
| `created_at`, `updated_at` | timestamptz | |

Constraints:
- `UNIQUE (tenant_id, email)`. The same email may exist in different tenants.
- `UNIQUE (tenant_id, id)`: enables the composite foreign keys from `sessions` and `stock_movements`.
- `CHECK (email = lower(email))`.

### 3.4 `sessions`
Server-side session.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | SHA-256 hash of the cookie token. The plain token is never stored |
| `user_id` | uuid FK → users | |
| `tenant_id` | uuid FK → tenants | |
| `expires_at` | timestamptz | |
| `created_at` | timestamptz | |
| `ip`, `user_agent` | text null | Optional, for basic auditing |

Composite FK: `(tenant_id, user_id) → users (tenant_id, id)`. A session cannot belong to a user of another tenant.
Indexes: `(tenant_id)`, `(user_id)`, `(expires_at)` for periodic cleanup.

### 3.5 `platform_admins`
Platform administrators (the platform operator). They approve products in the global catalog. They live outside tenants.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `email` | text | Unique |
| `password_hash` | text | |
| `created_at` | timestamptz | |

Constraints: `UNIQUE (email)`, `CHECK (email = lower(email))`.
In the MVP a seed and a script may be enough; the approval interface can be minimal.

### 3.6 `categories`
Shared classification. Shallow tree.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `parent_id` | uuid null FK → categories | `null` = root |
| `name` | text | English name. Fallback label when the frontend has no translation for the `slug` |
| `slug` | text | Unique, English, stable. The frontend translation key: never changes once created |
| `sort_order` | integer | Default `0` |
| `created_at` | timestamptz | |

Root examples (`slug`: `name`): `proteins`: Proteins, `amino-acids`: Amino acids, `vitamins-minerals`: Vitamins and minerals, `pre-workouts`: Pre-workouts, `creatines`: Creatines, `fat-burners`: Fat burners, `joint-health`: Joint health, `snacks-bars`: Snacks and bars.
Naming: categories are stored and seeded in English only. The frontend translates category labels by `slug` from its messages file and falls back to `name` when no translation exists. The API always returns `slug` and `name`.
Constraints: `UNIQUE (slug)`, `CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')` (same format as tenant slugs). Depth limit (2 levels) validated in the application.
A category is only edited from platform administration.

### 3.7 `global_products`
General catalog shared across tenants.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `gtin` | text null | Normalized to 14 digits (see section 4). Unique when not null |
| `name` | text | |
| `brand` | text | |
| `presentation` | text null | E.g. "60 capsules", "2 lb chocolate flavor" |
| `description` | text null | |
| `category_id` | uuid FK → categories | |
| `image_url` | text null | |
| `status` | enum `pending` \| `approved` \| `rejected` | |
| `created_by_tenant_id` | uuid null FK → tenants | Who created it. `null` for the platform's initial load |
| `reviewed_by` | uuid null FK → platform_admins | |
| `reviewed_at` | timestamptz null | |
| `created_at`, `updated_at` | timestamptz | |

Constraints:
- `UNIQUE (gtin) WHERE gtin IS NOT NULL`.
- `CHECK (gtin ~ '^[0-9]{14}$')`.

Indexes: `(category_id)`, `(status)`, and text search over `name` and `brand` with `pg_trgm` + `unaccent`:
- `unaccent()` is not `IMMUTABLE`, so the migration defines an `IMMUTABLE` wrapper `immutable_unaccent(text)` with the dictionary pinned.
- GIN trigram indexes on `immutable_unaccent(lower(name))` and `immutable_unaccent(lower(brand))`.
- **Rule:** text-search queries must use exactly `immutable_unaccent(lower(<column>))`, applied the same way to the search term; any other expression skips the indexes.

A product without a barcode is valid (bulk items or items without a GTIN). It is then identified by id.

### 3.8 `tenant_products`
A global product as offered by a business: what the business contributes.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `tenant_id` | uuid FK → tenants | |
| `global_product_id` | uuid FK → global_products | |
| `sku` | text null | The business's own SKU |
| `price` | numeric(12,2) | `CHECK (price >= 0)` |
| `alt_name` | text null | Alternative name that takes precedence in the business's catalog |
| `is_visible` | boolean | Default `true`. Controls whether it appears in the public catalog |
| `is_active` | boolean | Default `true`. `false` = archived (replaces deletion) |
| `created_at`, `updated_at` | timestamptz | |

Constraints:
- `UNIQUE (tenant_id, global_product_id)`: a business does not repeat the same product.
- `UNIQUE (tenant_id, sku) WHERE sku IS NOT NULL`.
- `UNIQUE (tenant_id, id)`: enables the composite foreign keys from stock (see 3.9 and 3.10).

Indexes: `(tenant_id, is_active, is_visible)`.

### 3.9 `stock_levels`
Current stock per tenant product. One row per `tenant_products`, created together with it at `0`.

| Column | Type | Notes |
|--------|------|-------|
| `tenant_product_id` | uuid PK | |
| `tenant_id` | uuid | |
| `quantity` | integer | `CHECK (quantity >= 0)` |
| `updated_at` | timestamptz | |

Composite FK: `(tenant_id, tenant_product_id) → tenant_products (tenant_id, id)`. This makes it impossible for a level to point to another tenant's product.
Index: `(tenant_id)`.

### 3.10 `stock_movements`
**Append-only** ledger of stock changes.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `tenant_id` | uuid | |
| `tenant_product_id` | uuid | |
| `type` | enum `in` \| `out` \| `adjustment` | |
| `delta` | integer | Signed. Positive for in, negative for out |
| `quantity_after` | integer | Resulting stock, for auditing |
| `reason` | text null | Required for `adjustment` (shrinkage, count, error) |
| `reference` | text null | Reserved: will later point to a sale |
| `client_request_id` | uuid null | Idempotency: prevents duplicating a resent scan |
| `created_by` | uuid FK → users | |
| `created_at` | timestamptz | |

Constraints:
- `CHECK (delta <> 0)`.
- `CHECK ((type = 'in' AND delta > 0) OR (type = 'out' AND delta < 0) OR type = 'adjustment')`.
- `CHECK (type <> 'adjustment' OR reason IS NOT NULL)`.
- `CHECK (quantity_after >= 0)`.
- `UNIQUE (tenant_id, client_request_id) WHERE client_request_id IS NOT NULL`.
- Composite FK `(tenant_id, tenant_product_id) → tenant_products (tenant_id, id)`.
- Composite FK `(tenant_id, created_by) → users (tenant_id, id)`: a movement cannot be attributed to a user of another tenant.

Index: `(tenant_id, tenant_product_id, created_at DESC)`.
Append-only at the database level: the `BEFORE UPDATE OR DELETE` row trigger `stock_movements_append_only` rejects both operations (`restrict_violation`). `TRUNCATE` is not blocked, because it does not fire row triggers; it is reserved for test cleanup and must never be used by application code.

---

## 4. GTIN normalization

Scanners return EAN-13, UPC-A (12), EAN-8 (8) or GTIN-14. So that the same product is not duplicated:

1. Strip spaces and non-numeric characters.
2. Accept only lengths 8, 12, 13 or 14.
3. Validate the check digit (GS1 modulo 10).
4. Left-pad with zeros up to 14 digits.

The 14-digit form is always stored. Scan lookups apply the same function before querying. This logic lives in a pure module (`shared/gtin.ts`) with unit tests; the frontend can reuse the same validation.

---

## 5. Rules and invariants

### Isolation
1. Every query on per-tenant tables includes the `tenant_id` taken from the session, never from the client.
2. Composite foreign keys prevent mixing tenants across products, levels, movements, sessions and users.
3. Repositories are the only way to access per-tenant data.

### Global catalog
4. Tenants do not edit `global_products`. They only create new ones (as `pending`).
5. **Exact GTIN lookup** (scan flow): returns the product in `pending` or `approved` status, regardless of who created it. This avoids duplicates when two businesses scan the same code.
6. **Browsing and text search** in the global catalog: only `approved`, plus the `pending` ones created by the tenant itself.
7. A `rejected` product cannot be linked to new `tenant_products`. Those already linked stop showing in the public catalog.
8. Only a `platform_admin` changes `status`.

### Stock
9. Every stock change is a movement plus the update of `stock_levels` in **the same transaction**.
10. Stock cannot go negative; the database `CHECK` guarantees it, not just the application.
11. Movements are not edited or deleted. A mistake is corrected with an `adjustment` movement with a reason.
12. A retry with the same `client_request_id` returns the original result without duplicating.

### Public catalog
13. Only shows `tenant_products` with `is_active = true` and `is_visible = true` whose global product is not `rejected`.
14. Stock is exposed according to `tenant_settings.show_exact_stock`: the exact number, or a status (`in_stock`, `low_stock` if `quantity <= low_stock_threshold`, `out_of_stock` if it is `0`). The frontend renders the Spanish labels.
15. Cost, movements and user data are never exposed.

---

## 6. Stock operation (implementation reference)

Inside a transaction:

```ts
// registerMovement(tx, { tenantId, tenantProductId, type, delta, reason, clientRequestId, userId })
// 1. Idempotency: if (tenant_id, client_request_id) exists, return the existing movement.
// 2. Update the level with an implicit row lock:
//      UPDATE stock_levels
//         SET quantity = quantity + :delta, updated_at = now()
//       WHERE tenant_id = :tenantId AND tenant_product_id = :tenantProductId
//   RETURNING quantity;
//    - If no row is returned: the product does not belong to the tenant -> 404 error.
//    - If CHECK (quantity >= 0) is violated: insufficient stock -> 409 error.
// 3. INSERT INTO stock_movements (..., delta, quantity_after = returned quantity, ...).
```

Advantages: a single atomic `UPDATE` avoids the read-then-write race condition, and the `CHECK` protects even if the code fails.

---

## 7. Main flows

### 7.1 Entry by scan
1. The frontend sends the scanned code to `GET /api/admin/catalog/lookup?gtin=...`.
2. The backend normalizes and validates the GTIN.
3. **Exists in global:**
   - If the tenant already has the `tenant_product`: return it to add stock.
   - Otherwise: ask for price and quantity; create the `tenant_product`, the `stock_level` at 0 and an `in` movement.
4. **Does not exist:** short form (name, brand, presentation, category, photo). Create the `global_product` as `pending` and continue as in step 3.

### 7.2 Manual adjustment
Stock editing: the owner enters the new quantity or the delta and a reason; it is recorded as an `adjustment`.

### 7.3 Approval
A `platform_admin` reviews the `pending` products, can correct name, brand or category, and moves them to `approved` or `rejected`.

---

## 8. Key queries and their indexes

| Query | Index that serves it |
|-------|----------------------|
| Resolve tenant by slug (login and catalog) | `UNIQUE (slug)` |
| Scan by GTIN | Partial `UNIQUE (gtin)` |
| Tenant inventory list | `(tenant_id, is_active, is_visible)` on `tenant_products` |
| Public catalog with category filter | `tenant_products` + `global_products(category_id)` |
| Text search | GIN `pg_trgm` over `immutable_unaccent(lower(name))` and `immutable_unaccent(lower(brand))` |
| Product history | `(tenant_id, tenant_product_id, created_at DESC)` on `stock_movements` |
| Sessions of a tenant | `(tenant_id)` on `sessions` |
| Session cleanup | `(expires_at)` |

Required extensions: `pg_trgm`, `unaccent` (created in the migrations). `gen_random_uuid()` is native since Postgres 13, so `pgcrypto` is not needed.

---

## 9. Planned for later phases (not implemented now)

- **Point of sale:** `sales` and `sale_items` tables; each sale generates `out` movements with `reference` pointing to the sale. `stock_movements` already supports it without changes.
- **Ecommerce:** `customers`, `carts`, `orders`, payments. Avoid using the name `orders` for anything else now.
- **Roles:** add `staff` to the `users.role` enum with limited permissions (record stock without editing prices).
- **Lots and expiration dates:** if ever required, add `stock_lots` and make `stock_movements` reference a lot. Explicit decision not to do it now.
- **Per-tenant price history:** `tenant_product_prices` if history is needed.

---

## 10. Open questions

| # | Question | Impact |
|---|----------|--------|
| 1 | ~~Where are logos and images stored?~~ **Resolved:** Cloudflare R2. The database stores the public URL; keys `tenants/{tenantId}/logo.webp` and `products/{globalProductId}.webp` | Nothing pending |
| 2 | Is the platform administration interface part of the MVP, or is approval done by script? | Phase 2 scope |
| 3 | Postgres RLS in addition to the composite keys? | See multi-tenancy ADR |
| 4 | Is a product without a GTIN allowed in the scan flow? | Allowed in the model today; UX still to be defined |
| 5 | ~~Category names are user-visible data stored in the database: are they seeded in Spanish, or translated in the frontend by `slug`?~~ **Resolved:** English `name` and stable English `slug`, seeded in English only; the frontend translates by `slug` from its messages file, falling back to `name` | Nothing pending |
