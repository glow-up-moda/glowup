"use client";

import { useActionState } from "react";

import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

import {
  type CodeState,
  confirmEnrollment,
  type EnrollState,
  startEnrollment,
  verifyCode,
} from "./actions";

function CodeInput() {
  return (
    <TextField
      label="Código de 6 números"
      name="code"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9 ]{6,7}"
      maxLength={7}
      required
      className="text-center text-xl tracking-[0.3em]"
    />
  );
}

export function VerifyForm() {
  const [state, formAction] = useActionState<CodeState, FormData>(
    verifyCode,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p>
        Abrí la app de autenticación de tu celular y escribí el código que
        muestra para el panel.
      </p>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <CodeInput />
      <SubmitButton pendingText="Verificando…" className="w-full">
        Verificar
      </SubmitButton>
    </form>
  );
}

export function EnrollForm() {
  const [enrollment, startAction] = useActionState<EnrollState>(
    startEnrollment,
    {},
  );
  const [state, confirmAction] = useActionState<CodeState, FormData>(
    confirmEnrollment,
    {},
  );

  if (!enrollment.factorId) {
    return (
      <form action={startAction} className="flex flex-col gap-4">
        <p>
          Para entrar al panel hace falta un segundo paso: un código que cambia
          cada 30 segundos y genera una app de tu celular (Google Authenticator,
          Authy o la que ya uses).
        </p>
        {enrollment.error && <Notice tone="error">{enrollment.error}</Notice>}
        <SubmitButton pendingText="Generando…" className="w-full">
          Configurar la app
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={confirmAction} className="flex flex-col gap-4">
      <p>Escaneá este código con la app y escribí el número que te muestra.</p>
      {/* El QR viene como imagen SVG en data URI desde Supabase. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={enrollment.qrCode}
        alt="Código QR para configurar la app de autenticación"
        width={200}
        height={200}
        className="mx-auto rounded-input bg-crema p-2"
      />
      <details className="text-sm">
        <summary className="min-h-11 cursor-pointer py-2 underline underline-offset-4">
          ¿No podés escanearlo? Cargá la clave a mano
        </summary>
        <p className="font-mono mt-1 rounded-input bg-crema px-3 py-2 break-all">
          {enrollment.secret}
        </p>
      </details>
      <input type="hidden" name="factorId" value={enrollment.factorId} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <CodeInput />
      <SubmitButton pendingText="Activando…" className="w-full">
        Activar y entrar
      </SubmitButton>
    </form>
  );
}
