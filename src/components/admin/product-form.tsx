"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createProduct,
  setProductPublished,
  uploadProductImage,
} from "@/app/admin/(panel)/productos/actions";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { MAX_ORIGINAL_BYTES, shrink } from "@/lib/admin/photo";
import { emptyForm, type FormState } from "@/lib/admin/forms";
import { formatPercent, margin, parsePesos, plural } from "@/lib/format";
import { useFormAction } from "@/lib/use-form-action";

import { VariantGrid } from "./variant-grid";

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

/** Los campos del producto. Los usan el alta y la edición. */
function ProductFields({
  categories,
  initial,
  state,
  pending,
  pendingText,
  submitLabel,
  onSubmit,
  formRef,
  extra,
}: {
  categories: { id: string; label: string }[];
  initial: ProductValues;
  state: FormState;
  pending: boolean;
  pendingText: string;
  submitLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
  extra?: ReactNode;
}) {
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

      {extra}

      <div>
        <SubmitButton pending={pending} pendingText={pendingText}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * El alta completa en una sola pantalla (§7): datos, stock y fotos. Crea el
 * producto como borrador, sube las fotos y recién ahí lo publica, así nunca se
 * ve a medio cargar en la tienda. Las fotos esperan en el navegador hasta que
 * el producto existe, porque se guardan en una carpeta con su id.
 */
export function CreateProductForm({
  categories,
}: {
  categories: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(emptyForm);
  const [step, setStep] = useState<string | null>(null);
  const [withVariants, setWithVariants] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setState(emptyForm);
    setStep("Creando el producto…");

    const created = await createProduct(emptyForm, formData);
    if (!created.productId) {
      setStep(null);
      return setState(created);
    }
    const id = created.productId;

    for (const [index, file] of photos.entries()) {
      setStep(`Subiendo la foto ${index + 1} de ${photos.length}…`);
      const photoData = new FormData();
      try {
        photoData.set("file", await shrink(file), "foto.jpg");
      } catch {
        setStep(null);
        return setState({
          error:
            "El producto se creó, pero una foto no se pudo leer. Subila desde su ficha.",
        });
      }
      await uploadProductImage(id, emptyForm, photoData);
    }

    setStep("Publicando…");
    await setProductPublished(id, true);
    router.push(`/admin/productos/${id}?nuevo=1`);
  }

  return (
    <ProductFields
      categories={categories}
      initial={emptyProduct}
      state={state}
      pending={step !== null}
      pendingText={step ?? "Creando…"}
      submitLabel="Crear y publicar"
      onSubmit={handleSubmit}
      extra={
        <>
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-2 font-display text-lg font-semibold">
              Stock
            </legend>
            {withVariants ? (
              <>
                <VariantGrid />
                <Button
                  type="button"
                  variant="quiet"
                  className="self-start"
                  onClick={() => setWithVariants(false)}
                >
                  No tiene colores ni talles
                </Button>
              </>
            ) : (
              <>
                <TextField
                  label="Cuántas unidades tenés"
                  name="stock_simple"
                  inputMode="numeric"
                  autoComplete="off"
                  hint="Para una prenda única, sin colores ni talles."
                  error={state.errors?.stock_simple}
                />
                <Button
                  type="button"
                  variant="quiet"
                  className="self-start"
                  onClick={() => setWithVariants(true)}
                >
                  Tiene colores o talles
                </Button>
              </>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 font-display text-lg font-semibold">
              Fotos
            </legend>
            <label htmlFor="fotos-nuevas" className="text-sm font-medium">
              Elegí las fotos
            </label>
            <input
              id="fotos-nuevas"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={(event) =>
                setPhotos(
                  [...(event.target.files ?? [])].filter(
                    (file) => file.size > 0 && file.size <= MAX_ORIGINAL_BYTES,
                  ),
                )
              }
              className="min-h-11 w-full rounded-input bg-arena px-3 py-2 text-base file:mr-3 file:rounded-full file:border-0 file:bg-brisa file:px-4 file:py-2 file:text-azul"
            />
            <p className="text-sm">
              {photos.length === 0
                ? "Se suben al crear el producto. Con dos alcanza: la segunda aparece al pasar el mouse."
                : plural(photos.length, "foto elegida", "fotos elegidas")}
            </p>
          </fieldset>
        </>
      }
    />
  );
}

/** La edición de un producto que ya existe. */
export function ProductForm({
  action,
  categories,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categories: { id: string; label: string }[];
  initial: ProductValues;
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action);

  return (
    <ProductFields
      categories={categories}
      initial={initial}
      state={state}
      pending={pending}
      pendingText="Guardando…"
      submitLabel="Guardar cambios"
      onSubmit={onSubmit}
      formRef={formRef}
    />
  );
}
