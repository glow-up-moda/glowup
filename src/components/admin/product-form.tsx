"use client";

import { useState } from "react";

import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/admin/forms";
import { formatPercent, margin, parsePesos } from "@/lib/format";

import { useFormAction } from "@/lib/use-form-action";

export type ProductValues = {
  name: string;
  slug: string;
  category_id: string;
  description: string;
  materials_care: string;
  measurements: string;
  model_info: string;
  price: string;
  compare_at_price: string;
  cost: string;
  seo_title: string;
  seo_description: string;
  is_published: boolean;
};

export const emptyProduct: ProductValues = {
  name: "",
  slug: "",
  category_id: "",
  description: "",
  materials_care: "",
  measurements: "",
  model_info: "",
  price: "",
  compare_at_price: "",
  cost: "",
  seo_title: "",
  seo_description: "",
  is_published: false,
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
  const value = (key: Exclude<keyof ProductValues, "is_published">) =>
    initial[key];
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
        <TextField
          label="Dirección en la tienda"
          name="slug"
          maxLength={120}
          defaultValue={value("slug")}
          error={errors.slug}
          hint="Así se ve en el link: /producto/nombre-del-producto. Si la dejás vacía, sale del nombre."
        />
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
          label="Materiales y cuidados"
          name="materials_care"
          maxLength={1000}
          rows={3}
          defaultValue={value("materials_care")}
          error={errors.materials_care}
        />
        <TextAreaField
          label="Medidas"
          name="measurements"
          maxLength={1000}
          rows={3}
          defaultValue={value("measurements")}
          error={errors.measurements}
        />
        <TextField
          label="La modelo"
          name="model_info"
          maxLength={200}
          defaultValue={value("model_info")}
          error={errors.model_info}
          hint="Por ejemplo: mide 1,68 m y usa talle M."
        />
      </fieldset>

      <details className="rounded-card bg-crema p-4">
        <summary className="min-h-11 cursor-pointer py-2 font-medium">
          Google y redes (SEO)
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          <TextField
            label="Título para Google"
            name="seo_title"
            maxLength={70}
            defaultValue={value("seo_title")}
            error={errors.seo_title}
            hint="Hasta 70 caracteres. Si lo dejás vacío, se usa el nombre."
          />
          <TextAreaField
            label="Descripción para Google"
            name="seo_description"
            maxLength={160}
            rows={2}
            defaultValue={value("seo_description")}
            error={errors.seo_description}
            hint="Hasta 160 caracteres."
          />
        </div>
      </details>

      {mode === "edit" && (
        <div>
          <CheckboxField
            label="Publicado en la tienda"
            name="is_published"
            defaultChecked={initial.is_published}
            hint="Para publicarlo hace falta al menos una variante y dos fotos."
          />
          {errors.is_published && (
            <Notice tone="error" className="mt-2">
              {errors.is_published}
            </Notice>
          )}
        </div>
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
