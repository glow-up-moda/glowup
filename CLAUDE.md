# GLOW UP — Guía del proyecto para Claude Code

> Leé este archivo completo antes de cada tarea. Si una decisión cambia, actualizá este archivo en el mismo commit.
> Para código de Next.js, seguí además `AGENTS.md`: lo escribe y lo mantiene Next.js, y manda a leer la documentación de la versión instalada en `node_modules/next/dist/docs/`. No lo edites a mano.

@AGENTS.md

## 1. Qué es

Tienda online de **ropa interior femenina y accesorios** (gorras, anteojos de sol, toallones y otros) con base en **Paraná, Entre Ríos, Argentina**. Vende a todo el país, con envío en el día y retiro en Paraná y Oro Verde.

- Público: mujeres. Tono cercano, cálido y cómplice.
- Idioma de la interfaz: español rioplatense con voseo ("Elegí tu talle", "Sumalo al carrito").
- Moneda: pesos argentinos (ARS).
- Dirección de la experiencia: **sutil pero no básica**. El logo y la estrella son lo memorable; todo lo demás es calmo, prolijo y suave.
- Todo se diseña primero para celular: la mayoría de las visitas llega desde Instagram y WhatsApp.

## 2. Forma de trabajo

- Modificá los archivos existentes en su lugar. **No crees copias ni versiones paralelas** (`page-v2.tsx`, `hero-nuevo.tsx`, `styles-old.css`).
- **Avanzá sin pedir confirmación.** Tomá las decisiones con criterio y contalas en dos líneas cuando ya estén hechas. Solo frená y preguntá si algo cuesta plata, borra datos, toca producción o necesita una clave o una cuenta personal (Supabase, Netlify, GitHub, Mercado Pago, etc.).
- Informes cortos: qué se hizo, qué falta, y seguir. Sin resúmenes largos ni listas de verificación en cada paso.
- Una tarea terminada = un commit. Código, nombres y commits en inglés; textos visibles en español.
- No agregues dependencias sin explicar para qué sirven y si existe una alternativa nativa.
- Nunca subas `.env` ni claves al repositorio.
- **El repositorio es público** (`glow-up-moda/glowup`). Además de las claves, nunca subas alias, CBU, teléfono, direcciones ni datos de clientas: esos valores viven en la tabla `settings` o en variables de entorno, nunca en el código, en migraciones ni en datos de prueba.
- Pagos: solo credenciales de prueba de Mercado Pago hasta el lanzamiento.
- Cambios de base de datos siempre como migraciones en `supabase/migrations/`, en este orden: primero la migración pasa junto con `supabase/tests/smoke.sql` dentro de una transacción que se deshace; después, commit y push; recién entonces, `npx supabase db push`. Los tipos (`npm run db:types`) se regeneran después de aplicar y van en el commit siguiente. El cron no se prueba en esa transacción: se verifica en `cron.job_run_details`.
- Al terminar una tarea con interfaz, revisala en 375px (celular) y en escritorio.

## 3. Stack

| Pieza | Herramienta |
|---|---|
| Front + API | Next.js (App Router) + TypeScript |
| Estilos | Tailwind CSS con los tokens de la sección 5 |
| Animación | Transiciones CSS; librería `motion` solo para el carrito lateral y la secuencia del hero |
| Base de datos, auth, archivos | Supabase (Postgres, Auth, Storage) |
| Pagos | Mercado Pago Checkout Pro (SDK oficial de Node) |
| Emails | Resend + React Email |
| Validación | Zod |
| Imágenes | `sharp` en el servidor: las fotos se suben convertidas a WebP (las transformaciones de Supabase son pagas y Safari no codifica WebP) |
| Formato | Prettier + `prettier-plugin-tailwindcss` (ordena las clases) |
| Hosting | Netlify (`glowupind.netlify.app` hasta tener dominio propio) |
| Analítica | Meta Pixel + Google Analytics 4 |

Variables de entorno (`.env.local` local; `.env.example` sin valores en el repo). Nombres verificados con la documentación de Supabase en septiembre de 2026. Las claves viejas `anon` y `service_role` se retiran a fines de 2026: usamos siempre la publicable y la secreta.

```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=          # solo servidor
MP_ACCESS_TOKEN=              # solo servidor
MP_WEBHOOK_SECRET=            # solo servidor
RESEND_API_KEY=               # solo servidor
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_GA4_ID=
```

