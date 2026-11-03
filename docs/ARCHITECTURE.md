# ARCHITECTURE.md

> Plataforma multi-tenant de gestión de inventario de suplementos para negocios locales, con catálogo público de existencias.
> Estado: borrador v0.1. Este documento es la fuente de verdad de la arquitectura; los detalles de datos viven en `DOMAIN-MODEL.md` y las decisiones puntuales en `docs/adr/`.

---

## 1. Visión y alcance

### Objetivo
Dar a varios negocios locales (tenants) una herramienta simple para controlar su inventario de suplementos y publicar un catálogo con existencias en tiempo real.

### Dentro del MVP
- Multi-tenant con una sola base de datos (`tenant_id`).
- Catálogo global de productos compartido entre tenants, con categorías.
- Panel de gestión por tenant (solo dueños): alta de productos, precios, existencias.
- Alta rápida por código de barras (GTIN) con lector USB o cámara. Es un módulo interno del panel.
- Personalización por tenant: nombre, logo, paleta de colores.
- Catálogo público por tenant: búsqueda, filtros, detalle y existencia.
- Login general: el usuario escribe el tenant, luego email y contraseña. Sin MFA.

### Fuera del MVP (pero previsto)
- Punto de venta (una venta será un movimiento más del ledger).
- Ecommerce, carrito, pagos, pedidos.
- Caducidad y lotes (decisión explícita: stock simple por producto).
- App móvil.
- MFA, roles más allá de "dueño".

---

## 2. Vista general

