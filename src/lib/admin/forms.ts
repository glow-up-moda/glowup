import { z } from "zod";

import { fromLocalInput, parsePesos } from "@/lib/format";

// El estado lo comparten el panel y la tienda; vive con el hook que lo usa.
export { emptyForm, type FormState } from "@/lib/use-form-action";

/** Primer error de cada campo, para mostrarlo debajo del input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const flat = z.flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(flat)) {
    if (messages?.[0]) result[field] = messages[0];
  }
  return result;
}

/** Lo que se escribió, para no perderlo si el formulario vuelve con errores. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

export function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Texto opcional: vacío se guarda como null. */
export const optionalText = (
  max: number,
  message = `Hasta ${max} caracteres.`,
) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

/** Precio obligatorio en pesos enteros, a centavos. */
export const pesos = (message: string) =>
  z.string().transform((value, ctx) => {
    const cents = parsePesos(value);
    if (cents == null || cents <= 0) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return cents;
  });

/** Precio opcional en pesos enteros, a centavos; vacío es null. */
export const optionalPesos = (message: string) =>
  z.string().transform((value, ctx) => {
    if (value.trim() === "") return null;
    const cents = parsePesos(value);
    if (cents == null) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return cents;
  });

/** Entero opcional (umbrales, usos máximos); vacío es null. */
export const optionalInt = (min: number, max: number, message: string) =>
  z.string().transform((value, ctx) => {
    if (value.trim() === "") return null;
    const number = Number(value.trim());
    if (!Number.isInteger(number) || number < min || number > max) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return number;
  });

export const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

/** Fecha y hora opcional de un <input type="datetime-local">, a ISO; vacío es null. */
export const optionalDateTime = (message = "Revisá la fecha y la hora.") =>
  z.string().transform((value, ctx) => {
    if (value.trim() === "") return null;
    const iso = fromLocalInput(value);
    if (!iso) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return iso;
  });

/** Entero obligatorio dentro de un rango. */
export const integer = (min: number, max: number, message: string) =>
  z.string().transform((value, ctx) => {
    const number = Number(value.trim());
    if (
      value.trim() === "" ||
      !Number.isInteger(number) ||
      number < min ||
      number > max
    ) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return number;
  });
