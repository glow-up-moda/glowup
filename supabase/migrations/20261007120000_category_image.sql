-- La foto de cada categoría, para las tarjetas del inicio (§7).
--
-- El archivo vive en el mismo bucket que las fotos de producto, bajo
-- `categories/`: es el mismo tipo de archivo (WebP, hasta 2 MB) y las mismas
-- políticas, así que no hace falta un bucket aparte.
--
-- No lleva grant nuevo: el permiso de lectura de `categories` es sobre la
-- tabla entera, así que la columna sale sola por la API pública.

alter table public.categories add column image_path text;

alter table public.categories add constraint categories_image_path_check
  check (image_path is null or length(trim(image_path)) > 0);

comment on column public.categories.image_path is
  'Ruta en el bucket product-images, o null si no tiene foto.';
