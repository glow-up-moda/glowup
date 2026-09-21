-- Cobros con Ualá Bis en vez de Mercado Pago (§11).
--
-- La tienda pasa a cobrar las tarjetas con la API Cobros Online de Ualá Bis,
-- así la plata cae directo en la cuenta de Ualá. Eso cambia tres nombres que
-- hablaban de Mercado Pago:
--
--   payment_method 'mercadopago' -> 'card'   (el medio, no la marca)
--   orders.mp_preference_id      -> payment_checkout_id  (la orden del proveedor)
--   orders.mp_payment_id         -> payment_reference    (el pago, para el panel)
--
-- Las dos funciones que nombran esas cosas se recrean tal cual estaban, con
-- los nombres nuevos. `confirm_order_payment` se borra y se vuelve a crear
-- porque Postgres no deja renombrar un parámetro con create or replace.

alter type public.payment_method rename value 'mercadopago' to 'card';

alter table public.orders rename column mp_preference_id to payment_checkout_id;
alter table public.orders rename column mp_payment_id to payment_reference;

comment on column public.orders.payment_checkout_id is
  'Identificador de la orden de pago en el proveedor (uuid del checkout de Ualá Bis).';
comment on column public.orders.payment_reference is
  'Referencia del pago cobrado, para buscarlo en el panel del proveedor.';

alter table public.payment_events alter column provider set default 'uala';

drop function public.confirm_order_payment(uuid, text);

create function public.confirm_order_payment(p_order_id uuid, p_payment_reference text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
      payment_reference = coalesce(p_payment_reference, o.payment_reference),
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
$function$
;

create or replace function public.create_order_with_reservation(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

revoke all on function public.confirm_order_payment(uuid, text) from public, anon;
grant execute on function public.confirm_order_payment(uuid, text) to authenticated, service_role;
revoke all on function public.create_order_with_reservation(jsonb) from public, anon, authenticated;
grant execute on function public.create_order_with_reservation(jsonb) to service_role;
