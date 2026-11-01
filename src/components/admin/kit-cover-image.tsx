"use client";

import {
  type ChangeEvent,
  startTransition,
  useActionState,
  useState,
} from "react";

import { ConfirmAction } from "@/components/admin/confirm-action";
import { Notice } from "@/components/ui/notice";
import { MAX_ORIGINAL_BYTES, shrink } from "@/lib/admin/photo";
import { emptyForm, type FormState } from "@/lib/admin/forms";
import { productImageUrl } from "@/lib/images";

/**
 * Portada independiente del kit. Si se quita, la tienda vuelve a mostrar
 * automáticamente las fotos de los productos que lo componen.
 */
export function KitCoverImage({
  name,
  imagePath,
  uploadAction,
  removeAction,
}: {
  name: string;
  imagePath: string | null;
  uploadAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  removeAction: (prev: FormState) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(uploadAction, emptyForm);
  const [preparing, setPreparing] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file || file.size === 0) return;
    if (file.size > MAX_ORIGINAL_BYTES) {
      input.value = "";
      return setClientError("La imagen pesa más de 25 MB. Probá con otra.");
    }

    setClientError(null);
    setPreparing(true);
    const formData = new FormData();
    try {
      formData.set("file", await shrink(file), "portada.jpg");
    } catch {
      setPreparing(false);
      input.value = "";
      return setClientError(
        "No pudimos leer esa imagen. Probá con una JPG o PNG.",
      );
    }
    setPreparing(false);
    input.value = "";
    startTransition(() => formAction(formData));
  }

  const busy = preparing || pending;

  return (
    <div className="flex flex-col gap-4">
      {state.message && <Notice tone="success">{state.message}</Notice>}
      {(clientError || state.error) && (
        <Notice tone="error">{clientError ?? state.error}</Notice>
      )}

      {imagePath ? (
        <div className="max-w-56">
          <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-arena">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productImageUrl(imagePath)}
              alt={`Imagen principal de ${name}`}
              className="size-full object-cover"
            />
          </div>
          <p className="mt-2 text-sm text-azul/80">Portada propia activa.</p>
        </div>
      ) : (
        <Notice>
          Este kit todavía usa las fotos de los productos que lo componen.
          Subí una portada para reemplazarlas.
        </Notice>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="foto-portada-kit" className="text-sm font-medium">
          {imagePath ? "Cambiar imagen principal" : "Elegir imagen principal"}
        </label>
        <input
          id="foto-portada-kit"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          disabled={busy}
          onChange={handleFile}
          aria-describedby="foto-portada-kit-ayuda"
          aria-invalid={state.errors?.file ? true : undefined}
          className="min-h-11 w-full rounded-input bg-arena px-3 py-2 text-base file:mr-3 file:rounded-full file:border-0 file:bg-brisa file:px-4 file:py-2 file:text-azul"
        />
        <p id="foto-portada-kit-ayuda" className="text-sm text-azul/80">
          {preparing
            ? "Preparando la imagen…"
            : pending
              ? "Subiendo imagen…"
              : "Se sube automáticamente al elegirla. Se adapta al formato vertical 4:5 de la tarjeta del kit."}
        </p>
        {state.errors?.file && (
          <p className="text-sm text-error" role="alert">
            {state.errors.file}
          </p>
        )}
      </div>

      {imagePath && (
        <ConfirmAction
          action={removeAction}
          label="Volver a las fotos automáticas"
          confirmLabel="Sí, volver a las fotos automáticas"
          question="Se quitará la portada propia y la tienda volverá a mostrar las fotos de los productos del kit."
        />
      )}
    </div>
  );
}
