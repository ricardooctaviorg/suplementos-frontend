# DOMAIN-MODEL.md

> Modelo de datos y reglas de dominio de la plataforma de inventario de suplementos.
> Complementa a `ARCHITECTURE.md`. Estado: borrador v0.1.
> Motor: PostgreSQL. ORM: Drizzle. Todo el esquema se define en `src/db/schema/`.

---

## 1. Convenciones generales

- **IDs:** `uuid` con `default gen_random_uuid()`. Excepción: `sessions.id` es un hash de token (texto).
- **Timestamps:** `timestamptz`, siempre en UTC. `created_at` y `updated_at` en toda tabla mutable.
- **Dinero:** `numeric(12,2)`. Nunca `float`. La moneda vive en `tenant_settings.currency` (por defecto `MXN`).
- **Cantidades de stock:** `integer`.
- **Nombres:** tablas y columnas en inglés, `snake_case`. Textos visibles al usuario en español.
- **Borrado:** lógico (`is_active = false`) para entidades de negocio. Los movimientos de stock **nunca** se borran ni se editan.
- **Enums:** `pgEnum` de Drizzle (o `text` con `CHECK`, si se prefiere facilidad de migración).
- **Aislamiento:** toda tabla con `tenant_id` lo exige `NOT NULL`, con índice que empieza por `tenant_id`.

---

## 2. Vista de entidades

```
categories (global) ◄──── global_products (global) ◄──── tenant_products ────► stock_levels
   │ parent_id                    ▲                           │  ▲                  ▲
   └──► categories                │                           │  │                  │
                                  │ created_by_tenant_id      │  └──── stock_movements
                                  │                           │
tenants ──┬── tenant_settings (1:1)                            │
          ├── users ──── sessions                              │
          └───────────────────────────────────────────────────┘
platform_admins (independiente de tenants)
```

**Globales** (sin `tenant_id`): `categories`, `global_products`, `platform_admins`.
**Por tenant** (con `tenant_id`): `tenant_settings`, `users`, `sessions`, `tenant_products`, `stock_levels`, `stock_movements`.

---

## 3. Tablas

### 3.1 `tenants`
Un negocio cliente.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `slug` | text | Único. Minúsculas, `a-z0-9-`, 3 a 40 caracteres. Es lo que el usuario escribe en el login y va en la URL del catálogo. |
| `name` | text | Nombre comercial |
| `status` | enum `active` \| `suspended` | Un tenant suspendido no puede iniciar sesión y su catálogo público deja de responder |
| `created_at`, `updated_at` | timestamptz | |

Restricciones: `UNIQUE (slug)`, `CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`.
Lista de slugs reservados (`app`, `api`, `admin`, `login`, `catalogo`, `www`...) validada en la capa de aplicación.

### 3.2 `tenant_settings`
Personalización e identidad visual. Relación 1:1 con `tenants`.

| Columna | Tipo | Notas |
|---------|------|-------|
| `tenant_id` | uuid PK, FK → tenants | |
| `display_name` | text | Nombre mostrado en el catálogo (puede diferir de `tenants.name`) |
| `logo_url` | text null | |
| `color_primary` | text | Hex `#RRGGBB`, con `CHECK` |
| `color_secondary` | text | |
| `color_accent` | text | |
| `color_background` | text | |
| `color_text` | text | |
| `currency` | char(3) | Por defecto `MXN` |
| `show_exact_stock` | boolean | Por defecto `false`. Si es `false`, el catálogo muestra Disponible / Pocas piezas / Agotado en lugar del número |
| `low_stock_threshold` | integer | Por defecto `5`. Umbral de "Pocas piezas" |
| `contact_phone` | text null | Útil para un catálogo local (WhatsApp, teléfono) |
| `address` | text null | |
| `updated_at` | timestamptz | |

Los colores se inyectan como variables CSS en el front. Se validan contra hex estricto para evitar inyección de estilos.

### 3.3 `users`
Dueños de un tenant. Sin MFA en el MVP.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `tenant_id` | uuid FK → tenants | |
| `email` | text | Se guarda normalizado en minúsculas |
| `password_hash` | text | argon2id |
| `name` | text | |
| `role` | enum `owner` | Un solo valor por ahora; el enum deja espacio para `staff` |
| `is_active` | boolean | |
| `last_login_at` | timestamptz null | |
| `created_at`, `updated_at` | timestamptz | |

