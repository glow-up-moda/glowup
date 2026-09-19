import Link from "next/link";
import type { ReactNode } from "react";

/** Título de cada pantalla del panel, con vuelta atrás y acciones opcionales. */
export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 print:hidden">
      {back && (
        <Link
          href={back.href}
          className="mb-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        >
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold md:text-3xl">
            {title}
          </h1>
          {description && (
            <div className="mt-1 max-w-[70ch] text-chocolate/80">
              {description}
            </div>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Tarjeta de sección del panel. */
export function Section({
  title,
  description,
  children,
  id,
}: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-card bg-crema-oscuro/60 p-4 md:p-6">
      {title && <h2 className="font-display text-xl font-semibold">{title}</h2>}
      {description && (
        <div className="mt-1 text-sm text-chocolate/80">{description}</div>
      )}
      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
