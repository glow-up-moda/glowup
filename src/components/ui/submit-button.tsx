"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { buttonClass } from "./button";

/** Botón de envío que se deshabilita y avisa mientras la acción corre. */
export function SubmitButton({
  children,
  pendingText = "Guardando…",
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & {
  pendingText?: string;
  variant?: "primary" | "secondary" | "quiet";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      aria-disabled={pending || props.disabled}
      className={buttonClass(variant, className)}
      {...props}
    >
      {pending ? pendingText : children}
    </button>
  );
}
