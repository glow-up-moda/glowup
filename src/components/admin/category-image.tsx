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
 * La foto de la tarjeta del inicio. Igual que en productos, se sube apenas se
 * elige, sin botón aparte (§7). Es una sola y cuadrada: reemplazarla pisa la
 * anterior.
 */
export function CategoryImage({
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
      return setClientError("La foto pesa más de 25 MB. Probá con otra.");
    }

    setClientError(null);
    setPreparing(true);
    const formData = new FormData();
    try {
      formData.set("file", await shrink(file), "foto.jpg");
    } catch {
      setPreparing(false);
      input.value = "";
      return setClientError(
        "No pudimos leer esa foto. Probá con una JPG o PNG.",
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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={productImageUrl(imagePath)}
          alt={`Foto de ${name}`}
          width={200}
          height={200}
          className="size-32 rounded-card object-cover"
        />
      ) : (
        <Notice>
          Sin foto, la tarjeta del inicio muestra el destello de la marca.
        </Notice>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="foto-categoria" className="text-sm font-medium">
          {imagePath ? "Cambiar la foto" : "Elegí una foto"}
        </label>
        <input
          id="foto-categoria"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          disabled={busy}
          onChange={handleFile}
          aria-describedby="foto-categoria-ayuda"
          aria-invalid={state.errors?.file ? true : undefined}
          className="min-h-11 w-full rounded-input bg-arena px-3 py-2 text-base file:mr-3 file:rounded-full file:border-0 file:bg-brisa file:px-4 file:py-2 file:text-azul"
        />
        <p id="foto-categoria-ayuda" className="text-sm text-azul/80">
          {preparing
            ? "Preparando la foto…"
            : pending
              ? "Subiendo…"
              : "Se sube sola al elegirla. Se recorta cuadrada, así que mirá que lo importante quede en el medio."}
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
          label="Sacar la foto"
          confirmLabel="Sí, sacarla"
          question="La tarjeta vuelve a mostrar el destello."
        />
      )}
    </div>
  );
}
