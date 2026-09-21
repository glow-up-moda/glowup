-- Pruebas de humo de la base (CLAUDE.md §8 y §9).
--
-- Se corren contra la base de desarrollo, después de cada migración:
--   npm run db:test
--
-- El resultado es binario: si una prueba falla, la corrida se corta con un
-- error que la nombra; si todas pasan, la última línea dice "todas las pruebas
-- pasaron". Cada verificación usa raise exception, que no se puede apagar por
-- configuración como assert.
--
-- Todo pasa dentro de una transacción que se deshace, con datos propios
-- (prefijo "prueba"): no depende del seed ni lo toca. Lo único que no vuelve
-- atrás con un rollback es la secuencia de números de pedido, así que la prueba
-- guarda su posición y la restaura al final, pase o falle. Por eso todo vive en
-- un solo bloque: restaurarla a mitad de camino haría chocar los números de los
-- pedidos que siguen vivos dentro de la transacción.
--
-- No es pgTAP: `supabase test db` no aplica acá. El cron tampoco se prueba en
-- este archivo, porque pg_cron solo corre jobs confirmados: se verifica aparte,
-- en cron.job_run_details.

begin;

-- Configuración conocida, para que los montos esperados no dependan de la base.
insert into public.settings (key, value) values
  ('transfer_discount_percent', '10'),
  ('free_shipping_threshold_cents', '5000000'),
  ('discounts_stack', 'false'),
  ('last_units_threshold', '2')
on conflict (key) do update set value = excluded.value;

-- Datos propios de la prueba ---------------------------------------------------

with cat as (
  insert into public.categories (name, slug) values ('Prueba', 'prueba') returning id
)
insert into public.products (category_id, name, slug, price_cents, is_published)
select cat.id, x.name, x.slug, x.price_cents, x.is_published
from cat
cross join (values
  ('Prueba Luna', 'prueba-luna', 3290000, true),
  ('Prueba oculto', 'prueba-oculto', 2750000, false),
  ('Prueba Clásica', 'prueba-clasica', 990000, true)
) as x (name, slug, price_cents, is_published);

insert into public.product_variants (product_id, color, size, sku, stock_on_hand)
select p.id, x.color, x.size, x.sku, x.stock
from (values
  ('prueba-luna', 'Negro', '90', 'PRUEBA-NEG-90', 6),
  ('prueba-luna', 'Negro', '100', 'PRUEBA-NEG-100', 0),
  ('prueba-luna', 'Natural', '100', 'PRUEBA-NAT-100', 1),
  ('prueba-luna', 'Natural', '90', 'PRUEBA-NAT-90', 5),
  ('prueba-luna', 'Natural', '85', 'PRUEBA-NAT-85', 2),
  ('prueba-oculto', 'Negro', 'M', 'PRUEBA-OCULTO-M', 5),
  ('prueba-clasica', 'Negro', 'M', 'PRUEBA-CLAS-NEG-M', 10),
  ('prueba-clasica', 'Blanco', 'M', 'PRUEBA-CLAS-BLA-M', 6),
  ('prueba-clasica', 'Natural', 'S', 'PRUEBA-CLAS-NAT-S', 4)
) as x (product_slug, color, size, sku, stock)
join public.products p on p.slug = x.product_slug;

with kit as (
  insert into public.kits (name, slug, price_cents, is_published)
  values ('Prueba kit', 'prueba-kit', 2690000, true)
  returning id
)
insert into public.kit_items (kit_id, variant_id, quantity)
select kit.id, v.id, x.quantity
from kit
cross join (values ('PRUEBA-CLAS-NEG-M', 2), ('PRUEBA-CLAS-BLA-M', 1)) as x (sku, quantity)
join public.product_variants v on v.sku = x.sku;

insert into public.shipping_zones (name, provinces, price_cents, eta_text, same_day) values
  ('Prueba envío', '{"Entre Ríos"}', 650000, 'De 2 a 4 días hábiles', false),
  ('Prueba en el día', '{"Entre Ríos"}', 350000, 'En el día', true);

insert into public.coupons (code, type, value, min_subtotal_cents, ends_at, max_uses, used_count) values
  ('PRUEBA15', 'percent', 15, 2000000, null, 100, 0),
  ('PRUEBAVENCIDO', 'percent', 20, 0, now() - interval '1 day', null, 0),
  ('PRUEBAAGOTADO', 'percent', 20, 0, null, 1, 1),
  ('PRUEBAUNICO', 'fixed', 100000, 0, null, 1, 0);

-- Pruebas ------------------------------------------------------------------------

do $$
declare
  v_seq_last bigint;
  v_seq_called boolean;
  v_res jsonb;
  v_msg text;
  v_detail text;
  v_count integer;
  v_price integer;
  v_order uuid;
  v_order_kit uuid;
  v_order_late uuid;
  v_order_coupon uuid;
  v_order_transfer uuid;
  v_neg90 uuid;
  v_neg100 uuid;
  v_nat100 uuid;
  v_nat90 uuid;
  v_nat85 uuid;
  v_hidden uuid;
  v_clas_neg uuid;
  v_clas_bla uuid;
  v_clas_nat uuid;
  v_luna_product uuid;
  v_hidden_product uuid;
  v_kit uuid;
  v_zone uuid;
  v_zone_same_day uuid;
  v_admin uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  r record;
  v_base jsonb := jsonb_build_object('email', 'Prueba@Example.com', 'phone', '3430000000');
