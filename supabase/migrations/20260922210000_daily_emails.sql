-- Emails que dependen del calendario (§13): por ahora el pedido de reseña,
-- unos días después de la entrega.
--
-- El trabajo lo hace la app, no la base: las plantillas y Resend viven en
-- Next. pg_cron solo despierta a la app una vez por día con pg_net, y la app
-- decide a quién le toca y anota lo enviado en `sent_emails`.
--
-- La URL y el secreto viven en `settings`, no acá: el repositorio es público
-- (§2). Mientras estén vacíos, el job corre y no hace nada.

-- 1. Cuándo se entregó, para poder contar los días. Mismo patrón que paid_at.
alter table public.orders add column delivered_at timestamptz;

comment on column public.orders.delivered_at is
  'Cuándo se marcó como entregado. La reseña se pide unos días después.';

create function public.set_order_delivered_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'delivered'
     and old.status is distinct from 'delivered'
     and new.delivered_at is null then
    new.delivered_at := now();
  end if;
  return new;
end;
$$;

create trigger set_delivered_at before update of status on public.orders
  for each row execute function public.set_order_delivered_at();

create index orders_delivered_at_idx on public.orders (delivered_at)
  where delivered_at is not null;

-- 2. Adónde llamar. Se cargan a mano, igual que el alias y el CBU.
insert into public.settings (key, value) values
  ('cron_site_url', 'null'::jsonb),
  ('cron_secret', 'null'::jsonb)
on conflict (key) do nothing;

-- 3. El llamado diario.
create extension if not exists pg_net;

create function public.run_daily_emails()
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select (s.value #>> '{}') into v_url
    from public.settings s where s.key = 'cron_site_url';
  select (s.value #>> '{}') into v_secret
    from public.settings s where s.key = 'cron_secret';

  -- Sin configurar no hay a quién llamar, y no es un error.
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/api/cron/emails',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

-- 10 de la mañana en Argentina. Con un nombre que ya existe, cron.schedule
-- actualiza el job en vez de duplicarlo.
select cron.schedule(
  'daily-emails',
  '0 13 * * *',
  $$select public.run_daily_emails()$$
);
