-- Panel de administración (CLAUDE.md §7, fase 2).
--
-- El panel lee y escribe con la sesión de cada administradora (clave publicable
-- más su JWT), no con la clave secreta. Las políticas deciden con
-- private.is_admin(), que exige estar en admin_users y haber pasado el segundo
-- factor (aal2). Si una página o una acción del servidor se olvidara de
-- verificar, la base igual dice que no.
--
-- authenticated pasa a ser el rol del panel: recibe permisos completos sobre lo
-- que administra, pero solo ve filas cuando is_admin() es verdadero. Por eso el
-- catálogo público queda solo para anon: una clienta con cuenta no puede leer
-- costos ni stock por la API, y la tienda lee el catálogo con un cliente sin
-- sesión.

-- 1. Administradoras -------------------------------------------------------------

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- La única función security definer del proyecto, a propósito: lee admin_users
-- sin pasar por su RLS, porque las políticas de admin_users la usan y si no se
-- llamaría a sí misma. Vive en el esquema private, fuera de la API, y solo
-- responde si quien llama es administradora con segundo factor.
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

grant select on public.admin_users to authenticated;

-- Con la contraseña sola (aal1) una administradora ve su propia fila: así el
-- servidor sabe que tiene que mandarla al segundo factor.
create policy "Users read their own admin row"
  on public.admin_users for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Admins read admins"
  on public.admin_users for select to authenticated
  using ((select private.is_admin()));

-- 2. Catálogo: lectura pública solo para anon, gestión para administradoras ------

alter policy "Public reads categories" on public.categories to anon;
alter policy "Public reads published products" on public.products to anon;
alter policy "Public reads images of published products" on public.product_images to anon;
alter policy "Public reads variants of published products" on public.product_variants to anon;
alter policy "Public reads published kits" on public.kits to anon;
alter policy "Public reads items of published kits" on public.kit_items to anon;
alter policy "Public reads shipping zones" on public.shipping_zones to anon;
alter policy "Public reads approved reviews" on public.reviews to anon;

grant select, insert, update, delete on
  public.categories,
  public.products,
  public.product_images,
  public.product_variants,
  public.kits,
  public.kit_items,
  public.shipping_zones,
  public.reviews
to authenticated;

create policy "Admins manage categories" on public.categories for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage products" on public.products for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage product images" on public.product_images for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage variants" on public.product_variants for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage kits" on public.kits for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage kit items" on public.kit_items for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage shipping zones" on public.shipping_zones for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage reviews" on public.reviews for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- 3. Datos privados: solo administradoras, y solo lo que el panel necesita -------

grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select, insert on public.stock_movements to authenticated;
grant select, insert, update, delete on public.coupons to authenticated;
grant select, insert, update on public.settings to authenticated;
grant select, insert on public.price_changes to authenticated;
grant select, update, delete on public.back_in_stock_requests to authenticated;
grant select on public.payment_events to authenticated;

create policy "Admins manage orders" on public.orders for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins read order items" on public.order_items for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage stock movements" on public.stock_movements for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage coupons" on public.coupons for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage settings" on public.settings for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage price changes" on public.price_changes for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage back in stock requests" on public.back_in_stock_requests for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins read payment events" on public.payment_events for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- 4. Fecha de pago -------------------------------------------------------------
-- Las ventas del día se cuentan por cuándo se cobró, no por cuándo se creó el
-- pedido: una transferencia puede confirmarse al día siguiente.

alter table public.orders add column paid_at timestamptz;

create function public.set_order_paid_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end;
$$;

create trigger set_paid_at before update of status on public.orders
  for each row execute function public.set_order_paid_at();

create index orders_paid_at_idx on public.orders (paid_at desc) where paid_at is not null;

-- 5. Historial de precios --------------------------------------------------------
-- Todo cambio de precio queda en price_changes, sea una edición suelta o un
-- cambio masivo. El motivo llega por app.price_change_reason.

create function public.log_price_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.price_changes (product_id, old_price_cents, new_price_cents, reason, created_by)
  values (
    new.id,
    old.price_cents,
    new.price_cents,
    coalesce(nullif(current_setting('app.price_change_reason', true), ''), 'Edición manual'),
    auth.uid()
  );
  return new;
end;
$$;

create trigger log_price_change after update of price_cents on public.products
  for each row when (old.price_cents is distinct from new.price_cents)
  execute function public.log_price_change();

-- 6. Estados del pedido ----------------------------------------------------------
-- Pagado -> preparando -> enviado o listo para retirar -> entregado, con la
-- posibilidad de volver un paso por si hubo un error. Pendiente y cancelado no
-- se tocan acá: se resuelven con confirm_order_payment y
-- release_order_reservation.

