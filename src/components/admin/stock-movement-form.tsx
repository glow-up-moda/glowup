"use client";

import { useState } from "react";

import { recordMovement } from "@/app/admin/(panel)/stock/actions";
import { SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { CHANNELS } from "@/lib/admin/stock";

import { clearFields, useFormAction } from "@/lib/use-form-action";

type ManualType = "restock" | "manual_sale" | "adjustment" | "return";

const quantityLabels: Record<ManualType, { label: string; hint?: string }> = {
  restock: { label: "Cantidad que entra" },
  manual_sale: { label: "Cantidad vendida" },
  adjustment: {
    label: "Cuánto sumar o restar",
    hint: "Negativo para restar, por ejemplo -2.",
  },
  return: { label: "Cantidad devuelta" },
};

/** Ingreso, venta manual, ajuste o devolución de una variante (§9.8). */
export function StockMovementForm({ variantId }: { variantId: string }) {
  // Si sale bien se vacían cantidad y nota, pero el tipo y el canal quedan:
  // es común cargar varias ventas de Instagram seguidas.
  const { state, pending, formRef, onSubmit } = useFormAction(recordMovement, {
    onSuccess: (form) => clearFields(form, ["quantity", "note"]),
  });
  const [type, setType] = useState<ManualType>("restock");
  const errors = state.errors ?? {};
  const prefix = `mov-${variantId}`;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="variant_id" value={variantId} />
      {state.message && <Notice tone="success">{state.message}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Qué pasó"
          name="type"
          id={`${prefix}-type`}
          value={type}
          onChange={(event) => setType(event.currentTarget.value as ManualType)}
        >
          <option value="restock">Entró mercadería</option>
          <option value="manual_sale">Venta fuera de la web</option>
          <option value="adjustment">Ajuste (conteo, falla, pérdida)</option>
          <option value="return">Devolución</option>
        </SelectField>
        <TextField
          label={quantityLabels[type].label}
          name="quantity"
          id={`${prefix}-quantity`}
          inputMode="numeric"
          required
          error={errors.quantity}
          hint={quantityLabels[type].hint}
        />
      </div>

      {type === "manual_sale" && (
        <SelectField
          label="Por dónde fue la venta"
          name="channel"
          id={`${prefix}-channel`}
          defaultValue=""
          error={errors.channel}
        >
          <option value="">Elegí una opción</option>
          {CHANNELS.map((channel) => (
            <option key={channel} value={channel}>
              {channel}
            </option>
          ))}
        </SelectField>
      )}

      <TextField
        label={type === "adjustment" ? "Motivo" : "Nota (opcional)"}
        name="note"
        id={`${prefix}-note`}
        maxLength={200}
        required={type === "adjustment"}
        error={errors.note}
        hint={
          type === "restock"
            ? "Por ejemplo: proveedor o número de remito."
            : undefined
        }
      />

      <div>
        <SubmitButton pending={pending} pendingText="Registrando…">
          Registrar
        </SubmitButton>
      </div>
    </form>
  );
}
