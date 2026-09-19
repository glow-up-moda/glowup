"use client";

import { Section } from "@/components/admin/page-header";
import { CheckboxField, TextAreaField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/admin/forms";
import {
  MAX_ANNOUNCEMENT_LENGTH,
  MAX_ANNOUNCEMENTS,
  type SettingsValues,
} from "@/lib/admin/settings";

import { useFormAction } from "./use-form-action";

export function SettingsForm({
  action,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: SettingsValues;
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      <Section title="Descuentos y envío">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Descuento por transferencia (%)"
              name="transfer_discount_percent"
              inputMode="numeric"
              defaultValue={initial.transfer_discount_percent}
              hint="Se aplica al pagar por transferencia."
              error={state.errors?.transfer_discount_percent}
            />
            <TextField
              label="Envío gratis desde"
              name="free_shipping_threshold_cents"
              inputMode="numeric"
              defaultValue={initial.free_shipping_threshold_cents}
              hint="En pesos, sobre el subtotal con descuentos. Vacío: sin envío gratis."
              error={state.errors?.free_shipping_threshold_cents}
            />
          </div>
          <CheckboxField
            label="Sumar cupón y descuento por transferencia"
            name="discounts_stack"
            defaultChecked={initial.discounts_stack}
            hint="Si está apagado se aplica el mayor de los dos, y en empate la transferencia."
          />
        </div>
      </Section>

      <Section title="Stock">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Aviso de stock bajo"
            name="low_stock_default"
            inputMode="numeric"
            defaultValue={initial.low_stock_default}
            hint="Unidades disponibles a partir de las cuales avisa el panel. Cada variante puede tener el suyo."
            error={state.errors?.low_stock_default}
          />
          <TextField
            label="“Últimas unidades” desde"
            name="last_units_threshold"
            inputMode="numeric"
            defaultValue={initial.last_units_threshold}
            hint="Lo que muestra la tienda cuando queda poco."
            error={state.errors?.last_units_threshold}
          />
        </div>
      </Section>

      <Section title="Entrega">
        <TextField
          label="Horario de corte del envío en el día"
          name="same_day_cutoff_time"
          type="time"
          defaultValue={initial.same_day_cutoff_time}
          hint="Después de esa hora, el pedido sale al día siguiente."
          error={state.errors?.same_day_cutoff_time}
          className="sm:max-w-xs"
        />
      </Section>

      <Section
        title="Datos para las clientas"
        description="Se muestran en el checkout, en el pedido y en el botón de WhatsApp. No van al repositorio."
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Alias bancario"
              name="bank_alias"
              defaultValue={initial.bank_alias}
              autoComplete="off"
              spellCheck={false}
              hint="Para las transferencias."
              error={state.errors?.bank_alias}
            />
            <TextField
              label="CBU"
              name="bank_cbu"
              inputMode="numeric"
              defaultValue={initial.bank_cbu}
              autoComplete="off"
              hint="22 números."
              error={state.errors?.bank_cbu}
            />
          </div>
          <TextField
            label="WhatsApp"
            name="whatsapp_number"
            inputMode="tel"
            defaultValue={initial.whatsapp_number}
            autoComplete="off"
            hint="Con característica y sin el 0 ni el 15. Ejemplo: 3434000000."
            error={state.errors?.whatsapp_number}
            className="sm:max-w-xs"
          />
        </div>
      </Section>

      <Section
        title="Barra de anuncios"
        description="Un mensaje por línea. Rotan de a uno arriba del header."
      >
        <TextAreaField
          label="Mensajes"
          name="announcement_messages"
          defaultValue={initial.announcement_messages}
          rows={5}
          hint={`Hasta ${MAX_ANNOUNCEMENTS} mensajes de ${MAX_ANNOUNCEMENT_LENGTH} caracteres.`}
          error={state.errors?.announcement_messages}
        />
      </Section>

      <div className="flex flex-col items-start gap-3">
        <SubmitButton pending={pending}>Guardar cambios</SubmitButton>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        {state.message && <Notice tone="success">{state.message}</Notice>}
      </div>
    </form>
  );
}
