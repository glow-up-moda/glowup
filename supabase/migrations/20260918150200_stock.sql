-- Reglas de stock (CLAUDE.md §9) y de precios (§10).
--
-- Ninguna función es security definer: solo las ejecuta el servidor con la
-- clave secreta (service_role) y el cron, que corre como dueño. Los dos ya
-- tienen los permisos que necesitan, y así un grant equivocado nunca escala
-- privilegios. search_path vacío en todas: cada nombre va con su esquema.
--
-- Los errores usan message como código estable (out_of_stock, invalid_coupon,
-- invalid_shipping...) y detail con un JSON. La app traduce el código al texto
-- de la tienda; ninguna frase de la interfaz vive acá.

-- Ayudantes -----------------------------------------------------------------

-- Valor de settings como texto; el JSON null devuelve null.
create function public.setting_text(p_key text)
returns text
language sql
stable
set search_path = ''
as $$
  select s.value #>> '{}' from public.settings s where s.key = p_key
$$;

-- Motivo por el que un cupón no vale en un momento dado, o null si vale.
create function public.coupon_error(
  p_coupon public.coupons,
  p_subtotal_cents integer,
  p_at timestamptz
)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_coupon.starts_at is not null and p_at < p_coupon.starts_at then 'not_started'
    when p_coupon.ends_at is not null and p_at > p_coupon.ends_at then 'expired'
    when p_coupon.max_uses is not null and p_coupon.used_count >= p_coupon.max_uses then 'max_uses'
    when p_subtotal_cents < p_coupon.min_subtotal_cents then 'min_subtotal'
  end
$$;

