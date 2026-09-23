"use client";

import Link from "next/link";

import { subscribeToNewsletter } from "@/app/(store)/actions";
import { Button } from "@/components/ui/button";
import { IconAlert, IconCheck } from "@/components/ui/icons";
import { clearFields, useFormAction } from "@/lib/use-form-action";

// Alta al newsletter (§7, inicio). El consentimiento es explícito: el texto
// dice para qué es el email antes de pedirlo (§15).

export function NewsletterForm() {
  const { state, pending, formRef, onSubmit } = useFormAction(
    subscribeToNewsletter,
    { onSuccess: (form) => clearFields(form, ["email"]) },
  );

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="mt-5 flex max-w-md flex-col gap-3"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Tu email</span>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tuemail@ejemplo.com"
            className="min-h-11 w-full rounded-input border-2 border-transparent bg-crema px-3 text-base text-chocolate placeholder:text-chocolate/60 focus:border-chocolate"
          />
          <Button type="submit" disabled={pending} className="shrink-0">
            {pending ? "Anotándote…" : "Quiero el descuento"}
          </Button>
        </div>
      </label>

      <p className="text-sm">
        Te escribimos cuando entra algo nuevo o hay una promo. Podés darte de
        baja cuando quieras. Leé cómo cuidamos tus datos en{" "}
        <Link href="/privacidad" className="underline underline-offset-4">
          privacidad
        </Link>
        .
      </p>

      {state.error && (
        <p className="flex items-start gap-1.5 text-sm text-error" role="alert">
          <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          className="flex items-start gap-1.5 text-sm text-exito"
          role="status"
        >
          <IconCheck width={16} height={16} className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      )}
    </form>
  );
}
