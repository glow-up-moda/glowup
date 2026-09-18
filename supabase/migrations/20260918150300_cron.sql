-- Libera las reservas vencidas cada 5 minutos (CLAUDE.md §9.5).
-- El job corre como postgres, dueño de la función.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Con un nombre que ya existe, cron.schedule actualiza el job en vez de
-- duplicarlo: la migración se puede volver a aplicar sin efectos raros.
select cron.schedule(
  'release-expired-reservations',
  '*/5 * * * *',
  $$select public.release_expired_reservations()$$
);
