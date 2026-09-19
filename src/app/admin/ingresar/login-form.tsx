"use client";

import { useActionState } from "react";

import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

import { type LoginState, signIn } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        required
        defaultValue={state.email}
      />
      <TextField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <SubmitButton pendingText="Entrando…" className="mt-2 w-full">
        Entrar
      </SubmitButton>
    </form>
  );
}