Regiones: la base de Supabase está en `us-east-2` (Ohio), la misma región donde Netlify ejecuta el servidor en el plan gratis. Así la consulta entre servidor y base es de milisegundos, que es lo que siente una clienta comprando. Medido desde Paraná, una consulta desde la computadora tarda unos 60 ms. La región de un proyecto de Supabase no se puede cambiar después: si alguna vez se pasa a Netlify Pro y se mueven las funciones a São Paulo, la base de producción también tiene que crearse en São Paulo.

## 4. Estructura de carpetas (objetivo)

```
src/app/(store)/          páginas públicas
src/app/admin/            panel de administración (protegido)
src/app/api/              webhooks y endpoints
src/components/ui/        botones, inputs, badges
src/components/store/     header, carrito lateral, tarjetas de producto
src/components/admin/     armazón, navegación y piezas del panel
scripts/                  tareas locales (alta de administradoras)
src/lib/                  supabase, mercadopago, pricing, stock, shipping
src/emails/               plantillas de React Email
supabase/migrations/      SQL versionado
public/brand/             logos y favicon
```

## 5. Marca

### Paleta (única fuente de color)

| Token | Hex | Uso |
|---|---|---|
| `chocolate` | `#3A2925` | Texto, íconos, footer, bordes fuertes |
| `rosa` | `#EFA3B5` | Fondos de acento, badges, bloques destacados |
| `coral` | `#F27F73` | Botón principal, estados activos, badge de oferta |
| `crema` | `#FFF7EE` | Fondo general |
| `crema-oscuro` | `#F3E6D8` | Tarjetas, separadores, fondo de inputs |

Proporción aproximada: crema 60%, chocolate 25%, rosa 10%, coral 5%.

Reglas de contraste (obligatorias):
- Permitido: texto chocolate sobre crema (≈13:1), rosa (≈6.9:1), coral (≈5.3:1) y crema oscuro.
- Prohibido: rosa o coral como color de texto sobre crema.
- Prohibido: texto blanco o crema sobre coral o rosa.
- Botón principal: fondo coral, texto chocolate. Secundario: borde y texto chocolate, fondo transparente.
- Links: chocolate con subrayado.
- Sin modo oscuro.

### Colores funcionales (solo estados)

| Token | Hex | Uso |
|---|---|---|
| `error` | `#B42318` | Errores de formulario, pago rechazado, alertas del panel |
| `exito` | `#2F6B3A` | Confirmaciones: pago aprobado, pedido creado, stock actualizado |

- No son colores de marca: no se usan en botones principales, fondos de sección ni decoración, y no cambian la proporción 60/25/10/5.
- Nunca el color solo: siempre con ícono y texto. El error además marca el borde del campo y se enlaza al input con `aria-describedby`.
- Solo sobre crema o crema oscuro: error 6.2:1 y éxito 6.0:1 sobre crema; 5.4:1 y 5.2:1 sobre crema oscuro.
- Prohibido sobre rosa o coral: 3.3:1 y 2.5:1, no llegan a 4.5:1.
- Bloque de aviso: fondo crema oscuro, borde del color funcional, ícono y texto del mismo color.
- Si hace falta un chip lleno en el panel, el texto va en crema (6.2:1 sobre error, 6.0:1 sobre éxito).
- Los avisos neutros o informativos usan fondo rosa con texto chocolate.

### Logo

El logo se está redibujando para usar esta paleta (ver pendientes):
- Letras "GLOW UP" redondeadas en rosa con contorno chocolate; estrella en coral y rosa; trazo curvo y destello en chocolate.
- La estrella no tapa la G ni la L.
- Versiones en `public/brand/`:
  - `logo-full.svg`: hero, emails, página Nosotras.
  - `logo-compact.svg`: header (texto + destello chico).
  - `star-icon.svg`: favicon, avatar, marca en fotos.
  - `logo-chocolate.svg` y `logo-crema.svg`: una sola tinta.
- Mientras no estén los SVG, usar "GLOW UP" escrito con la tipografía de títulos como placeholder. No dibujar ni recrear el logo por código.

### Tipografía

- Títulos: **Fredoka** (500–600). Redondeada, hace eco de las letras del logo.
- Texto e interfaz: **DM Sans** (400–500).
- Cargar con `next/font/google`.
- Escala: 14 / 16 / 20 / 25 / 31 / 39 px. Título del hero hasta 49px en escritorio.
- Largo de línea máximo ~70 caracteres. Interlineado: texto 1.6, títulos 1.15.
- Mayúsculas y minúsculas normales ("Nueva colección"). **Sin etiquetas en mayúsculas espaciadas** sobre los títulos y sin resaltar una sola palabra del título con otro color o itálica.

### Formas y motivos

