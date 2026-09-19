import type { ComponentProps, ReactNode } from "react";

import { IconAlert } from "./icons";

// Campos con label siempre visible, ayuda y error enlazados con
// aria-describedby (CLAUDE.md §5 y §15). Texto de 16px en los inputs para que
// el celular no haga zoom al tocarlos.

export const inputClass =
  "min-h-11 w-full rounded-input border-2 border-transparent bg-crema-oscuro px-3 py-2 text-base text-chocolate placeholder:text-chocolate/60 focus:border-chocolate aria-[invalid=true]:border-error";

type FieldBase = {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string;
};

function describedBy(
  name: string,
  hint?: ReactNode,
  error?: string,
): string | undefined {
  const ids = [
    hint ? `${name}-hint` : null,
    error ? `${name}-error` : null,
  ].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

function FieldFrame({
  label,
  name,
  hint,
  error,
  children,
}: FieldBase & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${name}-hint`} className="text-sm text-chocolate/80">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${name}-error`}
          className="flex items-start gap-1.5 text-sm text-error"
        >
          <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  name,
  hint,
  error,
  className = "",
  ...props
}: FieldBase & Omit<ComponentProps<"input">, "name">) {
  return (
    <FieldFrame label={label} name={name} hint={hint} error={error}>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={`${inputClass} ${className}`}
        {...props}
      />
    </FieldFrame>
  );
}

export function TextAreaField({
  label,
  name,
  hint,
  error,
  className = "",
  ...props
}: FieldBase & Omit<ComponentProps<"textarea">, "name">) {
  return (
    <FieldFrame label={label} name={name} hint={hint} error={error}>
      <textarea
        id={name}
        name={name}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={`${inputClass} ${className}`}
        {...props}
      />
    </FieldFrame>
  );
}

export function SelectField({
  label,
  name,
  hint,
  error,
  className = "",
  children,
  ...props
}: FieldBase & Omit<ComponentProps<"select">, "name">) {
  return (
    <FieldFrame label={label} name={name} hint={hint} error={error}>
      <select
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={`${inputClass} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

export function CheckboxField({
  label,
  name,
  hint,
  ...props
}: Omit<FieldBase, "error"> & Omit<ComponentProps<"input">, "name" | "type">) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={name}
        className="flex min-h-11 cursor-pointer items-center gap-3"
      >
        <input
          id={name}
          name={name}
          type="checkbox"
          aria-describedby={hint ? `${name}-hint` : undefined}
          className="size-5 shrink-0 accent-chocolate"
          {...props}
        />
        <span className="text-base">{label}</span>
      </label>
      {hint && (
        <p id={`${name}-hint`} className="-mt-1 pl-8 text-sm text-chocolate/80">
          {hint}
        </p>
      )}
    </div>
  );
}
