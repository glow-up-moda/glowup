# MAREA — Guía del proyecto para Claude Code

> Leé este archivo completo antes de cada tarea. Si una decisión cambia, actualizá este archivo en el mismo commit.
> Para código de Next.js, seguí además `AGENTS.md`: lo escribe y lo mantiene Next.js, y manda a leer la documentación de la versión instalada en `node_modules/next/dist/docs/`. No lo edites a mano.

@AGENTS.md

## 1. Qué es

Tienda online de **ropa interior femenina y accesorios** (gorras, anteojos de sol, toallones y otros) con base en **Paraná, Entre Ríos, Argentina**. Vende a todo el país, con envío en el día y retiro en Paraná y Oro Verde.

- Público: mujeres. Tono cercano, cálido y cómplice.
- Idioma de la interfaz: español rioplatense con voseo ("Elegí tu talle", "Sumalo al carrito").
- Moneda: pesos argentinos (ARS).
- Dirección de la experiencia: **sutil pero no básica**. El logo es lo memorable; todo lo demás es calmo, prolijo y suave.
- Todo se diseña primero para celular: la mayoría de las visitas llega desde Instagram y WhatsApp.

## 2. Forma de trabajo

- Modificá los archivos existentes en su lugar. **No crees copias ni versiones paralelas** (`page-v2.tsx`, `hero-nuevo.tsx`, `styles-old.css`).
- **Avanzá sin pedir confirmación.** Tomá las decisiones con criterio y contalas en dos líneas cuando ya estén hechas. Solo frená y preguntá si algo cuesta plata, borra datos, toca producción o necesita una clave o una cuenta personal (Supabase, Netlify, GitHub, Ualá, etc.).
- Informes cortos: qué se hizo, qué falta, y seguir. Sin resúmenes largos ni listas de verificación en cada paso.
- Una tarea terminada = un commit. Código, nombres y commits en inglés; textos visibles en español.
- No agregues dependencias sin explicar para qué sirven y si existe una alternativa nativa.
- Nunca subas `.env` ni claves al repositorio.
- **El repositorio es público** (`glow-up-moda/glowup`). Además de las claves, nunca subas alias, CBU, teléfono, direcciones ni datos de clientas: esos valores viven en la tabla `settings` o en variables de entorno, nunca en el código, en migraciones ni en datos de prueba.
- Pagos: **la tienda cobra con las credenciales de producción de Ualá Bis** (`UALA_ENVIRONMENT=production`), por decisión de la dueña. El ambiente de prueba de Ualá rechaza estas credenciales con "Invalid username" (§11) y conseguir las de sandbox hay que pedirlo a soporte, así que la prueba de punta a punta se hace con una compra real que después se devuelve. Mientras no haya un producto publicado con stock, nadie puede llegar a pagar.
- Cambios de base de datos siempre como migraciones en `supabase/migrations/`, en este orden: primero la migración pasa junto con `supabase/tests/smoke.sql` dentro de una transacción que se deshace; después, commit y push; recién entonces, `npx supabase db push`. Los tipos (`npm run db:types`) se regeneran después de aplicar y van en el commit siguiente. El cron no se prueba en esa transacción: se verifica en `cron.job_run_details`.
- Al terminar una tarea con interfaz, revisala en 375px (celular) y en escritorio.

## 3. Stack

| Pieza | Herramienta |
|---|---|
| Front + API | Next.js (App Router) + TypeScript |
| Estilos | Tailwind CSS con los tokens de la sección 5 |
| Animación | Transiciones CSS; librería `motion` solo para el carrito lateral y la secuencia del hero |
| Base de datos, auth, archivos | Supabase (Postgres, Auth, Storage) |
| Pagos | Ualá Bis, API Cobros Online v2 (REST con `fetch`, sin dependencias) para tarjetas, y transferencia bancaria |
| Emails | Resend + React Email |
| Validación | Zod |
| Imágenes | `sharp` en el servidor: las fotos se suben convertidas a WebP (las transformaciones de Supabase son pagas y Safari no codifica WebP) |
| Formato | Prettier + `prettier-plugin-tailwindcss` (ordena las clases) |
| Hosting | Netlify, en `mareapna.com`. La dirección vieja de Netlify redirige al dominio. No publica en cada push: ver §16 |
| Analítica | Meta Pixel + Google Analytics 4 |

Variables de entorno (`.env.local` local; `.env.example` sin valores en el repo). Nombres verificados con la documentación de Supabase en septiembre de 2026. Las claves viejas `anon` y `service_role` se retiran a fines de 2026: usamos siempre la publicable y la secreta.

```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=          # solo servidor
UALA_USERNAME=                # solo servidor
UALA_CLIENT_ID=               # solo servidor
UALA_CLIENT_SECRET=           # solo servidor
UALA_ENVIRONMENT=production   # test | production. Hoy producción: ver §2
RESEND_API_KEY=               # solo servidor
EMAIL_FROM=                   # solo servidor, dominio verificado en Resend
EMAIL_INTERNAL=               # solo servidor, destino de los avisos internos
CRON_SECRET=                  # solo servidor, con el que la base llama al cron
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
scripts/                  tareas locales (panel local, alta de administradoras, backup, publicar)
src/lib/                  supabase, uala, pricing, stock, shipping
src/emails/               plantillas de React Email
supabase/migrations/      SQL versionado
public/brand/             logos y favicon
```

## 5. Marca

### Paleta (única fuente de color)

| Token | Hex | Uso |
|---|---|---|
| `azul` | `#075477` | Texto, títulos, íconos, botón principal, footer, bordes fuertes |
| `aqua` | `#45B5C9` | Ondas y acentos decorativos: glow del hero, barra de progreso |
| `brisa` | `#A8DDE4` | Fondos de acento: barra de anuncios, badges, avisos neutros |
| `crema` | `#FFF9F0` | Fondo general |
| `arena` | `#F5EBDD` | Tarjetas, separadores, fondo de inputs |
| `tostado` | `#C9A982` | Detalle complementario; solo decoración |
| `caracola` | `#A82E5E` | Acento de ofertas y descuentos |
| `caracola-suave` | `#F7DDE4` | Fondo del bloque del cupón de bienvenida |

Proporción aproximada: crema y arena 60%, azul 25%, aqua y brisa 10%, tostado y caracola 5%. Lo que hace reconocible a MAREA es crema + azul + aqua.

