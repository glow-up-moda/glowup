-- Consentimiento para novedades (§7, paso 6 del checkout, y §15).
--
-- Se guarda en el pedido porque es ahí donde se da: "acepto recibir novedades"
-- al comprar. Arranca en false, que es el default seguro: sin marcarlo, la
-- tienda no puede mandarle nada que no sea sobre su propio pedido (§13).
--
-- Lo escribe el checkout justo después de crear el pedido, no
-- `create_order_with_reservation`: esa función es la que reserva stock y no
-- cambia por un dato de marketing.

alter table public.orders
  add column accepts_marketing boolean not null default false;

comment on column public.orders.accepts_marketing is
  'La clienta aceptó recibir novedades al comprar. Sin esto, solo se le escribe por su pedido.';
