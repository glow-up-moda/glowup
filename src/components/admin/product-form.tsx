"use client";

import { useState } from "react";

import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

import { VariantGrid } from "./variant-grid";
import type { FormState } from "@/lib/admin/forms";
import { formatPercent, margin, parsePesos } from "@/lib/format";

import { useFormAction } from "@/lib/use-form-action";

export type ProductValues = {
  name: string;
  category_id: string;
  description: string;
  measurements: string;
  price: string;
  compare_at_price: string;
  cost: string;
};

export const emptyProduct: ProductValues = {
  name: "",
  category_id: "",
  description: "",
  measurements: "",
  price: "",
  compare_at_price: "",
  cost: "",
};

export function ProductForm({
  action,
  categories,
  initial,
  mode,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categories: { id: string; label: string }[];
  initial: ProductValues;
  mode: "create" | "edit";
}) {
  // Al guardar, el formulario toma los valores que quedaron en la base (por
  // ejemplo, la dirección que se armó a partir del nombre).
  const { state, pending, formRef, onSubmit } = useFormAction(action, {
    onSuccess: (form) => form.reset(),
  });
  const value = (key: keyof ProductValues) => initial[key];
  const errors = state.errors ?? {};

  // Margen en vivo mientras se escriben precio y costo (§10).
  const [price, setPrice] = useState(value("price"));
  const [cost, setCost] = useState(value("cost"));
  const priceCents = parsePesos(price);
  const currentMargin = priceCents
    ? margin(priceCents, parsePesos(cost))
    : null;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-6"
      noValidate
    >
      {state.message && <Notice tone="success">{state.message}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}

      <fieldset className="flex flex-col gap-4">
        <legend className="sr-only">Datos</legend>
        <TextField
          label="Nombre"
          name="name"
          required
          maxLength={120}
          defaultValue={value("name")}
          error={errors.name}
        />
        <SelectField
          label="Categoría"
          name="category_id"
          required
          defaultValue={value("category_id")}
          error={errors.category_id}
        >
          <option value="">Elegí una categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </SelectField>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-display text-lg font-semibold">
          Precio
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Precio"
            name="price"
            inputMode="numeric"
            required
            defaultValue={value("price")}
            onChange={(event) => setPrice(event.currentTarget.value)}
            error={errors.price_cents}
            hint="En pesos, sin centavos."
          />
          <TextField
            label="Precio tachado"
            name="compare_at_price"
            inputMode="numeric"
            defaultValue={value("compare_at_price")}
            error={errors.compare_at_price_cents}
            hint="Opcional. Se muestra solo si es mayor al precio."
          />
          <TextField
            label="Costo"
            name="cost"
            inputMode="numeric"
            defaultValue={value("cost")}
            onChange={(event) => setCost(event.currentTarget.value)}
            error={errors.cost_cents}
            hint="Opcional. Nunca se muestra en la tienda."
          />
        </div>
        <p className="text-sm" aria-live="polite">
          {currentMargin == null
            ? "Cargá precio y costo para ver el margen."
            : `Margen: ${formatPercent(currentMargin)}`}
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-display text-lg font-semibold">
          Descripción
        </legend>
        <TextAreaField
          label="Descripción"
          name="description"
          maxLength={3000}
          defaultValue={value("description")}
          error={errors.description}
          hint="Qué es y cómo es, sin comentarios sobre cuerpos."
        />
        <TextAreaField
          label="Talle"
          name="measurements"
          maxLength={1000}
          rows={3}
          defaultValue={value("measurements")}
          error={errors.measurements}
        />
      </fieldset>

      {mode === "create" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-display text-lg font-semibold">
            Variantes y stock
          </legend>
          <VariantGrid />
        </fieldset>
      )}

      <div>
        <SubmitButton
          pending={pending}
          pendingText={mode === "create" ? "Creando…" : "Guardando…"}
        >
          {mode === "create" ? "Crear producto" : "Guardar cambios"}
        </SubmitButton>
      </div>
    </form>
  );
}
