-- Lo que la tienda necesita de `settings` (§8).
--
-- `settings` guarda además el alias y el CBU, que solo ve el servidor, así que
-- no se puede abrir la tabla entera. Esta vista expone únicamente las claves
-- que la tienda muestra a cualquiera: la barra de anuncios, el descuento por
-- transferencia, el monto de envío gratis, el WhatsApp y el horario de corte
-- del envío en el día.
--
-- Corre con los permisos de su dueño, como las vistas de disponibilidad,
-- porque `anon` no puede leer `settings`. El revisor de Supabase la va a
-- marcar como "security definer view": es intencional, y por eso el filtro de
-- claves vive adentro de la vista.

create view public.public_settings
with (security_invoker = false)
as
select s.key, s.value
from public.settings s
where s.key in (
  'transfer_discount_percent',
  'free_shipping_threshold_cents',
  'announcement_messages',
  'whatsapp_number',
  'same_day_cutoff_time'
);

comment on view public.public_settings is
  'Configuración que muestra la tienda. Corre con los permisos del dueño porque anon no puede leer settings; la lista de claves de adentro es lo que la hace segura: el alias y el CBU nunca salen por acá.';

grant select on public.public_settings to anon, authenticated;
