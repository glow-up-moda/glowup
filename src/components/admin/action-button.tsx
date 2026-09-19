"use client";

import { useActionState } from "react";

import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { emptyForm, type FormState } from "@/lib/admin/forms";

/** Un botón que corre una acción del servidor y muestra el resultado debajo. */
export function ActionButton({
  action,
  children,
  pendingText = "Guardando…",
  variant = "primary",
}: {
  action: (prev: FormState) => Promise<FormState>;
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "quiet";
}) {
  const [state, formAction] = useActionState(action, emptyForm);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <SubmitButton variant={variant} pendingText={pendingText}>
        {children}
      </SubmitButton>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}
    </form>
  );
}
