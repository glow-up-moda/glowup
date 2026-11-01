-- Imagen de portada opcional para cada kit fijo o combinable.
-- Cuando es NULL, la tienda conserva las fotos automáticas de sus productos.
alter table public.kits
  add column if not exists cover_image_path text;

comment on column public.kits.cover_image_path is
  'Ruta de la imagen de portada propia del kit en el bucket público product-images. Si es null, la tienda usa las fotos de los productos del kit.';
