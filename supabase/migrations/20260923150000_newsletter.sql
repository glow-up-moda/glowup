-- Newsletter con cupón de primera compra (§7, inicio, y §13).
--
-- Consentimiento explícito (§15): el formulario dice para qué es y cada email
-- lleva el link de baja, que escribe en `marketing_optouts` igual que el del
-- carrito abandonado.
--
-- El cupón no se genera por persona: se manda el código que esté cargado en
-- `welcome_coupon_code`, que se administra como cualquier otro cupón (§7). Sin
-- código cargado, el email es una bienvenida sin descuento.

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now(),
  -- Cuándo se le mandó la bienvenida con el cupón.
  welcomed_at timestamptz
);

comment on table public.newsletter_subscribers is
  'Quienes pidieron recibir novedades desde el inicio. La baja va a marketing_optouts.';

alter table public.newsletter_subscribers enable row level security;

insert into public.settings (key, value) values
  ('welcome_coupon_code', 'null'::jsonb)
on conflict (key) do nothing;
