import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ConfirmAction } from "@/components/admin/confirm-action";
import { PageHeader, Section } from "@/components/admin/page-header";
import { PhotoManager } from "@/components/admin/photo-manager";
import { ProductForm } from "@/components/admin/product-form";
import { VariantEditor } from "@/components/admin/variant-editor";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import {
  adminNames,
  categoryOptions,
  lowStockDefault,
} from "@/lib/admin/catalog";
import { isUuid, param } from "@/lib/admin/params";
import { compareVariants } from "@/lib/admin/sizes";
import { MOVEMENT_LABELS, movementSign } from "@/lib/admin/stock";
import { requireAdmin } from "@/lib/auth/admin";
import { centsToPesosInput, formatDateTime, formatMoney } from "@/lib/format";

import {
  addVariant,
  deleteProduct,
  deleteProductImage,
  deleteVariant,
  moveProductImage,
  updateImageAlt,
  updateProduct,
  updateVariant,
  uploadProductImage,
} from "../actions";

export const metadata: Metadata = { title: "Producto" };

export default async function ProductPage({
  params,
  searchParams,
}: PageProps<"/admin/productos/[id]">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const query = await searchParams;

  const [
    { data: product },
    categories,
    { data: variants },
    { data: photos },
    { data: movements },
    { data: prices },
    names,
    threshold,
  ] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    categoryOptions(supabase),
    supabase
      .from("product_variants")
      .select(
        "id, color, size, sku, stock_on_hand, stock_reserved, low_stock_threshold",
      )
      .eq("product_id", id),
    supabase
      .from("product_images")
      .select("id, path, alt, sort_order")
      .eq("product_id", id)
      .order("sort_order"),
    supabase
      .from("stock_movements")
      .select(
        "id, type, quantity, note, created_at, created_by, product_variants!inner(color, size, product_id)",
      )
      .eq("product_variants.product_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("price_changes")
      .select(
        "id, old_price_cents, new_price_cents, reason, created_at, created_by",
      )
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    adminNames(supabase),
    lowStockDefault(supabase),
  ]);

  if (!product) notFound();

  const sortedVariants = [...(variants ?? [])]
    .sort(compareVariants)
    .map((variant) => ({
      ...variant,
      update: updateVariant.bind(null, variant.id),
      remove: deleteVariant.bind(null, variant.id),
    }));

  const photoRows = (photos ?? []).map((photo, index, all) => ({
    id: photo.id,
    path: photo.path,
    alt: photo.alt,
    updateAlt: updateImageAlt.bind(null, photo.id),
    remove: deleteProductImage.bind(null, photo.id),
    moveUp: index > 0 ? moveProductImage.bind(null, id, photo.id, "up") : null,
    moveDown:
      index < all.length - 1
        ? moveProductImage.bind(null, id, photo.id, "down")
        : null,
  }));

  return (
    <>
      <PageHeader
        title={product.name}
        back={{ href: "/admin/productos", label: "Productos" }}
        actions={
          <Badge tone={product.is_published ? "success" : "neutral"}>
            {product.is_published ? "Publicado" : "Borrador"}
          </Badge>
        }
      />

      {param(query.nuevo) && (
        <Notice tone="success" className="mb-4">
          Producto creado como borrador. Sumale variantes con stock y dos fotos
          para poder publicarlo.
        </Notice>
      )}

      <div className="flex flex-col gap-6">
        <Section title="Variantes y stock" id="stock">
          <VariantEditor
            variants={sortedVariants}
            addAction={addVariant.bind(null, id)}
            lowStockDefault={threshold}
          />
        </Section>

        <Section title="Fotos" id="fotos">
          <PhotoManager
            photos={photoRows}
            uploadAction={uploadProductImage.bind(null, id)}
          />
        </Section>

        <Section title="Datos del producto" id="datos">
          <ProductForm
            action={updateProduct.bind(null, id)}
            categories={categories}
            mode="edit"
            initial={{
              name: product.name,
              slug: product.slug,
              category_id: product.category_id,
              description: product.description ?? "",
              materials_care: product.materials_care ?? "",
              measurements: product.measurements ?? "",
              model_info: product.model_info ?? "",
              price: centsToPesosInput(product.price_cents),
              compare_at_price: centsToPesosInput(
                product.compare_at_price_cents,
              ),
              cost: centsToPesosInput(product.cost_cents),
              seo_title: product.seo_title ?? "",
              seo_description: product.seo_description ?? "",
              is_published: product.is_published,
            }}
          />
        </Section>

        <Section title="Últimos movimientos de stock">
          {!movements?.length ? (
            <p>Todavía no hay movimientos.</p>
          ) : (
            <ul className="divide-y divide-crema-oscuro">
              {movements.map((movement) => (
                <li
                  key={movement.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
                >
                  <span>
                    <span className="font-medium">
                      {MOVEMENT_LABELS[movement.type]}
                    </span>{" "}
                    <span className="text-sm">
                      {movement.product_variants.color} ·{" "}
                      {movement.product_variants.size}
                    </span>
                    {movement.note && (
                      <span className="block text-sm">{movement.note}</span>
                    )}
                  </span>
                  <span className="text-right text-sm">
                    <span className="block font-medium">
                      {movementSign(movement.type, movement.quantity)}
                    </span>
                    {formatDateTime(movement.created_at)}
                    {movement.created_by && names.get(movement.created_by)
                      ? ` · ${names.get(movement.created_by)}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Historial de precios">
          {!prices?.length ? (
            <p>El precio no cambió desde que se creó.</p>
          ) : (
            <ul className="divide-y divide-crema-oscuro">
              {prices.map((change) => (
                <li
                  key={change.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
                >
                  <span>
                    {formatMoney(change.old_price_cents)} →{" "}
                    {formatMoney(change.new_price_cents)}
                    {change.reason && (
                      <span className="block text-sm">{change.reason}</span>
                    )}
                  </span>
                  <span className="text-sm">
                    {formatDateTime(change.created_at)}
                    {change.created_by && names.get(change.created_by)
                      ? ` · ${names.get(change.created_by)}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <ConfirmAction
          action={deleteProduct.bind(null, id)}
          label="Borrar producto"
          question="Se borra con sus variantes y fotos. Si ya tuvo ventas no se puede: en ese caso, despublicalo."
          confirmLabel="Sí, borrar producto"
        />
      </div>
    </>
  );
}