Reglas de contraste (obligatorias, medidas sobre estos hex):
- Permitido como texto: azul sobre crema (7.9:1), sobre arena (7.0:1) y sobre brisa (5.6:1); crema sobre azul (7.9:1, y 6.2:1 en el hover `azul/90`); caracola sobre crema (6.2:1) y sobre arena (5.5:1), crema sobre caracola (6.2:1) y azul sobre caracola-suave (6.5:1).
- Prohibido: aqua o tostado como color de texto sobre crema o arena (2.3:1 y 2.1:1).
- Prohibido: cualquier texto sobre aqua (azul 3.4:1, crema 2.3:1) o sobre tostado (azul 3.7:1, crema 2.1:1). **Aqua y tostado son superficies decorativas, nunca fondo de texto.**
- Prohibido: texto crema sobre brisa (1.4:1). Sobre brisa el texto va en azul.
- Botón principal: fondo azul, texto crema. Secundario: borde y texto azul, fondo transparente. El azul es el color de los botones porque el aqua no sostiene texto.
- Links: azul con subrayado.
- Las estrellas de las reseñas van en azul: en aqua no se distinguen del fondo.
- **Caracola es el acento de ofertas y descuentos**, y nada más: badge "Oferta", el precio cuando está rebajado (el tachado sigue en azul), la línea del descuento por transferencia, lo que se descuenta en el resumen del checkout y el corazón de favoritos marcado. Fuera de eso no aparece: botones, links, texto común, fondos de sección, anillo de foco y logo siguen en azul. Se eligió por contraste: es el único cálido que pasa 4.5:1 sobre crema **y** sobre arena, que es el fondo de las tarjetas; el coral vivo (`#C9442F`) se queda en 4.1:1 sobre arena. Y no se confunde con el rojo de error, que cereza o terracota sí.
- Aqua puede ser una superficie llena si nada tiene que leerse encima y la información también está en texto (la barra de "te faltan $X para el envío gratis").
- Sin modo oscuro.

### Colores funcionales (solo estados)

| Token | Hex | Uso |
|---|---|---|
| `error` | `#B42318` | Errores de formulario, pago rechazado, alertas del panel |
| `exito` | `#2F6B3A` | Confirmaciones: pago aprobado, pedido creado, stock actualizado |

- No son colores de marca: no se usan en botones principales, fondos de sección ni decoración, y no cambian la proporción 60/25/10/5.
- Nunca el color solo: siempre con ícono y texto. El error además marca el borde del campo y se enlaza al input con `aria-describedby`.
- Solo sobre crema o arena: error 6.3:1 y éxito 6.1:1 sobre crema; 5.6:1 y 5.4:1 sobre arena.
- Prohibido sobre aqua, brisa o tostado: entre 2.7:1 y 4.4:1, ninguno llega a 4.5:1.
- Bloque de aviso: fondo arena, borde del color funcional, ícono y texto del mismo color.
- Si hace falta un chip lleno en el panel, el texto va en crema (6.3:1 sobre error, 6.1:1 sobre éxito).
- Los avisos neutros o informativos usan fondo brisa con texto azul.

### Logo

Letras "MAREA" dibujadas a mano en azul profundo, con dos ondas en celeste debajo.

- **El original es `public/brand/logo.png`** (600 × 231, con transparencia), recortado del archivo que pasó la dueña. Todavía no hay versión en SVG (ver pendientes), así que todo sale de ese PNG.
- `public/brand/logo-crema.png`: el mismo dibujo en una sola tinta crema, para fondo azul. **Hoy no lo usa ninguna pantalla** —todas las de la tienda y el panel van sobre crema o arena— pero queda como pieza de marca para redes o lo que haga falta.
- Lo usan, siempre a color y con `next/image`: el header (36px de alto, 40 en escritorio), el footer (40), el menú lateral del celular (32), el ingreso al panel (48) y la hoja para armar pedidos (40). Todos van con `priority` y con el mismo `width={104}`, así piden la misma copia optimizada y se descarga una sola vez; el alto lo decide la clase `h-*`.
- El favicon (`src/app/icon.png`) y el ícono de iOS (`src/app/apple-icon.png`) son **la onda del logo en crema sobre azul**: el 55% del medio, porque la onda entera a 16px es una línea. Se generaron del mismo PNG conservando su alfa y cambiándole la tinta, no dibujando una onda nueva.
- Las tintas del archivo son `#013D64` y `#2CACC4`: parecidas a azul y aqua, pero no las mismas. El logo se usa tal cual vino; no se retoca para que coincida.
- Los emails siguen escribiendo "MAREA" con la tipografía: una imagen en un email necesita una dirección absoluta y que el lector de correo la muestre, así que se decide aparte (§13).
- No dibujar ni recrear el logo por código.

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
- Motivo de marca: hoy es el destello de 4 puntas que quedó del logo anterior, en confirmación de "agregado", loader, viñetas de beneficios y en lugar de las fotos que faltan. Cuando esté el logo nuevo se reemplaza por la onda (§17). No usarlo como decoración suelta.
- Manchas difusas de aqua y brisa con baja opacidad **solo detrás del hero**. Grano muy leve (opacidad ≤ 4%) opcional sobre crema.
- Sin sombras grises genéricas. Si hace falta elevación (carrito lateral, modales), sombra suave teñida de azul.
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
| `/pedido/[numero]` | Confirmación, estado real, instrucciones de transferencia y, si ya se entregó, el formulario de reseña |
| `/seguimiento` | Buscar pedido con número + email |
| `/bolsa/[id]` | Link del email de carrito abandonado: devuelve la bolsa con los precios de hoy |
| `/baja/[id]` | Baja de los avisos de carrito abandonado |
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

Cómo está hecha la tienda:
- Las categorías son rutas dinámicas (`/[categoria]` y `/[categoria]/[subcategoria]`) armadas con lo que hay en la base. Las rutas fijas (`/buscar`, `/kits`, `/favoritos`…) ganan sobre ellas, y un slug que no existe cae en el 404 de la tienda.
- Los filtros de los listados viven en la dirección (`?talle=&color=&desde=&hasta=&disponibles=&orden=`): se comparten, se marcan y el botón de volver funciona. El formulario es GET, así que anda sin JavaScript.
- Carrito y favoritos viven en el navegador y se leen con `useSyncExternalStore` (`src/lib/store/cart.tsx` y `favorites.ts`), no copiándolos a un estado con un efecto: así dos pestañas abiertas ven lo mismo. Un kit entra al carrito como una línea propia (`kind: "kit"`).
- Los favoritos guardan solo ids: los precios y el stock se leen frescos cada vez.
- "Avisame cuando vuelva" se guarda con una acción del servidor, porque `back_in_stock_requests` no está abierta a la API pública.
- Mientras un producto no tenga fotos, en lugar del hueco se muestra el destello de la marca.
- El checkout y la página del pedido corren con la clave secreta: `orders` no se lee por la API pública. Los totales se piden a `quote_cart` en cada cambio; el navegador nunca suma.
- Los números de pedido son correlativos, así que `/pedido/[numero]` solo se abre si el pedido se hizo en este navegador (cookie `glowup-pedidos`, httpOnly) o si se escribe el email con el que se compró. El error de `/seguimiento` es siempre el mismo, para no revelar qué números existen.
- Los formularios de la tienda que pueden fallar usan `useFormAction` (`src/lib/use-form-action.ts`), igual que el panel: React 19 borra los campos al terminar la acción.
- **Las páginas de la tienda se regeneran solas cada minuto** (`revalidate = 60` en el layout de `(store)`). Listados, buscador y ficha de producto se arman en cada visita, pero el inicio y las páginas fijas se prerrenderan y leen la base (catálogo, menú, barra de anuncios, configuración): sin esto quedaban congeladas hasta el próximo build, así que cargar un producto o cambiar Configuración no se veía en la tienda publicada. El checkout es la excepción: no se guarda en caché porque mira la hora para el horario de corte (§12).

### Inicio (orden de secciones)

