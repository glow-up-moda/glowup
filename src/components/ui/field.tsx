import type { ComponentProps, ReactNode } from "react";

import { IconAlert } from "./icons";

// Campos con label siempre visible, ayuda y error enlazados con
// aria-describedby (CLAUDE.md §5 y §15). Texto de 16px en los inputs para que
// el celular no haga zoom al tocarlos. Si el mismo formulario aparece varias
// veces en una página, cada campo necesita su propio id.

export const inputClass =
  "min-h-11 w-full rounded-input border-2 border-transparent bg-crema-oscuro px-3 py-2 text-base text-chocolate placeholder:text-chocolate/60 focus:border-chocolate aria-[invalid=true]:border-error";

type FieldBase = {
  label: string;
  name: string;
  id?: string;
  hint?: ReactNode;
  error?: string;
};

function describedBy(
  id: string,
  hint?: ReactNode,
  error?: string,
): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(
    Boolean,
  );
  return ids.length ? ids.join(" ") : undefined;
}

function FieldFrame({
  label,
  id,
  hint,
  error,
  children,
}: {
  label: string;
  id: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-chocolate/80">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
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
  id = name,
  hint,
  error,
  className = "",
  ...props
}: FieldBase & Omit<ComponentProps<"input">, "name" | "id">) {
  return (
    <FieldFrame label={label} id={id} hint={hint} error={error}>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} ${className}`}
        {...props}
      />
    </FieldFrame>
  );
}

export function TextAreaField({
  label,
  name,
  id = name,
  hint,
  error,
  className = "",
  ...props
}: FieldBase & Omit<ComponentProps<"textarea">, "name" | "id">) {
  return (
    <FieldFrame label={label} id={id} hint={hint} error={error}>
      <textarea
        id={id}
        name={name}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} ${className}`}
        {...props}
      />
    </FieldFrame>
  );
}

export function SelectField({
  label,
  name,
  id = name,
  hint,
  error,
  className = "",
  children,
  ...props
}: FieldBase & Omit<ComponentProps<"select">, "name" | "id">) {
  return (
    <FieldFrame label={label} id={id} hint={hint} error={error}>
      <select
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
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
  id = name,
  hint,
  ...props
}: Omit<FieldBase, "error"> &
  Omit<ComponentProps<"input">, "name" | "type" | "id">) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-center gap-3"
      >
        <input
          id={id}
          name={name}
          type="checkbox"
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="size-5 shrink-0 accent-chocolate"
          {...props}
        />
        <span className="text-base">{label}</span>
      </label>
      {hint && (
        <p id={`${id}-hint`} className="-mt-1 pl-8 text-sm text-chocolate/80">
          {hint}
        </p>
      )}
    </div>
  );
}

export function RadioGroupField({
  legend,
  name,
  options,
  value,
  hint,
}: {
  legend: string;
  name: string;
  options: readonly { value: string; label: string }[];
  value?: string;
  hint?: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          htmlFor={`${name}-${option.value}`}
          className="flex min-h-11 cursor-pointer items-center gap-3"
        >
          <input
            id={`${name}-${option.value}`}
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={value === option.value}
            className="size-5 shrink-0 accent-chocolate"
          />
          <span className="text-base">{option.label}</span>
        </label>
      ))}
      {hint && <p className="text-sm text-chocolate/80">{hint}</p>}
    </fieldset>
  );
}