- Botones y badges: píldora. Tarjetas de producto: 20px. Inputs: 12px.
- Fotos destacadas con forma de arco: `border-radius: 999px 999px 20px 20px`.
- Destello de 4 puntas (del logo) como motivo de marca: confirmación de "agregado", loader y viñetas de beneficios. No usarlo como decoración suelta.
- "Glow": manchas difusas de rosa y coral con baja opacidad **solo detrás del hero**. Grano muy leve (opacidad ≤ 4%) opcional sobre crema.
- Sin sombras grises genéricas. Si hace falta elevación (carrito lateral, modales), sombra suave teñida de chocolate.
- La barra de anuncios muestra **un mensaje por vez** que rota, no varios unidos con separadores.

### Fotografía

- Fondo crema o arena, luz natural, sombras de hojas. Mismo estilo en todo el catálogo.
- Proporción 4:5. Mínimo 2 fotos por producto; la segunda aparece al pasar el mouse en escritorio.
- Modelos reales y diversas, estética cuidada y no sugerente (también por las políticas de anuncios de Meta).

### Voz

- Cercana, simple y concreta. Voseo. Sin emojis en la interfaz.
- Botones que dicen qué pasa: "Sumar al carrito", "Ir a pagar", "Avisarme".
- Errores con solución: "Ese talle se agotó mientras elegías. Probá con otro o pedí que te avisemos."
- Estados vacíos como invitación: "Tu carrito está vacío. Mirá lo más vendido."
- Nunca comentarios sobre cuerpos ("afina", "disimula", "favorece").

## 6. Movimiento

- Curva general: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Duraciones: 150ms (hover de color), 300ms (estándar), 450ms (carrito lateral y modales).
- Rebote `cubic-bezier(0.34, 1.56, 0.64, 1)` **solo** en el contador de la bolsa al sumar y en el corazón de favoritos.
- **Un único momento orquestado:** al cargar el inicio, el hero entra en secuencia y el destello se "enciende" una vez. No animar la entrada de cada sección al hacer scroll.
- Movimiento que responde a acciones: carrito lateral que se desliza, acordeones, cambio de foto al hover (fundido 400ms), zoom 1.03 en fotos, botón "Sumar al carrito" que muestra destello + check durante 1.2s.
- Skeletons con pulso suave mientras cargan listados e imágenes.
- Animar solo `transform` y `opacity`.
- Con `prefers-reduced-motion`: sin desplazamientos ni zoom, solo cambios de opacidad.

## 7. Mapa del sitio

### Tienda

| Ruta | Contenido |
|---|---|
| `/` | Inicio |
| `/ropa-interior` | Listado con filtros (talle, color, tipo, precio); subcategorías según catálogo |
| `/accesorios` | Listado con filtros; subcategorías: gorras, anteojos de sol, toallones |
| `/kits` | Combos armados |
| `/producto/[slug]` | Página de producto |
| `/buscar` | Resultados; el buscador del header sugiere mientras se escribe |
| `/favoritos` | Guardados en el navegador; se sincronizan si hay cuenta |
| `/checkout` | Datos, entrega y pago en una sola página |
| `/pedido/[numero]` | Confirmación, estado real e instrucciones de transferencia |
| `/seguimiento` | Buscar pedido con número + email |
| `/cuenta` | Opcional: historial de pedidos (ingreso con link por email) |
| `/guia-de-talles` | Tabla de medidas y cómo medirse |
| `/envios-y-cambios` | Zonas, costos, plazos, envío discreto, política de cambios |
| `/preguntas-frecuentes` | Preguntas frecuentes |
| `/nosotras` | Historia de la marca |
| `/contacto` | Formulario + WhatsApp |
| `/arrepentimiento` | Botón de arrepentimiento |
| `/terminos`, `/privacidad` | Legales |
| 404 | Con estilo de marca y links a categorías |

Botón flotante de WhatsApp en todas las páginas públicas excepto el checkout.

### Inicio (orden de secciones)

```
Barra de anuncios (rota: envío gratis desde $X / cuotas / descuento por transferencia)
Header: menú, logo compacto, buscar, favoritos, bolsa
Hero: foto en arco, título, botón "Ver colección"
Categorías: Ropa interior, Accesorios, Kits
Lo más vendido (carrusel horizontal)
Kits: Kit playa, Kit básicos, Kit regalo
Beneficios: envío en el día en Paraná y Oro Verde, cuotas, transferencia, envío discreto, cambios
Clientas reales (fotos elegidas a mano)
Newsletter con cupón de primera compra
Footer: links, legales, Data Fiscal, redes
```

### Página de producto

