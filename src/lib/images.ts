// Fotos de productos en Supabase Storage (bucket público product-images).
// Cada foto tiene dos archivos WebP: el principal y una miniatura "-thumb".

export const PRODUCT_IMAGES_BUCKET = "product-images";

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
