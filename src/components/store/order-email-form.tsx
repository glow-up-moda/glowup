"use client";

import type { FindOrderState } from "@/app/(store)/pedido/actions";
import { Button } from "@/components/ui/button";
import { IconAlert } from "@/components/ui/icons";
import { useFormAction } from "@/lib/use-form-action";

const fieldClass =
  "min-h-11 w-full rounded-input border-2 border-transparent bg-arena px-3 text-base text-azul placeholder:text-azul/60 focus:border-azul";

/**
 * Pide el email con el que se compró, para abrir un pedido desde un navegador
 * que no lo recuerda. Va con `useFormAction` para que un email equivocado no
 * borre lo escrito (§7, formularios).
 */
export function OrderEmailForm({
  action,
  submitLabel = "Ver mi pedido",
}: {
  action: (prev: FindOrderState, formData: FormData) => Promise<FindOrderState>;
  submitLabel?: string;
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex max-w-md flex-col gap-3"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Email con el que compraste</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tuemail@ejemplo.com"
          className={fieldClass}
        />
      </label>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Buscando…" : submitLabel}
      </Button>
      {state.error && (
        <p className="flex items-start gap-1.5 text-sm text-error" role="alert">
          <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}
    </form>
  );
}
