-- Los textos y la foto del inicio, para que se editen desde el panel (§7).
--
-- `home_texts` es un objeto con una clave por campo. Va en una sola fila y no
-- en una fila por texto porque el panel los guarda todos juntos, con un solo
-- botón, y así la vista pública no crece una clave por cada frase.
--
-- Arranca vacío a propósito: los valores por defecto viven en el código
-- (`src/lib/store/settings.ts`), así no quedan duplicados acá y allá. Lo que
-- se guarda es solo lo que la dueña cambió.

insert into public.settings (key, value) values
  ('home_texts', '{}'::jsonb),
  ('home_hero_image_path', 'null'::jsonb)
on conflict (key) do nothing;

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
  'kits_image_path',
  'home_texts',
  'home_hero_image_path'
);
