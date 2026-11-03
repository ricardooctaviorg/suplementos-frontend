# suplementos-frontend

Next.js (App Router) app with three zones: login, per-tenant management dashboard and public stock catalog.

Project documentation: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/DOMAIN-MODEL.md`](docs/DOMAIN-MODEL.md). Rules for Claude Code: [`CLAUDE.md`](CLAUDE.md).

Language: code, comments, docs and commits are in English. User-facing UI text is in Spanish and lives only in [`src/messages/`](src/messages/).

## Quick start

```bash
nvm use                      # Node 24 (see .nvmrc)
npm install
cp .env.example .env.local
npm run dev                  # http://localhost:3000
```

The backend (`suplementos-backend`) must be running at `http://localhost:3001`. Check the same-origin proxy:

```bash
curl http://localhost:3000/api/health    # {"status":"ok"} (answered by the backend)
```

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` / `npm run test:watch` | Tests (Vitest + Testing Library) |
| `npm run typecheck` | Generates route types and checks types |
| `npm run lint` | ESLint |

## Routes

| Route | Zone |
|-------|------|
| `/` | Home |
| `/login` | Login (step 1: business, step 2: credentials) |
| `/app` | Tenant dashboard (requires a session) |
| `/catalog/[slug]` | The business's public catalog |
