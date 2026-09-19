import type { ReactNode } from "react";

// Badges píldora. Los de estado usan el chip lleno del §5: texto crema sobre
// error o éxito (6.2:1 y 6.0:1). Los demás, texto chocolate.

type Tone = "neutral" | "accent" | "offer" | "error" | "success";

const styles: Record<Tone, string> = {
  neutral: "bg-crema-oscuro text-chocolate",
  accent: "bg-rosa text-chocolate",
  offer: "bg-coral text-chocolate",
  error: "bg-error text-crema",
  success: "bg-exito text-crema",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
