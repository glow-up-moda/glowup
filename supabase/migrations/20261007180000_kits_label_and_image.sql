-- El nombre y la foto del bloque de kits, que en la tienda se llama "Combos".
--
-- No es una categoría: `/kits` es una ruta fija que lista la tabla `kits`, no
-- productos de una categoría, así que su etiqueta y su foto no tienen dónde
-- vivir en `categories`. Van en `settings`, con la foto en el mismo bucket y
-- la misma forma que las de categoría (§7).

insert into public.settings (key, value) values
  ('kits_label', '"Combos"'::jsonb),
  ('kits_image_path', 'null'::jsonb)
on conflict (key) do nothing;

-- La tienda lee la configuración por esta vista, no por la tabla: `settings`
-- también guarda el alias y el CBU.
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
  'pickup_hours',
  'kits_label',
  'kits_image_path'
);
