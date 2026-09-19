"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import {
  fieldErrors,
  type FormState,
  optionalDateTime,
  optionalInt,
  optionalPesos,
  text,
} from "@/lib/admin/forms";
import { isUuid } from "@/lib/admin/params";
import { requireAdmin } from "@/lib/auth/admin";
import { parsePesos } from "@/lib/format";

const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z0-9_-]{3,32}$/,
        "De 3 a 32 letras, números, guiones o guiones bajos.",
      ),
    type: z.enum(["percent", "fixed"], {
      error: "Elegí el tipo de descuento.",
    }),
    value: z.string(),
    min_subtotal_cents: optionalPesos(
      "Escribí el mínimo en pesos, sin centavos.",
    ),
    starts_at: optionalDateTime(),
    ends_at: optionalDateTime(),
    max_uses: optionalInt(
      1,
      1000000,
      "Poné un número entero de usos, o dejalo vacío.",
    ),
  })
  .transform((coupon, ctx) => {
    let value: number;
    if (coupon.type === "percent") {
      const percent = Number(coupon.value.trim());
      if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["value"],
          message: "El porcentaje va de 1 a 100, sin decimales.",
        });
        return z.NEVER;
      }
      value = percent;
    } else {
      const cents = parsePesos(coupon.value);
      if (cents == null || cents <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["value"],
          message: "Escribí el monto en pesos, sin centavos.",
        });
        return z.NEVER;
      }
      value = cents;
    }
    if (
      coupon.starts_at &&
      coupon.ends_at &&
      coupon.starts_at >= coupon.ends_at
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "El fin tiene que ser posterior al inicio.",
      });
      return z.NEVER;
    }
    return {
      code: coupon.code,
      type: coupon.type,
      value,
      min_subtotal_cents: coupon.min_subtotal_cents ?? 0,
      starts_at: coupon.starts_at,
      ends_at: coupon.ends_at,
      max_uses: coupon.max_uses,
    };
  });

function parseCoupon(formData: FormData) {
  return couponSchema.safeParse({
    code: text(formData, "code"),
    type: text(formData, "type"),
    value: text(formData, "value"),
    min_subtotal_cents: text(formData, "min_subtotal_cents"),
    starts_at: text(formData, "starts_at"),
    ends_at: text(formData, "ends_at"),
    max_uses: text(formData, "max_uses"),
  });
}

export async function createCoupon(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = parseCoupon(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { data, error } = await supabase
    .from("coupons")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error) {
    return {
      error: dbErrorMessage(
        error,
        error.code === "23505"
          ? "Ya hay un cupón con ese código."
          : "No se pudo crear el cupón.",
      ),
    };
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/cupones/${data.id}?hecho=creado`);
}

export async function updateCoupon(
  couponId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(couponId)) return { error: "No encontramos ese cupón." };
  const parsed = parseCoupon(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { data, error } = await supabase
    .from("coupons")
    .update(parsed.data)
    .eq("id", couponId)
    .select("id")
    .maybeSingle();
  if (error) {
    return {
      error: dbErrorMessage(
        error,
        error.code === "23505"
          ? "Ya hay otro cupón con ese código."
          : "No se pudo guardar el cupón.",
      ),
    };
  }
  if (!data) return { error: "No encontramos ese cupón." };

  revalidatePath("/admin", "layout");
  return { message: "Cambios guardados." };
}

/** Desactivar es cortarle la vigencia: el historial de pedidos queda igual. */
export async function deactivateCoupon(couponId: string): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(couponId)) return { error: "No encontramos ese cupón." };

  const { data: coupon } = await supabase
    .from("coupons")
    .select("starts_at")
    .eq("id", couponId)
    .maybeSingle();
  if (!coupon) return { error: "No encontramos ese cupón." };

  // La base exige que el inicio sea anterior al fin: si el cupón todavía no
  // arrancó, se le saca la fecha de inicio en vez de dejarla adelante.
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("coupons")
    .update({
      ends_at: now,
      starts_at:
        coupon.starts_at && coupon.starts_at >= now ? null : coupon.starts_at,
    })
    .eq("id", couponId)
    .select("code")
    .maybeSingle();
  if (error) return { error: dbErrorMessage(error, "No se pudo desactivar.") };
  if (!data) return { error: "No encontramos ese cupón." };

  revalidatePath("/admin", "layout");
  return { message: "Cupón desactivado: ya no se puede usar." };
}

export async function deleteCoupon(couponId: string): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(couponId)) return { error: "No encontramos ese cupón." };

  // Un cupón usado queda en los pedidos: se desactiva, no se borra.
  const { data, error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", couponId)
    .eq("used_count", 0)
    .select("id");
  if (error)
    return { error: dbErrorMessage(error, "No se pudo borrar el cupón.") };
  if (!data?.length) {
    return {
      error:
        "Ese cupón ya se usó en un pedido: desactivalo en vez de borrarlo.",
    };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/cupones?hecho=borrado");
}
