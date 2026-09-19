"use client";

import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/admin/forms";
import { plural } from "@/lib/format";

import { useFormAction } from "./use-form-action";

/**
 * Aplica el cambio que muestra la vista previa. Lleva escondidos los mismos
 * datos con los que se armó, así lo que se ve es lo que se aplica.
 */
export function PriceApplyForm({
  action,
  ids,
  percent,
  rounding,
  includeCompareAt,
  defaultReason,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  ids: string[];
  percent: string;
  rounding: number;
  includeCompareAt: boolean;
  defaultReason: string;
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col items-start gap-3"
    >
      {ids.map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      <input type="hidden" name="porcentaje" value={percent} />
      <input type="hidden" name="redondeo" value={rounding} />
      {includeCompareAt && <input type="hidden" name="tachado" value="on" />}

      <TextField
        label="Motivo"
        name="motivo"
        id="motivo-precios"
        defaultValue={defaultReason}
        maxLength={200}
        hint="Queda en el historial de precios de cada producto."
        error={state.errors?.motivo}
        className="max-w-sm"
      />
      <SubmitButton pending={pending} pendingText="Aplicando…">
        Aplicar a {plural(ids.length, "producto", "productos")}
      </SubmitButton>
      {state.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  );
}