- Galería con swipe en celular, nombre, precio, precio tachado si hay oferta, precio con transferencia y cuotas.
- Selector de color y talle. Talles agotados visibles pero deshabilitados, con "Avisame cuando vuelva".
- "Últimas unidades" cuando el disponible es ≤ 2 (configurable).
- Link a guía de talles y "La modelo mide X cm y usa talle Y".
- Pestañas: Descripción, Materiales y cuidados, Medidas, Envíos y cambios.
- "Combinalo con" (productos o kits relacionados).
- Reseñas aprobadas.
- En celular, botón "Sumar al carrito" fijo abajo.

### Carrito lateral

- Se abre desde cualquier página; no hay página de carrito aparte.
- Productos con cantidad editable, subtotal, barra "Te faltan $X para el envío gratis", un accesorio sugerido y botón "Ir a pagar".
- Se guarda en el navegador y, al abrirlo, se revalidan precios y stock contra la base.

### Checkout (sin registro obligatorio)

1. Email y teléfono (WhatsApp).
2. Entrega: envío a domicilio por zona, envío en el día (Paraná y Oro Verde) o retiro.
3. Opción "Es para regalo": caja sin precios + mensaje en tarjeta.
4. Cupón.
5. Pago: Mercado Pago o transferencia bancaria con descuento.
6. Aceptación de términos y consentimiento opcional para novedades.

### Panel `/admin`

Tiene que ser cómodo de usar desde el celular.
- **Inicio:** ventas del día y la semana, pedidos por preparar y alertas (stock bajo, pedidos para revisar, transferencias por confirmar).
- **Productos:** crear y editar, variantes (color + talle), fotos, costo, precio, precio tachado, SEO, publicado sí/no.
  - Un producto nuevo arranca como borrador. Para publicarlo hacen falta al menos una variante y dos fotos.
  - El stock inicial de una variante entra como ingreso de mercadería, así queda en el historial.
  - Fotos: el navegador las achica a 2000 px antes de subirlas, y el servidor las pasa a WebP con `sharp` (hasta 1600 × 2000 y una miniatura de 480 × 600) y las guarda en Storage. El texto alternativo es obligatorio.
- **Stock:** ingreso de mercadería, ajustes, venta manual rápida (Instagram, WhatsApp, en persona) e historial de movimientos.
- **Formularios del panel:** con `useFormAction` (`src/components/admin/use-form-action.ts`), no con `<form action>` directo. React 19 resetea el formulario al terminar la acción y eso cambia los `<select>` aunque haya fallado: una venta con error volvía a "Entró mercadería".
- **Precios:** aumento o descuento masivo por categoría o selección, con redondeo, vista previa y margen.
  - Alcance: una categoría (incluye sus subcategorías), los productos que se marquen o todo el catálogo. El porcentaje va de -90 a 300 y el redondeo es siempre hacia arriba.
  - La vista previa muestra el margen antes y después, marca los borradores y avisa cuando el precio nuevo alcanza al tachado y el producto deja de verse como oferta.
  - Cada cambio queda en `price_changes` con el motivo que se escriba.
- **Pedidos:** filtros por estado, detalle, confirmar transferencia, cambiar estado y hoja imprimible para armar el paquete.
  - Pestañas por `?estado=`: `por-preparar` (pagados, la vista inicial), `transferencias` (pendientes por transferencia), `revisar`, `preparando`, `enviados`, `entregados`, `cancelados` y `todos`. La búsqueda recorre todos los pedidos, por número o por email.
  - Estados: pagado → preparando → enviado (o listo para retirar, si es retiro) → entregado, con un paso atrás por si hubo un error. Los aplica `set_order_status`.
  - Las transferencias se confirman a mano, con un paso de confirmación. Una transferencia de un pedido ya cancelado también se puede confirmar: si todavía hay stock se descuenta; si no, queda para revisar (§9.6). Mercado Pago nunca se confirma desde el panel.
  - "Ya lo revisé" apaga `needs_review`, pero el motivo queda guardado en el pedido.
  - La hoja para armar (`/admin/pedidos/[numero]/hoja`) no lleva precios: puede ir dentro de la caja.
- **Cupones:** listado con estado (activo, programado, vencido, agotado), alta y edición con vigencia en hora de Argentina, "desactivar ahora" (le corta la vigencia) y borrado solo si nunca se usó.
  - Desactivar un cupón programado también le borra la fecha de inicio: la base exige que el inicio sea anterior al fin.