-- Cuántos kits completos se pueden armar ahora (§9.7). Un componente de un
-- producto despublicado cuenta como agotado.
create function public.kit_available_quantity(p_kit_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(
    min(
      case
        when p.is_published then floor((v.stock_on_hand - v.stock_reserved)::numeric / ki.quantity)
        else 0
      end
    ),
    0
  )::integer
  from public.kit_items ki
  join public.product_variants v on v.id = ki.variant_id
  join public.products p on p.id = v.product_id
  where ki.kit_id = p_kit_id
$$;

-- Totales -------------------------------------------------------------------

-- Única implementación del cálculo (§10): la usan el presupuesto del carrito y
-- la creación del pedido. Todos los montos salen de la base: recibe qué se
-- compra, el código del cupón, el medio de pago, el método de envío y el id de
-- la zona, nunca un precio ni un costo de envío.
--
-- Orden: subtotal -> cupón -> descuento por transferencia -> envío. Si
-- discounts_stack es false (el default), cupón y transferencia no se acumulan:
-- se aplica el mayor, y en empate gana la transferencia para no gastar el
-- cupón. Los descuentos se redondean al peso.
--
-- p_strict = false (presupuesto del carrito): un producto despublicado vuelve
-- marcado como no disponible en vez de cortar todo el cálculo.
create function public.calculate_order_totals(
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
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using message = 'invalid_items', detail = jsonb_build_object('reason', 'empty')::text;
  end if;

  -- Cada ítem es {variant_id, quantity} o {kit_id, quantity}; los repetidos se suman.
  for v_line in
    select x.variant_id, x.kit_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x (variant_id uuid, kit_id uuid, quantity integer)
    group by x.variant_id, x.kit_id
    order by x.variant_id nulls last, x.kit_id
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

    if v_line.variant_id is not null then
      select p.name || ' — ' || v.color || ' / ' || v.size, p.price_cents, v.stock_on_hand - v.stock_reserved
        into v_name, v_price, v_available
      from public.product_variants v
      join public.products p on p.id = v.product_id
      where v.id = v_line.variant_id and p.is_published;
    else
      select k.name, k.price_cents, public.kit_available_quantity(k.id)
        into v_name, v_price, v_available
      from public.kits k
      where k.id = v_line.kit_id and k.is_published;
    end if;

    if not found then
      if p_strict then
        raise exception using message = 'item_unavailable',
          detail = jsonb_build_object('variant_id', v_line.variant_id, 'kit_id', v_line.kit_id)::text;
      end if;
      v_lines := v_lines || jsonb_build_object(
        'variant_id', v_line.variant_id,
        'kit_id', v_line.kit_id,
        'quantity', v_line.quantity,
        'unavailable', true
      );
      continue;
    end if;

    v_subtotal := v_subtotal + v_price * v_line.quantity;
    v_lines := v_lines || jsonb_build_object(
      'variant_id', v_line.variant_id,
      'kit_id', v_line.kit_id,
      'name', v_name,
      'quantity', v_line.quantity,
      'unit_price_cents', v_price,
      'line_total_cents', v_price * v_line.quantity,
      'in_stock', v_available >= v_line.quantity,
      'unavailable', false
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
    if p_shipping_method = 'same_day' and not v_zone.same_day then
      raise exception using message = 'invalid_shipping',
        detail = jsonb_build_object('reason', 'zone_not_same_day')::text;
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

-- Presupuesto de solo lectura para el carrito lateral y el checkout (§7): mismos
-- números que va a cobrar create_order_with_reservation.
create function public.quote_cart(payload jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.calculate_order_totals(
    payload -> 'items',
    payload ->> 'coupon_code',
    nullif(payload ->> 'payment_method', '')::public.payment_method,
    nullif(payload ->> 'shipping_method', '')::public.shipping_method,
    nullif(payload ->> 'shipping_zone_id', '')::uuid,
    false
  )
$$;

-- Pedido y reserva ----------------------------------------------------------

-- Crea el pedido y reserva el stock en una sola transacción (§9.1). Si una
-- variante no alcanza, se rechaza el pedido entero y el error dice cuál.
-- Reserva: 30 minutos con Mercado Pago, 24 horas con transferencia (§9.2).
create function public.create_order_with_reservation(payload jsonb)
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
    now() + case v_payment when 'mercadopago' then interval '30 minutes' else interval '24 hours' end
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
      insert into public.order_items (order_id, parent_item_id, variant_id, name_snapshot, unit_price_cents, quantity)
      select v_order.id, v_item_id, ki.variant_id, p.name || ' — ' || v.color || ' / ' || v.size, 0,
             ki.quantity * (v_line ->> 'quantity')::integer
      from public.kit_items ki
      join public.product_variants v on v.id = ki.variant_id
      join public.products p on p.id = v.product_id
      where ki.kit_id = (v_line ->> 'kit_id')::uuid;
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

-- Pago aprobado (§9.3). Idempotente: confirmar dos veces no descuenta dos veces.
--
-- Si la reserva ya se había liberado (§9.6), intenta descontar de nuevo, todo o
-- nada; si no alcanza, no descuenta y marca el pedido para revisar.
--
-- Vuelve a validar el cupón: la vigencia contra la fecha del pedido (valía
-- cuando la clienta compró), los usos contra el conteo actual y el mínimo
-- contra el subtotal guardado. Como el pago ya está cobrado, un cupón inválido
-- nunca rechaza el pedido: se confirma y queda para revisar.
create function public.confirm_order_payment(p_order_id uuid, p_mp_payment_id text default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_coupon public.coupons%rowtype;
  v_coupon_error text;
  v_short text;
  v_reasons text[] := '{}';
begin
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception using message = 'order_not_found',
      detail = jsonb_build_object('order_id', p_order_id)::text;
  end if;

  if v_order.status not in ('pending_payment', 'cancelled') then
    return jsonb_build_object(
      'order_id', v_order.id,
      'number', v_order.number,
      'status', v_order.status,
      'already_confirmed', true,
      'needs_review', v_order.needs_review,
      'review_reason', v_order.review_reason
    );
  end if;

  perform 1
  from public.product_variants v
  where v.id in (
    select oi.variant_id from public.order_items oi
    where oi.order_id = p_order_id and oi.variant_id is not null
  )
  order by v.id
  for update;

  if v_order.status = 'pending_payment' then
    with req as (
      select oi.variant_id, sum(oi.quantity)::integer as quantity
      from public.order_items oi
      where oi.order_id = p_order_id and oi.variant_id is not null
      group by oi.variant_id
    ),
    updated as (
      update public.product_variants v
      set stock_on_hand = v.stock_on_hand - req.quantity,
          stock_reserved = v.stock_reserved - req.quantity
      from req
      where v.id = req.variant_id
      returning v.id, req.quantity
    )
    insert into public.stock_movements (variant_id, type, quantity, order_id)
    select u.id, 'web_sale', u.quantity, p_order_id from updated u;
  else
    select string_agg(p.name || ' ' || v.color || ' / ' || v.size, ', ' order by v.id)
    into v_short
    from (
      select oi.variant_id, sum(oi.quantity)::integer as quantity
      from public.order_items oi
      where oi.order_id = p_order_id and oi.variant_id is not null
      group by oi.variant_id
    ) req
    join public.product_variants v on v.id = req.variant_id
    join public.products p on p.id = v.product_id
    where v.stock_on_hand - v.stock_reserved < req.quantity;

    if v_short is null then
      with req as (
        select oi.variant_id, sum(oi.quantity)::integer as quantity
        from public.order_items oi
        where oi.order_id = p_order_id and oi.variant_id is not null
        group by oi.variant_id
      ),
      updated as (
        update public.product_variants v
        set stock_on_hand = v.stock_on_hand - req.quantity
        from req
        where v.id = req.variant_id
        returning v.id, req.quantity
      )
      insert into public.stock_movements (variant_id, type, quantity, order_id)
      select u.id, 'web_sale', u.quantity, p_order_id from updated u;
    else
      v_reasons := v_reasons
        || ('Pago aprobado después de liberar la reserva y sin stock suficiente de: ' || v_short
            || '. No se descontó nada.');
    end if;
  end if;

  if v_order.coupon_id is not null then
    select * into v_coupon from public.coupons c where c.id = v_order.coupon_id for update;
    v_coupon_error := public.coupon_error(v_coupon, v_order.subtotal_cents, v_order.created_at);
    if v_coupon_error is not null then
      v_reasons := v_reasons
        || ('Cupón ' || v_coupon.code || ': '
            || case v_coupon_error
                 when 'not_started' then 'todavía no estaba vigente'
                 when 'expired' then 'estaba vencido'
                 when 'max_uses' then 'ya había alcanzado sus usos máximos'
                 when 'min_subtotal' then 'el pedido no llegaba al mínimo'
               end
            || '. Se respetó el descuento porque el pago ya estaba cobrado.');
    end if;
    update public.coupons c set used_count = c.used_count + 1 where c.id = v_coupon.id;
  end if;

  update public.orders o
  set status = 'paid',
      mp_payment_id = coalesce(p_mp_payment_id, o.mp_payment_id),
      needs_review = o.needs_review or cardinality(v_reasons) > 0,
      review_reason = case
        when cardinality(v_reasons) = 0 then o.review_reason
        else concat_ws(' ', o.review_reason, array_to_string(v_reasons, ' '))
      end
  where o.id = p_order_id
  returning * into v_order;

  return jsonb_build_object(
    'order_id', v_order.id,
    'number', v_order.number,
    'status', v_order.status,
    'already_confirmed', false,
    'needs_review', v_order.needs_review,
    'review_reason', v_order.review_reason
  );
end;
$$;

-- Pago rechazado, cancelado o reserva vencida (§9.4). Solo actúa sobre pedidos
-- pendientes; devuelve false si no había nada que liberar.
create function public.release_order_reservation(p_order_id uuid, p_reason text default null)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception using message = 'order_not_found',
      detail = jsonb_build_object('order_id', p_order_id)::text;
  end if;

  if v_order.status <> 'pending_payment' then
    return false;
  end if;

  perform 1
  from public.product_variants v
  where v.id in (
    select oi.variant_id from public.order_items oi
    where oi.order_id = p_order_id and oi.variant_id is not null
  )
  order by v.id
  for update;

  with req as (
    select oi.variant_id, sum(oi.quantity)::integer as quantity
    from public.order_items oi
    where oi.order_id = p_order_id and oi.variant_id is not null
    group by oi.variant_id
  ),
  updated as (
    update public.product_variants v
    set stock_reserved = v.stock_reserved - req.quantity
    from req
    where v.id = req.variant_id
    returning v.id, req.quantity
  )
  insert into public.stock_movements (variant_id, type, quantity, order_id, note)
  select u.id, 'release', u.quantity, p_order_id, p_reason from updated u;

  update public.orders o set status = 'cancelled' where o.id = p_order_id;

  return true;
end;
$$;

-- La corre el cron cada 5 minutos (§9.5). Un pedido que falla no frena a los
-- demás, y los que se están confirmando en ese momento se saltean.
create function public.release_expired_reservations()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_released integer := 0;
begin
  for v_order_id in
    select o.id
    from public.orders o
    where o.status = 'pending_payment' and o.reserved_until < now()
    order by o.reserved_until
    for update skip locked
  loop
    begin
      if public.release_order_reservation(v_order_id, 'Reserva vencida') then
        v_released := v_released + 1;
      end if;
    exception when others then
      raise warning 'No se pudo liberar el pedido %: %', v_order_id, sqlerrm;
    end;
  end loop;

  return v_released;
end;
$$;

-- Movimientos manuales ------------------------------------------------------

-- Reposición, venta manual, ajuste o devolución, siempre con usuario, y en
-- ventas y ajustes también con nota (§9.8). Nunca deja el stock por debajo de
-- lo reservado.
create function public.record_stock_movement(
  p_variant_id uuid,
  p_type public.stock_movement_type,
  p_quantity integer,
  p_note text,
  p_created_by uuid
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_variant public.product_variants%rowtype;
  v_delta integer;
  v_movement_id uuid;
begin
  if p_type not in ('restock', 'manual_sale', 'adjustment', 'return') then
    raise exception using message = 'invalid_movement', detail = jsonb_build_object('reason', 'type_not_manual')::text;
  end if;
  if p_created_by is null then
    raise exception using message = 'invalid_movement', detail = jsonb_build_object('reason', 'user_required')::text;
  end if;
  if p_type in ('manual_sale', 'adjustment') and length(trim(coalesce(p_note, ''))) = 0 then
    raise exception using message = 'invalid_movement', detail = jsonb_build_object('reason', 'note_required')::text;
  end if;
  if p_quantity is null
     or (p_type = 'adjustment' and p_quantity = 0)
     or (p_type <> 'adjustment' and p_quantity <= 0) then
    raise exception using message = 'invalid_movement', detail = jsonb_build_object('reason', 'quantity')::text;
  end if;

  select * into v_variant from public.product_variants v where v.id = p_variant_id for update;
  if not found then
    raise exception using message = 'variant_not_found', detail = jsonb_build_object('variant_id', p_variant_id)::text;
  end if;

  v_delta := case p_type when 'manual_sale' then -p_quantity else p_quantity end;

  if v_variant.stock_on_hand + v_delta < v_variant.stock_reserved then
    raise exception using message = 'insufficient_stock',
      detail = jsonb_build_object(
        'variant_id', p_variant_id,
        'available', v_variant.stock_on_hand - v_variant.stock_reserved,
        'requested', -v_delta
      )::text;
  end if;

  update public.product_variants v
  set stock_on_hand = v.stock_on_hand + v_delta
  where v.id = p_variant_id
  returning * into v_variant;

  insert into public.stock_movements (variant_id, type, quantity, note, created_by)
  values (p_variant_id, p_type, p_quantity, nullif(trim(coalesce(p_note, '')), ''), p_created_by)
  returning id into v_movement_id;

  return jsonb_build_object(
    'movement_id', v_movement_id,
    'variant_id', p_variant_id,
    'stock_on_hand', v_variant.stock_on_hand,
    'stock_reserved', v_variant.stock_reserved,
    'available', v_variant.stock_on_hand - v_variant.stock_reserved
  );
end;
$$;

-- Reposición (§9.10): además del movimiento, devuelve los avisos pendientes de
-- esa variante para que el servidor mande "Volvió tu talle" (fase 5).
create function public.restock_variant(
  p_variant_id uuid,
  p_quantity integer,
  p_note text,
  p_created_by uuid
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  v_result := public.record_stock_movement(p_variant_id, 'restock', p_quantity, p_note, p_created_by);

  return v_result || jsonb_build_object(
    'pending_back_in_stock',
    case
      when (v_result ->> 'available')::integer > 0 then (
        select coalesce(
          jsonb_agg(jsonb_build_object('id', r.id, 'email', r.email) order by r.created_at),
          '[]'::jsonb
        )
        from public.back_in_stock_requests r
        where r.variant_id = p_variant_id and r.notified_at is null
      )
      else '[]'::jsonb
    end
  );
end;
$$;

-- Permisos: solo el servidor ------------------------------------------------

revoke all on function public.setting_text(text) from public, anon, authenticated;
revoke all on function public.coupon_error(public.coupons, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.kit_available_quantity(uuid) from public, anon, authenticated;
revoke all on function public.calculate_order_totals(jsonb, text, public.payment_method, public.shipping_method, uuid, boolean) from public, anon, authenticated;
revoke all on function public.quote_cart(jsonb) from public, anon, authenticated;
revoke all on function public.create_order_with_reservation(jsonb) from public, anon, authenticated;
revoke all on function public.confirm_order_payment(uuid, text) from public, anon, authenticated;
revoke all on function public.release_order_reservation(uuid, text) from public, anon, authenticated;
revoke all on function public.release_expired_reservations() from public, anon, authenticated;
revoke all on function public.record_stock_movement(uuid, public.stock_movement_type, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.restock_variant(uuid, integer, text, uuid) from public, anon, authenticated;

grant execute on function public.setting_text(text) to service_role;
grant execute on function public.coupon_error(public.coupons, integer, timestamptz) to service_role;
grant execute on function public.kit_available_quantity(uuid) to service_role;
grant execute on function public.calculate_order_totals(jsonb, text, public.payment_method, public.shipping_method, uuid, boolean) to service_role;
grant execute on function public.quote_cart(jsonb) to service_role;
grant execute on function public.create_order_with_reservation(jsonb) to service_role;
grant execute on function public.confirm_order_payment(uuid, text) to service_role;
grant execute on function public.release_order_reservation(uuid, text) to service_role;
grant execute on function public.release_expired_reservations() to service_role;
grant execute on function public.record_stock_movement(uuid, public.stock_movement_type, integer, text, uuid) to service_role;
grant execute on function public.restock_variant(uuid, integer, text, uuid) to service_role;
