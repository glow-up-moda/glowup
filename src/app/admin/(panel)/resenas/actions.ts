"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/admin/errors";
import type { FormState } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/params";

// Moderación de reseñas (§7). Entran como `pending` y no se ven en la tienda
// hasta que se aprueban; rechazarlas las esconde sin borrarlas, así se puede
// revisar después qué se decidió.

type ReviewStatus = "approved" | "rejected" | "pending";

async function setStatus(
  id: string,
  status: ReviewStatus,
  message: string,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos esa reseña." };

  const { error } = await supabase
    .from("reviews")
    .update({ status })
    .eq("id", id);
  if (error) return { error: dbErrorMessage(error, "No se pudo guardar.") };

  revalidatePath("/admin", "layout");
  return { message };
}

export async function approveReview(id: string): Promise<FormState> {
  return setStatus(id, "approved", "Publicada.");
}

export async function rejectReview(id: string): Promise<FormState> {
  return setStatus(id, "rejected", "No se publica.");
}

/** Vuelve a dejarla esperando, por si se aprobó o se rechazó sin querer. */
export async function resetReview(id: string): Promise<FormState> {
  return setStatus(id, "pending", "Vuelve a la cola.");
}