```
Barra de anuncios (rota: envío gratis desde $X / cuotas / descuento por transferencia)
Header: menú, logo compacto, buscar, favoritos, bolsa
Hero: foto en arco, título, botón "Ver colección"
Categorías: Ropa interior, Accesorios, Kits
Lo nuevo (carrusel horizontal; pasa a "Lo más vendido" cuando haya ventas para calcularlo)
Kits: Kit playa, Kit básicos, Kit regalo
Beneficios: envío en el día en Paraná y Oro Verde, cuotas, transferencia, envío discreto, cambios
Clientas reales (fotos elegidas a mano; pendiente, ver §17)
Newsletter con cupón de primera compra
Footer: links, legales, Data Fiscal, redes
```

### Página de producto

- Galería con swipe en celular, nombre, precio, precio tachado si hay oferta, precio con transferencia y cuotas.
- Selector de color y talle. Talles agotados visibles pero deshabilitados, con "Avisame cuando vuelva".
- "Últimas unidades" cuando el disponible es ≤ 2 (configurable).
- Link a guía de talles.
- Pestañas: Descripción, Talle, Envíos y cambios. "Materiales y cuidados" y "La modelo" siguen en la base pero ya no se cargan desde el panel, así que no aparecen.
- "Combinalo con" (productos o kits relacionados).
- Reseñas aprobadas.
- En celular, botón "Sumar al carrito" fijo abajo.

### Carrito lateral

- Se abre desde cualquier página; no hay página de carrito aparte.
- Productos con cantidad editable, subtotal, barra "Te faltan $X para el envío gratis", un accesorio sugerido y botón "Ir a pagar".
- El accesorio sugerido es el primero de la categoría Accesorios que no esté ya en la bolsa, y lleva a su ficha en vez de sumarse de una: puede tener más de un color o talle para elegir.
- Se guarda en el navegador y, al abrirlo, se revalidan precios y stock contra la base.

### Checkout (sin registro obligatorio)

1. Email y teléfono (WhatsApp).
2. Entrega: envío a domicilio por zona, envío en el día (Paraná y Oro Verde) o retiro.
3. Opción "Es para regalo": caja sin precios + mensaje en tarjeta.
4. Cupón.
5. Pago: tarjeta con Ualá Bis o transferencia bancaria con descuento.
6. Aceptación de términos y consentimiento opcional para novedades.

### Panel `/admin`

Tiene que ser cómodo de usar desde el celular.
- **Inicio:** ventas del día y la semana, pedidos por preparar y alertas (stock bajo, pedidos para revisar, transferencias por confirmar).
- **Productos:** crear y editar, variantes opcionales, fotos, costo, precio, precio tachado, publicado sí/no.
  - **El alta es una sola pantalla** (`/admin/productos/nuevo`): datos, stock y fotos juntos. El producto se crea como borrador, se suben las fotos y **recién entonces se publica**, así nunca aparece a medio cargar en la tienda. Las fotos esperan en el navegador hasta que el producto existe, porque se guardan en una carpeta con su id; por eso `createProduct` devuelve el id en vez de redirigir, y el formulario sigue desde el navegador.
  - **Las variantes son opcionales.** Por defecto el alta pide un solo número de stock y crea una fila sin color ni talle: esa fila **es** el producto (§8). Un botón cambia a la grilla cuando sí tiene colores o talles. En la tienda cada selector aparece solo si hay algo que elegir: sin talles no se muestra el talle ni el link a la guía, y sin nada que elegir el botón de comprar está habilitado de entrada. El nombre de la variante lo arma `variantText` (`src/lib/format.ts`): "Rosa · Talle 85", "Rosa" o "Talle 85", y nada si no tiene ninguno.
  - El formulario tiene solo lo que la dueña quiere escribir: nombre, categoría, precio, precio tachado, costo, descripción y talle. **La dirección de la tienda sale del nombre** (`freeSlug` en las acciones): no se escribe, y si dos productos se llaman igual al segundo se le suma un número. Renombrar un producto le cambia el link. El título para Google también sale del nombre y la descripción para Google queda vacía; las columnas `slug`, `seo_title`, `seo_description`, `materials_care` y `model_info` siguen existiendo en la base, pero ya no se editan.
  - En la ficha de un producto ya creado, **"Datos del producto" va plegado**: lo que se mira todos los días es el stock y las fotos. Publicar y despublicar es un botón en el encabezado, no un tilde adentro de un formulario.
  - **Grilla de variantes** (`src/components/admin/variant-grid.tsx`): se escriben los colores y los talles separados por coma, y aparece un bloque por color con un campo de stock por talle. **Los dos campos son opcionales y se usan sueltos:** solo colores (tres colores de talle único), solo talles (cuatro talles de un color) o los dos cruzados; lo que quede vacío se guarda en null. Una celda vacía no crea nada; un 0 crea la variante sin stock. Dos colores por cuatro talles entran en un solo envío en vez de ocho. En la ficha de un producto la misma grilla marca "ya está" las combinaciones que existen, porque la base no admite repetir color y talle. No es una tabla a propósito: a 375px una de cuatro talles pedía 443px y había que scrollear de costado.
  - El stock inicial de cada celda entra como ingreso de mercadería, así queda en el historial.
  - **Duplicar** copia los datos y las variantes (con stock en cero y sin SKU, que es único en toda la base) y deja la copia como borrador. Las fotos no se copian: son archivos, y el original se quedaría sin ellas al borrar la copia.
  - Fotos: en la ficha **se suben apenas se eligen**, sin botón aparte. El navegador las achica a 2000 px antes de subirlas (`src/lib/admin/photo.ts`), y el servidor las pasa a WebP con `sharp` (hasta 1600 × 2000 y una miniatura de 480 × 600) y las guarda en Storage. El texto alternativo no se escribe al subir: arranca con el nombre del producto, que es lo que exige la columna, y se puede mejorar después desde "Descripción" en cada foto.
- **Categorías** (`/admin/categorias`): el menú de la tienda. Alta, edición, borrado, orden y **la foto de la tarjeta del inicio**, con las subcategorías anidadas bajo su categoría y la cuenta de productos de cada una.
  - La foto se sube apenas se elige, igual que las de producto, y se recorta cuadrada a 1200px en WebP con calidad 90: la tarjeta del inicio es cuadrada. Ese archivo **no es el que se sirve** —Netlify lo vuelve a achicar y a comprimir para cada tamaño—, así que guardarlo chico o muy comprimido deja las letras de los productos con bordes sucios. Es una sola; subir otra reemplaza la anterior y recién entonces borra el archivo viejo. Sin foto, la tarjeta muestra el destello de la marca.
  - El nombre del archivo lleva un uuid nuevo en cada subida, porque se sirve con caché de un año: con el mismo nombre quedaría a la vista la foto vieja. La dirección sale del nombre, igual que en productos, así que renombrar una le cambia el link. **Solo dos niveles**, porque la tienda enruta `/[categoria]` y `/[categoria]/[subcategoria]`: una subcategoría no puede colgar de otra, y una categoría con subcategorías adentro no puede pasar a ser subcategoría. El orden se cambia con flechas que intercambian el `sort_order` con la vecina del mismo grupo. Borrar solo se ofrece cuando está vacía; con productos o subcategorías adentro, la base lo impide (`on delete restrict`) y la pantalla lo explica en vez de dejar que falle.
