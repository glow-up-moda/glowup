"use client";

import { useState } from "react";

import { CheckboxField, SelectField, TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/admin/forms";
import { useFormAction } from "@/lib/use-form-action";

export type VariantOption = { id: string; label: string };
export type CategoryOption = { id: string; label: string };

export type KitValues = {
  name: string;
  slug: string;
  price_cents: string;
  compare_at_price_cents: string;
  is_published: boolean;
  is_dynamic: boolean;
  discount_percent: string;
  items: { variant_id: string; quantity: number }[];
  components: { category_id: string; quantity: number }[];
};

export const emptyKit: KitValues = {
  name: "",
  slug: "",
  price_cents: "",
  compare_at_price_cents: "",
  is_published: false,
  is_dynamic: false,
  discount_percent: "10",
  items: [],
  components: [],
};

export function KitForm({
  action,
  variants,
  categories,
  initial = emptyKit,
  mode,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  variants: VariantOption[];
  categories: CategoryOption[];
  initial?: KitValues;
  mode: "create" | "edit";
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action);
  const [isDynamic, setIsDynamic] = useState(initial.is_dynamic);
  const [items, setItems] = useState(
    initial.items.length > 0
      ? initial.items
      : [{ variant_id: "", quantity: 1 }],
  );
  const [components, setComponents] = useState(
    initial.components.length > 0
      ? initial.components
      : [{ category_id: "", quantity: 1 }],
  );

  const changeItem = (
    index: number,
    change: Partial<(typeof items)[number]>,
  ) =>
    setItems(items.map((item, i) => (i === index ? { ...item, ...change } : item)));

  const changeComponent = (
    index: number,
    change: Partial<(typeof components)[number]>,
  ) =>
    setComponents(
      components.map((item, i) => (i === index ? { ...item, ...change } : item)),
    );

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Nombre"
          name="name"
          defaultValue={initial.name}
          maxLength={80}
          autoComplete="off"
          hint="Lo que ve la clienta. Ejemplo: Kit playa."
          error={state.errors?.name}
        />
        <TextField
          label="Dirección"
          name="slug"
          defaultValue={initial.slug}
          autoComplete="off"
          hint="Cómo aparece en el link. Vacío: se arma sola con el nombre."
          error={state.errors?.slug}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Tipo de kit</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="radio"
            name="kit_type"
            value="dynamic"
            checked={isDynamic}
            onChange={() => setIsDynamic(true)}
            className="size-5 accent-azul"
          />
          <span>
            <span className="block font-medium">Combinable</span>
            <span className="block text-sm text-azul/80">
              La clienta elige un producto de cada categoría.
            </span>
          </span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="radio"
            name="kit_type"
            value="fixed"
            checked={!isDynamic}
            onChange={() => setIsDynamic(false)}
            className="size-5 accent-azul"
          />
          <span>
            <span className="block font-medium">Fijo</span>
            <span className="block text-sm text-azul/80">
              Elegís las variantes exactas que trae el kit.
            </span>
          </span>
        </label>
      </fieldset>

      {isDynamic ? (
        <>
          <TextField
            label="Descuento del kit (%)"
            name="discount_percent"
            type="number"
            min={0}
            max={90}
            step={1}
            inputMode="numeric"
            defaultValue={initial.discount_percent || "10"}
            hint="Se aplica sobre la suma de los precios actuales de los productos elegidos."
            error={state.errors?.discount_percent}
          />

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium">Qué puede elegir</legend>
            {components.map((component, index) => (
              <div key={index} className="flex flex-wrap items-end gap-3">
                <SelectField
                  label="Categoría"
                  name="component_category"
                  value={component.category_id}
                  onChange={(event) =>
                    changeComponent(index, { category_id: event.target.value })
                  }
                  className="min-w-0 flex-1"
                >
                  <option value="">Elegí una categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </SelectField>
                <input type="hidden" name="component_quantity" value="1" />
                <Button
                  variant="quiet"
                  onClick={() =>
                    setComponents(components.filter((_, i) => i !== index))
                  }
                  aria-label="Sacar esta categoría del kit"
                >
                  <IconTrash />
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              className="self-start"
              onClick={() =>
                setComponents([
                  ...components,
                  { category_id: "", quantity: 1 },
                ])
              }
            >
              <IconPlus />
              Sumar categoría
            </Button>
            <p className="text-sm text-azul/80">
              Se mostrarán productos publicados con stock disponible de cada
              categoría. Elegí subcategorías concretas cuando corresponda.
            </p>
          </fieldset>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Precio"
              name="price_cents"
              inputMode="numeric"
              defaultValue={initial.price_cents}
              autoComplete="off"
              hint="En pesos, sin centavos."
              error={state.errors?.price_cents}
            />
            <TextField
              label="Precio tachado"
              name="compare_at_price_cents"
              inputMode="numeric"
              defaultValue={initial.compare_at_price_cents}
              autoComplete="off"
              hint="Lo que saldría comprando cada cosa por separado. Vacío: sin oferta."
              error={state.errors?.compare_at_price_cents}
            />
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium">Qué trae</legend>
            {items.map((item, index) => (
              <div key={index} className="flex flex-wrap items-end gap-3">
                <SelectField
                  label="Producto"
                  name="item_variante"
                  value={item.variant_id}
                  onChange={(event) =>
                    changeItem(index, { variant_id: event.target.value })
                  }
                  className="min-w-0 flex-1"
                >
                  <option value="">Elegí un producto</option>
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.label}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label="Cantidad"
                  name="item_cantidad"
                  inputMode="numeric"
                  type="number"
                  min={1}
                  max={99}
                  value={String(item.quantity)}
                  onChange={(event) =>
                    changeItem(index, {
                      quantity: Number(event.target.value) || 0,
                    })
                  }
                  className="w-24"
                />
                <Button
                  variant="quiet"
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                  aria-label="Sacar este producto del kit"
                >
                  <IconTrash />
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              className="self-start"
              onClick={() =>
                setItems([...items, { variant_id: "", quantity: 1 }])
              }
            >
              <IconPlus />
              Sumar producto
            </Button>
          </fieldset>
        </>
      )}

      <CheckboxField
        label="Publicado"
        name="is_published"
        defaultChecked={initial.is_published}
        hint={
          isDynamic
            ? "Para publicarlo tiene que incluir al menos una categoría."
            : "Para publicarlo tiene que traer al menos un producto."
        }
      />

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}

      <SubmitButton pending={pending} className="self-start">
        {mode === "create" ? "Crear el kit" : "Guardar cambios"}
      </SubmitButton>
    </form>
  );
}
