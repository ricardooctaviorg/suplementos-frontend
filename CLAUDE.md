# CLAUDE.md — suplementos-frontend

Next.js application with three zones: login, per-tenant management dashboard and public stock catalog.
Read `docs/ARCHITECTURE.md` and `docs/DOMAIN-MODEL.md` first (copies of the project documents; the reference version lives in `suplementos-backend/docs/`). If anything in this file conflicts with them, flag it before deciding.

**Before writing Next.js code, read `AGENTS.md` and the guides in `node_modules/next/dist/docs/`.** This version of Next has significant changes compared to what you know (see the "Next.js in this version" section).

## Stack

Next.js 16 (App Router, Cache Components and Partial Prefetching enabled) · React 19 · strict TypeScript · CSS variables for per-tenant theming · Vitest + Testing Library (jsdom) · `html5-qrcode` for the camera · Playwright (later).

## Commands

```bash
npm run dev          # development server
npm run build        # production build
npm start            # serve the build
npm test             # Vitest, single run
npm run test:watch   # Vitest in watch mode
npm run typecheck    # next typegen && tsc --noEmit (generates route types first)
npm run lint         # ESLint
```

Before considering a task done: `npm run typecheck && npm run lint && npm test`.

Locally, Next can run on the host (without Docker) to save resources; the backend and Postgres do run in Docker.

## Structure

```
src/
├── app/
│   ├── (auth)/login/              # step 1: tenant slug; step 2: email and password
│   ├── (dashboard)/app/           # tenant dashboard (requires a session)
│   │   ├── inventory/
│   │   ├── capture/               # barcode / QR reader
│   │   ├── products/
│   │   └── settings/              # name, logo, colors
│   ├── (public)/catalog/[slug]/   # public catalog
│   └── internal/revalidate/       # endpoint for the backend to invalidate the cache
├── components/
│   ├── ui/                        # reusable base components
│   └── <domain>/                  # components per zone
├── lib/
│   ├── api/                       # typed API client and error-code mapping
│   ├── theme/                     # per-tenant theming
│   ├── gtin.ts                    # same validation as the backend
│   └── session.ts
├── messages/
│   └── es.ts                      # all Spanish UI text (typed object)
└── styles/
tests/                             # mirrors the structure of src/
```

## Language policy

- Everything is in English: code, identifiers, comments, test descriptions, docs, commit messages and branch names.
- The only exception is user-facing UI text, which is in Spanish and lives **only** in `src/messages/` (`src/messages/es.ts`, a typed object). Pages and components import from there; no literal Spanish text in components, pages, metadata or `lib/`.
- Keep `<html lang="es">`.
- API errors: the backend returns `{ error: { code, message } }` with an English `message` that is not shown to users. `lib/api` maps `code` to Spanish text from `es.apiErrors` (`ApiError.userMessage`), with a generic fallback for unknown codes. A new backend error code gets its entry in `es.apiErrors`.
- Categories are stored in English; the UI translates their labels by `slug` from the messages file and falls back to `name` (see `docs/DOMAIN-MODEL.md`).
- Tests may assert on Spanish text, since that is what the user sees; their descriptions are in English.
- Check (accented letters, inverted question and exclamation marks, written as escapes so this file does not match itself): `grep -rnP "[\x{E1}\x{E9}\x{ED}\x{F3}\x{FA}\x{F1}\x{C1}\x{C9}\x{CD}\x{D3}\x{DA}\x{D1}\x{BF}\x{A1}]" src tests docs *.md` should only match `src/messages/` and tests that assert on Spanish text.

## Critical rules

### Same origin for API calls
- The browser **always** calls `/api/*` on the frontend's own origin. Next forwards it to the backend with `rewrites` pointing to `BACKEND_URL`.
- Reason: frontend and API live on different domains on Railway, and `sameSite=lax` session cookies do not travel across sites. With the proxy, the cookie belongs to the frontend domain.
- Server-side calls (SSR, server components) use `BACKEND_URL` directly, preferably over Railway's private network.
- Never store session tokens in `localStorage`; the session is the `httpOnly` cookie set by the backend.

### Session in the dashboard
- `(dashboard)/app/layout.tsx` verifies the session (`getCurrentSession()` in `lib/session.ts`) and redirects to `/login` on 401. That is not enough on its own: a layout does not stop child segments from rendering into the RSC payload (see the Next authentication guide, "Layouts and auth checks").
- Every page under `/app` and every server data access calls `getCurrentSession()` itself, inside a `<Suspense>` boundary. It is deduplicated per request with `React.cache`, so it costs a single `GET /api/auth/me`.
- The session is never cached (`serverApiFetch` uses `cache: "no-store"`) and never stored on the client.

### Tenant
- In the dashboard, the tenant comes from the session. In the public catalog, from the URL `slug`.
- Never build or send a `tenant_id` from the client. The frontend does not decide isolation; it only respects it.

### Per-tenant theming
- Colors (`color_primary`, `color_secondary`, `color_accent`, `color_background`, `color_text`) come from the API and are injected as CSS variables (`--color-primary`, etc.) on the root container of each tenant zone.
- Every component uses the variables, **never** hardcoded colors.
- Validate minimum text-on-background contrast when showing the preview in settings.
- The logo is shown with `next/image`, with a fallback when there is no logo.

