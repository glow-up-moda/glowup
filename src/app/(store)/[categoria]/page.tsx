import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CategoryListing } from "@/components/store/category-listing";
import { getCategoryBySlug, getNavigation } from "@/lib/store/catalog";

export async function generateMetadata({
  params,
}: PageProps<"/[categoria]">): Promise<Metadata> {
  const { categoria } = await params;
  const found = await getCategoryBySlug(categoria);
  if (!found) return {};
  return {
    title: `${found.category.name} · GLOW UP`,
    description: `${found.category.name} de GLOW UP. Envío a todo el país y en el día en Paraná y Oro Verde.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[categoria]">) {
  const { categoria } = await params;
  const found = await getCategoryBySlug(categoria);
  if (!found) notFound();
  // Una subcategoría suelta va a su dirección completa.
  if (found.parent) redirect(`/${found.parent.slug}/${found.category.slug}`);

  const navigation = await getNavigation();
  const category = navigation.find((item) => item.slug === categoria);
  if (!category) notFound();

  // La categoría madre muestra también lo que cuelga de sus subcategorías.
  const categoryIds = [
    category.id,
    ...category.children.map((child) => child.id),
  ];

  return (
    <CategoryListing
      title={category.name}
      categoryIds={categoryIds}
      basePath={`/${category.slug}`}
      subcategories={category.children}
      searchParams={await searchParams}
    />
  );
}