create function public.set_order_status(p_order_id uuid, p_status public.order_status)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_allowed public.order_status[];
begin
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception using message = 'order_not_found', detail = jsonb_build_object('order_id', p_order_id)::text;
  end if;

  v_allowed := case v_order.status
    when 'paid' then array['preparing']::public.order_status[]
    when 'preparing' then
      case
        when v_order.shipping_method = 'pickup' then array['ready_for_pickup', 'paid']::public.order_status[]
        else array['shipped', 'paid']::public.order_status[]
      end
    when 'shipped' then array['delivered', 'preparing']::public.order_status[]
    when 'ready_for_pickup' then array['delivered', 'preparing']::public.order_status[]
    when 'delivered' then
      case
        when v_order.shipping_method = 'pickup' then array['ready_for_pickup']::public.order_status[]
        else array['shipped']::public.order_status[]
      end
    else array[]::public.order_status[]
  end;

  if not (p_status = any (v_allowed)) then
    raise exception using message = 'invalid_transition',
      detail = jsonb_build_object('from', v_order.status, 'to', p_status)::text;
  end if;

  update public.orders o set status = p_status where o.id = p_order_id returning * into v_order;

  return jsonb_build_object('order_id', v_order.id, 'number', v_order.number, 'status', v_order.status);
end;
$$;

-- 7. Precios masivos (§10) ---------------------------------------------------------
-- Una sola fórmula para la vista previa y para aplicar: lo que se ve es lo que
-- queda. Redondeo hacia arriba al múltiplo elegido; 10000 centavos es la
-- centena de pesos, el default.