- **Kits, reseñas (moderación), avisos de reposición y zonas de envío.**
- **Reportes:** más vendidos, talles más vendidos, avisos de reposición por variante y margen.
- **Configuración:** % de descuento por transferencia, monto de envío gratis, alias y CBU, umbral de stock bajo, mensajes de la barra de anuncios, número de WhatsApp.
- **Acceso:** solo usuarios con rol admin y verificación en dos pasos.
  - Ingreso en `/admin/ingresar` con email y contraseña, y después un código de una app de autenticación (TOTP) en `/admin/verificar`. La primera vez, esa pantalla muestra el QR para configurarla.
  - Las cuentas se dan de alta con `npm run admin:create`, que pide email, nombre y contraseña en la terminal. Si alguien pierde el celular, el mismo comando le borra el segundo paso para configurarlo de nuevo.
  - `requireAdmin()` (`src/lib/auth/admin.ts`) va en cada página y cada acción del panel; `src/proxy.ts` solo renueva la sesión.
  - Una administradora con movimientos de stock a su nombre no se puede borrar de `auth`: el historial exige el usuario. Para sacarle el acceso, se la quita de `admin_users`.

## 8. Modelo de datos (base)

Montos siempre en **enteros de centavos**. Fechas guardadas en UTC y mostradas en `America/Argentina/Buenos_Aires`. El esquema vive en `supabase/migrations/`; después de cada migración, regenerar los tipos con `npm run db:types`.

- `categories` (id, parent_id, name, slug único, sort_order)
- `products` (id, category_id, name, slug único, description, materials_care, measurements, model_info, cost_cents, price_cents, compare_at_price_cents, is_published, seo_title, seo_description, created_at)
  - Un producto vendido no se puede borrar (sus variantes están en pedidos): se despublica.
- `product_images` (id, product_id, path, alt obligatorio, sort_order)
- `product_variants` (id, product_id, color, size, sku, stock_on_hand, stock_reserved, low_stock_threshold)
  - Disponible = `stock_on_hand - stock_reserved`. Ningún valor puede ser negativo, y `stock_reserved` nunca supera a `stock_on_hand`: esa restricción es la red de seguridad de §9.6.
  - `low_stock_threshold` vacío usa `low_stock_default` de `settings`.
- `kits` (id, name, slug único, price_cents, compare_at_price_cents, is_published) y `kit_items` (kit_id, variant_id, quantity). Los kits no tienen stock propio. Si en la fase 3 se muestran en `/producto/[slug]`, hace falta unicidad de slug entre productos y kits.
- `orders` (id, number, status, payment_method `mercadopago | transfer`, email, phone, shipping_method `delivery | same_day | pickup`, shipping_zone_id, shipping_address, is_gift, gift_message, subtotal_cents, coupon_discount_cents, transfer_discount_cents, discount_cents, shipping_cents, total_cents, coupon_id, reserved_until, mp_preference_id, mp_payment_id, needs_review, review_reason, created_at)
  - status: `pending_payment | paid | preparing | shipped | ready_for_pickup | delivered | cancelled`
  - number: `GU-001000` en adelante (la secuencia arranca en 1000).
  - La base exige `discount_cents = coupon_discount_cents + transfer_discount_cents` y `total_cents = subtotal_cents - discount_cents + shipping_cents`.
  - `coupon_id` solo se guarda si el cupón se aplicó. `review_reason` explica por qué el pedido quedó con `needs_review`.
  - `paid_at` se completa solo al pasar a `paid`: las ventas del día se cuentan por fecha de cobro.
  - `shipping_address` es un objeto con las claves `name`, `street`, `number`, `floor`, `apartment`, `city`, `province`, `postal_code` y `notes`. El panel las muestra en ese orden, porque `jsonb` no guarda el orden de las claves.
- `order_items` (order_id, parent_item_id, variant_id, kit_id, name_snapshot, unit_price_cents, quantity)
  - Un kit entra como una línea con `kit_id` y su precio, y sus componentes como líneas hijas (`parent_item_id`) con `variant_id` y precio 0. Así el pedido guarda la composición con la que se vendió, aunque el kit cambie después. Las operaciones de stock recorren solo las líneas con variante.
- `stock_movements` (id, variant_id, type, quantity, order_id, note, created_by, created_at)
  - type: `restock | web_sale | manual_sale | adjustment | reservation | release | return`
  - `quantity` siempre positiva y el tipo da la dirección; solo `adjustment` lleva signo.
  - Los movimientos manuales (`restock`, `manual_sale`, `adjustment`, `return`) exigen usuario; ventas manuales y ajustes, además, nota.
- `payment_events` (id, provider_event_id único, payload, processed_at) para idempotencia de webhooks.
- `coupons` (id, code, type `percent | fixed`, value, min_subtotal_cents, starts_at, ends_at, max_uses, used_count)
  - `percent`: value es el porcentaje (1 a 100). `fixed`: value en centavos. Los códigos se guardan en mayúsculas.