Restricciones: `UNIQUE (tenant_id, email)`. El mismo correo puede existir en tenants distintos.

### 3.4 `sessions`
Sesión del lado servidor.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | text PK | Hash SHA-256 del token de la cookie. El token en claro nunca se guarda |
| `user_id` | uuid FK → users | |
| `tenant_id` | uuid FK → tenants | |
| `expires_at` | timestamptz | |
| `created_at` | timestamptz | |
| `ip`, `user_agent` | text null | Opcional, para auditoría básica |

Índices: `(user_id)`, `(expires_at)` para limpieza periódica.

### 3.5 `platform_admins`
Administradores de la plataforma (tú). Sirven para aprobar productos del catálogo global. Quedan fuera de los tenants.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `email` | text | Único |
| `password_hash` | text | |
| `created_at` | timestamptz | |

En el MVP puede bastar con un seed y un script; la interfaz de aprobación puede ser mínima.

### 3.6 `categories`
Clasificación compartida. Árbol de profundidad pequeña.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `parent_id` | uuid null FK → categories | `null` = raíz |
| `name` | text | |
| `slug` | text | Único |
| `sort_order` | integer | Por defecto `0` |
| `created_at` | timestamptz | |

Ejemplos de raíz: Proteínas, Aminoácidos, Vitaminas y minerales, Pre-entrenos, Creatinas, Quemadores, Salud articular, Snacks y barras.
Restricciones: `UNIQUE (slug)`. Límite de profundidad (2 niveles) validado en la aplicación.
Una categoría solo se edita desde administración de plataforma.

### 3.7 `global_products`
Catálogo general compartido entre tenants.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `gtin` | text null | Normalizado a 14 dígitos (ver sección 4). Único cuando no es nulo |
| `name` | text | |
| `brand` | text | |
| `presentation` | text null | Ej. "60 cápsulas", "2 lb sabor chocolate" |
| `description` | text null | |
| `category_id` | uuid FK → categories | |
| `image_url` | text null | |
| `status` | enum `pending` \| `approved` \| `rejected` | |
| `created_by_tenant_id` | uuid null FK → tenants | Quién lo dio de alta. `null` para carga inicial de plataforma |
| `reviewed_by` | uuid null FK → platform_admins | |
| `reviewed_at` | timestamptz null | |
| `created_at`, `updated_at` | timestamptz | |

Restricciones:
- `UNIQUE (gtin) WHERE gtin IS NOT NULL`.
- `CHECK (gtin ~ '^[0-9]{14}$')`.

Índices: `(category_id)`, `(status)`, y búsqueda por texto sobre `name` y `brand` con `pg_trgm` + `unaccent`.

Un producto sin código de barras es válido (artículos a granel o sin GTIN). Se identifica entonces por id.

### 3.8 `tenant_products`
Un producto global tal como lo ofrece un negocio: lo que el negocio pone de su parte.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `tenant_id` | uuid FK → tenants | |
| `global_product_id` | uuid FK → global_products | |
| `sku` | text null | SKU propio del negocio |
| `price` | numeric(12,2) | `CHECK (price >= 0)` |
| `alt_name` | text null | Nombre alterno que prevalece en el catálogo del negocio |
| `is_visible` | boolean | Por defecto `true`. Controla si aparece en el catálogo público |
| `is_active` | boolean | Por defecto `true`. `false` = archivado (sustituye a borrar) |
| `created_at`, `updated_at` | timestamptz | |

Restricciones:
- `UNIQUE (tenant_id, global_product_id)`: un negocio no repite el mismo producto.
- `UNIQUE (tenant_id, sku) WHERE sku IS NOT NULL`.
- `UNIQUE (tenant_id, id)`: habilita las llaves foráneas compuestas de stock (ver 3.9 y 3.10).

Índices: `(tenant_id, is_active, is_visible)`.

### 3.9 `stock_levels`
Existencia actual por producto del tenant. Una fila por `tenant_products`, creada junto con él en `0`.

| Columna | Tipo | Notas |
|---------|------|-------|
| `tenant_product_id` | uuid PK | |
| `tenant_id` | uuid | |
| `quantity` | integer | `CHECK (quantity >= 0)` |
| `updated_at` | timestamptz | |

