"use client";

import {
  type FormEvent,
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { IconArrowDown, IconArrowUp, IconUpload } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { emptyForm, type FormState } from "@/lib/admin/forms";
import { productImageUrl } from "@/lib/images";

import { ConfirmAction } from "./confirm-action";
import { useFormAction } from "./use-form-action";

type FormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

export type PhotoRow = {
  id: string;
  path: string;
  alt: string;
  updateAlt: FormAction;
  remove: (prev: FormState) => Promise<FormState>;
  moveUp: (() => Promise<void>) | null;
  moveDown: (() => Promise<void>) | null;
};

// Tope antes de achicar: una foto de celular pesa de 2 a 12 MB.
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
const MAX_SIDE = 2000;

/**
 * Achica la foto en el navegador antes de subirla: sube rápido con datos del
 * celular y entra en el límite del servidor. El servidor la convierte a WebP.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))),
      "image/jpeg",
      0.9,
    ),
  );
}

export function PhotoManager({
  photos,
  uploadAction,
}: {
  photos: PhotoRow[];
  uploadAction: FormAction;
}) {
  return (
    <div className="flex flex-col gap-5">
      {photos.length === 0 ? (
        <Notice>
          Todavía no tiene fotos. Hacen falta dos para publicarlo: la segunda
          aparece al pasar el mouse.
        </Notice>
      ) : (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <PhotoCard key={photo.id} photo={photo} position={index + 1} />
          ))}
        </ol>
      )}
      {photos.length === 1 && (
        <Notice>
          Sumá una segunda foto: la tienda la muestra al pasar el mouse.
        </Notice>
      )}
      <UploadForm action={uploadAction} />
    </div>
  );
}

function UploadForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, emptyForm);
  const [clientError, setClientError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0)
      return setClientError("Elegí una foto.");
    if (file.size > MAX_ORIGINAL_BYTES)
      return setClientError("La foto pesa más de 25 MB. Probá con otra.");
    if (String(formData.get("alt") ?? "").trim().length < 3) {
      return setClientError(
        "Contá qué se ve en la foto: lo leen quienes usan lector de pantalla.",
      );
    }

    setClientError(null);
    setPreparing(true);
    try {
      formData.set("file", await shrink(file), "foto.jpg");
    } catch {
      setPreparing(false);
      return setClientError(
        "No pudimos leer esa foto. Probá con una JPG o PNG.",
      );
    }
    setPreparing(false);
    startTransition(() => formAction(formData));
  }

  const busy = preparing || pending;
  const errors = state.errors ?? {};

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-card bg-crema p-4"
      noValidate
    >
      <h3 className="font-medium">Subir una foto</h3>
      {state.message && <Notice tone="success">{state.message}</Notice>}
      {(clientError || state.error) && (
        <Notice tone="error">{clientError ?? state.error}</Notice>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="photo-file" className="text-sm font-medium">
          Foto
        </label>
        <input
          id="photo-file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          required
          aria-describedby="photo-file-hint"
          aria-invalid={errors.file ? true : undefined}
          className="min-h-11 w-full rounded-input bg-crema-oscuro px-3 py-2 text-base file:mr-3 file:rounded-full file:border-0 file:bg-rosa file:px-4 file:py-2 file:text-chocolate"
        />
        <p id="photo-file-hint" className="text-sm text-chocolate/80">
          Ideal en 4:5, con fondo crema o arena y luz natural. Se guarda en
          WebP.
        </p>
        {errors.file && <p className="text-sm text-error">{errors.file}</p>}
      </div>
      <TextField
        label="Qué se ve en la foto"
        name="alt"
        id="photo-alt"
        required
        maxLength={150}
        defaultValue={state.values?.alt ?? ""}
        error={errors.alt}
        hint="Por ejemplo: Corpiño Luna negro, de frente, sobre fondo crema."
      />
      <div>
        <Button type="submit" disabled={busy}>
          <IconUpload />
          {preparing
            ? "Preparando la foto…"
            : pending
              ? "Subiendo…"
              : "Subir foto"}
        </Button>
      </div>
    </form>
  );
}

function PhotoCard({ photo, position }: { photo: PhotoRow; position: number }) {
  const { state, pending, formRef, onSubmit } = useFormAction(photo.updateAlt, {
    onSuccess: (form) => form.reset(),
  });

  return (
    <li className="flex flex-col gap-2 rounded-card bg-crema p-2">
      <div className="relative aspect-[4/5] overflow-hidden rounded-input bg-crema-oscuro">
        {/* Miniatura WebP ya optimizada: no pasa por el optimizador de imágenes. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={productImageUrl(photo.path, "thumb")}
          alt={photo.alt}
          loading="lazy"
          className="size-full object-cover"
        />
        <span className="absolute top-2 left-2 rounded-full bg-crema px-2 text-sm font-medium">
          {position}
        </span>
      </div>
      <div className="flex gap-1">
        <form action={photo.moveUp ?? undefined}>
          <button
            type="submit"
            disabled={!photo.moveUp}
            aria-label={`Mover la foto ${position} antes`}
            className="flex size-11 items-center justify-center rounded-full hover:bg-crema-oscuro disabled:opacity-40"
          >
            <IconArrowUp />
          </button>
        </form>
        <form action={photo.moveDown ?? undefined}>
          <button
            type="submit"
            disabled={!photo.moveDown}
            aria-label={`Mover la foto ${position} después`}
            className="flex size-11 items-center justify-center rounded-full hover:bg-crema-oscuro disabled:opacity-40"
          >
            <IconArrowDown />
          </button>
        </form>
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm underline underline-offset-4">
          Descripción
        </summary>
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="mt-2 flex flex-col gap-2"
        >
          {state.message && <Notice tone="success">{state.message}</Notice>}
          {state.error && <Notice tone="error">{state.error}</Notice>}
          <TextField
            label="Qué se ve"
            name="alt"
            id={`alt-${photo.id}`}
            required
            maxLength={150}
            defaultValue={photo.alt}
            error={state.errors?.alt}
          />
          <SubmitButton pending={pending} variant="secondary" className="px-4">
            Guardar
          </SubmitButton>
        </form>
      </details>
      <ConfirmAction
        action={photo.remove}
        label="Borrar"
        question="¿Borramos esta foto?"
        confirmLabel="Sí, borrar foto"
      />
    </li>
  );
}