- `price_changes` (product_id, old_price_cents, new_price_cents, reason, created_by, created_at). Lo llena un trigger en cada cambio de precio, suelto o masivo; el motivo llega por `app.price_change_reason`.
- `admin_users` (user_id, name, created_at): quién entra al panel.
- `shipping_zones` (id, name único, provinces, postal_codes, price_cents, eta_text, same_day)
- `back_in_stock_requests` (variant_id, email, created_at, notified_at). Un solo aviso pendiente por variante y email.
- `reviews` (id, product_id, order_id, rating, text, name, status `pending | approved | rejected`)
- `favorites` (user_id, product_id), solo con cuenta.
- `settings` (clave/valor jsonb: transfer_discount_percent, free_shipping_threshold_cents, discounts_stack, bank_alias, bank_cbu, low_stock_default, last_units_threshold, announcement_messages, whatsapp_number, same_day_cutoff_time)
  - Los valores iniciales están en la migración del esquema, porque producción también los necesita. Alias, CBU y WhatsApp arrancan vacíos: el repo es público.

### Exposición por la API

**RLS activado en todas las tablas**, y además nada se lee por la API salvo lo que se habilita a mano. Supabase da por defecto todos los permisos a `anon` y `authenticated` sobre cada tabla y función nueva; la migración de RLS los revoca también para lo que se cree después. **Toda tabla, vista o función nueva nace privada**: para exponerla hace falta un `grant` explícito y su política.

- **La tienda (`anon`)** lee categorías, productos publicados (sin `cost_cents`), sus imágenes, sus variantes (solo `id`, `product_id`, `color` y `size`), kits publicados con sus ítems, zonas de envío y reseñas aprobadas (sin `order_id`). Como el stock está oculto, `select *` sobre `product_variants` falla: pedir siempre las columnas.
- **El catálogo se lee siempre con un cliente sin sesión**, aunque la clienta esté logueada: con su sesión sería `authenticated` y no vería nada.
- La disponibilidad pública sale de las vistas `variant_availability` y `kit_availability`, que devuelven solo `is_available` e `is_last_units` (umbral `last_units_threshold`). Corren con los permisos de su dueño, porque `anon` no puede leer las columnas de stock, y por eso filtran adentro lo publicado. El revisor de Supabase las marca como "security definer view": es intencional.
- **El panel (`authenticated`)** lee y escribe con la sesión de cada administradora, no con la clave secreta. Tiene permisos completos sobre lo que administra, pero cada política exige `private.is_admin()`: estar en `admin_users` y haber pasado el segundo factor (`aal2`). Sin segundo factor, una administradora solo ve su propia fila de `admin_users`, para que el servidor sepa mandarla a verificarlo. Una clienta con cuenta no ve catálogo, pedidos ni configuración.
- `favorites`: cada persona logueada lee, agrega y borra solo los suyos.
- La clave secreta queda para lo que no tiene sesión: checkout, webhooks, cron y el alta de administradoras.
- Fotos: bucket público `product-images`, solo WebP y hasta 2 MB. Solo las administradoras suben, reemplazan o borran.

### Funciones de la base

Ninguna es `security definer` salvo `private.is_admin()`, que lee `admin_users` sin pasar por su RLS (si no, la política se llamaría a sí misma) y vive fuera de la API. Las demás corren con los permisos de quien llama, así que RLS decide adentro: las que usa el panel se pueden llamar con la sesión de una administradora, y a cualquier otra persona logueada le fallan con `order_not_found` o `variant_not_found`.

| Función | Quién | Uso |
|---|---|---|
| `quote_cart(payload)` | servidor | Presupuesto del carrito y el checkout. Si un producto se despublicó, lo marca en vez de fallar |
| `create_order_with_reservation(payload)` | servidor | Crea el pedido y reserva el stock, todo o nada (§9.1) |
| `confirm_order_payment(order_id, mp_payment_id)` | servidor y panel | Pago aprobado o transferencia confirmada (§9.3 y §9.6). Confirmar dos veces no descuenta dos veces |
| `release_order_reservation(order_id, reason)` | servidor y panel | Pago rechazado o pedido cancelado (§9.4) |
| `release_expired_reservations()` | cron | La corre `release-expired-reservations` cada 5 minutos (§9.5) |
| `record_stock_movement(...)` y `restock_variant(...)` | panel | Movimientos manuales (§9.8). Reponer devuelve los avisos pendientes (§9.10) |
| `set_order_status(order_id, status)` | panel | Pagado → preparando → enviado o listo para retirar → entregado, con vuelta de un paso |
| `preview_price_change(...)` y `apply_price_change(...)` | panel | Aumento o descuento masivo (§10) con la misma fórmula (`adjusted_price`) en la vista previa y al aplicar |
| `admin_dashboard()` y la vista `low_stock_variants` | panel | Ventas de hoy y de la semana, pedidos por preparar y alertas |
| `calculate_order_totals(...)` | servidor | La única implementación del cálculo de §10, que usan las anteriores |

