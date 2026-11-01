-- Kits dinámicos: el cliente elige una variante disponible por cada categoría.
-- Los kits fijos y sus componentes históricos siguen usando kit_items.

alter table public.kits
  add column is_dynamic boolean not null default false,
  add column discount_percent integer not null default 10
    check (discount_percent between 0 and 90);

create table public.kit_components (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.kits (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  quantity integer not null default 1 check (quantity = 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (kit_id, category_id)
);

create index kit_components_category_id_idx on public.kit_components (category_id);
create index kit_components_kit_id_idx on public.kit_components (kit_id);

alter table public.kit_components enable row level security;

grant select on public.kit_components to anon, authenticated, service_role;
create policy "Public reads components of published kits"
  on public.kit_components for select to anon
  using (
    exists (
      select 1 from public.kits k
      where k.id = kit_components.kit_id and k.is_published
    )
  );

grant select, insert, update, delete on public.kit_components to authenticated;
create policy "Admins manage kit components"
  on public.kit_components for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Disponibilidad pública de kits tradicionales y dinámicos. Para los
-- dinámicos alcanza con que cada categoría tenga al menos una variante libre.
create or replace view public.kit_availability
with (security_invoker = false)
as
with fixed_stock as (
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
),
dynamic_stock as (
  select
    kc.kit_id,
    bool_and(exists (
      select 1
      from public.products p
      join public.product_variants v on v.product_id = p.id
      where p.category_id = kc.category_id
        and p.is_published
        and (
          p.category_id = kc.category_id
          or exists (
            select 1 from public.categories child
            where child.id = p.category_id and child.parent_id = kc.category_id
          )
        )
        and v.stock_on_hand - v.stock_reserved >= kc.quantity
    )) as is_available
  from public.kit_components kc
  group by kc.kit_id
)
select
  k.id as kit_id,
  case
    when k.is_dynamic then coalesce(ds.is_available, false)
    else coalesce(fs.available, 0) > 0
  end as is_available,
  case
    when k.is_dynamic then false
    else coalesce(fs.available, 0) between 1 and coalesce(
      (select (s.value #>> '{}')::integer from public.settings s where s.key = 'last_units_threshold'),
      2
    )
  end as is_last_units
from public.kits k
left join fixed_stock fs on fs.kit_id = k.id
left join dynamic_stock ds on ds.kit_id = k.id
where k.is_published;

comment on view public.kit_availability is
  'Disponibilidad pública por kit. Para kits dinámicos exige al menos una variante libre por componente y nunca expone cantidades.';


-- Resuelve la composición dinámica usando precios y stock reales de la base.
-- No expone cantidades al navegador: solo la función privada de cotización la usa.
create function public.resolve_dynamic_kit(p_kit_id uuid, p_selections jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_kit public.kits%rowtype;
  v_component record;
  v_match_count integer;
  v_variant_id uuid;
  v_product_name text;
  v_color text;
  v_size text;
  v_label text;
  v_product_price integer;
  v_variant_stock integer;
  v_total_price integer := 0;
  v_available integer := 2147483647;
  v_component_count integer := 0;
  v_components jsonb := '[]'::jsonb;
begin
  select * into v_kit
  from public.kits k
  where k.id = p_kit_id and k.is_published and k.is_dynamic;

  if not found or jsonb_typeof(p_selections) is distinct from 'array' then
    return jsonb_build_object('valid', false);
  end if;

  select count(*)::integer into v_component_count
  from public.kit_components kc
  where kc.kit_id = p_kit_id;

  if v_component_count = 0 or jsonb_array_length(p_selections) <> v_component_count then
    return jsonb_build_object('valid', false);
  end if;

  for v_component in
    select kc.id, kc.category_id, kc.quantity
    from public.kit_components kc
    where kc.kit_id = p_kit_id
    order by kc.sort_order, kc.id
  loop
    select count(*)::integer
      into v_match_count
    from jsonb_to_recordset(p_selections) as selected(component_id uuid, variant_id uuid)
    where selected.component_id = v_component.id;

    if v_match_count <> 1 then
      return jsonb_build_object('valid', false);
    end if;

    select selected.variant_id
      into v_variant_id
    from jsonb_to_recordset(p_selections) as selected(component_id uuid, variant_id uuid)
    where selected.component_id = v_component.id;

    select
      p.name,
      p.price_cents,
      v.color,
      v.size,
      v.stock_on_hand - v.stock_reserved
      into v_product_name, v_product_price, v_color, v_size, v_variant_stock
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = v_variant_id
      and (
        p.category_id = v_component.category_id
        or exists (
          select 1 from public.categories child
          where child.id = p.category_id and child.parent_id = v_component.category_id
        )
      )
      and p.is_published;

    if not found then
      return jsonb_build_object('valid', false);
    end if;

    v_total_price := v_total_price + v_product_price * v_component.quantity;
    v_available := least(
      v_available,
      floor(v_variant_stock::numeric / v_component.quantity)::integer
    );

    v_label := v_product_name || case
      when coalesce(v_color, v_size) is not null
        then ' — ' || concat_ws(' / ', v_color, v_size)
      else '' end;

    v_components := v_components || jsonb_build_array(jsonb_build_object(
      'variant_id', v_variant_id,
      'name', v_label,
      'quantity', v_component.quantity
    ));
  end loop;

  return jsonb_build_object(
    'valid', true,
    'price_cents', round(v_total_price * (100 - v_kit.discount_percent) / 100.0)::integer,
    'compare_at_price_cents', v_total_price,
    'discount_percent', v_kit.discount_percent,
    'available', greatest(v_available, 0),
    'components', v_components
  );
end;
$$;

-- La función solo se usa desde cotizaciones del servidor. PostgreSQL concede
-- EXECUTE a PUBLIC por defecto; retiramos ese acceso explícitamente.
revoke execute on function public.resolve_dynamic_kit(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.resolve_dynamic_kit(uuid, jsonb) to service_role;

create or replace function public.calculate_order_totals(
  p_items jsonb,
  p_coupon_code text default null,
  p_payment_method public.payment_method default null,
  p_shipping_method public.shipping_method default null,
  p_shipping_zone_id uuid default null,
  p_strict boolean default true
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_line record;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_name text;
  v_price integer;
  v_available integer;
  v_coupon public.coupons%rowtype;
  v_coupon_code text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  v_coupon_error text;
  v_coupon_discount integer := 0;
  v_coupon_applied boolean := false;
  v_applied_coupon_discount integer := 0;
  v_transfer_percent integer := 0;
  v_transfer_discount integer := 0;
  v_discount integer;
  v_zone public.shipping_zones%rowtype;
  v_shipping integer;
  v_threshold integer;
  v_remaining integer;
  v_after_discount integer;
  v_dynamic boolean;
  v_valid_line boolean;
  v_dynamic_result jsonb;
  v_components jsonb;
  v_line_key text;
  v_cutoff time;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using message = 'invalid_items', detail = jsonb_build_object('reason', 'empty')::text;
  end if;

  -- Una línea dinámica incluye line_key y selections; ambas distinguen
  -- combinaciones distintas del mismo kit en un solo carrito.
  for v_line in
    select x.variant_id, x.kit_id, x.line_key, x.selections,
           sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x (
      variant_id uuid, kit_id uuid, quantity integer,
      line_key text, selections jsonb
    )
    group by x.variant_id, x.kit_id, x.line_key, x.selections
    order by x.variant_id nulls last, x.kit_id, x.line_key
  loop
    if (v_line.variant_id is null) = (v_line.kit_id is null) then
      raise exception using message = 'invalid_items',
        detail = jsonb_build_object('reason', 'variant_or_kit')::text;
    end if;
    -- Tope por línea: una reserva de transferencia inmoviliza stock 24 horas.
    if v_line.quantity is null or v_line.quantity < 1 or v_line.quantity > 10 then
      raise exception using message = 'invalid_items',
        detail = jsonb_build_object('reason', 'quantity', 'max', 10)::text;
    end if;

    v_valid_line := false;
    v_components := null;
    v_dynamic := false;
    v_dynamic_result := null;
    v_line_key := coalesce(nullif(v_line.line_key, ''), 
      case when v_line.variant_id is not null
        then 'variant:' || v_line.variant_id::text
        else 'kit:' || v_line.kit_id::text
      end);

    if v_line.variant_id is not null then
      select p.name || case
               when coalesce(v.color, v.size) is not null
                 then ' — ' || concat_ws(' / ', v.color, v.size)
               else '' end,
             p.price_cents, v.stock_on_hand - v.stock_reserved
        into v_name, v_price, v_available
      from public.product_variants v
      join public.products p on p.id = v.product_id
      where v.id = v_line.variant_id and p.is_published;
      v_valid_line := found;
    else
      select k.name, k.price_cents, k.is_dynamic
        into v_name, v_price, v_dynamic
      from public.kits k
      where k.id = v_line.kit_id and k.is_published;

      v_valid_line := found;
      if v_valid_line and v_dynamic then
        v_dynamic_result := public.resolve_dynamic_kit(v_line.kit_id, v_line.selections);
        v_valid_line := coalesce((v_dynamic_result ->> 'valid')::boolean, false);
        if v_valid_line then
          v_price := (v_dynamic_result ->> 'price_cents')::integer;
          v_available := (v_dynamic_result ->> 'available')::integer;
          v_components := v_dynamic_result -> 'components';
        end if;
      elsif v_valid_line then
        v_available := public.kit_available_quantity(v_line.kit_id);
      end if;
    end if;

    if not v_valid_line then
      if p_strict then
        raise exception using message = 'item_unavailable',
          detail = jsonb_build_object(
            'variant_id', v_line.variant_id,
            'kit_id', v_line.kit_id,
            'reason', case when v_line.kit_id is not null then 'invalid_kit_selection' end
          )::text;
      end if;
      v_lines := v_lines || jsonb_build_object(
        'variant_id', v_line.variant_id,
        'kit_id', v_line.kit_id,
        'line_key', v_line_key,
        'quantity', v_line.quantity,
        'unavailable', true
      );
      continue;
    end if;

    v_subtotal := v_subtotal + v_price * v_line.quantity;
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'variant_id', v_line.variant_id,
        'kit_id', v_line.kit_id,
        'line_key', v_line_key,
        'name', v_name,
        'quantity', v_line.quantity,
        'unit_price_cents', v_price,
        'line_total_cents', v_price * v_line.quantity,
        'in_stock', v_available >= v_line.quantity,
        'unavailable', false
      ) || case
        when v_components is not null
          then jsonb_build_object('components', v_components)
        else '{}'::jsonb
      end
    );
  end loop;

  -- Cupón: vigencia, usos y mínimo, medidos ahora.
  if v_coupon_code is not null then
    select * into v_coupon from public.coupons c where c.code = v_coupon_code;
    if not found then
      v_coupon_error := 'not_found';
    else
      v_coupon_error := public.coupon_error(v_coupon, v_subtotal, now());
    end if;

    if v_coupon_error is null then
      v_coupon_discount := least(
        case v_coupon.type
          when 'percent' then (round(v_subtotal * v_coupon.value / 10000.0) * 100)::integer
          else v_coupon.value
        end,
        v_subtotal
      );
    end if;
  end if;

  if p_payment_method = 'transfer' then
    v_transfer_percent := coalesce(public.setting_text('transfer_discount_percent')::integer, 0);
  end if;

  if coalesce(public.setting_text('discounts_stack')::boolean, false) then
    v_coupon_applied := v_coupon_discount > 0;
    v_applied_coupon_discount := v_coupon_discount;
    v_transfer_discount := least(
      (round((v_subtotal - v_coupon_discount) * v_transfer_percent / 10000.0) * 100)::integer,
      v_subtotal - v_coupon_discount
    );
  else
    v_transfer_discount := least(
      (round(v_subtotal * v_transfer_percent / 10000.0) * 100)::integer,
      v_subtotal
    );
    if v_coupon_discount > v_transfer_discount then
      v_coupon_applied := true;
      v_applied_coupon_discount := v_coupon_discount;
      v_transfer_discount := 0;
    end if;
  end if;

  v_discount := v_applied_coupon_discount + v_transfer_discount;
  v_after_discount := v_subtotal - v_discount;

  -- Envío: el costo sale siempre de shipping_zones. null = sin envío gratis.
  v_threshold := public.setting_text('free_shipping_threshold_cents')::integer;

  if p_shipping_method is null then
    if p_shipping_zone_id is not null then
      raise exception using message = 'invalid_shipping',
        detail = jsonb_build_object('reason', 'method_required')::text;
    end if;
    v_shipping := null;
  elsif p_shipping_method = 'pickup' then
    if p_shipping_zone_id is not null then
      raise exception using message = 'invalid_shipping',
        detail = jsonb_build_object('reason', 'pickup_has_zone')::text;
    end if;
    v_shipping := 0;
  else
    if p_shipping_zone_id is null then
      raise exception using message = 'invalid_shipping',
        detail = jsonb_build_object('reason', 'zone_required')::text;
    end if;

    select * into v_zone from public.shipping_zones z where z.id = p_shipping_zone_id;
    if not found then
      raise exception using message = 'invalid_shipping',
        detail = jsonb_build_object('reason', 'zone_not_found')::text;
    end if;
    if p_shipping_method = 'same_day' then
      if not v_zone.same_day then
        raise exception using message = 'invalid_shipping',
          detail = jsonb_build_object('reason', 'zone_not_same_day')::text;
      end if;

      -- El corte se valida en el servidor para que el reloj del navegador no decida.
      v_cutoff := public.setting_text('same_day_cutoff_time')::time;
      if v_cutoff is not null
         and (now() at time zone 'America/Argentina/Buenos_Aires')::time > v_cutoff then
        raise exception using message = 'invalid_shipping',
          detail = jsonb_build_object(
            'reason', 'same_day_closed',
            'cutoff', to_char(v_cutoff, 'HH24:MI')
          )::text;
      end if;
    end if;
    if p_shipping_method = 'delivery' and v_zone.same_day then
      raise exception using message = 'invalid_shipping',
        detail = jsonb_build_object('reason', 'zone_is_same_day')::text;
    end if;

    v_shipping := case
      when v_threshold is not null and v_after_discount >= v_threshold then 0
      else v_zone.price_cents
    end;
  end if;

  if v_threshold is not null then
    v_remaining := greatest(v_threshold - v_after_discount, 0);
  end if;

  return jsonb_build_object(
    'lines', v_lines,
    'subtotal_cents', v_subtotal,
    'coupon', case
      when v_coupon_code is null then null
      else jsonb_build_object(
        'code', v_coupon_code,
        'id', case when v_coupon_error is null then v_coupon.id end,
        'valid', v_coupon_error is null,
        'error', v_coupon_error,
        'applied', v_coupon_applied,
        'discount_cents', v_coupon_discount
      )
    end,
    'coupon_discount_cents', v_applied_coupon_discount,
    'transfer_discount_cents', v_transfer_discount,
    'discount_cents', v_discount,
    'shipping_cents', v_shipping,
    'free_shipping_threshold_cents', v_threshold,
    'remaining_for_free_shipping_cents', v_remaining,
    'total_cents', v_after_discount + coalesce(v_shipping, 0)
  );
end;
$$;

-- El pedido conserva el kit como línea principal y cada variante elegida como
-- una línea hija. Las funciones de pago y liberación existentes descuentan y
-- liberan todas las líneas con variant_id, sin cambios.
create or replace function public.create_order_with_reservation(payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_payment public.payment_method;
  v_shipping_method public.shipping_method;
  v_zone_id uuid;
  v_email text;
  v_phone text;
  v_address jsonb;
  v_is_gift boolean;
  v_totals jsonb;
  v_required jsonb;
  v_short record;
  v_order public.orders%rowtype;
  v_line jsonb;
  v_item_id uuid;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception using message = 'invalid_payload', detail = jsonb_build_object('reason', 'not_an_object')::text;
  end if;

  v_payment := nullif(payload ->> 'payment_method', '')::public.payment_method;
  v_shipping_method := nullif(payload ->> 'shipping_method', '')::public.shipping_method;
  v_zone_id := nullif(payload ->> 'shipping_zone_id', '')::uuid;
  v_email := lower(trim(coalesce(payload ->> 'email', '')));
  v_phone := trim(coalesce(payload ->> 'phone', ''));
  v_address := payload -> 'shipping_address';
  v_is_gift := coalesce((payload ->> 'is_gift')::boolean, false);

  if v_payment is null then
    raise exception using message = 'invalid_payload', detail = jsonb_build_object('reason', 'payment_method')::text;
  end if;
  if v_shipping_method is null then
    raise exception using message = 'invalid_payload', detail = jsonb_build_object('reason', 'shipping_method')::text;
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception using message = 'invalid_payload', detail = jsonb_build_object('reason', 'email')::text;
  end if;
  if length(v_phone) < 6 then
    raise exception using message = 'invalid_payload', detail = jsonb_build_object('reason', 'phone')::text;
  end if;
  if v_shipping_method <> 'pickup' and (v_address is null or jsonb_typeof(v_address) <> 'object') then
    raise exception using message = 'invalid_shipping', detail = jsonb_build_object('reason', 'address_required')::text;
  end if;

  -- 1. Totales con los precios de la base (§10).
  v_totals := public.calculate_order_totals(
    payload -> 'items',
    payload ->> 'coupon_code',
    v_payment,
    v_shipping_method,
    v_zone_id,
    true
  );

  if (v_totals #>> '{coupon,error}') is not null then
    raise exception using message = 'invalid_coupon',
      detail = jsonb_build_object(
        'code', v_totals #>> '{coupon,code}',
        'reason', v_totals #>> '{coupon,error}'
      )::text;
  end if;

  -- 2. Unidades por variante: variantes sueltas más componentes de kits.
  select coalesce(
    jsonb_agg(jsonb_build_object('variant_id', r.variant_id, 'quantity', r.quantity) order by r.variant_id),
    '[]'::jsonb
  )
  into v_required
  from (
    select req.variant_id, sum(req.quantity)::integer as quantity
    from (
      select (l ->> 'variant_id')::uuid as variant_id, (l ->> 'quantity')::integer as quantity
      from jsonb_array_elements(v_totals -> 'lines') l
      where l ->> 'variant_id' is not null
      union all
      select ki.variant_id, ki.quantity * (l ->> 'quantity')::integer
      from jsonb_array_elements(v_totals -> 'lines') l
      join public.kit_items ki on ki.kit_id = (l ->> 'kit_id')::uuid
      where l ->> 'kit_id' is not null
      union all
      select c.variant_id, c.quantity * (l ->> 'quantity')::integer
      from jsonb_array_elements(v_totals -> 'lines') l
      cross join lateral jsonb_to_recordset(coalesce(l -> 'components', '[]'::jsonb))
        as c(variant_id uuid, quantity integer)
      where l ->> 'kit_id' is not null
    ) req
    group by req.variant_id
  ) r;

  -- 3. Bloqueo siempre en orden de id: dos pedidos simultáneos esperan en fila
  -- en vez de trabarse entre sí.
  perform 1
  from public.product_variants v
  where v.id in (select (r ->> 'variant_id')::uuid from jsonb_array_elements(v_required) r)
  order by v.id
  for update;

  -- 4. ¿Alcanza todo? Con las filas bloqueadas, esta lectura ya es la definitiva.
  select v.id as variant_id, p.name as product, v.color, v.size,
         (r ->> 'quantity')::integer as requested,
         v.stock_on_hand - v.stock_reserved as available
  into v_short
  from jsonb_array_elements(v_required) r
  join public.product_variants v on v.id = (r ->> 'variant_id')::uuid
  join public.products p on p.id = v.product_id
  where v.stock_on_hand - v.stock_reserved < (r ->> 'quantity')::integer
  order by v.id
  limit 1;

  if found then
    raise exception using message = 'out_of_stock',
      detail = jsonb_build_object(
        'variant_id', v_short.variant_id,
        'product', v_short.product,
        'color', v_short.color,
        'size', v_short.size,
        'requested', v_short.requested,
        'available', greatest(v_short.available, 0)
      )::text;
  end if;

  -- 5. Pedido.
  insert into public.orders (
    payment_method, email, phone, shipping_method, shipping_zone_id, shipping_address,
    is_gift, gift_message, subtotal_cents, coupon_discount_cents, transfer_discount_cents,
    discount_cents, shipping_cents, total_cents, coupon_id, reserved_until
  )
  values (
    v_payment,
    v_email,
    v_phone,
    v_shipping_method,
    v_zone_id,
    case when v_shipping_method = 'pickup' then null else v_address end,
    v_is_gift,
    case when v_is_gift then nullif(trim(coalesce(payload ->> 'gift_message', '')), '') end,
    (v_totals ->> 'subtotal_cents')::integer,
    (v_totals ->> 'coupon_discount_cents')::integer,
    (v_totals ->> 'transfer_discount_cents')::integer,
    (v_totals ->> 'discount_cents')::integer,
    (v_totals ->> 'shipping_cents')::integer,
    (v_totals ->> 'total_cents')::integer,
    case when (v_totals #>> '{coupon,applied}')::boolean then (v_totals #>> '{coupon,id}')::uuid end,
    now() + case v_payment when 'card' then interval '30 minutes' else interval '24 hours' end
  )
  returning * into v_order;

  -- 6. Líneas. Cada kit guarda sus componentes como líneas hijas.
  for v_line in select l from jsonb_array_elements(v_totals -> 'lines') l loop
    insert into public.order_items (order_id, variant_id, kit_id, name_snapshot, unit_price_cents, quantity)
    values (
      v_order.id,
      (v_line ->> 'variant_id')::uuid,
      (v_line ->> 'kit_id')::uuid,
      v_line ->> 'name',
      (v_line ->> 'unit_price_cents')::integer,
      (v_line ->> 'quantity')::integer
    )
    returning id into v_item_id;

    if v_line ->> 'kit_id' is not null then
      if jsonb_typeof(v_line -> 'components') = 'array' then
        insert into public.order_items (
          order_id, parent_item_id, variant_id, name_snapshot, unit_price_cents, quantity
        )
        select
          v_order.id,
          v_item_id,
          c.variant_id,
          c.name,
          0,
          c.quantity * (v_line ->> 'quantity')::integer
        from jsonb_to_recordset(v_line -> 'components') as c(
          variant_id uuid, name text, quantity integer
        );
      else
        insert into public.order_items (order_id, parent_item_id, variant_id, name_snapshot, unit_price_cents, quantity)
        select
          v_order.id,
          v_item_id,
          ki.variant_id,
          p.name || case
            when coalesce(v.color, v.size) is not null
              then ' — ' || concat_ws(' / ', v.color, v.size)
            else '' end,
          0,
          ki.quantity * (v_line ->> 'quantity')::integer
        from public.kit_items ki
        join public.product_variants v on v.id = ki.variant_id
        join public.products p on p.id = v.product_id
        where ki.kit_id = (v_line ->> 'kit_id')::uuid;
      end if;
    end if;
  end loop;

  -- 7. Reserva y movimientos, calculados desde las líneas guardadas: lo que se
  -- reserva es exactamente lo que después se confirma o se libera.
  with req as (
    select oi.variant_id, sum(oi.quantity)::integer as quantity
    from public.order_items oi
    where oi.order_id = v_order.id and oi.variant_id is not null
    group by oi.variant_id
  ),
  updated as (
    update public.product_variants v
    set stock_reserved = v.stock_reserved + req.quantity
    from req
    where v.id = req.variant_id
    returning v.id, req.quantity
  )
  insert into public.stock_movements (variant_id, type, quantity, order_id)
  select u.id, 'reservation', u.quantity, v_order.id from updated u;

  return jsonb_build_object(
    'order_id', v_order.id,
    'number', v_order.number,
    'status', v_order.status,
    'total_cents', v_order.total_cents,
    'reserved_until', v_order.reserved_until,
    'totals', v_totals
  );
end;
$$;
