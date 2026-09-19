import type { ReactNode } from "react";

import { IconAlert, IconCheck, IconInfo } from "./icons";

// Avisos (CLAUDE.md §5): error y éxito nunca con el color solo, siempre con
// ícono y texto, sobre crema oscuro con borde del color funcional. Los
// informativos van en rosa con texto chocolate.

type Tone = "info" | "error" | "success";

const styles: Record<Tone, string> = {
  info: "bg-rosa text-chocolate",
  error: "border-l-4 border-error bg-crema-oscuro text-error",
  success: "border-l-4 border-exito bg-crema-oscuro text-exito",
};

const icons: Record<Tone, typeof IconInfo> = {
  info: IconInfo,
  error: IconAlert,
  success: IconCheck,
};

export function Notice({
  tone = "info",
  title,
  children,
  className = "",
  id,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  const Icon = icons[tone];
  return (
    <div
      id={id}
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-3 rounded-card px-4 py-3 text-sm ${styles[tone]} ${className}`}
    >
      <Icon className="mt-0.5 shrink-0" />
      <div>
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
      </div>
    </div>
  );
}