- Los errores usan `message` como código estable (`out_of_stock`, `invalid_coupon`, `invalid_shipping`, `item_unavailable`, `invalid_items`, `invalid_payload`, `insufficient_stock`, `invalid_movement`, `invalid_transition`, `invalid_price_change`) y `details` con un JSON. La app traduce el código al texto de la tienda.
- Tope de 10 unidades por línea: una reserva por transferencia inmoviliza stock durante 24 horas.
- Datos de prueba en `supabase/seed.sql`, aplicados con `npx supabase db push --include-seed`. Nunca van a producción.
- Pruebas de humo en `supabase/tests/smoke.sql`, con `npm run db:test`. Crean sus propios datos dentro de una transacción que se deshace, así que no dependen del seed, y restauran la secuencia de pedidos. Si algo falla, la corrida se corta con un error que nombra la prueba; si no, termina en "todas las pruebas pasaron". No son pgTAP: `supabase test db` no aplica.

## 9. Reglas de stock

1. **Reservar al crear el pedido** dentro de una sola función de Postgres (transacción). Si alguna variante no alcanza, se rechaza todo el pedido y se informa qué talle se agotó.
2. Duración de la reserva: Mercado Pago 30 minutos (la preferencia vence en el mismo plazo); transferencia 24 horas.
3. **Pago aprobado:** `stock_on_hand -= qty` y `stock_reserved -= qty`, movimiento `web_sale`, estado `paid`.
4. **Pago rechazado, cancelado o reserva vencida:** `stock_reserved -= qty`, movimiento `release`, estado `cancelled`.
5. Un job cada 5 minutos (pg_cron en Supabase) libera las reservas vencidas.
6. **Pago aprobado después de liberar la reserva:** intentar descontar; si no hay stock, no descontar, marcar `needs_review = true` y alertar en el panel y por email.
7. **Kits:** disponible = mínimo de `floor(disponible del componente / cantidad)`. Reservar un kit reserva sus componentes.
8. Ventas manuales y ajustes siempre generan movimiento con nota y usuario.
9. Alerta de stock bajo cuando el disponible ≤ umbral.
10. Al reponer una variante con avisos pendientes, enviar el email "Volvió tu talle".

## 10. Reglas de precios

- **El total se calcula siempre en el servidor** con los precios de la base. Nunca confiar en precios, descuentos o costos de envío enviados por el navegador.
- El cálculo vive en la función `calculate_order_totals` (§8): recibe qué se compra, el cupón, el medio de pago, el método de envío y el id de la zona, y lee todos los montos de la base. `src/lib/pricing` queda para formato y margen.
- Orden de cálculo: subtotal → cupón → descuento por transferencia → envío. Los descuentos se redondean al peso.
- Por defecto, cupón y descuento por transferencia no se acumulan: se aplica el mayor, y en empate la transferencia, para no gastar el cupón (`discounts_stack`, ver pendientes).
- Envío gratis si el subtotal con descuentos ≥ `free_shipping_threshold_cents` (vacío = sin envío gratis). El costo sale siempre de `shipping_zones`; el retiro no lleva zona y el envío en el día solo va a zonas `same_day`.
- Cupones: se validan al crear el pedido (vigencia, usos máximos y monto mínimo) y otra vez al confirmar el pago. Al confirmar, la vigencia se mide contra la fecha del pedido, y si algo falla el pago no se rechaza, porque ya está cobrado: el pedido queda con `needs_review`.
- `order_items` guarda el precio del momento; cambiar precios no altera pedidos existentes.
- Aumento masivo: % sobre categoría o selección, redondeo configurable (por defecto hacia arriba a la centena de pesos), vista previa antes de aplicar y registro en `price_changes`.
- Precio tachado solo si `compare_at_price_cents > price_cents`.
- Margen en el panel: `(precio - costo) / precio`.
- Formato: `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })`.

## 11. Pagos

### Mercado Pago (Checkout Pro)

- Crear la preferencia en el servidor con `external_reference = order.id`, `notification_url` apuntando al webhook y vencimiento igual a `reserved_until`.
- Excluir pagos en efectivo (tipo `ticket`) al menos al inicio.
- Webhook `/api/webhooks/mercadopago`:
  1. Validar la firma (`x-signature`) con `MP_WEBHOOK_SECRET`.
  2. Registrar el evento en `payment_events`; si ya existe, responder 200 sin procesar.
  3. Consultar el pago a la API de Mercado Pago; nunca confiar solo en el contenido del aviso.
  4. Aplicar las reglas de stock según el estado.
  5. Responder 200 rápido.
