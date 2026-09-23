"use client";

import { unsubscribeFromMarketing } from "@/app/(store)/checkout/actions";
import { Button } from "@/components/ui/button";
import { IconAlert, IconCheck } from "@/components/ui/icons";
import { useFormAction } from "@/lib/use-form-action";

export function UnsubscribeForm({ id }: { id: string }) {
  const { state, pending, formRef, onSubmit } = useFormAction(
    unsubscribeFromMarketing.bind(null, id),
  );

  if (state.message) {
    return (
      <p className="flex items-start gap-1.5 text-exito" role="status">
        <IconCheck width={18} height={18} className="mt-0.5 shrink-0" />
        {state.message}
      </p>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Dando de baja…" : "Sí, no me escriban más"}
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
