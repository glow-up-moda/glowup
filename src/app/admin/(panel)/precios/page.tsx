import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/admin/page-header";
import { PriceApplyForm } from "@/components/admin/price-apply-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckboxField,
  RadioGroupField,
  SelectField,
  TextField,
} from "@/components/ui/field";
import { IconAlert } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { adminNames } from "@/lib/admin/catalog";
import { isUuid, param, paramList } from "@/lib/admin/params";
import {
  DEFAULT_ROUNDING,
  isPriceScope,
  parsePercent,
  parseRounding,
  PERCENT_HELP,
  percentLabel,
  type PricePreviewRow,
  ROUNDING_OPTIONS,
  roundingLabel,
} from "@/lib/admin/prices";
import { requireAdmin } from "@/lib/auth/admin";
import {
  formatDateTime,
  formatMoney,
  formatPercent,
  margin,
  plural,
} from "@/lib/format";

import { applyPrices } from "./actions";

export const metadata: Metadata = { title: "Precios" };

const scopeOptions = [
  { value: "categoria", label: "Una categoría" },
  { value: "seleccion", label: "Productos elegidos" },
  { value: "todos", label: "Todo el catálogo" },
] as const;

function marginText(priceCents: number, costCents: number | null): string {
  const value = margin(priceCents, costCents);
  return value == null ? "sin costo" : formatPercent(value);
}

