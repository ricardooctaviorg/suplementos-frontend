# CLAUDE.md — suplementos-frontend

Aplicación Next.js con tres zonas: login, panel de gestión por tenant y catálogo público de existencias.
Lee primero `docs/ARCHITECTURE.md` y `docs/DOMAIN-MODEL.md` (copias de los documentos del proyecto; la versión de referencia vive en `suplementos-backend/docs/`). Si algo de este archivo choca con ellos, avisa antes de decidir.

**Antes de escribir código de Next.js lee `AGENTS.md` y las guías de `node_modules/next/dist/docs/`.** Esta versión de Next tiene cambios importantes frente a lo que conoces (ver la sección "Next.js de esta versión").

## Stack

Next.js 16 (App Router, Cache Components y Partial Prefetching activados) · React 19 · TypeScript estricto · CSS variables para theming por tenant · Vitest + Testing Library (jsdom) · `html5-qrcode` para cámara · Playwright (más adelante).

## Comandos

```bash
npm run dev          # servidor de desarrollo
npm run build        # build de producción
npm start            # servir el build
npm test             # Vitest, una pasada
npm run test:watch   # Vitest en modo watch
npm run typecheck    # next typegen && tsc --noEmit (genera los tipos de rutas primero)
npm run lint         # ESLint
```

Antes de dar una tarea por terminada: `npm run typecheck && npm run lint && npm test`.

En local, Next puede correr en el host (sin Docker) para ahorrar recursos; el backend y Postgres sí van en Docker.

## Estructura

```
src/
├── app/
│   ├── (auth)/login/              # paso 1: slug del tenant; paso 2: email y contraseña
│   ├── (gestion)/app/             # panel del tenant (requiere sesión)
│   │   ├── inventario/
│   │   ├── captura/               # lector de código de barras / QR
│   │   ├── productos/
│   │   └── configuracion/         # nombre, logo, colores
│   ├── (publico)/catalogo/[slug]/ # catálogo público
│   └── internal/revalidate/       # endpoint para que el backend invalide el caché
├── components/
│   ├── ui/                        # componentes base reutilizables
│   └── <dominio>/                 # componentes por zona
├── lib/
│   ├── api/                       # cliente de API tipado
│   ├── theme/                     # theming por tenant
│   ├── gtin.ts                    # misma validación que el backend
│   └── session.ts
└── styles/
tests/                             # espeja la estructura de src/
```

## Reglas críticas

### Mismo origen para llamar al API
- El navegador **siempre** llama a `/api/*` en el mismo origen del front. Next lo reenvía al backend con `rewrites` hacia `BACKEND_URL`.
- Motivo: front y API viven en dominios distintos en Railway y las cookies de sesión `sameSite=lax` no viajan entre sitios. Con el proxy, la cookie pertenece al dominio del front.
- Las llamadas desde el servidor (SSR, server components) usan `BACKEND_URL` directamente, de preferencia por la red privada de Railway.
- Nunca guardar tokens de sesión en `localStorage`; la sesión es la cookie `httpOnly` que pone el backend.

### Tenant
- En el panel, el tenant sale de la sesión. En el catálogo público, del `slug` de la URL.
- Nunca construir ni enviar un `tenant_id` desde el cliente. El front no decide el aislamiento; solo lo respeta.

### Theming por tenant
- Los colores (`color_primary`, `color_secondary`, `color_accent`, `color_background`, `color_text`) llegan del API y se inyectan como variables CSS (`--color-primary`, etc.) en el contenedor raíz de cada zona del tenant.
- Todo componente usa las variables, **nunca** colores hardcodeados.
- Validar contraste mínimo del texto sobre fondo al mostrar la vista previa en configuración.
- El logo se muestra con `next/image` y un respaldo si no hay logo.

### Captura por código de barras
- Dos modos: lector USB (se comporta como teclado) y cámara.
- Lector USB: capturar la secuencia de teclas rápida terminada en Enter dentro de un campo enfocado; no depender de un evento especial.
- Cámara: cargar la librería solo en el módulo de captura (import dinámico) para no engordar el resto de la app.
- Validar y normalizar el GTIN con `lib/gtin.ts` antes de llamar al API (UX inmediata); el backend vuelve a validar.
- Enviar un `client_request_id` (uuid) en cada registro de movimiento para evitar duplicados por reintento o doble escaneo.
- Tras escanear: si el producto existe, pedir solo cantidad y precio; si no, mostrar el formulario corto y avisar que quedará pendiente de revisión.

