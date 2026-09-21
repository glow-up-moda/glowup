"use client";

import { resumeCardPayment } from "@/app/(store)/pedido/actions";
import { Button } from "@/components/ui/button";
import { IconAlert } from "@/components/ui/icons";
import { useFormAction } from "@/lib/use-form-action";

/** Reabre el pago con tarjeta de un pedido pendiente (§11). */
export function ResumePaymentButton({ number }: { number: string }) {
  const { state, pending, formRef, onSubmit } = useFormAction(() =>
    resumeCardPayment(number),
  );

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col items-start gap-2"
    >
      <Button type="submit" disabled={pending}>
        {pending ? "Abriendo el pago…" : "Terminar el pago"}
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