- **Stock:** ingreso de mercadería, ajustes, venta manual rápida (Instagram, WhatsApp, en persona) e historial de movimientos.
- **Formularios del panel:** con `useFormAction` (`src/components/admin/use-form-action.ts`), no con `<form action>` directo. React 19 resetea el formulario al terminar la acción y eso cambia los `<select>` aunque haya fallado: una venta con error volvía a "Entró mercadería".
- **Precios:** aumento o descuento masivo por categoría o selección, con redondeo, vista previa y margen.
  - Alcance: una categoría (incluye sus subcategorías), los productos que se marquen o todo el catálogo. El porcentaje va de -90 a 300 y el redondeo es siempre hacia arriba.
  - La vista previa muestra el margen antes y después, marca los borradores y avisa cuando el precio nuevo alcanza al tachado y el producto deja de verse como oferta.
  - Cada cambio queda en `price_changes` con el motivo que se escriba.
- **Pedidos:** filtros por estado, detalle, confirmar transferencia, cambiar estado y hoja imprimible para armar el paquete.
  - Pestañas por `?estado=`: `por-preparar` (pagados, la vista inicial), `transferencias` (pendientes por transferencia), `revisar`, `preparando`, `enviados`, `entregados`, `cancelados` y `todos`. La búsqueda recorre todos los pedidos, por número o por email.
  - Estados: pagado → preparando → enviado (o listo para retirar, si es retiro) → entregado, con un paso atrás por si hubo un error. Los aplica `set_order_status`.
  - Las transferencias se confirman a mano, con un paso de confirmación. Una transferencia de un pedido ya cancelado también se puede confirmar: si todavía hay stock se descuenta; si no, queda para revisar (§9.6). Un pago con tarjeta nunca se confirma desde el panel: lo confirma el webhook.
  - "Ya lo revisé" apaga `needs_review`, pero el motivo queda guardado en el pedido.
  - La hoja para armar (`/admin/pedidos/[numero]/hoja`) no lleva precios: puede ir dentro de la caja.
- **Cupones:** listado con estado (activo, programado, vencido, agotado), alta y edición con vigencia en hora de Argentina, "desactivar ahora" (le corta la vigencia) y borrado solo si nunca se usó.
  - Desactivar un cupón programado también le borra la fecha de inicio: la base exige que el inicio sea anterior al fin.
- **Zonas de envío:** alta, edición y borrado (`/admin/zonas`). Nombre, costo, plazo, si es zona de envío en el día, y las provincias y códigos postales que abarca, uno por línea. Una zona que ya viajó en un pedido no se puede borrar: la base lo impide y el panel lo explica.
- **Combos** (`/admin/categorias/combos`): cómo se llama el bloque de kits en el menú y en el inicio, y su foto. `/kits` es una ruta fija que lista la tabla `kits`, no una categoría, así que esos dos valores viven en `settings` (`kits_label` y `kits_image_path`) y no en `categories`. La foto se guarda igual que las de categoría, bajo `categories/kits/`. La pantalla cuelga de Categorías porque es ahí donde se arma el menú de la tienda; la sección **Kits** del panel sigue siendo donde se arman los combos.
- **Kits** (`/admin/kits`): nombre, dirección, precio, precio tachado, publicado y qué trae (variante + cantidad, una línea por producto). No tienen stock propio: el disponible sale de los componentes (§9.7). Un kit publicado tiene que traer al menos un producto, y uno ya vendido no se puede borrar: se despublica.
- **Reseñas** (`/admin/resenas`): entran como `pending` y no se ven en la tienda hasta publicarlas. Rechazarlas las esconde sin borrarlas, y desde cualquiera de los dos estados se pueden devolver a la cola.
- **Avisos de reposición** (`/admin/reposiciones`): quién está esperando cada talle agotado, agrupado por variante y ordenado por cuántas esperan. Al reponer desde Stock, el email sale solo (§9.10).
- **Reportes** (`/admin/reportes`): facturado, costo y margen, más vendidos y talles más vendidos, por 30 días, 90 o todo. Solo cuenta pedidos cobrados. Las unidades salen de las líneas con variante, así lo que viajó dentro de un kit también cuenta, y la facturación de las líneas de arriba, para no contar dos veces. Las cuentas se hacen en la app y no en la base: con el volumen de una tienda chica alcanza, y si algún día se pone lento se mudan a SQL.
- **Configuración:** % de descuento por transferencia, monto de envío gratis, alias y CBU, umbral de stock bajo, mensajes de la barra de anuncios, número de WhatsApp y código del cupón de bienvenida.
  - Una sola pantalla con todo, validado: CBU de 22 números, alias de 6 a 20 caracteres, WhatsApp solo números, horario de corte HH:MM y hasta 5 mensajes de anuncio de 80 caracteres, uno por línea.
  - Un campo opcional vacío se guarda como el null de JSON. Escribir algo inválido nunca lo borra en silencio: vuelve con el error.
- **Acceso:** solo usuarios que estén en `admin_users`.
  - Ingreso en `/admin/ingresar` con email y contraseña, nada más. **No hay segundo factor:** se sacó a pedido de la dueña porque pedir un código de la app del celular en cada ingreso era demasiada fricción. La contraseña es la única llave del panel, así que tiene que ser larga y no repetirse en ningún otro lado.
  - Los campos del formulario van con `autocomplete` (`username` y `current-password`), para que el navegador ofrezca guardarlos. La sesión se renueva sola en `src/proxy.ts`, así que en el celular casi nunca hay que volver a escribirlos.
  - Las cuentas se dan de alta con `npm run admin:create`, que pide email, nombre y contraseña en la terminal. Si la cuenta arrastra un segundo factor viejo, el mismo comando lo borra.
  - En el escritorio de la dueña hay un acceso directo ("Panel MAREA.url") que abre `mareapna.com/admin`, el panel publicado: sirve desde cualquier dispositivo y no hay que prender nada. Para trabajar sin internet en esa computadora está `npm run panel` (`scripts/panel-local.mjs` y su `.cmd`), que levanta el servidor de desarrollo si no está andando, espera a que conteste y abre `/admin`. La ventana que queda abierta **es** el servidor: cerrarla lo apaga. El script no tiene rutas de ninguna computadora escritas adentro: se ubica solo.
  - `requireAdmin()` (`src/lib/auth/admin.ts`) va en cada página y cada acción del panel; `src/proxy.ts` solo renueva la sesión.
  - Una administradora con movimientos de stock a su nombre no se puede borrar de `auth`: el historial exige el usuario. Para sacarle el acceso, se la quita de `admin_users`.

## 8. Modelo de datos (base)

Montos siempre en **enteros de centavos**. Fechas guardadas en UTC y mostradas en `America/Argentina/Buenos_Aires`. El esquema vive en `supabase/migrations/`; después de cada migración, regenerar los tipos con `npm run db:types`.

