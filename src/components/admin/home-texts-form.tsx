"use client";

import { useRouter } from "next/navigation";

import { TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { type FormState } from "@/lib/admin/forms";
import { type HomeTexts } from "@/lib/store/settings";
import { useFormAction } from "@/lib/use-form-action";

/**
 * Los textos del inicio. Cada campo arranca con lo que se ve hoy; borrarlo y
 * guardar lo devuelve al texto de fábrica, que es la salida cuando algo quedó
 * mal escrito.
 */
export function HomeTextsForm({
  action,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: HomeTexts;
}) {
  // Al guardar se vuelven a leer los valores: si un campo se dejó vacío, el
  // formulario tiene que mostrar el texto de fábrica que quedó en uso, y no el
  // blanco que se escribió. El refresh trae los valores nuevos y la `key`
  // rearma el formulario, porque `defaultValue` no vuelve a aplicarse sola.
  const router = useRouter();
  const { state, pending, formRef, onSubmit } = useFormAction(action, {
    onSuccess: () => router.refresh(),
  });
  const errors = state.errors ?? {};

  return (
    <form
      key={JSON.stringify(initial)}
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-6"
      noValidate
    >
      {state.message && <Notice tone="success">{state.message}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-display text-lg font-semibold">
          Lo primero que se ve
        </legend>
        <TextField
          label="Título"
          name="heroTitle"
          maxLength={70}
          defaultValue={initial.heroTitle}
          error={errors.heroTitle}
          hint="Corto: en el celular entra en tres renglones."
        />
        <TextAreaField
          label="Debajo del título"
          name="heroSubtitle"
          maxLength={160}
          rows={2}
          defaultValue={initial.heroSubtitle}
          error={errors.heroSubtitle}
        />
        <TextField
          label="Texto del botón"
          name="heroCta"
          maxLength={30}
          defaultValue={initial.heroCta}
          error={errors.heroCta}
          hint="Lleva siempre al listado de productos."
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-display text-lg font-semibold">
          Títulos de las secciones
        </legend>
        <TextField
          label="Arriba de las categorías"
          name="categoriesTitle"
          maxLength={40}
          defaultValue={initial.categoriesTitle}
          error={errors.categoriesTitle}
        />
        <TextField
          label="Arriba de los productos nuevos"
          name="newTitle"
          maxLength={40}
          defaultValue={initial.newTitle}
          error={errors.newTitle}
        />
        <TextField
          label="Arriba de los combos"
          name="kitsTitle"
          maxLength={40}
          defaultValue={initial.kitsTitle}
          error={errors.kitsTitle}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-display text-lg font-semibold">
          Por qué comprar acá
        </legend>
        <TextField
          label="Título"
          name="benefitsTitle"
          maxLength={40}
          defaultValue={initial.benefitsTitle}
          error={errors.benefitsTitle}
        />
        <TextAreaField
          label="Los puntos"
          name="benefits"
          rows={5}
          maxLength={600}
          defaultValue={initial.benefits.join("\n")}
          error={errors.benefits}
          hint="Uno por línea, hasta seis. Cada uno, hasta 90 caracteres."
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-display text-lg font-semibold">
          El bloque del cupón
        </legend>
        <TextField
          label="Título"
          name="newsletterTitle"
          maxLength={60}
          defaultValue={initial.newsletterTitle}
          error={errors.newsletterTitle}
        />
        <TextAreaField
          label="Texto"
          name="newsletterText"
          rows={3}
          maxLength={300}
          defaultValue={initial.newsletterText}
          error={errors.newsletterText}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-display text-lg font-semibold">
          El pie de página
        </legend>
        <TextAreaField
          label="Debajo del logo"
          name="footerTagline"
          rows={2}
          maxLength={140}
          defaultValue={initial.footerTagline}
          error={errors.footerTagline}
          hint="Se ve en todas las páginas, no solo en el inicio."
        />
      </fieldset>

      <div>
        <SubmitButton pending={pending} pendingText="Guardando…">
          Guardar los textos
        </SubmitButton>
      </div>
    </form>
  );
}
