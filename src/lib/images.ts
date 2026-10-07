// Fotos del catálogo en Supabase Storage (bucket público product-images).
// Guarda las de producto, cada una con dos archivos WebP —el principal y una
// miniatura "-thumb"—, y las de categoría, que son una sola, bajo categories/.

export const PRODUCT_IMAGES_BUCKET = "product-images";

/** Tope del servidor al subir. El navegador ya la achicó antes de mandarla. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function thumbPath(path: string): string {
  return path.replace(/\.webp$/, "-thumb.webp");
}

export function productImageUrl(
  path: string,
  size: "full" | "thumb" = "full",
): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const file = size === "thumb" ? thumbPath(path) : path;
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${file}`;
}
