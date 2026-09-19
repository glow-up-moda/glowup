"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { buttonClass } from "./button";

/**
 * Botón de envío que se deshabilita y avisa mientras la acción corre. Con
 * useFormAction el envío no pasa por <form action>, así que el estado llega
 * por la prop pending.
 */
export function SubmitButton({
  children,
  pendingText = "Guardando…",
  variant = "primary",
  className,
  pending,
  disabled,
  ...props
}: ComponentProps<"button"> & {
  pendingText?: string;
  variant?: "primary" | "secondary" | "quiet";
  pending?: boolean;
}) {
  const status = useFormStatus();
  const busy = pending ?? status.pending;
  return (
    <button
      {...props}
      type="submit"
      disabled={busy || disabled}
      aria-disabled={busy || disabled}
      className={buttonClass(variant, className)}
    >
      {busy ? pendingText : children}
    </button>
  );
}
