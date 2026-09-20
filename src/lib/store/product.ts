import { compareSizes } from "@/lib/sizes";
import { createCatalogClient } from "@/lib/supabase/catalog";

import { listProducts, type ProductCard } from "./catalog";

// Ficha de producto: lo que se ve en /producto/[slug] (§7).

export type ProductVariant = {
  id: string;
  color: string;
  size: string;
  isAvailable: boolean;
  isLastUnits: boolean;
};

export type ProductReview = {
  id: string;
  rating: number;
  text: string | null;
  name: string | null;
  createdAt: string;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  materialsCare: string | null;
  measurements: string | null;
  modelInfo: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string | null;
  images: { path: string; alt: string }[];
  variants: ProductVariant[];
  colors: string[];
  sizes: string[];
  reviews: ProductReview[];
  rating: { average: number; count: number } | null;
};

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const supabase = createCatalogClient();
  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, materials_care, measurements, model_info, price_cents, compare_at_price_cents, seo_title, seo_description, category_id, product_images(path, alt, sort_order), product_variants(id, color, size)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!product) return null;

  const [{ data: availability }, { data: reviews }] = await Promise.all([
    supabase
      .from("variant_availability")
      .select("variant_id, is_available, is_last_units")
      .eq("product_id", product.id),
    supabase
      .from("reviews")
      .select("id, rating, text, name, created_at")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false }),
  ]);

  const states = new Map(
    (availability ?? []).map((row) => [row.variant_id, row] as const),
  );
  const variants: ProductVariant[] = product.product_variants
    .map((variant) => ({
      id: variant.id,
      color: variant.color,
      size: variant.size,
      isAvailable: states.get(variant.id)?.is_available === true,
      isLastUnits: states.get(variant.id)?.is_last_units === true,
    }))
    .sort(
      (a, b) =>
        a.color.localeCompare(b.color, "es") || compareSizes(a.size, b.size),
    );

  const ratings = (reviews ?? []).map((review) => review.rating);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    materialsCare: product.materials_care,
    measurements: product.measurements,
    modelInfo: product.model_info,
    priceCents: product.price_cents,
    compareAtPriceCents: product.compare_at_price_cents,
    seoTitle: product.seo_title,
    seoDescription: product.seo_description,
    categoryId: product.category_id,
    images: [...product.product_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ path, alt }) => ({ path, alt })),
    variants,
    colors: [...new Set(variants.map((variant) => variant.color))],
    sizes: [...new Set(variants.map((variant) => variant.size))].sort(
      compareSizes,
    ),
    reviews: (reviews ?? []).map((review) => ({
      id: review.id,
      rating: review.rating,
      text: review.text,
      name: review.name,
      createdAt: review.created_at,
    })),
    rating: ratings.length
      ? {
          average:
            ratings.reduce((total, value) => total + value, 0) / ratings.length,
          count: ratings.length,
        }
      : null,
  };
}

/** "Combinalo con": otros productos de la misma categoría (§7). */
export async function listRelatedProducts(
  product: ProductDetail,
  limit = 4,
): Promise<ProductCard[]> {
  const products = await listProducts({
    categoryIds: product.categoryId ? [product.categoryId] : undefined,
    limit: limit + 1,
  });
  return products.filter((card) => card.id !== product.id).slice(0, limit);
}