export default async function PricesPage({
  searchParams,
}: PageProps<"/admin/precios">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const scopeParam = param(params.alcance);
  const scope = isPriceScope(scopeParam) ? scopeParam : "categoria";
  const categoryId = param(params.categoria);
  const selected = paramList(params.ids).filter(isUuid);
  const percentInput = param(params.porcentaje);
  const percent = parsePercent(percentInput);
  const rounding = parseRounding(param(params.redondeo));
  const includeCompareAt = param(params.tachado) === "on";
  const applied = Number.parseInt(param(params.hecho), 10);

  const [{ data: categoryRows }, { data: products }, { data: history }, names] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, parent_id, sort_order")
        .order("sort_order"),
      supabase
        .from("products")
        .select("id, name, price_cents, is_published, category_id")
        .order("name"),
      supabase
        .from("price_changes")
        .select(
          "id, old_price_cents, new_price_cents, reason, created_at, created_by, products(name)",
        )
        .order("created_at", { ascending: false })
        .limit(15),
      adminNames(supabase),
    ]);

  const categories = categoryRows ?? [];
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const categoryLabel = (id: string | null): string => {
    const category = id ? categoryById.get(id) : undefined;
    if (!category) return "Sin categoría";
    const parent = category.parent_id
      ? categoryById.get(category.parent_id)
      : undefined;
    return parent ? `${parent.name} / ${category.name}` : category.name;
  };
  const categoryOrder = categories
    .map((category) => ({ id: category.id, label: categoryLabel(category.id) }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  // Elegir una categoría alcanza también a sus subcategorías.
  const inChosenCategory = new Set(
    categoryId
      ? [
          categoryId,
          ...categories
            .filter((c) => c.parent_id === categoryId)
            .map((c) => c.id),
        ]
      : [],
  );

  const all = products ?? [];
  const chosen = all.filter((product) =>
    scope === "todos"
      ? true
      : scope === "seleccion"
        ? selected.includes(product.id)
        : product.category_id != null &&
          inChosenCategory.has(product.category_id),
  );
  const draftIds = new Set(all.filter((p) => !p.is_published).map((p) => p.id));

  const preview =
    percent != null && chosen.length > 0
      ? await supabase.rpc("preview_price_change", {
          p_product_ids: chosen.map((product) => product.id),
          p_percent: percent,
          p_round_to_cents: rounding,
          p_include_compare_at: includeCompareAt,
        })
      : null;
  const rows = (preview?.data ?? []) as PricePreviewRow[];
  const losesOffer = rows.filter(
    (row) =>
      !includeCompareAt &&
      row.old_compare_at_price_cents != null &&
      row.new_price_cents >= row.old_compare_at_price_cents,
  ).length;
  const withoutCost = rows.filter((row) => row.cost_cents == null).length;

  return (
    <>
      <PageHeader
        title="Precios"
        description="Subí o bajá precios por categoría o eligiendo productos. Siempre mirás la vista previa antes de aplicar."
      />

      {applied > 0 && (
        <Notice tone="success" className="mb-4">
          Listo: {plural(applied, "precio actualizado", "precios actualizados")}
          .
        </Notice>
      )}

      <div className="flex flex-col gap-4">
        <Section title="Qué cambiar">
          <form className="flex flex-col gap-4">
            <RadioGroupField
              legend="Alcance"
              name="alcance"
              value={scope}
              options={scopeOptions}
            />

            <SelectField
              label="Categoría"
              name="categoria"
              defaultValue={categoryId}
              hint="Incluye sus subcategorías."
            >
              <option value="">Elegí una categoría</option>
              {categoryOrder.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </SelectField>

            <details className="rounded-input bg-crema-oscuro/60 p-3">
              <summary className="flex min-h-11 cursor-pointer items-center font-medium">
                Elegir productos ({selected.length})
              </summary>
              <ul className="mt-2 max-h-80 overflow-y-auto">
                {all.map((product) => (
                  <li key={product.id}>
                    <CheckboxField
                      label={`${product.name} · ${formatMoney(product.price_cents)}`}
                      name="ids"
                      id={`producto-${product.id}`}
                      value={product.id}
                      defaultChecked={selected.includes(product.id)}
                    />
                  </li>
                ))}
              </ul>
            </details>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Porcentaje"
                name="porcentaje"
                inputMode="decimal"
                placeholder="10"
                defaultValue={percentInput}
                hint={PERCENT_HELP}
                error={
                  percentInput && percent == null
                    ? "Poné un número entre -90 y 300, distinto de 0."
                    : undefined
                }
              />
              <SelectField
                label="Redondeo"
                name="redondeo"
                defaultValue={String(rounding || DEFAULT_ROUNDING)}
                hint="Siempre hacia arriba."
              >
                {ROUNDING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <CheckboxField
              label="Cambiar también el precio tachado"
              name="tachado"
              defaultChecked={includeCompareAt}
            />

            <Button type="submit" className="self-start">
              Ver vista previa
            </Button>
          </form>
        </Section>

        {percent != null && (
          <Section
            title="Vista previa"
            description={`${plural(rows.length, "producto", "productos")} · ${percentLabel(percent)} · redondeo ${roundingLabel(rounding).toLowerCase()}`}
          >
            {preview?.error ? (
              <Notice tone="error">
                No pudimos armar la vista previa. Revisá el porcentaje y los
                productos.
              </Notice>
            ) : rows.length === 0 ? (
              <Notice>
                No hay productos en ese alcance. Elegí una categoría o marcá
                productos.
              </Notice>
            ) : (
              <div className="flex flex-col gap-4">
                {(losesOffer > 0 || withoutCost > 0) && (
                  <div className="flex flex-col gap-2">
                    {losesOffer > 0 && (
                      <Notice tone="error">
                        {losesOffer === 1
                          ? "En 1 producto el precio nuevo queda igual o por encima del precio tachado, así que deja de verse como oferta."
                          : `En ${losesOffer} productos el precio nuevo queda igual o por encima del precio tachado, así que dejan de verse como oferta.`}{" "}
                        Marcá “Cambiar también el precio tachado” si querés
                        moverlo.
                      </Notice>
                    )}
                    {withoutCost > 0 && (
                      <Notice>
                        {plural(withoutCost, "producto", "productos")} sin costo
                        cargado: no se puede calcular el margen.
                      </Notice>
                    )}
                  </div>
                )}

                <ul className="divide-y divide-crema-oscuro">
                  {rows.map((row) => {
                    const offerLost =
                      !includeCompareAt &&
                      row.old_compare_at_price_cents != null &&
                      row.new_price_cents >= row.old_compare_at_price_cents;
                    return (
                      <li
                        key={row.product_id}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 font-medium">
                            {row.name}
                            {draftIds.has(row.product_id) && (
                              <Badge>Borrador</Badge>
                            )}
                          </p>
                          <p className="text-sm">
                            Margen{" "}
                            {marginText(row.old_price_cents, row.cost_cents)} →{" "}
                            {marginText(row.new_price_cents, row.cost_cents)}
                          </p>
                          {includeCompareAt &&
                            row.old_compare_at_price_cents != null && (
                              <p className="text-sm">
                                Tachado{" "}
                                {formatMoney(row.old_compare_at_price_cents)} →{" "}
                                {formatMoney(
                                  row.new_compare_at_price_cents ?? 0,
                                )}
                              </p>
                            )}
                          {offerLost && (
                            <p className="flex items-center gap-1.5 text-sm text-error">
                              <IconAlert
                                width={16}
                                height={16}
                                className="shrink-0"
                              />
                              Deja de ser oferta: tachado{" "}
                              {formatMoney(row.old_compare_at_price_cents ?? 0)}
                            </p>
                          )}
                        </div>
                        <p className="font-medium whitespace-nowrap">
                          {formatMoney(row.old_price_cents)} →{" "}
                          {formatMoney(row.new_price_cents)}
                        </p>
                      </li>
                    );
                  })}
                </ul>

                <PriceApplyForm
                  action={applyPrices}
                  ids={rows.map((row) => row.product_id)}
                  percent={percentInput}
                  rounding={rounding}
                  includeCompareAt={includeCompareAt}
                  defaultReason={`Cambio masivo de ${percentLabel(percent)}`}
                />
              </div>
            )}
          </Section>
        )}

        <Section title="Últimos cambios">
          {!history?.length ? (
            <Notice>Todavía no hubo cambios de precio.</Notice>
          ) : (
            <ul className="divide-y divide-crema-oscuro">
              {history.map((change) => (
                <li key={change.id} className="py-2 first:pt-0">
                  <p>
                    <span className="font-medium">{change.products?.name}</span>{" "}
                    {formatMoney(change.old_price_cents)} →{" "}
                    {formatMoney(change.new_price_cents)}
                  </p>
                  <p className="text-sm">
                    {formatDateTime(change.created_at)}
                    {change.created_by && names.get(change.created_by)
                      ? ` · ${names.get(change.created_by)}`
                      : ""}
                    {change.reason ? ` · ${change.reason}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
