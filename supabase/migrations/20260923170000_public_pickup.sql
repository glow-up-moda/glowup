-- El punto de retiro, en la vista que lee la tienda (§12).
--
-- Va acá porque la clienta tiene que verlo antes de elegir "retiro", no
-- después de pagar: dónde y a qué hora puede pasar a buscarlo. Es lo único
-- nuevo que sale por esta vista; el alias y el CBU siguen sin salir.

create or replace view public.public_settings
with (security_invoker = false)
as
select s.key, s.value
from public.settings s
where s.key in (
  'transfer_discount_percent',
  'free_shipping_threshold_cents',
  'announcement_messages',
  'whatsapp_number',
  'same_day_cutoff_time',
  'pickup_address',
  'pickup_hours'
);