### Barcode capture
- Two modes: USB scanner (behaves like a keyboard) and camera.
- USB scanner: capture the fast key sequence ending in Enter inside a focused field; do not rely on a special event.
- Camera: load the library only in the capture module (dynamic import) so the rest of the app stays lean.
- Validate and normalize the GTIN with `lib/gtin.ts` before calling the API (immediate UX); the backend validates again.
- Send a `client_request_id` (uuid) with every stock movement to avoid duplicates from retries or double scans.
- After scanning: if the product exists, ask only for quantity and price; otherwise show the short form and warn that it will be pending review.

### Public catalog
- Server-rendered (SSR) for SEO: `generateMetadata` with the tenant's name, description and colors.
- Search, category filter and pagination are handled with URL parameters (`?q=&category=&page=`) so they are shareable and crawlable.
- Stock is shown as a number or a status (available / low / out, labels from `es.stock`) depending on what the API returns; the frontend does not recompute business rules.
- "Stable" catalog data (name, image, price, category) may be cached with `use cache` + ``cacheTag(`tenant:${slug}`)``, and the backend invalidates it by calling `/internal/revalidate` (protected with `REVALIDATE_SECRET`, which runs `revalidateTag(tag, "max")`). Stock is **not** cached: it is fetched dynamically or with a short client-side query. No WebSockets in the MVP.
- The revalidation endpoint lives at `/internal/revalidate` and **not** under `/api/`, because `/api/*` is forwarded to the backend.
- Accessible and simple: semantic HTML, images with `alt`, keyboard navigable.

## Next.js in this version

- `AGENTS.md` (generated by Next) and `node_modules/next/dist/docs/` are the reference. If your knowledge of Next contradicts those guides, the guides win.
- **Cache Components** enabled: data access is dynamic by default and is cached explicitly with `use cache`, `cacheLife` and `cacheTag`. Runtime data (`params`, `searchParams`, `cookies()`, `headers()`) is read inside a `<Suspense>` boundary or the build fails.
- `params` and `searchParams` are promises (`await`). Use the global type helpers `PageProps<"/route">` and `LayoutProps<"/route">` (generated by `npm run typecheck`).
- With Cache Components, hidden routes stay mounted (`<Activity>`): clean up effects on unmount. In the capture module, **always stop the camera** in the effect's cleanup function.
- `next/font/google` is not used (the build must not depend on the network): system fonts defined in `globals.css`.
- Vitest tests cover synchronous components; `async` server components are tested with E2E (Playwright).
- The `rewrites` in `next.config.ts` are fixed at build time: `BACKEND_URL` must exist during the build.

## Code conventions

- TypeScript `strict`; `any` is forbidden.
- Server components by default; `"use client"` only where needed (forms, scanner, interaction).
- Component names in `PascalCase`, files and folders in `kebab-case`; identifiers in English, visible text in Spanish (from `src/messages/`).
- All API access goes through `lib/api`; no stray `fetch` calls in components.
- Response types are shared with the backend contract (Zod schemas or generated types); do not hand-duplicate types when it can be avoided.
- Forms with client-side validation and clear Spanish error messages; the server always has the final say.
- Money formatted with `Intl.NumberFormat` using the tenant's currency; the value arrives as a string from the API and is never operated on as a float.
- Styles: CSS Modules with CSS variables (decision pending versus Tailwind; do not mix both until decided).
- No `console.log` in shipped code.

## Tests

- Vitest + Testing Library. Priority: product entry form, barcode reader (keyboard capture logic), inventory table, GTIN normalization, stock status component.
- Test behavior visible to the user, not implementation details.
- Playwright later, for the scan → register → see in public catalog flow.
- A new feature includes its tests in the same change.
- Server modules that read `cookies()` run in the `node` environment (`// @vitest-environment node`) with `next/headers` mocked; `server-only` is aliased in `vitest.config.mts`.

### Pending for E2E (async server components, not covered by Vitest)

- `/login/[slug]`: resolves the tenant on the server, applies its palette and redirects to `/login` for unknown, suspended or malformed slugs.
- `(dashboard)/app/layout.tsx`: the session guard (`GET /api/auth/me` forwarding the request cookie) redirects to `/login` on 401 and shows the user and tenant names.
- Full flow: slug → credentials → `/app` → logout → `/login`, and `/app` without a session redirects to `/login`.

## Environment variables

Validated at startup. Example in `.env.example`; `.env.local` is never committed.

| Variable | Use |
|----------|-----|
| `BACKEND_URL` | API URL (internal on Railway), used by `rewrites` and SSR |
| `REVALIDATE_SECRET` | Secret shared with the backend for `/internal/revalidate` |
| `NEXT_PUBLIC_APP_NAME` | Platform name (not sensitive) |

Nothing sensitive gets the `NEXT_PUBLIC_` prefix.

## Environments

Only two: **local** and **production** (Railway). In production, `next build` and its own Railway service.

## Git

- Main branch `main`; branches `feat/...`, `fix/...`, `chore/...`.
- Conventional commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`), in English.
- One change = one intent.

## What NOT to do

- Do not implement a cart, payments or point of sale: out of the MVP.
- Do not let the browser call the backend domain directly.
- Do not hardcode colors, business names or logos.
- Do not add heavy UI libraries without justification (the development MacBook is limited).
- Do not duplicate backend business rules; the frontend displays, validates for UX and delegates.
- Do not write Spanish text outside `src/messages/`.
- Do not modify `docs/ARCHITECTURE.md` or `docs/DOMAIN-MODEL.md` silently: propose the change and explain why.