FK compuesta: `(tenant_id, tenant_product_id) → tenant_products (tenant_id, id)`. Así es imposible que el nivel apunte a un producto de otro tenant.

### 3.10 `stock_movements`
Ledger **append-only** de cambios de existencia.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `tenant_id` | uuid | |
| `tenant_product_id` | uuid | |
| `type` | enum `in` \| `out` \| `adjustment` | |
| `delta` | integer | Con signo. Entrada positiva, salida negativa |
| `quantity_after` | integer | Existencia resultante, para auditoría |
| `reason` | text null | Obligatorio en `adjustment` (merma, conteo, error) |
| `reference` | text null | Reservado: más adelante apuntará a una venta |
| `client_request_id` | uuid null | Idempotencia: evita duplicar un escaneo reenviado |
| `created_by` | uuid FK → users | |
| `created_at` | timestamptz | |

Restricciones:
- `CHECK (delta <> 0)`.
- `CHECK ((type = 'in' AND delta > 0) OR (type = 'out' AND delta < 0) OR type = 'adjustment')`.
- `CHECK (type <> 'adjustment' OR reason IS NOT NULL)`.
- `CHECK (quantity_after >= 0)`.
- `UNIQUE (tenant_id, client_request_id) WHERE client_request_id IS NOT NULL`.
- FK compuesta `(tenant_id, tenant_product_id) → tenant_products (tenant_id, id)`.

Índice: `(tenant_id, tenant_product_id, created_at DESC)`.
A nivel de base de datos se recomienda un trigger o permisos que impidan `UPDATE` y `DELETE` sobre esta tabla.

---

## 4. Normalización del GTIN

Los lectores devuelven EAN-13, UPC-A (12), EAN-8 (8) o GTIN-14. Para que el mismo producto no se duplique:

1. Quitar espacios y caracteres no numéricos.
2. Aceptar solo longitudes 8, 12, 13 o 14.
3. Validar el dígito verificador (módulo 10 de GS1).
4. Rellenar con ceros a la izquierda hasta 14 dígitos.

Se guarda siempre la forma de 14 dígitos. La búsqueda por escaneo aplica la misma función antes de consultar. Esta lógica vive en un módulo puro (`shared/gtin.ts`) con pruebas unitarias; el front puede reutilizar la misma validación.

---

## 5. Reglas e invariantes

### Aislamiento
1. Toda consulta sobre tablas por tenant incluye `tenant_id` tomado de la sesión, nunca del cliente.
2. Las llaves foráneas compuestas impiden mezclar tenants entre productos, niveles y movimientos.
3. Los repositorios son la única vía de acceso a datos por tenant.

### Catálogo global
4. Los tenants no editan `global_products`. Solo crean nuevos (en `pending`).
5. **Búsqueda por GTIN exacto** (flujo de escaneo): devuelve el producto en estado `pending` o `approved`, sin importar quién lo creó. Esto evita duplicados cuando dos negocios escanean el mismo código.
6. **Exploración y búsqueda de texto** en el catálogo global: solo `approved`, más los `pending` creados por el propio tenant.
7. Un producto `rejected` no se puede enlazar a nuevos `tenant_products`. Los ya enlazados dejan de mostrarse en el catálogo público.
8. Solo un `platform_admin` cambia `status`.

### Existencias
9. Cada cambio de stock es un movimiento más la actualización de `stock_levels` en **la misma transacción**.
10. El stock no puede quedar negativo; lo garantiza el `CHECK` de la base, no solo la aplicación.
11. Los movimientos no se editan ni se borran. Un error se corrige con un movimiento `adjustment` con motivo.
12. Un reintento con el mismo `client_request_id` devuelve el resultado original sin duplicar.

### Catálogo público
13. Solo muestra `tenant_products` con `is_active = true` e `is_visible = true`, cuyo producto global no esté `rejected`.
14. La existencia se expone según `tenant_settings.show_exact_stock`: número exacto, o estado (`Disponible`, `Pocas piezas` si `quantity <= low_stock_threshold`, `Agotado` si es `0`).
15. Nunca se expone costo, movimientos ni datos de usuarios.

---