create function public.adjusted_price(p_price_cents integer, p_percent numeric, p_round_to_cents integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select greatest(
    p_round_to_cents,
    (ceil(p_price_cents * (1 + p_percent / 100) / p_round_to_cents) * p_round_to_cents)::integer
  )
$$;

create function public.check_price_change(p_product_ids uuid[], p_percent numeric, p_round_to_cents integer)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_product_ids is null or cardinality(p_product_ids) = 0 then
    raise exception using message = 'invalid_price_change', detail = jsonb_build_object('reason', 'no_products')::text;
  end if;
  if p_percent is null or p_percent = 0 or p_percent < -90 or p_percent > 300 then
    raise exception using message = 'invalid_price_change', detail = jsonb_build_object('reason', 'percent')::text;
  end if;
  if p_round_to_cents is null or p_round_to_cents not in (100, 1000, 10000, 100000) then
    raise exception using message = 'invalid_price_change', detail = jsonb_build_object('reason', 'rounding')::text;
  end if;
end;
$$;

create function public.preview_price_change(
  p_product_ids uuid[],
  p_percent numeric,
  p_round_to_cents integer default 10000,
  p_include_compare_at boolean default false
)
returns table (
  product_id uuid,
  name text,
  cost_cents integer,
  old_price_cents integer,
  new_price_cents integer,
  old_compare_at_price_cents integer,
  new_compare_at_price_cents integer
)
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.check_price_change(p_product_ids, p_percent, p_round_to_cents);

  return query
  select
    p.id,
    p.name,
    p.cost_cents,
    p.price_cents,
    public.adjusted_price(p.price_cents, p_percent, p_round_to_cents),
    p.compare_at_price_cents,
    case
      when p_include_compare_at and p.compare_at_price_cents is not null
        then public.adjusted_price(p.compare_at_price_cents, p_percent, p_round_to_cents)
      else p.compare_at_price_cents
    end
  from public.products p
  where p.id = any (p_product_ids)
  order by p.name;
end;
$$;

create function public.apply_price_change(
  p_product_ids uuid[],
  p_percent numeric,
  p_round_to_cents integer,
  p_include_compare_at boolean,
  p_reason text
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_updated integer;
begin
  perform public.check_price_change(p_product_ids, p_percent, p_round_to_cents);

  perform set_config(
    'app.price_change_reason',
    left(coalesce(nullif(trim(p_reason), ''), 'Cambio masivo de ' || p_percent || '%'), 200),
    true
  );

  update public.products p
  set price_cents = public.adjusted_price(p.price_cents, p_percent, p_round_to_cents),
      compare_at_price_cents = case
        when p_include_compare_at and p.compare_at_price_cents is not null
          then public.adjusted_price(p.compare_at_price_cents, p_percent, p_round_to_cents)
        else p.compare_at_price_cents
      end
  where p.id = any (p_product_ids);

  get diagnostics v_updated = row_count;

  perform set_config('app.price_change_reason', '', true);

  return v_updated;
end;
$$;

-- 8. Inicio del panel --------------------------------------------------------------

-- Variantes de productos publicados con disponible <= su umbral (§9.9). Corre
-- con los permisos de quien consulta, así que solo devuelve filas a las
-- administradoras.
create view public.low_stock_variants
with (security_invoker = true)
as
select
  v.id as variant_id,
  v.product_id,
  p.name as product_name,
  v.color,
  v.size,
  v.sku,
  v.stock_on_hand - v.stock_reserved as available,
  coalesce(
    v.low_stock_threshold,
    (select (s.value #>> '{}')::integer from public.settings s where s.key = 'low_stock_default'),
    3
  ) as threshold
from public.product_variants v
join public.products p on p.id = v.product_id
where p.is_published
  and v.stock_on_hand - v.stock_reserved <= coalesce(
    v.low_stock_threshold,
    (select (s.value #>> '{}')::integer from public.settings s where s.key = 'low_stock_default'),
    3
  );

grant select on public.low_stock_variants to authenticated;

-- Ventas de hoy y de la semana (lunes a domingo, hora de Argentina), pedidos
-- por preparar y alertas.
create function public.admin_dashboard()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select
      date_trunc('day', now() at time zone 'America/Argentina/Buenos_Aires')
        at time zone 'America/Argentina/Buenos_Aires' as day_start,
      date_trunc('week', now() at time zone 'America/Argentina/Buenos_Aires')
        at time zone 'America/Argentina/Buenos_Aires' as week_start
  ),
  sold as (
    select o.total_cents, o.paid_at
    from public.orders o
    where o.paid_at is not null and o.status <> 'cancelled'
  )
  select jsonb_build_object(
    'sales_today_cents', (select coalesce(sum(s.total_cents), 0) from sold s, bounds b where s.paid_at >= b.day_start),
    'orders_today', (select count(*) from sold s, bounds b where s.paid_at >= b.day_start),
    'sales_week_cents', (select coalesce(sum(s.total_cents), 0) from sold s, bounds b where s.paid_at >= b.week_start),
    'orders_week', (select count(*) from sold s, bounds b where s.paid_at >= b.week_start),
    'to_prepare', (select count(*) from public.orders o where o.status = 'paid'),
    'pending_transfers', (
      select count(*) from public.orders o
      where o.status = 'pending_payment' and o.payment_method = 'transfer'
    ),
    'needs_review', (select count(*) from public.orders o where o.needs_review),
    'low_stock', (select count(*) from public.low_stock_variants)
  )
$$;

-- 9. Permisos de funciones ---------------------------------------------------------
-- Las que usa el panel se ejecutan con la sesión de la administradora, así que
-- authenticated puede llamarlas: RLS adentro decide qué filas ve y toca. Una
-- persona logueada que no es administradora no ve ningún pedido ni variante,
-- y la función falla con order_not_found o variant_not_found.

revoke all on function public.set_order_paid_at() from public, anon, authenticated;
revoke all on function public.log_price_change() from public, anon, authenticated;

revoke all on function public.set_order_status(uuid, public.order_status) from public, anon;
revoke all on function public.adjusted_price(integer, numeric, integer) from public, anon;
revoke all on function public.check_price_change(uuid[], numeric, integer) from public, anon;
revoke all on function public.preview_price_change(uuid[], numeric, integer, boolean) from public, anon;
revoke all on function public.apply_price_change(uuid[], numeric, integer, boolean, text) from public, anon;
revoke all on function public.admin_dashboard() from public, anon;

grant execute on function public.set_order_status(uuid, public.order_status) to authenticated, service_role;
grant execute on function public.adjusted_price(integer, numeric, integer) to authenticated, service_role;
grant execute on function public.check_price_change(uuid[], numeric, integer) to authenticated, service_role;
grant execute on function public.preview_price_change(uuid[], numeric, integer, boolean) to authenticated, service_role;
grant execute on function public.apply_price_change(uuid[], numeric, integer, boolean, text) to authenticated, service_role;
grant execute on function public.admin_dashboard() to authenticated, service_role;

grant execute on function public.confirm_order_payment(uuid, text) to authenticated;
grant execute on function public.release_order_reservation(uuid, text) to authenticated;
grant execute on function public.record_stock_movement(uuid, public.stock_movement_type, integer, text, uuid) to authenticated;
grant execute on function public.restock_variant(uuid, integer, text, uuid) to authenticated;
grant execute on function public.coupon_error(public.coupons, integer, timestamptz) to authenticated;
grant execute on function public.setting_text(text) to authenticated;
grant execute on function public.kit_available_quantity(uuid) to authenticated;

-- 10. Fotos de productos -----------------------------------------------------------
-- Bucket público (las fotos se ven en la tienda), solo WebP y hasta 2 MB por
-- archivo: el servidor convierte y achica antes de subir. Solo las
-- administradoras suben, reemplazan o borran.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins read product image objects" on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()));
create policy "Admins upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select private.is_admin()));
create policy "Admins update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()))
  with check (bucket_id = 'product-images' and (select private.is_admin()));
create policy "Admins delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()));