```
                    ┌──────────────────────────────┐
                    │  frontend (Next.js + TS)     │
                    │  repo: suplementos-frontend  │
                    │                              │
   Dueño ─────────► │  (gestion)  /app/*           │
                    │  (publico)  /catalogo/[slug] │ ◄───── Cliente final
                    │  (auth)     /login           │
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

Dos repositorios, sin monorepo:

| Repo | Contenido | Despliegue |
|------|-----------|------------|
| `suplementos-backend` | API REST en Fastify, lógica de dominio, acceso a datos, migraciones | Railway (servicio) |
| `suplementos-frontend` | Un solo Next.js con route groups: panel, catálogo público y login | Railway (servicio) |

> Los nombres de repo son provisionales.

### Por qué un solo front
Panel y catálogo comparten sistema de diseño, theming por tenant y cliente de API. El catálogo público necesita SSR para SEO, y Next lo resuelve igual que el panel. Si el catálogo crece o necesita otro ciclo de despliegue, se separa después sin tocar el backend, porque ya consume `/api/public/*`.

---

## 3. Stack

### Backend
- **Node.js (LTS) + TypeScript** estricto.
- **Fastify** como framework HTTP.
- **Drizzle ORM** + **drizzle-kit** para esquema y migraciones.
- **Zod** para validación de entrada (con `fastify-type-provider-zod`) y para generar los tipos de contrato.
- **argon2** para hash de contraseñas.
- **Vitest** para pruebas unitarias; pruebas de integración contra Postgres en Docker.

### Frontend
- **Next.js (App Router) + TypeScript**.
- Estilos: CSS variables para theming por tenant. Tailwind es opcional, decidirlo en el ADR del front.
- Lectura de códigos: entrada de teclado para lector USB y `html5-qrcode` o ZXing para cámara.
- **Vitest + Testing Library** para componentes. Playwright más adelante.

### Datos e infraestructura
- **PostgreSQL**.
- **Docker / docker compose** para local.
- **Railway** para producción.
- **Cloudflare R2** (compatible con S3) para logos e imágenes de productos.

---

## 4. Multi-tenancy

**Modelo:** base compartida, esquema compartido, columna `tenant_id` en toda tabla que pertenezca a un negocio.

- **Datos globales (sin `tenant_id`):** `categories`, `global_products`.
- **Datos por tenant (con `tenant_id`):** `tenant_settings`, `users`, `tenant_products`, `stock_movements`, `stock_levels`.

### Reglas de aislamiento
1. Todo acceso a datos por tenant pasa por una capa de repositorios que **exige** el `tenant_id`. No se escribe SQL o consultas de tenant fuera de esa capa.
2. El `tenant_id` sale **siempre de la sesión autenticada** (panel) o del slug resuelto en servidor (catálogo público). Nunca se acepta del body ni de un parámetro de cliente en rutas de administración.
3. Candidato a segunda línea de defensa: **Row Level Security** de Postgres. Se evalúa en un ADR; no bloquea el MVP.

### Resolución del tenant
- **Panel y login:** el tenant se elige escribiendo su slug en `/login`; queda en la sesión.
- **Catálogo público:** `/catalogo/[slug]` en el MVP. Subdominios (`slug.dominio.com`) quedan como mejora si se compra dominio con wildcard.

### Theming
`tenant_settings` guarda nombre, logo y paleta. El layout del front los inyecta como variables CSS (`--color-primary`, etc.) en el contenedor raíz de cada tenant.

---

## 5. Autenticación y autorización

- **Auth propia**, encapsulada en un módulo (`auth`) para poder migrar a un proveedor después.
- Flujo: `/login` pide slug del tenant → pantalla de email y contraseña → sesión.
- Contraseñas con **argon2id**.
- Sesión del lado servidor (tabla `sessions` en Postgres) con cookie `httpOnly`, `secure` y `sameSite=lax`. Evita JWT para no complicar la revocación.
- Un solo rol en el MVP: **dueño** del tenant.
- Protección básica: rate limiting en login (`@fastify/rate-limit`) y mensajes de error genéricos.
- El catálogo público no requiere autenticación.

---

## 6. Dominio: inventario

Resumen; el detalle está en `DOMAIN-MODEL.md`.

- **Catálogo global:** producto identificado por GTIN, con estado `aprobado` o `pendiente`.
- **Catálogo del tenant:** `tenant_products` referencia al producto global y agrega precio, SKU propio y visibilidad pública.
- **Existencias:** `stock_movements` es un ledger (entrada, salida, ajuste). `stock_levels` guarda la cantidad actual y se actualiza **en la misma transacción** que el movimiento.
- Sin lotes ni caducidad en esta etapa.

### Gobernanza del catálogo global
- Los tenants **no editan** productos globales; solo sus campos propios.
- Un producto nuevo creado por un tenant queda `pendiente` y es visible solo para ese tenant hasta que un administrador de plataforma lo apruebe.

### Alta rápida por código de barras
1. El dueño escanea el GTIN en el módulo de captura.
2. El backend busca en `global_products`.
3. Si existe: se pide cantidad y precio y se crea el `tenant_product` con su entrada de stock.
4. Si no existe: formulario corto (nombre, marca, categoría, foto) y se crea como `pendiente`.
5. Opcional más adelante: prellenado con Open Food Facts.

---

## 7. Catálogo público y existencias

- Rutas `/api/public/:slug/products` (listado paginado, búsqueda, filtro por categoría) y `/api/public/:slug/products/:id`.
- Solo expone productos con `visible = true` y datos no sensibles.
- Páginas con **SSR** para SEO.
- **Existencia casi en tiempo real**, sin WebSockets en el MVP:
  - El número de existencia se pide al backend desde el cliente con una consulta corta.
  - Opcional: el backend llama a un endpoint de revalidación del front cuando cambia el stock.
- Si el tráfico lo pide, se agrega caché corta en el backend. No antes.

### Imágenes y archivos
- Almacenamiento en **Cloudflare R2**: la capa gratuita cubre 10 GB de almacenamiento, 1 millón de operaciones de escritura y 10 millones de lectura al mes, y la salida de datos no se cobra. Suficiente para el catálogo de varios negocios locales.
- Subida **a través del backend**: valida tipo y tamaño, reescala y convierte a webp con `sharp`, y guarda en R2 con el SDK de S3.
- Claves: `tenants/{tenantId}/logo.webp` y `products/{globalProductId}.webp`. La base guarda la URL pública.
- Lectura pública con un dominio propio conectado al bucket (el subdominio de desarrollo `r2.dev` no es para producción).
- Dos ambientes, dos buckets: uno para local y otro para producción.

### Mismo origen entre front y API
Front y API viven en dominios distintos en Railway, y las cookies `sameSite=lax` no viajan entre sitios. Por eso el navegador llama siempre a `/api/*` en el dominio del front y Next lo reenvía al backend con `rewrites`. La cookie de sesión queda en el dominio del front. El SSR llama al backend directo, de preferencia por la red privada de Railway.

---

## 8. Contrato de API

- REST + JSON, prefijo `/api`.
- Tres zonas: `/api/auth/*`, `/api/admin/*` (requiere sesión) y `/api/public/*` (sin sesión).
- Validación con Zod en cada ruta; los esquemas son la fuente de los tipos.
- Errores con formato uniforme: `{ "error": { "code": "...", "message": "..." } }`.
- Paginación por `page` y `pageSize`, con tope máximo.
- Versionado: sin prefijo de versión por ahora; se introduce `/v1` si hay clientes externos.

---

## 9. Entornos

Solo dos:

| Entorno | Dónde | Notas |
|---------|-------|-------|
| `local` | Docker Compose | Postgres y API en contenedores |
| `production` | Railway | Servicios backend, frontend y Postgres |

### Local y la MacBook Intel 2019
Docker Desktop consume bastante en esa máquina. Por defecto se dockeriza **Postgres y el API**; el front de Next se puede correr en el host con `npm run dev` si va lento. El `docker-compose.yml` del backend levanta Postgres y expone el puerto.

### Configuración
- Variables de entorno, con `.env.example` versionado y `.env` ignorado.
- Validación de variables al arrancar (Zod); el proceso falla rápido si falta alguna.
- Migraciones: se ejecutan como paso de despliegue, no al arrancar la app.

### Producción en Railway
- Un servicio por repo más el plugin de Postgres.
- Variables de entorno en Railway; nunca secretos en el repo.
- Respaldos de la base: activarlos y probar una restauración antes de cargar datos reales.

---

## 10. Pruebas

- **Backend:** Vitest. Unitarias para lógica de dominio (movimientos y niveles de stock, resolución de tenant). Integración para repositorios y rutas contra Postgres de Docker.
- **Frontend:** Vitest + Testing Library para componentes clave (formulario de alta, lector de códigos, tabla de inventario).
- **E2E:** Playwright, más adelante, con el flujo escanear → registrar → ver en catálogo público.
- Prioridad de cobertura: aislamiento entre tenants y consistencia de stock.

---

## 11. Estructura de carpetas (propuesta)

### Backend
```
suplementos-backend/
├── src/
│   ├── config/          # env, constantes
│   ├── db/              # schema Drizzle, migraciones, cliente
│   ├── modules/
│   │   ├── auth/
│   │   ├── tenants/
│   │   ├── catalog/     # global_products, categories
│   │   ├── inventory/   # tenant_products, stock
│   │   └── public/      # rutas del catálogo público
│   ├── plugins/         # plugins de Fastify (db, auth, rate limit)
│   ├── shared/          # errores, utilidades
│   └── server.ts
├── tests/
├── docker-compose.yml
├── CLAUDE.md
└── ARCHITECTURE.md  (copia o enlace a este documento)
```

### Frontend
```
suplementos-frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (gestion)/app/        # panel del tenant
│   │   └── (publico)/catalogo/[slug]/
│   ├── components/
│   ├── lib/             # cliente de API, theming, utilidades
│   └── styles/
├── tests/
├── CLAUDE.md
└── ARCHITECTURE.md  (copia o enlace)
```

Cada módulo del backend tiene sus rutas, servicio, repositorio y esquemas Zod.

---

## 12. Decisiones registradas

| # | Decisión | Estado |
|---|----------|--------|
| 1 | PostgreSQL en lugar de MongoDB (datos relacionales, transacciones de stock) | Tomada |
| 2 | Multi-tenant con base compartida y `tenant_id` | Tomada |
| 3 | Backend en Node + TypeScript con **Fastify** | Tomada |
| 4 | Auth propia con sesión en servidor, detrás de un módulo | Tomada |
| 5 | Dos repos; un solo Next.js con route groups para panel y catálogo | Tomada |
| 6 | Sin lotes ni caducidad en el MVP | Tomada |
| 7 | Ledger de movimientos + `stock_levels` en la misma transacción | Tomada |
| 8 | Drizzle como ORM | Propuesta |
| 9 | Row Level Security como defensa adicional | Pendiente |
| 10 | Tailwind vs CSS Modules en el front | Pendiente |
| 11 | Tenant en catálogo público por path vs subdominio | Path en MVP |
| 12 | Cloudflare R2 para imágenes, subida vía backend | Tomada |
| 13 | Navegador llama al API en el mismo origen (rewrites de Next) | Tomada |

Cada decisión relevante tendrá su ADR corto en `docs/adr/NNNN-titulo.md`.

---

## 13. Fases

1. **Fundación:** repos, Docker, esquema base, auth, tenants y theming.
2. **Catálogo e inventario:** categorías, alta por código de barras, stock.
3. **Catálogo público:** listado, búsqueda, detalle, existencias.
4. **Punto de venta:** ventas como movimientos de stock.
5. **Ecommerce** (opcional): pedidos, carrito, pagos.

---

## 14. Riesgos y consideraciones

- **Fuga entre tenants:** el mayor riesgo del modelo. Mitigación: capa de repositorios obligatoria, pruebas de aislamiento y, quizá, RLS.
- **Ensuciar el catálogo global:** mitigado con estado `pendiente` y aprobación manual.
- **Concurrencia de stock:** actualizar movimiento y nivel en una transacción, con restricción para evitar stock negativo.
- **Recursos de la MacBook:** mantener el stack local mínimo.
- **Cobertura de datos de suplementos en APIs abiertas:** no depender de ellas para el alta.
