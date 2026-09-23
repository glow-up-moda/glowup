import type { MetadataRoute } from "next";

import { getNavigation } from "@/lib/store/catalog";
import { absoluteUrl, INDEXABLE } from "@/lib/site";
import { createCatalogClient } from "@/lib/supabase/catalog";

// sitemap.xml (§14): lo que una clienta puede llegar buscando. No entran el
// checkout, los pedidos ni el panel.

export const revalidate = 3600;

const STATIC = [
  { path: "/", priority: 1 },
  { path: "/kits", priority: 0.8 },
  { path: "/guia-de-talles", priority: 0.6 },
  { path: "/envios-y-cambios", priority: 0.6 },
  { path: "/preguntas-frecuentes", priority: 0.5 },
  { path: "/nosotras", priority: 0.5 },
  { path: "/contacto", priority: 0.5 },
  { path: "/terminos", priority: 0.2 },
  { path: "/privacidad", priority: 0.2 },
  { path: "/arrepentimiento", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!INDEXABLE) return [];

  const supabase = createCatalogClient();
  const [categories, { data: products }] = await Promise.all([
    getNavigation(),
    supabase
      .from("products")
      .select("slug, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
  ]);

  const categoryPaths = categories.flatMap((category) => [
    `/${category.slug}`,
    ...category.children.map((child) => `/${category.slug}/${child.slug}`),
  ]);

  return [
    ...STATIC.map((page) => ({
      url: absoluteUrl(page.path),
      changeFrequency: "monthly" as const,
      priority: page.priority,
    })),
    ...categoryPaths.map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...(products ?? []).map((product) => ({
      url: absoluteUrl(`/producto/${product.slug}`),
      lastModified: new Date(product.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
