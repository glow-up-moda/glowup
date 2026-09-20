import type { ReactNode } from "react";

/** Contenedor de las páginas de texto: ancho de lectura cómodo (§5). */
export function PageShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold md:text-3xl">
        {title}
      </h1>
      {intro && <p className="mt-3 text-lg">{intro}</p>}
      <div className="mt-8 flex flex-col gap-8">{children}</div>
    </article>
  );
}

export function Block({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </section>
  );
}
