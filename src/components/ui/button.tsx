import Link from "next/link";
import type { ComponentProps } from "react";

// Botones de la marca (CLAUDE.md §5): píldora, 44px de alto como mínimo.
// Principal: fondo coral con texto chocolate. Secundario: borde y texto chocolate.

type Variant = "primary" | "secondary" | "quiet";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-base font-medium transition-colors duration-150 ease-brand disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-coral text-chocolate hover:bg-rosa",
  secondary: "border-2 border-chocolate text-chocolate hover:bg-crema-oscuro",
  quiet:
    "px-3 text-chocolate underline underline-offset-4 hover:bg-crema-oscuro",
};

export function buttonClass(
  variant: Variant = "primary",
  className = "",
): string {
  return `${base} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={buttonClass(variant, className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
