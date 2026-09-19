import type { ReactNode } from "react";

/** Marco de las pantallas de ingreso y segundo factor. */
export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="text-center font-display text-3xl font-semibold">
          GLOW UP
        </p>
        <h1 className="mt-1 text-center text-base">{title}</h1>
        <div className="mt-8 rounded-card bg-crema-oscuro/60 p-5 shadow-soft sm:p-6">
          {children}
        </div>
      </div>
    </main>
  );
}
