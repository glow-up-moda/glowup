"use client";

import { useActionState } from "react";

import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { emptyForm, type FormState } from "@/lib/admin/forms";

/**
 * Acción destructiva en dos pasos: primero se abre, después se confirma. Sin
 * JavaScript sigue funcionando porque usa <details>.
 */
export function ConfirmAction({
  action,
  label,
  question,
  confirmLabel,
  pendingText = "Borrando…",
}: {
  action: (prev: FormState) => Promise<FormState>;
  label: string;
  question: string;
  confirmLabel: string;
  pendingText?: string;
}) {
  const [state, formAction] = useActionState(action, emptyForm);

  return (
    <details className="group">
      <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 underline underline-offset-4 hover:bg-crema-oscuro">
        {label}
      </summary>
      <form
        action={formAction}
        className="mt-2 flex flex-col items-start gap-3 rounded-card bg-crema p-4"
      >
        <p className="text-sm">{question}</p>
        <SubmitButton variant="secondary" pendingText={pendingText}>
          {confirmLabel}
        </SubmitButton>
      </form>
      {state.error && (
        <Notice tone="error" className="mt-2">
          {state.error}
        </Notice>
      )}
      {state.message && (
        <Notice tone="success" className="mt-2">
          {state.message}
        </Notice>
      )}
    </details>
  );
}
