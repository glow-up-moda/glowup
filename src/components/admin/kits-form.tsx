"use client";

import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { type FormState } from "@/lib/admin/forms";
import { useFormAction } from "@/lib/use-form-action";

/** Cómo se llama el bloque de combos en el menú y en el inicio (§7). */
export function KitsForm({
  action,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: string;
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      {state.message && <Notice tone="success">{state.message}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}

      <TextField
        label="Nombre"
        name="name"
        required
        maxLength={30}
        defaultValue={initial}
        error={state.errors?.name}
        hint="Lo que ve la clienta en el menú y en el inicio. El link sigue siendo /kits."
      />

      <div>
        <SubmitButton pending={pending} pendingText="Guardando…">
          Guardar cambios
        </SubmitButton>
      </div>
    </form>
  );
}
