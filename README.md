# suplementos-frontend

Next.js (App Router) con tres zonas: login, panel de gestión por tenant y catálogo público de existencias.

Documentación del proyecto: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y [`docs/DOMAIN-MODEL.md`](docs/DOMAIN-MODEL.md). Reglas para Claude Code: [`CLAUDE.md`](CLAUDE.md).

## Arranque rápido

```bash
nvm use                      # Node 24 (ver .nvmrc)
npm install
cp .env.example .env.local
npm run dev                  # http://localhost:3000
```

El backend (`suplementos-backend`) debe estar corriendo en `http://localhost:3001`. Verifica el proxy de mismo origen:

```bash
curl http://localhost:3000/api/health    # {"status":"ok"} (lo responde el backend)
```

## Comandos

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servicio de producción |
| `npm test` / `npm run test:watch` | Pruebas (Vitest + Testing Library) |
| `npm run typecheck` | Genera tipos de rutas y verifica tipos |
| `npm run lint` | ESLint |

## Rutas

| Ruta | Zona |
|------|------|
| `/` | Inicio |
| `/login` | Login (paso 1: negocio, paso 2: credenciales) |
| `/app` | Panel del tenant (requiere sesión) |
| `/catalogo/[slug]` | Catálogo público del negocio |
