-- Carrito abandonado (§13).
--
-- El carrito vive en el navegador (§7), así que para poder escribirle hay que
-- guardar una copia. Se guarda solo cuando la clienta dejó su email y marcó
-- que quiere recibir novedades (§15): sin las dos cosas no se anota nada, y si
-- desmarca el consentimiento la fila se borra.
--
-- Es el único lugar donde queda un email de alguien que todavía no compró, así
-- que el job diario también limpia lo viejo.

create table public.abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  -- Uno por persona: si vuelve a cargar el carrito, se pisa el anterior.
  email text not null unique
    check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Las líneas tal como las guarda el navegador, para poder rearmarlo.
  items jsonb not null,
  total_cents integer not null check (total_cents >= 0),
  notified_at timestamptz,
  -- Compró: ya no hay nada que recordarle.
  recovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.abandoned_carts is
  'Copia del carrito de quien dejó su email y aceptó novedades, para el aviso de carrito abandonado.';

create trigger set_updated_at before update on public.abandoned_carts
  for each row execute function public.set_updated_at();

create index abandoned_carts_pending_idx
  on public.abandoned_carts (updated_at)
  where notified_at is null and recovered_at is null;

-- Quien se da de baja desde el email no vuelve a recibir, aunque más adelante
-- vuelva a marcar la casilla sin querer.
create table public.marketing_optouts (
  email text primary key
    check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);

comment on table public.marketing_optouts is
  'Emails que pidieron no recibir más avisos de marketing.';

-- Nacen privadas (§8): las escribe el servidor con la clave secreta.
alter table public.abandoned_carts enable row level security;
alter table public.marketing_optouts enable row level security;
