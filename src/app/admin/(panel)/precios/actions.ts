"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import { fieldErrors, type FormState, text } from "@/lib/admin/forms";
import { isUuid } from "@/lib/params";
import { parsePercent, parseRounding, percentLabel } from "@/lib/admin/prices";
import { requireAdmin } from "@/lib/auth/admin";

const schema = z.object({
  motivo: z.string().trim().max(200, "Hasta 200 caracteres."),
});

/** Aplica el cambio masivo que se vio en la vista previa (§10). */
export async function applyPrices(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const ids = formData
    .getAll("ids")
    .filter((value): value is string => typeof value === "string")
    .filter(isUuid);
  const percent = parsePercent(text(formData, "porcentaje"));
  const rounding = parseRounding(text(formData, "redondeo"));
  const includeCompareAt = text(formData, "tachado") === "on";
  const parsed = schema.safeParse({ motivo: text(formData, "motivo") });

  if (!ids.length) {
    return {
      error: "No quedó ningún producto elegido. Armá la vista previa de nuevo.",
    };
  }
  if (percent == null) {
    return {
      error: "El porcentaje tiene que estar entre -90 y 300, y no puede ser 0.",
    };
  }
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { data, error } = await supabase.rpc("apply_price_change", {
    p_product_ids: ids,
    p_percent: percent,
    p_round_to_cents: rounding,
    p_include_compare_at: includeCompareAt,
    p_reason: parsed.data.motivo || `Cambio masivo de ${percentLabel(percent)}`,
  });
  if (error) {
    return {
      error: dbErrorMessage(error, "No se pudieron cambiar los precios."),
    };
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/precios?hecho=${data}`);
}
