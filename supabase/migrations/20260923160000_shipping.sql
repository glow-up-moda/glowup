-- Envíos y retiro (§12).
--
-- Dos cosas que faltaban:
--
-- 1. El horario de corte del envío en el día se mostraba, pero no se aplicaba:
--    a las 16 todavía se podía elegir "te llega hoy". Ahora lo valida la base,
--    que es donde se calcula todo lo demás (§10).
-- 2. El punto de retiro no estaba en ningún lado: la clienta elegía "retiro"
--    sin saber dónde ni a qué hora. Va en settings, como el alias y el CBU,
--    porque es una dirección real y el repositorio es público (§2).

insert into public.settings (key, value) values
  ('pickup_address', 'null'::jsonb),
  ('pickup_hours', 'null'::jsonb)
on conflict (key) do nothing;

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
  v_cutoff time;
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
    if p_shipping_method = 'same_day' then
      if not v_zone.same_day then
        raise exception using message = 'invalid_shipping',
          detail = jsonb_build_object('reason', 'zone_not_same_day')::text;
      end if;

      -- Pasada la hora de corte ya no se entrega hoy (§12). Se mira acá y no
      -- en el navegador: el reloj de la clienta no decide.
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
