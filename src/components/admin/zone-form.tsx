"use client";

import { CheckboxField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/admin/forms";
import { useFormAction } from "@/lib/use-form-action";

// Zona de envío (§12). Las provincias y los códigos postales van uno por línea:
// se escriben desde el celular y así no hay que contar comas.

export type ZoneValues = {
  name: string;
  price_cents: string;
  eta_text: string;
  same_day: boolean;
  provinces: string;
  postal_codes: string;
};

export const emptyZone: ZoneValues = {
  name: "",
  price_cents: "",
  eta_text: "",
  same_day: false,
  provinces: "",
  postal_codes: "",
};

export function ZoneForm({
  action,
  initial = emptyZone,
  mode,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: ZoneValues;
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
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Nombre"
          name="name"
          defaultValue={initial.name}
          maxLength={60}
          autoComplete="off"
          hint="Lo que ve la clienta al elegir. Ejemplo: Entre Ríos."
          error={state.errors?.name}
        />
        <TextField
          label="Costo"
          name="price_cents"
          inputMode="numeric"
          defaultValue={initial.price_cents}
          autoComplete="off"
          hint="En pesos, sin centavos. 0 es sin cargo."
          error={state.errors?.price_cents}
        />
      </div>

      <TextField
        label="Plazo"
        name="eta_text"
        defaultValue={initial.eta_text}
        maxLength={60}
        autoComplete="off"
        hint="Cuánto tarda, como se lo contás a una clienta. Ejemplo: de 2 a 4 días hábiles."
        error={state.errors?.eta_text}
      />

      <CheckboxField
        label="Es zona de envío en el día"
        name="same_day"
        defaultChecked={initial.same_day}
        hint="Paraná y Oro Verde. Estas zonas solo se ofrecen antes del horario de corte."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextAreaField
          label="Provincias"
          name="provinces"
          defaultValue={initial.provinces}
          rows={4}
          hint="Una por línea. Opcional: sirve para saber qué zona le toca a cada dirección."
          error={state.errors?.provinces}
        />
        <TextAreaField
          label="Códigos postales"
          name="postal_codes"
          defaultValue={initial.postal_codes}
          rows={4}
          hint="Uno por línea. Opcional."
          error={state.errors?.postal_codes}
        />
      </div>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}

      <SubmitButton pending={pending} className="self-start">
        {mode === "create" ? "Crear la zona" : "Guardar cambios"}
      </SubmitButton>
    </form>
  );
}
