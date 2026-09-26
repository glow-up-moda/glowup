import Link from "next/link";
import type { ComponentProps } from "react";

// Botones de la marca (CLAUDE.md §5): píldora, 44px de alto como mínimo.
// Principal: fondo azul con texto crema. Secundario: borde y texto azul.

type Variant = "primary" | "secondary" | "quiet";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-base font-medium transition-colors duration-150 ease-brand disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-azul text-crema hover:bg-azul/90",
  secondary: "border-2 border-azul text-azul hover:bg-arena",
  quiet: "px-3 text-azul underline underline-offset-4 hover:bg-arena",
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
