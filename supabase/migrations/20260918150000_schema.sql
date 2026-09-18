-- Esquema de la tienda (CLAUDE.md §8).
-- Montos siempre en enteros de centavos. Fechas en timestamptz (se guardan en UTC).

-- Tipos ---------------------------------------------------------------------

create type public.order_status as enum (
  'pending_payment',
  'paid',
  'preparing',
  'shipped',
  'ready_for_pickup',
  'delivered',
  'cancelled'
);

create type public.payment_method as enum ('mercadopago', 'transfer');

create type public.shipping_method as enum ('delivery', 'same_day', 'pickup');

create type public.stock_movement_type as enum (
  'restock',
  'web_sale',
  'manual_sale',
  'adjustment',
  'reservation',
  'release',
  'return'
);

create type public.coupon_type as enum ('percent', 'fixed');

create type public.review_status as enum ('pending', 'approved', 'rejected');

-- updated_at ----------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Catálogo ------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  materials_care text,
  measurements text,
  model_info text,
  -- Puede faltar: el margen se calcula solo cuando hay costo.
  cost_cents integer check (cost_cents >= 0),
  price_cents integer not null check (price_cents >= 0),
  -- Sin restricción contra price_cents a propósito: un aumento masivo no
  -- tiene que fallar porque el precio pase al tachado. El tachado solo se
  -- muestra si compare_at_price_cents > price_cents (§10).
  compare_at_price_cents integer check (compare_at_price_cents >= 0),
  is_published boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null check (length(trim(path)) > 0),
  -- Texto alternativo obligatorio (§15).
  alt text not null check (length(trim(alt)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  -- Un producto vendido no se puede borrar: order_items bloquea la cascada.
  -- Se despublica.
  product_id uuid not null references public.products (id) on delete cascade,
  color text not null check (length(trim(color)) > 0),
  size text not null check (length(trim(size)) > 0),
  sku text unique,
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  stock_reserved integer not null default 0 check (stock_reserved >= 0),
  -- Sin valor, usa low_stock_default de settings.
  low_stock_threshold integer check (low_stock_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, color, size),
  -- Disponible = stock_on_hand - stock_reserved, nunca negativo. Es además la
  -- red de seguridad de la regla §9.6: un pago que llega tarde no puede
  -- consumir stock que ya no está.
  constraint product_variants_reserved_within_on_hand check (stock_reserved <= stock_on_hand)
);

create table public.kits (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  price_cents integer not null check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Los kits no tienen stock propio: su disponible sale de los componentes (§9.7).
create table public.kit_items (
  kit_id uuid not null references public.kits (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  primary key (kit_id, variant_id)
);

-- Cupones y envíos ----------------------------------------------------------

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  type public.coupon_type not null,
  -- percent: porcentaje de 1 a 100. fixed: monto en centavos.
  value integer not null check (value > 0),
  min_subtotal_cents integer not null default 0 check (min_subtotal_cents >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer check (max_uses > 0),
  -- Puede superar max_uses en el caso raro de dos pedidos que pagan casi a la
  -- vez: la confirmación lo marca para revisar en vez de rechazar un pago.
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_percent_range check (type <> 'percent' or value <= 100),
  constraint coupons_window check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  provinces text[] not null default '{}',
  postal_codes text[] not null default '{}',
  price_cents integer not null check (price_cents >= 0),
  eta_text text not null,
  same_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pedidos -------------------------------------------------------------------

-- El primer pedido es GU-001000.
create sequence public.order_number_seq start with 1000;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique
    default ('GU-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  status public.order_status not null default 'pending_payment',
  payment_method public.payment_method not null,
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text not null check (length(trim(phone)) >= 6),
  shipping_method public.shipping_method not null,
  shipping_zone_id uuid references public.shipping_zones (id) on delete restrict,
  shipping_address jsonb,
  is_gift boolean not null default false,
  gift_message text check (gift_message is null or length(gift_message) <= 300),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  coupon_discount_cents integer not null default 0 check (coupon_discount_cents >= 0),
  transfer_discount_cents integer not null default 0 check (transfer_discount_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  -- Solo se guarda si el cupón se aplicó de verdad.
  coupon_id uuid references public.coupons (id) on delete restrict,
  reserved_until timestamptz,
  mp_preference_id text,
  mp_payment_id text unique,
  needs_review boolean not null default false,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_discount_breakdown
    check (discount_cents = coupon_discount_cents + transfer_discount_cents),
  constraint orders_discount_within_subtotal check (discount_cents <= subtotal_cents),
  constraint orders_total_matches
    check (total_cents = subtotal_cents - discount_cents + shipping_cents)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  parent_item_id uuid references public.order_items (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete restrict,
  kit_id uuid references public.kits (id) on delete restrict,
  name_snapshot text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  -- Una línea es una variante o un kit. Los componentes del kit cuelgan de su
  -- línea (parent_item_id) con su variante y precio 0: así el pedido guarda la
  -- composición con la que se vendió, aunque el kit cambie después.
  constraint order_items_kind check (
    (parent_item_id is null and ((variant_id is null) <> (kit_id is null)))
    or (
      parent_item_id is not null
      and variant_id is not null
      and kit_id is null
      and unit_price_cents = 0
    )
  )
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  type public.stock_movement_type not null,
  -- Las unidades van siempre en positivo y el tipo da la dirección. Solo el
  -- ajuste lleva su propio signo.
  quantity integer not null,
  order_id uuid references public.orders (id) on delete set null,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_movements_quantity_sign check (
    (type = 'adjustment' and quantity <> 0) or (type <> 'adjustment' and quantity > 0)
  ),
  -- Los movimientos manuales siempre llevan usuario, y ventas y ajustes,
  -- además, nota (§9.8).
  constraint stock_movements_manual_user check (
    type not in ('restock', 'manual_sale', 'adjustment', 'return') or created_by is not null
  ),
  constraint stock_movements_manual_note check (
    type not in ('manual_sale', 'adjustment') or length(trim(coalesce(note, ''))) > 0
  )
);

-- Idempotencia del webhook de Mercado Pago (§11).
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercadopago',
  provider_event_id text not null unique,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.price_changes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  old_price_cents integer not null check (old_price_cents >= 0),
  new_price_cents integer not null check (new_price_cents >= 0),
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.back_in_stock_requests (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now(),
  notified_at timestamptz
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  text text not null check (length(trim(text)) > 0),
  name text not null check (length(trim(name)) > 0),
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- Configuración clave/valor. Un valor sin definir es el JSON null.
create table public.settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Valores iniciales. Van en la migración, no en los datos de prueba, porque
-- producción también los necesita. Son provisorios (§17) y se editan desde el
-- panel; on conflict do nothing nunca pisa lo que ya se cambió.
-- El repo es público: alias, CBU y WhatsApp quedan vacíos acá.
insert into public.settings (key, value) values
  ('transfer_discount_percent', '10'),
  ('free_shipping_threshold_cents', '5000000'),
  ('discounts_stack', 'false'),
  ('low_stock_default', '3'),
  ('last_units_threshold', '2'),
  ('same_day_cutoff_time', '"15:00"'),
  ('announcement_messages', '["Envío gratis desde $50.000", "10% off pagando con transferencia", "Envío en el día en Paraná y Oro Verde"]'),
  ('bank_alias', 'null'),
  ('bank_cbu', 'null'),
  ('whatsapp_number', 'null')
on conflict (key) do nothing;

-- Triggers de updated_at -----------------------------------------------------

create trigger set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.kits
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.shipping_zones
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- Índices -------------------------------------------------------------------
-- Uno por cada clave foránea que no quede cubierta por otra clave, más los de
-- las consultas previstas del panel y la tienda.

create index categories_parent_id_idx on public.categories (parent_id);
create index products_category_id_idx on public.products (category_id);
create index products_published_idx on public.products (created_at desc) where is_published;
create index product_images_product_id_idx on public.product_images (product_id, sort_order);
create index kit_items_variant_id_idx on public.kit_items (variant_id);
create index orders_status_created_at_idx on public.orders (status, created_at desc);
create index orders_pending_reserved_until_idx on public.orders (reserved_until)
  where status = 'pending_payment';
create index orders_email_idx on public.orders (lower(email));
create index orders_coupon_id_idx on public.orders (coupon_id);
create index orders_shipping_zone_id_idx on public.orders (shipping_zone_id);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_parent_item_id_idx on public.order_items (parent_item_id);
create index order_items_variant_id_idx on public.order_items (variant_id);
create index order_items_kit_id_idx on public.order_items (kit_id);
create index stock_movements_variant_id_created_at_idx
  on public.stock_movements (variant_id, created_at desc);
create index stock_movements_order_id_idx on public.stock_movements (order_id);
create index stock_movements_created_by_idx on public.stock_movements (created_by);
create index price_changes_product_id_idx on public.price_changes (product_id, created_at desc);
create index price_changes_created_by_idx on public.price_changes (created_by);
create index back_in_stock_requests_variant_id_idx on public.back_in_stock_requests (variant_id);
-- Un solo aviso pendiente por variante y email.
create unique index back_in_stock_requests_pending_unique
  on public.back_in_stock_requests (variant_id, lower(email))
  where notified_at is null;
create index reviews_product_id_status_idx on public.reviews (product_id, status);
create index reviews_order_id_idx on public.reviews (order_id);
create index favorites_product_id_idx on public.favorites (product_id);