## 6. Operación de stock (referencia de implementación)

Dentro de una transacción:

```ts
// registerMovement(tx, { tenantId, tenantProductId, type, delta, reason, clientRequestId, userId })
// 1. Idempotencia: si existe (tenant_id, client_request_id), devolver el movimiento existente.
// 2. Actualizar el nivel con bloqueo implícito de fila:
//      UPDATE stock_levels
//         SET quantity = quantity + :delta, updated_at = now()
//       WHERE tenant_id = :tenantId AND tenant_product_id = :tenantProductId
//   RETURNING quantity;
//    - Si no devuelve fila: el producto no pertenece al tenant -> error 404.
//    - Si viola CHECK (quantity >= 0): stock insuficiente -> error 409.
// 3. INSERT INTO stock_movements (..., delta, quantity_after = quantity devuelta, ...).
```

Ventajas: un único `UPDATE` atómico evita la condición de carrera de leer y luego escribir, y el `CHECK` protege aunque el código falle.

---

## 7. Flujos principales

### 7.1 Alta por escaneo
1. Front envía el código leído a `GET /api/admin/catalog/lookup?gtin=...`.
2. Backend normaliza y valida el GTIN.
3. **Existe en global:**
   - Si el tenant ya tiene `tenant_product`: devolverlo para sumar existencias.
   - Si no: pedir precio y cantidad; crear `tenant_product`, `stock_level` en 0 y movimiento `in`.
4. **No existe:** formulario corto (nombre, marca, presentación, categoría, foto). Crear `global_product` en `pending` y continuar como en el punto 3.

### 7.2 Ajuste manual
Edición de existencias: el dueño indica la nueva cantidad o el delta y un motivo; se registra como `adjustment`.

### 7.3 Aprobación
Un `platform_admin` revisa los `pending`, puede corregir nombre, marca o categoría, y los pasa a `approved` o `rejected`.

---

## 8. Consultas clave y sus índices

| Consulta | Índice que la sirve |
|----------|---------------------|
| Resolver tenant por slug (login y catálogo) | `UNIQUE (slug)` |
| Escaneo por GTIN | `UNIQUE (gtin)` parcial |
| Listado de inventario del tenant | `(tenant_id, is_active, is_visible)` en `tenant_products` |
| Catálogo público con filtro de categoría | `tenant_products` + `global_products(category_id)` |
| Búsqueda de texto | GIN `pg_trgm` sobre `name` y `brand` |
| Historial de un producto | `(tenant_id, tenant_product_id, created_at DESC)` en `stock_movements` |
| Limpieza de sesiones | `(expires_at)` |

Extensiones requeridas: `pgcrypto` (o `gen_random_uuid()` nativo en Postgres 13+), `pg_trgm`, `unaccent`.

---

## 9. Previsto para fases posteriores (no se implementa ahora)

- **Punto de venta:** tablas `sales` y `sale_items`; cada venta genera movimientos `out` con `reference` apuntando a la venta. `stock_movements` ya lo soporta sin cambios.
- **Ecommerce:** `customers`, `carts`, `orders`, pagos. Evitar usar ya el nombre `orders` para otra cosa.
- **Roles:** agregar `staff` al enum de `users.role` con permisos limitados (capturar stock sin editar precios).
- **Lotes y caducidad:** si algún día se requieren, se agrega `stock_lots` y `stock_movements` pasa a referenciar lote. Decisión explícita de no hacerlo ahora.
- **Precio por tenant con histórico:** `tenant_product_prices` si se necesita historial.

---

## 10. Preguntas abiertas

| # | Pregunta | Impacto |
|---|----------|---------|
| 1 | ~~¿Dónde se almacenan logos e imágenes?~~ **Resuelta:** Cloudflare R2. La base guarda la URL pública; claves `tenants/{tenantId}/logo.webp` y `products/{globalProductId}.webp` | Ninguno pendiente |
| 2 | ¿La interfaz de administración de plataforma entra en el MVP o se aprueba por script? | Alcance de fase 2 |
| 3 | ¿RLS de Postgres además de las llaves compuestas? | Ver ADR de multi-tenancy |
| 4 | ¿Se permite un producto sin GTIN en el flujo de escaneo? | Hoy se permite en el modelo; falta definir la UX |
