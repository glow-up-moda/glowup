-- Seguridad a nivel de fila y exposición por la API (CLAUDE.md §8).
--
-- Modelo: por la API no se lee nada que este archivo no habilite de forma
-- explícita. anon (la clave publicable) y authenticated reciben permisos solo
-- donde la tienda los necesita, y RLS recorta las filas. El servidor usa la
-- clave secreta (service_role), que saltea RLS, para todo lo demás.
--
-- Supabase otorga por defecto todos los permisos sobre cada tabla nueva de
-- public a anon y authenticated, y EXECUTE sobre cada función. Por eso primero
-- se revoca todo y después se otorga solo lo necesario.

-- 1. Lo que se cree de acá en adelante también nace privado.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

-- 2. Lo que ya existe arranca privado.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

-- 3. RLS en todas las tablas. Sin política, nadie ve ninguna fila.
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.kits enable row level security;
alter table public.kit_items enable row level security;
alter table public.coupons enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.payment_events enable row level security;
alter table public.price_changes enable row level security;
alter table public.back_in_stock_requests enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.settings enable row level security;

-- 4. Lectura pública del catálogo ---------------------------------------------

grant select on public.categories to anon, authenticated;
create policy "Public reads categories"
  on public.categories for select to anon, authenticated
  using (true);

-- Todas las columnas menos cost_cents: el costo no sale del servidor.
grant select (
  id, category_id, name, slug, description, materials_care, measurements, model_info,
  price_cents, compare_at_price_cents, is_published, seo_title, seo_description,
  created_at, updated_at
) on public.products to anon, authenticated;
create policy "Public reads published products"
  on public.products for select to anon, authenticated
  using (is_published);

grant select on public.product_images to anon, authenticated;
create policy "Public reads images of published products"
  on public.product_images for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.is_published
    )
  );

-- Solo color y talle. El stock exacto se consulta por variant_availability,
-- que devuelve "hay" o "quedan pocas", nunca el número.
grant select (id, product_id, color, size) on public.product_variants to anon, authenticated;
create policy "Public reads variants of published products"
  on public.product_variants for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.is_published
    )
  );

grant select on public.kits to anon, authenticated;
create policy "Public reads published kits"
  on public.kits for select to anon, authenticated
  using (is_published);

grant select on public.kit_items to anon, authenticated;
create policy "Public reads items of published kits"
  on public.kit_items for select to anon, authenticated
  using (
    exists (
      select 1 from public.kits k
      where k.id = kit_items.kit_id and k.is_published
    )
  );

grant select on public.shipping_zones to anon, authenticated;
create policy "Public reads shipping zones"
  on public.shipping_zones for select to anon, authenticated
  using (true);

-- Sin order_id: la reseña no expone a qué pedido pertenece.
grant select (id, product_id, rating, text, name, created_at) on public.reviews to anon, authenticated;
create policy "Public reads approved reviews"
  on public.reviews for select to anon, authenticated
  using (status = 'approved');

-- 5. Favoritos: cada persona logueada ve y edita solo los suyos ---------------

grant select, insert, delete on public.favorites to authenticated;
create policy "Users read own favorites"
  on public.favorites for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users add own favorites"
  on public.favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users remove own favorites"
  on public.favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Pedidos, ítems, movimientos, cupones, cambios de precio, eventos de pago,
-- avisos de reposición y settings (ahí van el alias y el CBU) no tienen
-- permisos ni políticas públicas: se leen y escriben solo desde el servidor.

-- 6. Disponibilidad pública ---------------------------------------------------
--
-- Estas dos vistas corren a propósito con los permisos de su dueño
-- (security_invoker = false). anon no puede leer stock_on_hand ni
-- stock_reserved (ver los grants por columna de arriba), así que una vista con
-- security_invoker = on fallaría para la tienda. Como el dueño no está sujeto
-- a RLS, cada vista filtra adentro lo publicado, y solo devuelve booleanos,
-- nunca las cantidades. El revisor de seguridad de Supabase las marca como
-- "security definer view": es intencional.

create view public.variant_availability
with (security_invoker = false)
as
select
  v.id as variant_id,
  v.product_id,
  (v.stock_on_hand - v.stock_reserved) > 0 as is_available,
  (v.stock_on_hand - v.stock_reserved) between 1 and coalesce(
    (select (s.value #>> '{}')::integer from public.settings s where s.key = 'last_units_threshold'),
    2
  ) as is_last_units
from public.product_variants v
join public.products p on p.id = v.product_id
where p.is_published;

comment on view public.variant_availability is
  'Disponibilidad pública por variante, solo de productos publicados. Corre con los permisos del dueño porque anon no puede leer las columnas de stock; expone booleanos, nunca cantidades.';

-- Un kit está disponible si alcanzan todos sus componentes (§9.7). Un
-- componente de un producto despublicado cuenta como agotado.
create view public.kit_availability
with (security_invoker = false)
as
with kit_stock as (
  select
    ki.kit_id,
    min(
      case
        when p.is_published then floor((v.stock_on_hand - v.stock_reserved)::numeric / ki.quantity)
        else 0
      end
    )::integer as available
  from public.kit_items ki
  join public.product_variants v on v.id = ki.variant_id
  join public.products p on p.id = v.product_id
  group by ki.kit_id
)
select
  k.id as kit_id,
  coalesce(ks.available, 0) > 0 as is_available,
  coalesce(ks.available, 0) between 1 and coalesce(
    (select (s.value #>> '{}')::integer from public.settings s where s.key = 'last_units_threshold'),
    2
  ) as is_last_units
from public.kits k
left join kit_stock ks on ks.kit_id = k.id
where k.is_published;

comment on view public.kit_availability is
  'Disponibilidad pública por kit, solo de kits publicados. Corre con los permisos del dueño por la misma razón que variant_availability; expone booleanos, nunca cantidades.';

grant select on public.variant_availability to anon, authenticated;
grant select on public.kit_availability to anon, authenticated;
