"use client";

import { useState } from "react";

import type { FormState } from "@/lib/use-form-action";
import type { ReviewableProduct } from "@/lib/orders/reviews";
import { Button } from "@/components/ui/button";
import { IconAlert, IconCheck, IconStar } from "@/components/ui/icons";
import { clearFields, useFormAction } from "@/lib/use-form-action";

// Reseña de un pedido entregado (§13). Va con `useFormAction` para que un
// error no borre lo escrito (§7, formularios).

const fieldClass =
  "w-full rounded-input border-2 border-transparent bg-crema-oscuro px-3 py-2 text-base text-chocolate placeholder:text-chocolate/60 focus:border-chocolate";

const RATINGS = [
  { value: 1, label: "1 estrella" },
  { value: 2, label: "2 estrellas" },
  { value: 3, label: "3 estrellas" },
  { value: 4, label: "4 estrellas" },
  { value: 5, label: "5 estrellas" },
];

export function ReviewForm({
  number,
  products,
  action,
}: {
  number: string;
  products: ReviewableProduct[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const pending = products.filter((product) => !product.done);
  const [productId, setProductId] = useState(pending[0]?.id ?? "");
  const [rating, setRating] = useState(0);

  const {
    state,
    pending: sending,
    formRef,
    onSubmit,
  } = useFormAction(action, {
    onSuccess: (form) => {
      clearFields(form, ["texto"]);
      setRating(0);
    },
  });

  if (pending.length === 0) {
    return (
      <p className="mt-3 flex items-start gap-1.5 text-exito">
        <IconCheck width={18} height={18} className="mt-0.5 shrink-0" />
        Ya nos contaste cómo te quedó todo. ¡Gracias!
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="mt-3 flex max-w-md flex-col gap-4"
    >
      {pending.length > 1 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Qué querés reseñar</span>
          <select
            name="producto"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className={`${fieldClass} min-h-11`}
          >
            {pending.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {pending.length === 1 && (
        <input type="hidden" name="producto" value={productId} />
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">Cuánto te gustó</legend>
        <div className="flex gap-1">
          {RATINGS.map((option) => (
            <label
              key={option.value}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-chocolate"
            >
              <input
                type="radio"
                name="puntaje"
                value={option.value}
                checked={rating === option.value}
                onChange={() => setRating(option.value)}
                className="sr-only"
              />
              <span className="sr-only">{option.label}</span>
              <IconStar
                width={28}
                height={28}
                className={
                  option.value <= rating ? "text-coral" : "text-crema-oscuro"
                }
              />
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Tu nombre</span>
        <input
          name="nombre"
          required
          maxLength={60}
          autoComplete="given-name"
          placeholder="Cómo querés que aparezca"
          className={`${fieldClass} min-h-11`}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Cómo te quedó</span>
        <textarea
          name="texto"
          required
          rows={4}
          maxLength={600}
          placeholder="El talle, la tela, si lo volverías a comprar…"
          className={fieldClass}
        />
      </label>

      <input type="hidden" name="pedido" value={number} />

      <Button type="submit" disabled={sending} className="self-start">
        {sending ? "Enviando…" : "Dejar mi reseña"}
      </Button>

      {state.error && (
        <p className="flex items-start gap-1.5 text-sm text-error" role="alert">
          <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          className="flex items-start gap-1.5 text-sm text-exito"
          role="status"
        >
          <IconCheck width={16} height={16} className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      )}
    </form>
  );
}
