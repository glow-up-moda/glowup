"use client";

import { SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/admin/forms";
import { useFormAction } from "@/lib/use-form-action";

// Categoría del catálogo (§7). La dirección no se escribe: sale del nombre.

export type CategoryValues = {
  name: string;
  parent_id: string;
};

export const emptyCategory: CategoryValues = { name: "", parent_id: "" };

export function CategoryForm({
  action,
  parents,
  initial = emptyCategory,
  mode,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  parents: { id: string; name: string }[];
  initial?: CategoryValues;
  mode: "create" | "edit";
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      <TextField
        label="Nombre"
        name="name"
        defaultValue={initial.name}
        maxLength={60}
        autoComplete="off"
        hint="Lo que ve la clienta en el menú. El link sale de acá."
        error={state.errors?.name}
      />

      <SelectField
        label="Va adentro de"
        name="parent_id"
        defaultValue={initial.parent_id}
        hint="Dejalo en “Ninguna” para que sea una categoría principal del menú."
        error={state.errors?.parent_id}
      >
        <option value="">Ninguna: es una categoría principal</option>
        {parents.map((parent) => (
          <option key={parent.id} value={parent.id}>
            {parent.name}
          </option>
        ))}
      </SelectField>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}

      <SubmitButton pending={pending} className="self-start">
        {mode === "create" ? "Crear la categoría" : "Guardar cambios"}
      </SubmitButton>
    </form>
  );
}