- `categories` (id, parent_id, name, slug único, sort_order, image_path)
  - `image_path` es la foto de la tarjeta del inicio: una ruta en el bucket `product-images`, bajo `categories/<id>/`, o null. Si está, no puede ser una cadena vacía: la tarjeta pediría un archivo que no existe.
- `products` (id, category_id, name, slug único, description, materials_care, measurements, model_info, cost_cents, price_cents, compare_at_price_cents, is_published, seo_title, seo_description, created_at)
  - Un producto vendido no se puede borrar (sus variantes están en pedidos): se despublica.
- `product_images` (id, product_id, path, alt obligatorio, sort_order)
- `product_variants` (id, product_id, color, size, sku, stock_on_hand, stock_reserved, low_stock_threshold)
  - **`color` y `size` pueden ser nulos.** Una fila sin ninguno de los dos no es una variante: es el producto a secas, y ahí vive su stock. Así una prenda única no necesita una variante llamada "Único". La unicidad es `nulls not distinct`, porque si no Postgres consideraría distinto cada nulo y un producto podría terminar con dos filas sin color ni talle.
  - Disponible = `stock_on_hand - stock_reserved`. Ningún valor puede ser negativo, y `stock_reserved` nunca supera a `stock_on_hand`: esa restricción es la red de seguridad de §9.6.
  - `low_stock_threshold` vacío usa `low_stock_default` de `settings`.
- `kits` (id, name, slug único, price_cents, compare_at_price_cents, is_published) y `kit_items` (kit_id, variant_id, quantity). Los kits no tienen stock propio. Si en la fase 3 se muestran en `/producto/[slug]`, hace falta unicidad de slug entre productos y kits.
- `orders` (id, number, status, payment_method `card | transfer`, email, phone, shipping_method `delivery | same_day | pickup`, shipping_zone_id, shipping_address, is_gift, gift_message, subtotal_cents, coupon_discount_cents, transfer_discount_cents, discount_cents, shipping_cents, total_cents, coupon_id, reserved_until, payment_checkout_id, payment_reference, needs_review, review_reason, created_at)
  - status: `pending_payment | paid | preparing | shipped | ready_for_pickup | delivered | cancelled`
  - number: `GU-001000` en adelante (la secuencia arranca en 1000).
  - La base exige `discount_cents = coupon_discount_cents + transfer_discount_cents` y `total_cents = subtotal_cents - discount_cents + shipping_cents`.
  - `coupon_id` solo se guarda si el cupón se aplicó. `review_reason` explica por qué el pedido quedó con `needs_review`.
  - `paid_at` se completa solo al pasar a `paid`: las ventas del día se cuentan por fecha de cobro. `delivered_at` hace lo mismo con `delivered`, y de ahí se cuentan los días para pedir la reseña.
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
- `reviews` (id, product_id, order_id, rating, text, name, status `pending | approved | rejected`). Un índice único por (order_id, product_id) deja una sola reseña por producto y pedido.
- `sent_emails` (id, key único, kind, recipient, sent_at): qué emails ya salieron, para no mandar dos veces (§13).
- `abandoned_carts` (id, email único, items, total_cents, notified_at, recovered_at) y `marketing_optouts` (email): copia del carrito de quien dejó su email y aceptó novedades, y quiénes pidieron no recibir más (§13).
- `newsletter_subscribers` (id, email único, welcomed_at): quienes se anotaron desde el inicio.
- `favorites` (user_id, product_id), solo con cuenta.
- `settings` (clave/valor jsonb: transfer_discount_percent, free_shipping_threshold_cents, discounts_stack, bank_alias, bank_cbu, low_stock_default, last_units_threshold, announcement_messages, whatsapp_number, same_day_cutoff_time, welcome_coupon_code, kits_label, kits_image_path, y `cron_site_url` y `cron_secret`, que no se editan desde el panel)
  - La tienda no lee la tabla: lee la vista `public_settings`, que expone solo las claves que se muestran (hoy nueve) y deja afuera el alias, el CBU y lo del cron. **Una clave nueva que la tienda tenga que ver hay que agregarla a esa vista**, y la prueba de humo 15m2 cuenta cuántas son.
  - Los valores iniciales están en la migración del esquema, porque producción también los necesita. Alias, CBU y WhatsApp arrancan vacíos: el repo es público.
  - `value` es jsonb `not null` y un valor sin configurar es el null de JSON. El panel guarda con `set_settings`, no con un upsert: PostgREST convertiría ese null en NULL de SQL y la columna lo rechaza.

### Exposición por la API

**RLS activado en todas las tablas**, y además nada se lee por la API salvo lo que se habilita a mano. Supabase da por defecto todos los permisos a `anon` y `authenticated` sobre cada tabla y función nueva; la migración de RLS los revoca también para lo que se cree después. **Toda tabla, vista o función nueva nace privada**: para exponerla hace falta un `grant` explícito y su política.

- **La tienda (`anon`)** lee categorías, productos publicados (sin `cost_cents`), sus imágenes, sus variantes (solo `id`, `product_id`, `color` y `size`), kits publicados con sus ítems, zonas de envío y reseñas aprobadas (sin `order_id`). Como el stock está oculto, `select *` sobre `product_variants` falla: pedir siempre las columnas.
- **El catálogo se lee siempre con un cliente sin sesión**, aunque la clienta esté logueada: con su sesión sería `authenticated` y no vería nada.
- La disponibilidad pública sale de las vistas `variant_availability` y `kit_availability`, que devuelven solo `is_available` e `is_last_units` (umbral `last_units_threshold`). Corren con los permisos de su dueño, porque `anon` no puede leer las columnas de stock, y por eso filtran adentro lo publicado. El revisor de Supabase las marca como "security definer view": es intencional.
- **El panel (`authenticated`)** lee y escribe con la sesión de cada administradora, no con la clave secreta. Tiene permisos completos sobre lo que administra, pero cada política exige `private.is_admin()`: estar en `admin_users`. Ya no se exige el `aal2` del JWT (§7). Una clienta con cuenta, aunque tenga segundo factor, no ve catálogo, pedidos ni configuración.
- `favorites`: cada persona logueada lee, agrega y borra solo los suyos.
- La clave secreta queda para lo que no tiene sesión: checkout, webhooks, cron y el alta de administradoras.
- Fotos: bucket público `product-images`, solo WebP y hasta 2 MB. Guarda las de producto (bajo `products/`) y las de categoría (bajo `categories/`). Solo las administradoras suben, reemplazan o borran.

### Funciones de la base

Ninguna es `security definer` salvo `private.is_admin()`, que lee `admin_users` sin pasar por su RLS (si no, la política se llamaría a sí misma) y vive fuera de la API. Las demás corren con los permisos de quien llama, así que RLS decide adentro: las que usa el panel se pueden llamar con la sesión de una administradora, y a cualquier otra persona logueada le fallan con `order_not_found` o `variant_not_found`.