### Catálogo público
- Renderizado en servidor (SSR) para SEO: `generateMetadata` con nombre, descripción y colores del tenant.
- Búsqueda, filtro por categoría y paginación manejados por parámetros de URL (`?q=&categoria=&page=`), para que sean compartibles y rastreables.
- La existencia se muestra como número o estado (`Disponible`, `Pocas piezas`, `Agotado`) según lo que devuelva el API; el front no recalcula reglas de negocio.
- Datos "estables" del catálogo (nombre, imagen, precio, categoría) pueden cachearse con `use cache` + ``cacheTag(`tenant:${slug}`)`` y el backend los invalida llamando a `/internal/revalidate` (protegido con `REVALIDATE_SECRET`, que ejecuta `revalidateTag(tag, "max")`). La existencia **no se cachea**: se pide dinámica o con una consulta corta en cliente. Sin WebSockets en el MVP.
- El endpoint de revalidación vive en `/internal/revalidate` y **no** bajo `/api/`, porque `/api/*` se reenvía al backend.
- Accesible y simple: HTML semántico, imágenes con `alt`, navegable con teclado.

## Next.js de esta versión

- `AGENTS.md` (generado por Next) y `node_modules/next/dist/docs/` son la referencia. Si tu conocimiento de Next contradice esas guías, mandan las guías.
- **Cache Components** activado: el acceso a datos es dinámico por defecto y se cachea de forma explícita con `use cache`, `cacheLife` y `cacheTag`. Los datos de runtime (`params`, `searchParams`, `cookies()`, `headers()`) se leen dentro de un límite `<Suspense>` o la compilación falla.
- `params` y `searchParams` son promesas (`await`). Usa los helpers de tipos globales `PageProps<"/ruta">` y `LayoutProps<"/ruta">` (se generan con `npm run typecheck`).
- Con Cache Components, las rutas ocultas se conservan montadas (`<Activity>`): limpia efectos al desmontar. En el módulo de captura, **detén siempre la cámara** en la función de limpieza del efecto.
- No se usa `next/font/google` (el build no debe depender de red): fuentes del sistema definidas en `globals.css`.
- Las pruebas de Vitest cubren componentes síncronos; los componentes de servidor `async` se prueban con E2E (Playwright).
- Los `rewrites` de `next.config.ts` se fijan al compilar: `BACKEND_URL` debe existir en build.

## Convenciones de código

- TypeScript `strict`; prohibido `any`.
- Componentes de servidor por defecto; `"use client"` solo donde haga falta (formularios, escáner, interacción).
- Nombres de componentes en `PascalCase`, archivos y carpetas en `kebab-case`; identificadores en inglés, texto visible en español.
- Todo el acceso al API pasa por `lib/api`; sin `fetch` sueltos en componentes.
- Los tipos de las respuestas se comparten con el contrato del backend (esquemas Zod o tipos generados); no duplicar tipos a mano si se puede evitar.
- Formularios con validación en cliente y mensajes de error claros en español; el servidor siempre manda la última palabra.
- Dinero formateado con `Intl.NumberFormat` usando la moneda del tenant; el valor llega como string del API y no se opera con flotantes.
- Estilos: CSS Modules con variables CSS (decisión pendiente frente a Tailwind; no mezclar ambos hasta que se decida).
- Sin `console.log` en código entregado.

## Pruebas

- Vitest + Testing Library. Prioridad: formulario de alta, lector de códigos (lógica de captura de teclado), tabla de inventario, normalización de GTIN, componente de estado de existencia.
- Probar comportamiento visible para el usuario, no detalles de implementación.
- Playwright más adelante, para el flujo escanear → registrar → ver en el catálogo público.
- Una funcionalidad nueva incluye sus pruebas en el mismo cambio.

## Variables de entorno

Validadas al arrancar. Ejemplo en `.env.example`; `.env.local` nunca se versiona.

| Variable | Uso |
|----------|-----|
| `BACKEND_URL` | URL del API (interna en Railway), usada por `rewrites` y SSR |
| `REVALIDATE_SECRET` | Secreto compartido con el backend para `/internal/revalidate` |
| `NEXT_PUBLIC_APP_NAME` | Nombre de la plataforma (no sensible) |

Nada sensible lleva el prefijo `NEXT_PUBLIC_`.

## Entornos

Solo dos: **local** y **producción** (Railway). En producción, `next build` y servicio propio en Railway.

## Git

- Rama principal `main`; ramas `feat/...`, `fix/...`, `chore/...`.
- Commits en formato convencional (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- Un cambio = una intención.

## Qué NO hacer

- No implementar carrito, pagos ni punto de venta: fuera del MVP.
- No hacer que el navegador llame directamente al dominio del backend.
- No hardcodear colores, nombres de negocio ni logos.
- No agregar librerías de UI pesadas sin justificarlo (la MacBook de desarrollo es limitada).
- No duplicar reglas de negocio del backend; el front muestra, valida para UX y delega.
- No modificar `docs/ARCHITECTURE.md` ni `docs/DOMAIN-MODEL.md` en silencio: propón el cambio y explica por qué.
