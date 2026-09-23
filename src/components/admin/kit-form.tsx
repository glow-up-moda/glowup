"use client";

import { useState } from "react";

import { CheckboxField, SelectField, TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/admin/forms";
import { useFormAction } from "@/lib/use-form-action";

// Un kit es un precio y una lista de variantes (§8). No tiene stock propio: lo
// que se puede vender sale de sus componentes, así que acá solo se elige qué
// trae y cuánto.

export type VariantOption = { id: string; label: string };

export type KitValues = {
  name: string;
  slug: string;
  price_cents: string;
  compare_at_price_cents: string;
  is_published: boolean;
  items: { variant_id: string; quantity: number }[];
};

export const emptyKit: KitValues = {
  name: "",
  slug: "",
  price_cents: "",
  compare_at_price_cents: "",
  is_published: false,
  items: [],
};

export function KitForm({
  action,
  variants,
  initial = emptyKit,
  mode,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  variants: VariantOption[];
  initial?: KitValues;
  mode: "create" | "edit";
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action);
  const [items, setItems] = useState(
    initial.items.length > 0
      ? initial.items
      : [{ variant_id: "", quantity: 1 }],
  );

  const cambiar = (index: number, cambio: Partial<(typeof items)[number]>) =>
    setItems(
      items.map((item, i) => (i === index ? { ...item, ...cambio } : item)),
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
                cambiar(index, { variant_id: event.target.value })
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
              value={String(item.quantity)}
              onChange={(event) =>
                cambiar(index, {
                  quantity: Number(event.target.value.replace(/\D/g, "")) || 0,
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
          onClick={() => setItems([...items, { variant_id: "", quantity: 1 }])}
        >
          <IconPlus />
          Sumar producto
        </Button>
      </fieldset>

      <CheckboxField
        label="Publicado"
        name="is_published"
        defaultChecked={initial.is_published}
        hint="Sin publicar no se ve en la tienda. Para publicarlo tiene que traer al menos un producto."
      />

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}

      <SubmitButton pending={pending} className="self-start">
        {mode === "create" ? "Crear el kit" : "Guardar cambios"}
      </SubmitButton>
    </form>
  );
}