| Función | Quién | Uso |
|---|---|---|
| `quote_cart(payload)` | servidor | Presupuesto del carrito y el checkout. Si un producto se despublicó, lo marca en vez de fallar |
| `create_order_with_reservation(payload)` | servidor | Crea el pedido y reserva el stock, todo o nada (§9.1) |
| `confirm_order_payment(order_id, payment_reference)` | servidor y panel | Pago aprobado o transferencia confirmada (§9.3 y §9.6). Confirmar dos veces no descuenta dos veces |
| `release_order_reservation(order_id, reason)` | servidor y panel | Pago rechazado o pedido cancelado (§9.4) |
| `release_expired_reservations()` | cron | La corre `release-expired-reservations` cada 5 minutos (§9.5) |
| `record_stock_movement(...)` y `restock_variant(...)` | panel | Movimientos manuales (§9.8). Reponer devuelve los avisos pendientes (§9.10) |
| `set_order_status(order_id, status)` | panel | Pagado → preparando → enviado o listo para retirar → entregado, con vuelta de un paso |
| `preview_price_change(...)` y `apply_price_change(...)` | panel | Aumento o descuento masivo (§10) con la misma fórmula (`adjusted_price`) en la vista previa y al aplicar |
| `admin_dashboard()` y la vista `low_stock_variants` | panel | Ventas de hoy y de la semana, pedidos por preparar y alertas |
| `set_settings(valores)` | panel | Guarda la configuración; solo acepta claves que ya existen |
| `calculate_order_totals(...)` | servidor | La única implementación del cálculo de §10, que usan las anteriores |

- Los errores usan `message` como código estable (`out_of_stock`, `invalid_coupon`, `invalid_shipping`, `item_unavailable`, `invalid_items`, `invalid_payload`, `insufficient_stock`, `invalid_movement`, `invalid_transition`, `invalid_price_change`, `invalid_setting`) y `details` con un JSON. La app traduce el código al texto de la tienda.
- Tope de 10 unidades por línea: una reserva por transferencia inmoviliza stock durante 24 horas.
- Datos de prueba en `supabase/seed.sql`. **Hay una sola base de Supabase: la de esta computadora y la del sitio publicado son la misma.** Así que el seed no es un entorno aparte: lo que inserta queda en la base real y se ve en la tienda. Los datos de prueba se borraron el 27 de septiembre de 2026; volver a correr `npx supabase db push --include-seed` los mete de nuevo (el seed usa `on conflict do nothing`, y las filas ya no están). No correrlo salvo que se quiera exactamente eso.
- Pruebas de humo en `supabase/tests/smoke.sql`, con `npm run db:test`. Crean sus propios datos dentro de una transacción que se deshace, así que no dependen del seed, y restauran la secuencia de pedidos. Si algo falla, la corrida se corta con un error que nombra la prueba; si no, termina en "todas las pruebas pasaron". No son pgTAP: `supabase test db` no aplica.

## 9. Reglas de stock

1. **Reservar al crear el pedido** dentro de una sola función de Postgres (transacción). Si alguna variante no alcanza, se rechaza todo el pedido y se informa qué talle se agotó.
2. Duración de la reserva: tarjeta 30 minutos; transferencia 24 horas.
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

La plata de las ventas cae en la cuenta de Ualá: por eso las tarjetas se cobran con **Ualá Bis** y no con Mercado Pago. El medio de pago en la base se llama `card`, no por la marca del proveedor.

### Tarjetas (Ualá Bis, API Cobros Online v2)

- Credenciales: app o web de Ualá → Ualá Bis → Cobros online → API. Hay un juego para test y otro para producción, y no son intercambiables. **Las que tenemos son de producción.** Comprobado el 1 de octubre de 2026 pidiendo token a los dos ambientes: `auth.stage.developers.ar.ua.la` devuelve 401 "Invalid username" y `auth.developers.ar.ua.la` devuelve 200. El juego de sandbox no aparece en el panel junto al de producción: hay que pedírselo a soporte de Ualá Bis.
- Autenticación: `POST {auth}/auth/token` con `username`, `client_id`, `client_secret_id` y `grant_type: client_credentials`. El token dura 24 horas y se guarda en memoria con unos minutos de margen.
- Crear el pago: `POST {checkout}/checkout` con el monto **en pesos con dos decimales, como texto** (la base guarda centavos: 2500 se manda como `"25.00"`), `external_reference = order.id`, `notification_url` al webhook y los dos `callback` a `/pedido/[numero]`. Devuelve el `uuid` de la orden y el `checkout_link` al que se manda a la clienta.
- Mínimo por pago: $25. Por debajo de eso solo queda transferencia. Ojo: un cobro de $25 se parece a una prueba de tarjeta robada y los bancos lo rechazan, así que para probar conviene un monto normal.
- Ualá Bis rechaza `notification_url` y `callback` que apunten a `localhost`: el webhook solo se puede probar desde una URL pública.
- El `uuid` se guarda en `orders.payment_checkout_id`; el pago confirmado queda en `orders.payment_reference`.
- Webhook `/api/webhooks/uala`:
  1. **El aviso no viene firmado**, así que no se le cree nada: solo dice qué orden mirar.
  2. Se anota el evento en `payment_events` (`uala:<uuid>:<estado>`); si ya estaba, se responde 200 sin hacer nada.
  3. Se consulta el estado real con `GET {checkout}/orders/:uuid` usando nuestro token.
  4. El pedido se busca por `external_reference`, y se comprueba que el monto cobrado sea el del pedido; si no coincide, no se confirma y queda `needs_review`.
  5. `APPROVED` o `PROCESSED` confirman el pago (§9.3); `REJECTED` o `REFUNDED` liberan la reserva (§9.4); `PENDING` espera el próximo aviso.
  6. Se responde 200. Ualá reintenta hasta 3 veces más ante cualquier otra respuesta, así que el 500 queda solo para "no pudimos consultar, probá de nuevo".
- Si no se puede abrir el pago al crear el pedido, la reserva se libera en el acto y se ofrece transferencia.
- `/pedido/[numero]` puede reabrir el pago: crea un link nuevo en vez de reusar el viejo (pueden vencer) y el pedido se reconoce igual por su referencia.
- Cuotas: Ualá Bis permite ofrecerlas absorbiendo el costo. Queda pendiente decidirlo (§17).

### Transferencia bancaria

- El pedido queda `pending_payment` con reserva de 24 horas.
- `/pedido/[numero]` muestra alias, CBU, monto exacto y un botón para enviar el comprobante por WhatsApp.
- La confirmación se hace manualmente desde el panel.

No se guardan datos de tarjetas en ningún lugar: el formulario de pago es de Ualá Bis.

## 12. Envíos

- Métodos: envío a domicilio por zona (costo fijo configurable), envío en el día en Paraná y Oro Verde (con horario de corte configurable) y retiro en punto de entrega en Paraná.
- Las zonas se cargan en `/admin/zonas`; el checkout las ofrece según el método elegido y, si la dirección alcanza para saber cuál le toca (por código postal o por provincia), la elige sola. La sugerencia se calcula al dibujar, no con un efecto, así elegir a mano siempre gana; si empatan dos zonas, no se elige ninguna.
- **El horario de corte se aplica, no solo se muestra:** pasada esa hora el envío en el día no aparece en el checkout, y `calculate_order_totals` lo rechaza con `same_day_closed` si igual llega. La hora es la de Argentina y la mira la base.
- El punto de retiro (`pickup_address` y `pickup_hours` en `settings`) se muestra en el checkout, en la página del pedido, en los emails y en `/envios-y-cambios`. Es una dirección real, así que vive en la base y no en el código (§2).
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

