-- Registro de emails enviados (§13).
--
-- Sirve para una sola cosa: que el mismo email no salga dos veces. Marcar un
-- pedido como enviado, volver atrás y volver a marcarlo es una corrección
-- normal en el panel, y la clienta no tiene por qué enterarse dos veces; el
-- pedido de reseña lo manda un cron que vuelve a pasar cada día.
--
-- La clave la arma quien manda: `enviado:<order_id>`, `resena:<order_id>`,
-- `repuesto:<request_id>`. Es única, así que el insert falla cuando ya se
-- mandó y eso mismo es la señal para no mandarlo de nuevo.
--
-- Nace privada (§8): no se otorga nada a anon ni a authenticated, así que solo
-- la toca el servidor con la clave secreta.

create table public.sent_emails (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  kind text not null,
  recipient text not null,
  sent_at timestamptz not null default now()
);

comment on table public.sent_emails is
  'Un email ya enviado. La unicidad de key es lo que evita el duplicado.';

alter table public.sent_emails enable row level security;
