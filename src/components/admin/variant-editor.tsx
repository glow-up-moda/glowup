"use client";

import { Badge } from "@/components/ui/badge";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/admin/forms";

import { ConfirmAction } from "./confirm-action";
import { StockMovementForm } from "./stock-movement-form";
import { useFormAction } from "@/lib/use-form-action";

type FormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

export type VariantRow = {
  id: string;
  color: string;
  size: string;
  sku: string | null;
  stock_on_hand: number;
  stock_reserved: number;
  low_stock_threshold: number | null;
  update: FormAction;
  remove: (prev: FormState) => Promise<FormState>;
};

const summaryClass =
  "inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 underline underline-offset-4 hover:bg-crema-oscuro";

export function VariantEditor({
  variants,
  addAction,
  lowStockDefault,
}: {
  variants: VariantRow[];
  addAction: FormAction;
  lowStockDefault: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      {variants.length === 0 ? (
        <Notice>
          Todavía no tiene variantes. Sumá la primera con su color, talle y
          stock.
        </Notice>
      ) : (
        <ul className="flex flex-col gap-3">
          {variants.map((variant) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              lowStockDefault={lowStockDefault}
            />
          ))}
        </ul>
      )}
      <details
        open={variants.length === 0}
        className="rounded-card bg-crema p-4"
      >
        <summary className="min-h-11 cursor-pointer py-2 font-medium">
          Agregar variante
        </summary>
        <AddVariantForm action={addAction} />
      </details>
    </div>
  );
}

function VariantCard({
  variant,
  lowStockDefault,
}: {
  variant: VariantRow;
  lowStockDefault: number;
}) {
  const available = variant.stock_on_hand - variant.stock_reserved;
  const threshold = variant.low_stock_threshold ?? lowStockDefault;

  return (
    <li className="rounded-card bg-crema p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {variant.color} · {variant.size}
          </p>
          {variant.sku && <p className="text-sm">SKU {variant.sku}</p>}
        </div>
        {available <= 0 ? (
          <Badge tone="error">Agotado</Badge>
        ) : available <= threshold ? (
          <Badge tone="accent">Stock bajo</Badge>
        ) : null}
      </div>
      <p className="mt-2 text-sm">
        <span className="font-display text-xl font-semibold">{available}</span>{" "}
        {available === 1 ? "disponible" : "disponibles"} ·{" "}
        {variant.stock_on_hand} en mano · {variant.stock_reserved}{" "}
        {variant.stock_reserved === 1 ? "reservada" : "reservadas"}
      </p>
      <details className="mt-3">
        <summary className={summaryClass}>Mover stock</summary>
        <div className="mt-3">
          <StockMovementForm variantId={variant.id} />
        </div>
      </details>
      <details>
        <summary className={summaryClass}>Editar o borrar</summary>
        <div className="mt-3 flex flex-col gap-4">
          <EditVariantForm variant={variant} />
          <ConfirmAction
            action={variant.remove}
            label="Borrar variante"
            question="Solo se puede borrar si no tiene stock, ventas ni está en un kit. ¿La borramos?"
            confirmLabel="Sí, borrar variante"
          />
        </div>
      </details>
    </li>
  );
}

function AddVariantForm({ action }: { action: FormAction }) {
  const { state, pending, formRef, onSubmit } = useFormAction(action, {
    onSuccess: (form) => form.reset(),
  });
  const errors = state.errors ?? {};

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="mt-3 flex flex-col gap-4"
    >
      {state.message && <Notice tone="success">{state.message}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Color"
          name="color"
          required
          maxLength={40}
          error={errors.color}
        />
        <TextField
          label="Talle"
          name="size"
          required
          maxLength={20}
          error={errors.size}
          hint="Por ejemplo 90, M o Único."
        />
        <TextField
          label="Stock inicial"
          name="initial_stock"
          inputMode="numeric"
          error={errors.initial_stock}
          hint="Entra como ingreso de mercadería."
        />
        <TextField
          label="SKU (opcional)"
          name="sku"
          maxLength={40}
          error={errors.sku}
        />
        <TextField
          label="Aviso de stock bajo (opcional)"
          name="low_stock_threshold"
          inputMode="numeric"
          error={errors.low_stock_threshold}
          hint="Vacío usa el de la configuración."
        />
      </div>
      <div>
        <SubmitButton pending={pending} pendingText="Agregando…">
          Agregar variante
        </SubmitButton>
      </div>
    </form>
  );
}

function EditVariantForm({ variant }: { variant: VariantRow }) {
  const { state, pending, formRef, onSubmit } = useFormAction(variant.update, {
    onSuccess: (form) => form.reset(),
  });
  const errors = state.errors ?? {};
  const value = (_key: string, fallback: string) => fallback;
  const id = (field: string) => `variante-${variant.id}-${field}`;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      {state.message && <Notice tone="success">{state.message}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Color"
          name="color"
          id={id("color")}
          required
          maxLength={40}
          defaultValue={value("color", variant.color)}
          error={errors.color}
        />
        <TextField
          label="Talle"
          name="size"
          id={id("size")}
          required
          maxLength={20}
          defaultValue={value("size", variant.size)}
          error={errors.size}
        />
        <TextField
          label="SKU"
          name="sku"
          id={id("sku")}
          maxLength={40}
          defaultValue={value("sku", variant.sku ?? "")}
          error={errors.sku}
        />
        <TextField
          label="Aviso de stock bajo"
          name="low_stock_threshold"
          id={id("threshold")}
          inputMode="numeric"
          defaultValue={value(
            "low_stock_threshold",
            variant.low_stock_threshold?.toString() ?? "",
          )}
          error={errors.low_stock_threshold}
          hint="Vacío usa el de la configuración."
        />
      </div>
      <div>
        <SubmitButton pending={pending} variant="secondary">
          Guardar variante
        </SubmitButton>
      </div>
    </form>
  );
}