Cómo están hechos:
- Las plantillas viven en `src/emails/` y comparten `layout.tsx` (paleta, tipografía y pie) y `order-summary.tsx` (qué compró y cómo lo recibe). Todo con estilos en línea y sin fuentes web: Gmail y Outlook descartan las hojas de estilo y los `@font-face`.
- El envío es un `POST` a la API de Resend con `fetch`, sin dependencias (`src/lib/emails/send.ts`). Sin `RESEND_API_KEY` o sin `EMAIL_FROM` no se manda nada y queda anotado en la consola, así el entorno local funciona sin cuenta.
- **Un email nunca rompe lo que lo disparó.** Los errores se registran y la función sigue: un pago confirmado vale más que un aviso.
- Salen con `after()` de `next/server`, después de responder: la clienta no espera a Resend. Se ejecutan igual cuando la acción termina en `redirect()`.
- `sent_emails` evita los duplicados: la clave (`enviado:<order_id>`, `resena:<order_id>`) es única y el insert falla cuando ya se mandó. El aviso de stock bajo se manda una vez por variante y la marca se borra al reponerla.
- Los avisos internos van a `EMAIL_INTERNAL`; si no está cargada, no se mandan.
- El pedido de reseña depende del calendario, así que lo dispara el job `daily-emails` de pg_cron: la base llama con pg_net a `/api/cron/emails` con `CRON_SECRET` en una cabecera, y la app decide a quién le toca. La URL y el secreto viven en `settings` (`cron_site_url` y `cron_secret`), no en el código: el repo es público. Se pide a los 3 días de entregado y no se pide nada entregado hace más de 30.
- La reseña se deja desde `/pedido/[numero]`, que ya sabe quién mira (§7): no hace falta cuenta. Se puede reseñar cada producto del pedido una sola vez, y entra como `pending` hasta que se apruebe en el panel.
- El carrito abandonado sale del mismo job. El carrito vive en el navegador, así que el checkout guarda una copia en `abandoned_carts` **solo** cuando hay email válido y la casilla de novedades marcada; si la desmarca, la copia se borra (§15). Se guardan solo los ids: nombres y precios se leen frescos al mandar y al volver. Se escribe una vez, a las 4 horas del último cambio, nada de más de 7 días, y a los 30 días la copia se borra.
- La baja (`/baja/[id]`) se confirma con un botón, no con el link: los lectores de correo abren los links solos. El email queda en `marketing_optouts`, así volver a marcar la casilla sin querer no vuelve a suscribir. El mismo link sirve para el newsletter.
- El newsletter del inicio manda la bienvenida en el momento, no con el job: el cupón es la razón por la que dejó el email. El código no se genera por persona: se manda el que esté en `welcome_coupon_code`, que se carga en Configuración y se crea como cualquier cupón. Sin código, el email es una bienvenida sin descuento.

## 14. SEO, rendimiento y analítica

- Título y descripción por página. Open Graph con foto y precio para que los links se vean bien en WhatsApp e Instagram.
- `sitemap.xml`, `robots.txt` y URLs en español sin IDs.
- Datos estructurados `Product` (precio, disponibilidad, reseñas) en cada producto.
- Imágenes con `next/image`, formatos modernos, carga diferida y tamaños correctos; la foto del hero con prioridad.
- **El `sizes` tiene que decir cuánto mide el hueco de verdad.** Si se queda corto, el navegador baja una copia más chica y la estira: las tarjetas de categoría pedían 20rem para un hueco de 363px y se veían borrosas. Cuando el ancho sale de una grilla, calcularlo: `max-w-6xl` (1152) menos `px-4` y los `gap`, dividido por las columnas.
- **`images.qualities` en `next.config.ts` es obligatorio desde Next 16 y arranca en `[75]`.** Una `quality` que no esté en la lista se baja a la más cercana **sin avisar ni fallar el build**: el `quality={85}` de las tarjetas no hizo nada hasta que se agregó el 85.
- Objetivo: buenos Core Web Vitals en celular con 4G.
- Eventos de Meta Pixel y GA4: `ViewContent`, `AddToCart`, `InitiateCheckout` y `Purchase` (con `event_id` para evitar duplicados; `Purchase` solo cuando el pago está confirmado).

## 15. Accesibilidad y legales

- Texto alternativo en todas las fotos (automático: el nombre del producto, editable foto por foto), labels en todos los campos, navegación con teclado y áreas táctiles de al menos 44px de alto. Un link corto puede medir menos de ancho: lo que importa es que se pueda tocar.
- Cada página tiene un solo `h1` y los títulos no saltan niveles. En el checkout el `h1` es `sr-only`: la página se lee como pasos numerados y un título arriba solo ocuparía pantalla en el celular.
- Un link que repite a otro que está al lado (la miniatura del carrito) va con `aria-hidden` y fuera del tabulador: si no, se anuncia como un enlace sin nombre.
- Foco visible: anillo azul de 2px con separación (el aqua no tiene contraste suficiente sobre crema).
- Footer en todas las páginas: link a Defensa del Consumidor, botón de arrepentimiento, QR de Data Fiscal de ARCA, términos y privacidad.
- Los textos legales se redactan como borrador marcado **"PENDIENTE DE REVISIÓN"** y no se publican sin revisión profesional. Incluye la política de cambios de ropa interior por higiene.
- **Privacidad es la excepción**: el 7 de octubre de 2026 la dueña pidió sacarle el cartel de borrador y dejarla con dos apartados, "Qué datos pedimos" y "Para qué los usamos". Se quitaron con quién se comparten los datos, la medición, cuánto se guardan y los derechos del titular, que incluían los textos de los artículos 14 y 29 de la Ley 25.326. Es una decisión suya, tomada sabiendo que esos puntos son los que la ley pide en una política de privacidad. Términos y arrepentimiento conservan el cartel.
- Consentimiento explícito para newsletter y emails de carrito abandonado.

## 16. Plan de construcción

0. **Setup:** repo, Next.js, Tailwind con tokens, fuentes, Supabase, Netlify y `.env.example`.
1. **Base de datos:** migraciones, RLS, funciones de stock y datos de prueba (10 productos con variantes y 2 kits).
2. **Panel admin:** login, productos, stock, precios, pedidos y configuración.
3. **Tienda:** header, inicio, listados con filtros, producto, buscador, favoritos y carrito lateral.
4. **Checkout:** cálculo de totales, reservas, tarjeta con Ualá Bis, transferencia, webhook y job de vencimiento.
5. **Emails.**
6. **Envíos y retiro.**
7. **SEO, analítica, rendimiento y accesibilidad.**
8. **Legales y prueba completa:** compras de prueba con cada método, pagos rechazados, reservas vencidas y webhook duplicado.
   - Probado de punta a punta: compra por transferencia (pedido → reserva → confirmación en el panel → descuento de stock → preparando → listo para retirar → entregado), pago rechazado de verdad por el webhook, aviso repetido reconocido como duplicado, reserva vencida liberada por el cron, y pago tardío sin stock marcado para revisar (§9.6, pruebas de humo 10a y 10c).
   - Falta solo el tramo final de la tarjeta: que Ualá avise un pago aprobado y el pedido pase a `paid` descontando stock. **Lo anterior ya está probado en el sitio publicado** (1 de octubre de 2026, con `UALA_ENVIRONMENT=production`): la app se autentica contra Ualá, crea el cobro y manda a la clienta a la pantalla de pago con el monto correcto ($15.000 pedidos, "$15.000,00" en Ualá), el pedido queda `pending_payment` con el uuid de Ualá guardado y la reserva de 30 minutos. Se liberó la reserva y se borró todo al terminar.