- `back_urls` a `/pedido/[numero]`, que muestra el estado leído de la base, no de los parámetros de la URL.

### Transferencia bancaria

- El pedido queda `pending_payment` con reserva de 24 horas.
- `/pedido/[numero]` muestra alias, CBU, monto exacto y un botón para enviar el comprobante por WhatsApp.
- La confirmación se hace manualmente desde el panel.

No se guardan datos de tarjetas en ningún lugar.

## 12. Envíos

- Métodos: envío a domicilio por zona (costo fijo configurable), envío en el día en Paraná y Oro Verde (con horario de corte configurable) y retiro en punto de entrega en Paraná.
- Embalaje discreto para ropa interior, mencionado en producto y checkout.
- Fase posterior: cotización automática con Andreani o Correo Argentino.

## 13. Emails (Resend + React Email)

Con logo, paleta y voz de marca:
- Pedido recibido (con instrucciones si es transferencia).
- Pago aprobado.
- Pedido enviado o listo para retirar.
- Carrito abandonado (solo si dejó email y aceptó recibir novedades).
- Volvió tu talle.
- Pedido de reseña, unos días después de la entrega.
- Internos: stock bajo, pedido para revisar, transferencia pendiente.

## 14. SEO, rendimiento y analítica

- Título y descripción por página. Open Graph con foto y precio para que los links se vean bien en WhatsApp e Instagram.
- `sitemap.xml`, `robots.txt` y URLs en español sin IDs.
- Datos estructurados `Product` (precio, disponibilidad, reseñas) en cada producto.
- Imágenes con `next/image`, formatos modernos, carga diferida y tamaños correctos; la foto del hero con prioridad.
- Objetivo: buenos Core Web Vitals en celular con 4G.
- Eventos de Meta Pixel y GA4: `ViewContent`, `AddToCart`, `InitiateCheckout` y `Purchase` (con `event_id` para evitar duplicados; `Purchase` solo cuando el pago está confirmado).

## 15. Accesibilidad y legales

- Texto alternativo en todas las fotos, labels en todos los campos, navegación con teclado y áreas táctiles de al menos 44px.
- Foco visible: anillo chocolate de 2px con separación (el coral no tiene contraste suficiente sobre crema).
- Footer en todas las páginas: link a Defensa del Consumidor, botón de arrepentimiento, QR de Data Fiscal de ARCA, términos y privacidad.
- Los textos legales se redactan como borrador marcado **"PENDIENTE DE REVISIÓN"** y no se publican sin revisión profesional. Incluye la política de cambios de ropa interior por higiene.
- Consentimiento explícito para newsletter y emails de carrito abandonado.

## 16. Plan de construcción

0. **Setup:** repo, Next.js, Tailwind con tokens, fuentes, Supabase, Netlify y `.env.example`.
1. **Base de datos:** migraciones, RLS, funciones de stock y datos de prueba (10 productos con variantes y 2 kits).
2. **Panel admin:** login, productos, stock, precios, pedidos y configuración.
3. **Tienda:** header, inicio, listados con filtros, producto, buscador, favoritos y carrito lateral.
4. **Checkout:** cálculo de totales, reservas, Mercado Pago, transferencia, webhook y job de vencimiento.
5. **Emails.**
6. **Envíos y retiro.**
7. **SEO, analítica, rendimiento y accesibilidad.**
8. **Legales y prueba completa:** compras de prueba con cada método, pagos rechazados, reservas vencidas y webhook duplicado.
9. **Lanzamiento:** credenciales de producción, dominio, **quitar el `noindex` del layout**, backup periódico de la base y monitoreo de errores.

## 17. Pendientes

- [ ] Logo ajustado a la paleta en SVG, con todas las versiones.
- [ ] Catálogo: subcategorías de ropa interior, productos, talles, colores y fotos.
- [ ] Tabla de talles con medidas reales.
- [ ] Monto de envío gratis y % de descuento por transferencia.
- [ ] Cuotas sin interés: sí o no, y cuántas.
- [ ] ¿Cupón y descuento por transferencia se acumulan?
- [ ] Zonas y costos de envío; punto de retiro y horarios.
- [ ] Alias, CBU y número de WhatsApp.
- [ ] Dominio, usuario de Instagram y registro de marca en el INPI.
- [ ] Textos legales revisados.
