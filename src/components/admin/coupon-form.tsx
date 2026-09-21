"use client";

import { useState } from "react";

import { SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { COUPON_TYPES, type CouponType } from "@/lib/admin/coupons";
import type { FormState } from "@/lib/admin/forms";

import { useFormAction } from "@/lib/use-form-action";

export type CouponValues = {
  code: string;
  type: CouponType;
  value: string;
  min_subtotal_cents: string;
  starts_at: string;
  ends_at: string;
  max_uses: string;
};

export const emptyCoupon: CouponValues = {
  code: "",
  type: "percent",
  value: "",
  min_subtotal_cents: "",
  starts_at: "",
  ends_at: "",
  max_uses: "",
};

export function CouponForm({
  action,
  initial = emptyCoupon,
  mode,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: CouponValues;
  mode: "create" | "edit";
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action);
  const [type, setType] = useState<CouponType>(initial.type);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Código"
          name="code"
          defaultValue={initial.code}
          maxLength={32}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="uppercase"
          hint="De 3 a 32 letras, números o guiones. Se guarda en mayúsculas."
          error={state.errors?.code}
        />
        <SelectField
          label="Tipo de descuento"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as CouponType)}
          error={state.errors?.type}
        >
          {COUPON_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={type === "percent" ? "Porcentaje" : "Monto en pesos"}
          name="value"
          inputMode="numeric"
          defaultValue={initial.value}
          placeholder={type === "percent" ? "15" : "5000"}
          hint={
            type === "percent"
              ? "De 1 a 100, sin decimales."
              : "En pesos, sin centavos."
          }
          error={state.errors?.value}
        />
        <TextField
          label="Compra mínima"
          name="min_subtotal_cents"
          inputMode="numeric"
          defaultValue={initial.min_subtotal_cents}
          hint="Opcional: el subtotal tiene que llegar a este monto."
          error={state.errors?.min_subtotal_cents}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Desde"
          name="starts_at"
          type="datetime-local"
          defaultValue={initial.starts_at}
          hint="Opcional. Hora de Argentina."
          error={state.errors?.starts_at}
        />
        <TextField
          label="Hasta"
          name="ends_at"
          type="datetime-local"
          defaultValue={initial.ends_at}
          hint="Opcional. Vacío: sin vencimiento."
          error={state.errors?.ends_at}
        />
      </div>

      <TextField
        label="Usos máximos"
        name="max_uses"
        inputMode="numeric"
        defaultValue={initial.max_uses}
        hint="Opcional. Vacío: sin tope."
        error={state.errors?.max_uses}
        className="sm:max-w-xs"
      />

      <SubmitButton pending={pending} className="self-start">
        {mode === "create" ? "Crear cupón" : "Guardar cambios"}
      </SubmitButton>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}
    </form>
  );
}