9. **Lanzamiento:** en este orden.
   1. Destrabar Netlify (créditos) y publicar, que hoy es lo que frena todo.
   2. Cargar en Netlify las variables que faltan: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_INTERNAL`, `CRON_SECRET`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA4_ID`, y `UALA_ENVIRONMENT=production` con las credenciales de producción.
   3. En `settings`: `cron_site_url` y `cron_secret` (el mismo valor que la variable), alias, CBU, WhatsApp, punto de retiro, zonas de envío y cupón de bienvenida.
   4. Dominio propio y `NEXT_PUBLIC_SITE_URL` apuntando ahí.
   5. Revisar los textos legales y completar razón social, CUIT y QR de Data Fiscal.
   6. Poner `INDEXABLE = true` en `src/lib/site.ts`: eso saca el `noindex` del layout y habilita el robots.txt y el sitemap de una sola vez.
   7. Compra de prueba con tarjeta de punta a punta y devolución.
   8. Rutina de backup y monitoreo (ver abajo).

Publicar:
- **Netlify no construye en cada push.** Cada build se come varios de los 300 créditos que trae el plan gratis por mes, y el ciclo de esta cuenta va del 16 al 16. `netlify.toml` llama a `scripts/netlify-ignore.mjs`, que saltea el build salvo que el mensaje del commit diga `[deploy]` o que lo haya pedido un hook. Ojo con el código de salida: en Netlify, 0 significa saltear y cualquier otro, construir.
- Para publicar: `npm run deploy`, que dispara el hook con la dirección guardada en `NETLIFY_BUILD_HOOK` (`.env.local`; quien la tenga puede publicar, así que no va al repo). Publica lo último que haya en `main`.

Backups y errores:
- `npm run db:backup` baja todas las tablas a `backups/<fecha>/datos.json`. La lista de tablas sale de la base, así que una tabla nueva entra sola. Se corre a mano y conviene guardar el archivo fuera de la computadora; el esquema no hace falta guardarlo porque está en `supabase/migrations`. `supabase db dump` no sirve acá: necesita Docker.
- Los errores de la tienda y del panel muestran una página con la cara de la marca (`error.tsx`) y se escriben en la consola, que en Netlify son los logs de las funciones. Un servicio de monitoreo de verdad (tipo Sentry) queda pendiente: necesita cuenta.

## 17. Pendientes

- [ ] Logo de MAREA en SVG. **El PNG ya está** (`public/brand/logo.png`, y `logo-crema.png` en una sola tinta) y se usa en el header, el footer, el menú lateral, el ingreso al panel, la hoja de pedidos y el favicon. Falta el SVG, para que no pixele al agrandarlo. La imagen que se ve al compartir un link (`src/app/(store)/opengraph-image.tsx`) y los emails siguen con el nombre escrito.
- [ ] Cambiar el destello de 4 puntas por una onda cuando esté el logo: el destello viene del logo anterior y hoy se usa como motivo y como placeholder de las fotos que faltan (§5).
- [ ] Catálogo: subcategorías de ropa interior, productos, talles, colores y fotos.
- [ ] Tabla de talles con medidas reales.
- [ ] Monto de envío gratis y % de descuento por transferencia.
- [ ] Credenciales de sandbox de Ualá Bis, pedidas a soporte. Mientras tanto se cobra en producción (§2) y la prueba de tarjeta es una compra real que se devuelve.
- [ ] Una compra con tarjeta pagada de verdad, para probar el último tramo: el aviso de Ualá, el paso a `paid` y el descuento de stock. Crear el cobro y llegar a la pantalla de pago ya está probado (§16, fase 8); lo que falta necesita una tarjeta real. Hacerla por un monto normal: el intento de $25 lo rechazó el banco porque se parece a una prueba de tarjeta robada. Se devuelve desde Ualá después.
- [ ] Cuotas sin interés: sí o no, y cuántas.
- [ ] ¿Cupón y descuento por transferencia se acumulan?
- [ ] Cargar las zonas y costos de envío reales en `/admin/zonas` (las que hay son de prueba) y el punto de retiro con sus horarios en Configuración.
- [ ] Alias, CBU y número de WhatsApp.
- [ ] Usuario de Instagram y registro de marca en el INPI. (El dominio ya está: `mareapna.com`, con el DNS en Netlify. En DonWeb quedaron solo los nameservers.)
- [ ] Cuenta de Resend con un dominio verificado, y cargar `RESEND_API_KEY`, `EMAIL_FROM` y `EMAIL_INTERNAL`: hasta entonces no sale ningún email y cada intento queda anotado en la consola.
- [x] Trabajo diario conectado: `CRON_SECRET` generado al azar y cargado en Netlify, y el mismo valor más `cron_site_url` en `settings`. Verificado el 1 de octubre de 2026 en los dos sentidos: la ruta rechaza con 401 sin la clave y con una clave equivocada, y responde 200 con la correcta; y la base la llamó sola con pg_net y recibió `{"ok":true}`. El job `daily-emails` corre a las 13 UTC y su última corrida figura como `succeeded`. **Todavía no manda nada**: sin la cuenta de Resend, cada email queda anotado en la consola.
- [ ] Textos legales revisados.
- [ ] Activar en Supabase Auth la protección de contraseñas filtradas (HaveIBeenPwned), que hoy está apagada.
- [ ] Fotos de clientas reales para el inicio, y la foto del hero (hoy hay un destello en su lugar).
- [x] Meta Pixel: `1587022683122205`, cargado en Netlify y verificado en vivo el 1 de octubre de 2026 (la librería carga, el píxel queda registrado y cuenta también las navegaciones internas, que el fragmento suelto de Meta no hace).
- [ ] Cuenta de Google Analytics y cargar `NEXT_PUBLIC_GA4_ID`: hasta entonces GA4 no mide nada. Ojo: las dos son `NEXT_PUBLIC_`, así que se incrustan en el build y hay que publicar de nuevo después de cargarlas.
- [ ] Servicio de monitoreo de errores (tipo Sentry). Hoy los errores solo quedan en los logs de Netlify.
- [ ] Crear el cupón de bienvenida en el panel y cargar su código en Configuración: hasta entonces el newsletter manda un email sin descuento.
- [ ] ¿Mover el consentimiento de novedades al lado del email en el checkout? Hoy está al final (paso 6), así que el aviso de carrito abandonado casi nunca va a dispararse: quien se va antes de terminar rara vez llegó a marcarlo.
- [ ] CUIT y QR de Data Fiscal de ARCA para el pie.
- [ ] Medidas reales para la guía de talles (hoy solo dice cómo medirse y qué talles hay).
