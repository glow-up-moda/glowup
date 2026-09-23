-- Una reseña por producto y por pedido (§13).
--
-- La reseña se deja desde la página del pedido, así que el pedido es quien la
-- habilita. Sin este índice, recargar o hacer doble clic dejaba dos.
--
-- order_id puede quedar en null si el pedido se borra: esas filas no compiten
-- entre sí, por eso el índice es parcial.

create unique index reviews_order_product_idx
  on public.reviews (order_id, product_id)
  where order_id is not null;