begin
  select last_value, is_called into v_seq_last, v_seq_called from public.order_number_seq;

  begin
    select id into v_neg90 from public.product_variants where sku = 'PRUEBA-NEG-90';
    select id into v_neg100 from public.product_variants where sku = 'PRUEBA-NEG-100';
    select id into v_nat100 from public.product_variants where sku = 'PRUEBA-NAT-100';
    select id into v_nat90 from public.product_variants where sku = 'PRUEBA-NAT-90';
    select id into v_nat85 from public.product_variants where sku = 'PRUEBA-NAT-85';
    select id into v_hidden from public.product_variants where sku = 'PRUEBA-OCULTO-M';
    select id into v_clas_neg from public.product_variants where sku = 'PRUEBA-CLAS-NEG-M';
    select id into v_clas_bla from public.product_variants where sku = 'PRUEBA-CLAS-BLA-M';
    select id into v_clas_nat from public.product_variants where sku = 'PRUEBA-CLAS-NAT-S';
    select id into v_luna_product from public.products where slug = 'prueba-luna';
    select id into v_hidden_product from public.products where slug = 'prueba-oculto';
    select id into v_kit from public.kits where slug = 'prueba-kit';
    select id into v_zone from public.shipping_zones where name = 'Prueba envío';
    select id into v_zone_same_day from public.shipping_zones where name = 'Prueba en el día';

    -- 1 ----------------------------------------------------------------------
    v_res := public.quote_cart(jsonb_build_object(
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_neg90, 'quantity', 2)),
      'coupon_code', ' prueba15 ', 'payment_method', 'transfer',
      'shipping_method', 'delivery', 'shipping_zone_id', v_zone));
    if (v_res ->> 'subtotal_cents')::integer is distinct from 6580000
       or (v_res ->> 'coupon_discount_cents')::integer is distinct from 987000
       or (v_res ->> 'transfer_discount_cents')::integer is distinct from 0
       or (v_res ->> 'shipping_cents')::integer is distinct from 0
       or (v_res ->> 'total_cents')::integer is distinct from 5593000 then
      raise exception 'Prueba 1, el cupón le gana a la transferencia y el envío sale gratis: %', v_res;
    end if;

    -- 2 ----------------------------------------------------------------------
    v_res := public.quote_cart(jsonb_build_object(
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_neg90, 'quantity', 1)),
      'payment_method', 'transfer', 'shipping_method', 'delivery', 'shipping_zone_id', v_zone));
    if (v_res ->> 'transfer_discount_cents')::integer is distinct from 329000
       or (v_res ->> 'shipping_cents')::integer is distinct from 650000
       or (v_res ->> 'total_cents')::integer is distinct from 3611000
       or (v_res ->> 'remaining_for_free_shipping_cents')::integer is distinct from 2039000 then
      raise exception 'Prueba 2, descuento por transferencia, envío pago y cuánto falta para el gratis: %', v_res;
    end if;

    -- 3a ---------------------------------------------------------------------
    v_msg := null;
    begin
      perform public.quote_cart(jsonb_build_object(
        'items', jsonb_build_array(jsonb_build_object('variant_id', v_neg90, 'quantity', 1)),
        'shipping_method', 'same_day', 'shipping_zone_id', v_zone));
    exception when others then
      v_msg := sqlerrm;
      get stacked diagnostics v_detail = pg_exception_detail;
    end;
    if v_msg is distinct from 'invalid_shipping' then
      raise exception 'Prueba 3a, envío en el día a una zona sin esa opción: esperaba invalid_shipping y vino %', coalesce(v_msg, 'ningún error');
    elsif nullif(v_detail, '')::jsonb ->> 'reason' is distinct from 'zone_not_same_day' then
      raise exception 'Prueba 3a, envío en el día a una zona sin esa opción: motivo %', v_detail;
    end if;

    -- 3b ---------------------------------------------------------------------
    v_msg := null;
    begin
      perform public.quote_cart(jsonb_build_object(
        'items', jsonb_build_array(jsonb_build_object('variant_id', v_neg90, 'quantity', 1)),
        'shipping_method', 'delivery', 'shipping_zone_id', v_zone_same_day));
    exception when others then
      v_msg := sqlerrm;
      get stacked diagnostics v_detail = pg_exception_detail;
    end;
    if v_msg is distinct from 'invalid_shipping' then
      raise exception 'Prueba 3b, envío a domicilio a una zona de envío en el día: esperaba invalid_shipping y vino %', coalesce(v_msg, 'ningún error');
    elsif nullif(v_detail, '')::jsonb ->> 'reason' is distinct from 'zone_is_same_day' then
      raise exception 'Prueba 3b, envío a domicilio a una zona de envío en el día: motivo %', v_detail;
    end if;

    -- 3c ---------------------------------------------------------------------
    v_msg := null;
    begin
      perform public.quote_cart(jsonb_build_object(
        'items', jsonb_build_array(jsonb_build_object('variant_id', v_neg90, 'quantity', 1)),
        'shipping_method', 'pickup', 'shipping_zone_id', v_zone));
    exception when others then
      v_msg := sqlerrm;
      get stacked diagnostics v_detail = pg_exception_detail;
    end;
    if v_msg is distinct from 'invalid_shipping' then
      raise exception 'Prueba 3c, retiro con zona: esperaba invalid_shipping y vino %', coalesce(v_msg, 'ningún error');
    elsif nullif(v_detail, '')::jsonb ->> 'reason' is distinct from 'pickup_has_zone' then
      raise exception 'Prueba 3c, retiro con zona: motivo %', v_detail;
    end if;

    -- 3d ---------------------------------------------------------------------
    v_msg := null;
    begin
      perform public.quote_cart(jsonb_build_object(
        'items', jsonb_build_array(jsonb_build_object('variant_id', v_neg90, 'quantity', 1)),
        'shipping_method', 'delivery', 'shipping_zone_id', gen_random_uuid()));
    exception when others then
      v_msg := sqlerrm;
      get stacked diagnostics v_detail = pg_exception_detail;
    end;
    if v_msg is distinct from 'invalid_shipping' then
      raise exception 'Prueba 3d, zona inexistente: esperaba invalid_shipping y vino %', coalesce(v_msg, 'ningún error');
    elsif nullif(v_detail, '')::jsonb ->> 'reason' is distinct from 'zone_not_found' then
      raise exception 'Prueba 3d, zona inexistente: motivo %', v_detail;
    end if;

    -- 3e ---------------------------------------------------------------------
    v_res := public.quote_cart(jsonb_build_object(
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_neg90, 'quantity', 1)),
      'shipping_method', 'delivery', 'shipping_zone_id', v_zone, 'shipping_cents', 1));
    if (v_res ->> 'shipping_cents')::integer is distinct from 650000 then
      raise exception 'Prueba 3e, un costo de envío que viene de afuera se ignora: %', v_res;
    end if;

    -- 4 ----------------------------------------------------------------------
    v_res := public.create_order_with_reservation(v_base || jsonb_build_object(
      'payment_method', 'card', 'shipping_method', 'delivery', 'shipping_zone_id', v_zone,
      'shipping_address', jsonb_build_object('calle', 'Inventada 123'),
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_neg90, 'quantity', 2))));
    v_order := (v_res ->> 'order_id')::uuid;
    if v_res ->> 'number' !~ '^GU-[0-9]{6}$' then
      raise exception 'Prueba 4a, número de pedido GU-: %', v_res;
    end if;
    select * into r from public.product_variants where id = v_neg90;
    if r.stock_on_hand is distinct from 6 or r.stock_reserved is distinct from 2 then
      raise exception 'Prueba 4b, crear el pedido reserva sin descontar: disponible % reservado %', r.stock_on_hand, r.stock_reserved;
    end if;
    select * into r from public.orders where id = v_order;
    if r.reserved_until is distinct from now() + interval '30 minutes' then
      raise exception 'Prueba 4c, la reserva de un pago con tarjeta dura 30 minutos: %', r.reserved_until;
    end if;
    if r.email is distinct from 'prueba@example.com' then
      raise exception 'Prueba 4d, el email se guarda normalizado: %', r.email;
    end if;
    if r.accepts_marketing is distinct from false then
      raise exception 'Prueba 4d2, sin aceptar nada, el pedido no consiente novedades: %', r.accepts_marketing;
    end if;
    select count(*) into v_count from public.stock_movements where order_id = v_order and type = 'reservation';
    if v_count is distinct from 1 then
      raise exception 'Prueba 4e, la reserva deja un movimiento: hay %', v_count;
    end if;

    -- 5 ----------------------------------------------------------------------
    v_res := public.confirm_order_payment(v_order, 'mp-prueba-1');
    select * into r from public.product_variants where id = v_neg90;
    if r.stock_on_hand is distinct from 4 or r.stock_reserved is distinct from 0 then
      raise exception 'Prueba 5a, confirmar convierte la reserva en venta: stock % reservado %', r.stock_on_hand, r.stock_reserved;
    end if;
    v_res := public.confirm_order_payment(v_order, 'mp-prueba-1');
    select * into r from public.product_variants where id = v_neg90;
    if (v_res ->> 'already_confirmed')::boolean is not true or r.stock_on_hand is distinct from 4 then
      raise exception 'Prueba 5b, confirmar dos veces no descuenta dos veces: % stock %', v_res, r.stock_on_hand;
    end if;

    -- 6 ----------------------------------------------------------------------
    v_msg := null;
    begin
      perform public.create_order_with_reservation(v_base || jsonb_build_object(
        'payment_method', 'transfer', 'shipping_method', 'pickup',
        'items', jsonb_build_array(
          jsonb_build_object('variant_id', v_neg90, 'quantity', 1),
          jsonb_build_object('variant_id', v_neg100, 'quantity', 1))));
    exception when others then
      v_msg := sqlerrm;
      get stacked diagnostics v_detail = pg_exception_detail;
    end;
    if v_msg is distinct from 'out_of_stock' then
      raise exception 'Prueba 6a, un talle agotado rechaza el pedido: esperaba out_of_stock y vino %', coalesce(v_msg, 'ningún error');
    elsif nullif(v_detail, '')::jsonb ->> 'size' is distinct from '100'
       or nullif(v_detail, '')::jsonb ->> 'color' is distinct from 'Negro' then
      raise exception 'Prueba 6b, el error dice qué talle se agotó: %', v_detail;
    end if;
    select * into r from public.product_variants where id = v_neg90;
    if r.stock_reserved is distinct from 0 then
      raise exception 'Prueba 6c, un pedido rechazado no reserva nada: reservado %', r.stock_reserved;
    end if;

    -- 7 ----------------------------------------------------------------------
    if public.kit_available_quantity(v_kit) is distinct from 5 then
      raise exception 'Prueba 7a, el disponible del kit es el mínimo de floor(disponible / cantidad): %', public.kit_available_quantity(v_kit);
    end if;
    v_res := public.create_order_with_reservation(v_base || jsonb_build_object(
      'payment_method', 'transfer', 'shipping_method', 'pickup',
      'items', jsonb_build_array(jsonb_build_object('kit_id', v_kit, 'quantity', 1))));
    v_order_kit := (v_res ->> 'order_id')::uuid;
    if (select stock_reserved from public.product_variants where id = v_clas_neg) is distinct from 2
       or (select stock_reserved from public.product_variants where id = v_clas_bla) is distinct from 1 then
      raise exception 'Prueba 7b, reservar el kit reserva sus componentes';
    end if;
    select count(*) into v_count from public.order_items where order_id = v_order_kit and parent_item_id is not null;
    if v_count is distinct from 2 then
      raise exception 'Prueba 7c, los componentes quedan como líneas hijas: hay %', v_count;
    end if;
    select * into r from public.orders where id = v_order_kit;
    if r.reserved_until is distinct from now() + interval '24 hours' then
      raise exception 'Prueba 7d, la reserva por transferencia dura 24 horas: %', r.reserved_until;
    end if;
    if r.total_cents is distinct from 2421000 or r.transfer_discount_cents is distinct from 269000 then
      raise exception 'Prueba 7e, total del kit con transferencia: % (descuento %)', r.total_cents, r.transfer_discount_cents;
    end if;

    -- 8 ----------------------------------------------------------------------
    update public.orders set reserved_until = now() - interval '1 minute' where id = v_order_kit;
    v_count := public.release_expired_reservations();
    select * into r from public.orders where id = v_order_kit;
    if v_count < 1 or r.status is distinct from 'cancelled' then
      raise exception 'Prueba 8a, el job libera la reserva vencida y cancela: liberados % estado %', v_count, r.status;
    end if;
    if (select stock_reserved from public.product_variants where id = v_clas_neg) is distinct from 0 then
      raise exception 'Prueba 8b, la reserva liberada vuelve a estar disponible';
    end if;
    select count(*) into v_count from public.stock_movements where order_id = v_order_kit and type = 'release';
    if v_count is distinct from 2 then
      raise exception 'Prueba 8c, la liberación deja un movimiento por componente: hay %', v_count;
    end if;

    -- 9 ----------------------------------------------------------------------
    v_res := public.confirm_order_payment(v_order_kit, null);
    if v_res ->> 'status' is distinct from 'paid' or (v_res ->> 'needs_review')::boolean is not false then
      raise exception 'Prueba 9a, un pago tardío con stock se cobra sin revisión: %', v_res;
    end if;
    if (select stock_on_hand from public.product_variants where id = v_clas_neg) is distinct from 8 then
      raise exception 'Prueba 9b, un pago tardío con stock descuenta';
    end if;

    -- 10 ---------------------------------------------------------------------
    v_res := public.create_order_with_reservation(v_base || jsonb_build_object(
      'payment_method', 'card', 'shipping_method', 'pickup',
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_nat100, 'quantity', 1))));
    v_order_late := (v_res ->> 'order_id')::uuid;
    update public.orders set reserved_until = now() - interval '1 minute' where id = v_order_late;
    perform public.release_expired_reservations();
    update public.product_variants set stock_on_hand = 0 where id = v_nat100;
    v_res := public.confirm_order_payment(v_order_late, null);
    if v_res ->> 'status' is distinct from 'paid' or (v_res ->> 'needs_review')::boolean is not true then
      raise exception 'Prueba 10a, un pago tardío sin stock se confirma y queda para revisar: %', v_res;
    end if;
    if v_res ->> 'review_reason' not like 'Pago aprobado después de liberar la reserva%' then
      raise exception 'Prueba 10b, el motivo de la revisión: %', v_res ->> 'review_reason';
    end if;
    if (select stock_on_hand from public.product_variants where id = v_nat100) is distinct from 0 then
      raise exception 'Prueba 10c, un pago tardío sin stock no descuenta nada';
    end if;

    -- 11a --------------------------------------------------------------------
    v_msg := null;
    begin
      perform public.create_order_with_reservation(v_base || jsonb_build_object(
        'payment_method', 'card', 'shipping_method', 'pickup', 'coupon_code', 'PRUEBAVENCIDO',
        'items', jsonb_build_array(jsonb_build_object('variant_id', v_nat90, 'quantity', 1))));
    exception when others then
      v_msg := sqlerrm;
      get stacked diagnostics v_detail = pg_exception_detail;
    end;
    if v_msg is distinct from 'invalid_coupon' then
      raise exception 'Prueba 11a, cupón vencido: esperaba invalid_coupon y vino %', coalesce(v_msg, 'ningún error');
    elsif nullif(v_detail, '')::jsonb ->> 'reason' is distinct from 'expired' then
      raise exception 'Prueba 11a, cupón vencido: motivo %', v_detail;
    end if;

    -- 11b --------------------------------------------------------------------
    v_msg := null;
    begin
      perform public.create_order_with_reservation(v_base || jsonb_build_object(
        'payment_method', 'card', 'shipping_method', 'pickup', 'coupon_code', 'PRUEBAAGOTADO',
        'items', jsonb_build_array(jsonb_build_object('variant_id', v_nat90, 'quantity', 1))));
    exception when others then
      v_msg := sqlerrm;
      get stacked diagnostics v_detail = pg_exception_detail;
    end;
    if v_msg is distinct from 'invalid_coupon' then
      raise exception 'Prueba 11b, cupón sin usos: esperaba invalid_coupon y vino %', coalesce(v_msg, 'ningún error');
    elsif nullif(v_detail, '')::jsonb ->> 'reason' is distinct from 'max_uses' then
      raise exception 'Prueba 11b, cupón sin usos: motivo %', v_detail;
    end if;

    -- 11c --------------------------------------------------------------------
    v_msg := null;
    begin
      perform public.create_order_with_reservation(v_base || jsonb_build_object(
        'payment_method', 'card', 'shipping_method', 'pickup', 'coupon_code', 'PRUEBA15',
        'items', jsonb_build_array(jsonb_build_object('variant_id', v_clas_nat, 'quantity', 1))));
    exception when others then
      v_msg := sqlerrm;
      get stacked diagnostics v_detail = pg_exception_detail;
    end;
    if v_msg is distinct from 'invalid_coupon' then
      raise exception 'Prueba 11c, cupón por debajo del mínimo: esperaba invalid_coupon y vino %', coalesce(v_msg, 'ningún error');
    elsif nullif(v_detail, '')::jsonb ->> 'reason' is distinct from 'min_subtotal' then
      raise exception 'Prueba 11c, cupón por debajo del mínimo: motivo %', v_detail;
    end if;

    -- 12 ---------------------------------------------------------------------
    v_res := public.create_order_with_reservation(v_base || jsonb_build_object(
      'payment_method', 'card', 'shipping_method', 'pickup', 'coupon_code', 'pruebaunico',
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_nat90, 'quantity', 1))));
    v_order_coupon := (v_res ->> 'order_id')::uuid;
    select * into r from public.orders where id = v_order_coupon;
    if r.coupon_id is null or r.coupon_discount_cents is distinct from 100000 then
      raise exception 'Prueba 12a, el pedido guarda el cupón aplicado: cupón % descuento %', r.coupon_id, r.coupon_discount_cents;
    end if;
    update public.coupons set used_count = 1 where code = 'PRUEBAUNICO';
    v_res := public.confirm_order_payment(v_order_coupon, null);
    if v_res ->> 'status' is distinct from 'paid' or (v_res ->> 'needs_review')::boolean is not true then
      raise exception 'Prueba 12b, un cupón que se agotó antes del pago no rechaza el pago y queda para revisar: %', v_res;
    end if;
    if v_res ->> 'review_reason' not like '%PRUEBAUNICO%usos máximos%' then
      raise exception 'Prueba 12c, el motivo nombra el cupón: %', v_res ->> 'review_reason';
    end if;
    if (select used_count from public.coupons where code = 'PRUEBAUNICO') is distinct from 2 then
      raise exception 'Prueba 12d, el uso del cupón se cuenta igual';
    end if;

    -- 13 ---------------------------------------------------------------------
    v_res := public.quote_cart(jsonb_build_object(
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_hidden, 'quantity', 1))));
    if (v_res #>> '{lines,0,unavailable}')::boolean is not true then
      raise exception 'Prueba 13a, el presupuesto marca un producto sin publicar: %', v_res;
    end if;
    v_msg := null;
    begin
      perform public.create_order_with_reservation(v_base || jsonb_build_object(
        'payment_method', 'transfer', 'shipping_method', 'pickup',
        'items', jsonb_build_array(jsonb_build_object('variant_id', v_hidden, 'quantity', 1))));
    exception when others then
      v_msg := sqlerrm;
    end;
    if v_msg is distinct from 'item_unavailable' then
      raise exception 'Prueba 13b, no se puede pedir un producto sin publicar: esperaba item_unavailable y vino %', coalesce(v_msg, 'ningún error');
    end if;

    -- 14 ---------------------------------------------------------------------
    -- Solo los rechazos: registrar un movimiento de verdad necesita una usuaria
    -- en auth.users (eso se prueba en la sección del panel).
    v_msg := null;
    begin
      perform public.record_stock_movement(v_neg90, 'manual_sale', 1, 'Venta por Instagram', null);
    exception when others then
      v_msg := sqlerrm;
      get stacked diagnostics v_detail = pg_exception_detail;
    end;
    if v_msg is distinct from 'invalid_movement' or nullif(v_detail, '')::jsonb ->> 'reason' is distinct from 'user_required' then
      raise exception 'Prueba 14a, un movimiento manual sin usuario se rechaza: % %', coalesce(v_msg, 'ningún error'), coalesce(v_detail, '');
    end if;
    v_msg := null;
    begin
      perform public.record_stock_movement(v_neg90, 'adjustment', -1, ' ', gen_random_uuid());
    exception when others then
      v_msg := sqlerrm;
      get stacked diagnostics v_detail = pg_exception_detail;
    end;
    if v_msg is distinct from 'invalid_movement' or nullif(v_detail, '')::jsonb ->> 'reason' is distinct from 'note_required' then
      raise exception 'Prueba 14b, un ajuste sin nota se rechaza: % %', coalesce(v_msg, 'ningún error'), coalesce(v_detail, '');
    end if;
    v_msg := null;
    begin
      perform public.record_stock_movement(v_neg90, 'manual_sale', 999, 'Venta por Instagram', gen_random_uuid());
    exception when others then
      v_msg := sqlerrm;
    end;
    if v_msg is distinct from 'insufficient_stock' then
      raise exception 'Prueba 14c, no se puede vender más de lo disponible: esperaba insufficient_stock y vino %', coalesce(v_msg, 'ningún error');
    end if;

    -- 15. Permisos como la tienda: rol anon, el de la clave publicable ---------
    set local role anon;

    if current_user is distinct from 'anon' then
      raise exception 'Prueba 15a, la prueba de permisos corre como anon: corre como %', current_user;
    end if;
    if not exists (select 1 from public.products where id = v_luna_product) then
      raise exception 'Prueba 15b, anon lee productos publicados: no ve prueba-luna';
    end if;
    if exists (select 1 from public.products where id = v_hidden_product) then
      raise exception 'Prueba 15c, anon no ve productos sin publicar: ve prueba-oculto';
    end if;
    if (select count(*) from public.variant_availability where product_id = v_luna_product) is distinct from 5 then
      raise exception 'Prueba 15d, anon lee variant_availability de un producto publicado';
    end if;
    if exists (select 1 from public.variant_availability where product_id = v_hidden_product) then
      raise exception 'Prueba 15e, variant_availability no muestra productos sin publicar';
    end if;
    select * into r from public.variant_availability where variant_id = v_neg100;
    if r.is_available is not false then
      raise exception 'Prueba 15f, un talle agotado figura como no disponible: %', r;
    end if;
    select * into r from public.variant_availability where variant_id = v_nat85;
    if r.is_available is not true or r.is_last_units is not true then
      raise exception 'Prueba 15g, dos unidades figuran como últimas unidades: %', r;
    end if;
    if not exists (select 1 from public.kit_availability where kit_id = v_kit and is_available) then
      raise exception 'Prueba 15h, anon lee kit_availability';
    end if;

    -- 42501 = permiso denegado. Cualquier otro resultado falla con el nombre de
    -- la prueba, incluso otro error.
    v_msg := null;
    begin
      perform stock_on_hand from public.product_variants limit 1;
    exception when others then
      v_msg := sqlstate;
    end;
    if v_msg is distinct from '42501' then
      raise exception 'Prueba 15i, anon no puede leer stock_on_hand: vino %', coalesce(v_msg, 'pudo leerlo');
    end if;

    v_msg := null;
    begin
      perform stock_reserved from public.product_variants limit 1;
    exception when others then
      v_msg := sqlstate;
    end;
    if v_msg is distinct from '42501' then
      raise exception 'Prueba 15j, anon no puede leer stock_reserved: vino %', coalesce(v_msg, 'pudo leerlo');
    end if;

    v_msg := null;
    begin
      perform cost_cents from public.products limit 1;
    exception when others then
      v_msg := sqlstate;
    end;
    if v_msg is distinct from '42501' then
      raise exception 'Prueba 15k, anon no puede leer cost_cents: vino %', coalesce(v_msg, 'pudo leerlo');
    end if;

    v_msg := null;
    begin
      perform 1 from public.orders limit 1;
    exception when others then
      v_msg := sqlstate;
    end;
    if v_msg is distinct from '42501' then
      raise exception 'Prueba 15l, anon no puede leer orders: vino %', coalesce(v_msg, 'pudo leerlo');
    end if;

    v_msg := null;
    begin
      perform 1 from public.settings limit 1;
    exception when others then
      v_msg := sqlstate;
    end;
    if v_msg is distinct from '42501' then
      raise exception 'Prueba 15m, anon no puede leer settings: vino %', coalesce(v_msg, 'pudo leerlo');
    end if;

    -- Pero sí lee por la vista las claves que muestra la tienda, y solo esas.
    select count(*) into v_count from public.public_settings;
    if v_count is distinct from 5
       or (select value #>> '{}' from public.public_settings where key = 'transfer_discount_percent') is distinct from '10'
       or exists (select 1 from public.public_settings where key in ('bank_alias', 'bank_cbu')) then
      raise exception 'Prueba 15m2, anon lee la configuración de la tienda sin el alias ni el CBU: ve % claves', v_count;
    end if;

    v_msg := null;
    begin
      perform public.create_order_with_reservation('{}'::jsonb);
    exception when others then
      v_msg := sqlstate;
    end;
    if v_msg is distinct from '42501' then
      raise exception 'Prueba 15n, anon no puede crear pedidos: vino %', coalesce(v_msg, 'pudo llamarla');
    end if;

    v_msg := null;
    begin
      perform 1 from public.admin_users limit 1;
    exception when others then
      v_msg := sqlstate;
    end;
    if v_msg is distinct from '42501' then
      raise exception 'Prueba 15o, anon no puede leer admin_users: vino %', coalesce(v_msg, 'pudo leerla');
    end if;

    v_msg := null;
    begin
      perform 1 from public.low_stock_variants limit 1;
    exception when others then
      v_msg := sqlstate;
    end;
    if v_msg is distinct from '42501' then
      raise exception 'Prueba 15p, anon no puede leer low_stock_variants: vino %', coalesce(v_msg, 'pudo leerla');
    end if;

    v_msg := null;
    begin
      perform public.admin_dashboard();
    exception when others then
      v_msg := sqlstate;
    end;
    if v_msg is distinct from '42501' then
      raise exception 'Prueba 15q, anon no puede pedir el resumen del panel: vino %', coalesce(v_msg, 'pudo llamarlo');
    end if;

    reset role;

    -- Panel: usuarias simuladas con el JWT --------------------------------------
    insert into auth.users (id, email, aud, role) values
      (v_admin, 'admin-humo@example.com', 'authenticated', 'authenticated'),
      (v_other, 'clienta-humo@example.com', 'authenticated', 'authenticated');
    insert into public.admin_users (user_id, name) values (v_admin, 'Admin de prueba');

    -- Una transferencia pendiente, creada como la crearía el checkout.
    v_res := public.create_order_with_reservation(jsonb_build_object(
      'email', 'prueba@example.com', 'phone', '3430000000',
      'payment_method', 'transfer', 'shipping_method', 'pickup',
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_neg90, 'quantity', 1))));
    v_order_transfer := (v_res ->> 'order_id')::uuid;

    -- 16. Administradora con segundo factor --------------------------------------
    perform set_config('request.jwt.claims',
      jsonb_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal2')::text, true);
    set local role authenticated;

    if private.is_admin() is not true then
      raise exception 'Prueba 16a, una administradora con segundo factor es administradora';
    end if;
    if not exists (select 1 from public.products where id = v_hidden_product) then
      raise exception 'Prueba 16b, la administradora ve productos sin publicar';
    end if;
    select stock_on_hand into v_count from public.product_variants where id = v_neg90;
    if v_count is null then
      raise exception 'Prueba 16c, la administradora lee el stock';
    end if;
    if not exists (select 1 from public.orders where id = v_order_transfer) then
      raise exception 'Prueba 16d, la administradora ve los pedidos';
    end if;

    v_res := public.confirm_order_payment(v_order_transfer, null);
    select * into r from public.orders where id = v_order_transfer;
    if r.status is distinct from 'paid' or r.paid_at is null then
      raise exception 'Prueba 16e, confirmar una transferencia la marca pagada con fecha de pago: % %', r.status, r.paid_at;
    end if;

    perform public.set_order_status(v_order_transfer, 'preparing');
    perform public.set_order_status(v_order_transfer, 'ready_for_pickup');
    v_res := public.set_order_status(v_order_transfer, 'delivered');
    if v_res ->> 'status' is distinct from 'delivered' then
      raise exception 'Prueba 16f, un retiro pasa por preparando y listo para retirar hasta entregado: %', v_res;
    end if;
    v_msg := null;
    begin
      perform public.set_order_status(v_order_transfer, 'paid');
    exception when others then
      v_msg := sqlerrm;
    end;
    if v_msg is distinct from 'invalid_transition' then
      raise exception 'Prueba 16g, no se puede saltar de entregado a pagado: vino %', coalesce(v_msg, 'ningún error');
    end if;

    v_res := public.restock_variant(v_neg90, 2, 'Ingreso de prueba', v_admin);
    if not exists (
      select 1 from public.stock_movements
      where created_by = v_admin and type = 'restock' and variant_id = v_neg90
    ) then
      raise exception 'Prueba 16h, la administradora repone stock y queda su usuario: %', v_res;
    end if;

    update public.settings set value = '12' where key = 'transfer_discount_percent';
    get diagnostics v_count = row_count;
    if v_count is distinct from 1 then
      raise exception 'Prueba 16i, la administradora edita la configuración';
    end if;

    select price_cents into v_price from public.products where id = v_luna_product;
    update public.products set price_cents = v_price + 10000 where id = v_luna_product;
    if not exists (
      select 1 from public.price_changes
      where product_id = v_luna_product and old_price_cents = v_price and new_price_cents = v_price + 10000
        and reason = 'Edición manual' and created_by = v_admin
    ) then
      raise exception 'Prueba 16j, una edición de precio queda en el historial con su autora';
    end if;

    -- 3.300.000 + 10% = 3.630.000, que ya es múltiplo de la centena de pesos.
    select p.new_price_cents into v_count
    from public.preview_price_change(array[v_luna_product], 10, 10000, false) p;
    if v_count is distinct from 3630000 then
      raise exception 'Prueba 16k, la vista previa del aumento: %', v_count;
    end if;
    -- En dos sentencias: una sola no ve lo que cambia la función que llama.
    v_count := public.apply_price_change(array[v_luna_product], 10, 10000, false, 'Aumento de prueba');
    select price_cents into v_price from public.products where id = v_luna_product;
    if v_count is distinct from 1 or v_price is distinct from 3630000 then
      raise exception 'Prueba 16l, aplicar el aumento deja el precio de la vista previa: % productos, precio %', v_count, v_price;
    end if;
    if not exists (
      select 1 from public.price_changes where product_id = v_luna_product and reason = 'Aumento de prueba'
    ) then
      raise exception 'Prueba 16m, el aumento masivo queda en el historial con su motivo';
    end if;
    if public.adjusted_price(1234500, 5, 10000) is distinct from 1300000 then
      raise exception 'Prueba 16n, el redondeo es hacia arriba a la centena de pesos: %', public.adjusted_price(1234500, 5, 10000);
    end if;
    v_msg := null;
    begin
      perform public.apply_price_change(array[v_luna_product], 0, 10000, false, null);
    exception when others then
      v_msg := sqlerrm;
    end;
    if v_msg is distinct from 'invalid_price_change' then
      raise exception 'Prueba 16o, un cambio de 0%% se rechaza: vino %', coalesce(v_msg, 'ningún error');
    end if;

    v_res := public.admin_dashboard();
    if (v_res ->> 'sales_today_cents') is null or (v_res ->> 'orders_today')::integer < 1 then
      raise exception 'Prueba 16p, el resumen del panel cuenta la venta de hoy: %', v_res;
    end if;
    if not exists (select 1 from public.low_stock_variants where sku = 'PRUEBA-NEG-100') then
      raise exception 'Prueba 16q, un talle agotado aparece en stock bajo';
    end if;

    v_count := public.set_settings(jsonb_build_object(
      'transfer_discount_percent', 15, 'bank_alias', null));
    if v_count is distinct from 2
       or public.setting_text('transfer_discount_percent') is distinct from '15'
       or public.setting_text('bank_alias') is not null
       or (select jsonb_typeof(value) from public.settings where key = 'bank_alias') is distinct from 'null' then
      raise exception 'Prueba 16r, guardar la configuración deja el null de JSON en lo que queda vacío: % filas', v_count;
    end if;
    v_msg := null;
    begin
      perform public.set_settings(jsonb_build_object('clave_inventada', 1));
    exception when others then
      v_msg := sqlerrm;
      get stacked diagnostics v_detail = pg_exception_detail;
    end;
    if v_msg is distinct from 'invalid_setting'
       or nullif(v_detail, '')::jsonb #>> '{keys,0}' is distinct from 'clave_inventada' then
      raise exception 'Prueba 16s, una clave que no existe se rechaza: % %', coalesce(v_msg, 'ningún error'), v_detail;
    end if;

    reset role;

    -- 17. La misma administradora, solo con contraseña ---------------------------
    perform set_config('request.jwt.claims',
      jsonb_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal1')::text, true);
    set local role authenticated;

    if private.is_admin() then
      raise exception 'Prueba 17a, sin segundo factor no es administradora';
    end if;
    if not exists (select 1 from public.admin_users where user_id = v_admin) then
      raise exception 'Prueba 17b, sin segundo factor ve su propia fila para ir a verificarlo';
    end if;
    select count(*) into v_count from public.orders;
    if v_count is distinct from 0 then
      raise exception 'Prueba 17c, sin segundo factor no ve pedidos: ve %', v_count;
    end if;
    select count(*) into v_count from public.products;
    if v_count is distinct from 0 then
      raise exception 'Prueba 17d, sin segundo factor no ve productos: ve %', v_count;
    end if;

    reset role;

    -- 18. Una clienta con cuenta --------------------------------------------------
    perform set_config('request.jwt.claims',
      jsonb_build_object('sub', v_other, 'role', 'authenticated', 'aal', 'aal2')::text, true);
    set local role authenticated;

    if private.is_admin() then
      raise exception 'Prueba 18a, una clienta no es administradora';
    end if;
    select count(*) into v_count from public.products;
    if v_count is distinct from 0 then
      raise exception 'Prueba 18b, una clienta no lee el catálogo con su sesión (costos y stock): ve %', v_count;
    end if;
    select count(*) into v_count from public.orders;
    if v_count is distinct from 0 then
      raise exception 'Prueba 18c, una clienta no ve pedidos: ve %', v_count;
    end if;
    select count(*) into v_count from public.admin_users;
    if v_count is distinct from 0 then
      raise exception 'Prueba 18d, una clienta no ve administradoras: ve %', v_count;
    end if;
    update public.settings set value = '50' where key = 'transfer_discount_percent';
    get diagnostics v_count = row_count;
    if v_count is distinct from 0 then
      raise exception 'Prueba 18e, una clienta no edita la configuración';
    end if;
    v_msg := null;
    begin
      perform public.confirm_order_payment(v_order_transfer, null);
    exception when others then
      v_msg := sqlerrm;
    end;
    if v_msg is distinct from 'order_not_found' then
      raise exception 'Prueba 18f, una clienta no confirma pagos: vino %', coalesce(v_msg, 'ningún error');
    end if;
    v_msg := null;
    begin
      perform public.record_stock_movement(v_neg90, 'restock', 1, 'Intento', v_other);
    exception when others then
      v_msg := sqlerrm;
    end;
    if v_msg is distinct from 'variant_not_found' then
      raise exception 'Prueba 18g, una clienta no mueve stock: vino %', coalesce(v_msg, 'ningún error');
    end if;

    reset role;
  exception when others then
    -- La secuencia no vuelve atrás con el rollback: se restaura antes de fallar.
    perform setval('public.order_number_seq', v_seq_last, v_seq_called);
    raise;
  end;

  perform setval('public.order_number_seq', v_seq_last, v_seq_called);
end
$$;

rollback;

select 'todas las pruebas pasaron' as resultado;
