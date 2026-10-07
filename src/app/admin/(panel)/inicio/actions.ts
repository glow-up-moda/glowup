"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/admin/errors";
import { fieldErrors, type FormState, text } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth/admin";
import { MAX_UPLOAD_BYTES, PRODUCT_IMAGES_BUCKET } from "@/lib/images";
import { homeDefaults } from "@/lib/store/settings";

// Los textos del inicio (§7). Se guardan todos juntos en la clave `home_texts`,
// y lo que queda vacío no se guarda: así el campo vuelve solo al texto de
// fábrica en vez de dejar un hueco en la página.

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

/** Un texto corto, opcional: vacío significa "usá el de fábrica". */
const linea = (max: number) =>
  z.string().trim().max(max, `Hasta ${max} caracteres.`);

const homeSchema = z.object({
  heroTitle: linea(70),
  heroSubtitle: linea(160),
  heroCta: linea(30),
  categoriesTitle: linea(40),
  newTitle: linea(40),
  kitsTitle: linea(40),
  benefitsTitle: linea(40),
  benefits: z
    .string()
    .trim()
    .max(600, "Hasta 600 caracteres en total.")
    .transform((value) =>
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .refine((list) => list.length <= 6, "Hasta 6 puntos.")
    .refine(
      (list) => list.every((item) => item.length <= 90),
      "Cada punto, hasta 90 caracteres.",
    ),
  footerTagline: linea(140),
});

export async function updateHomeTexts(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const parsed = homeSchema.safeParse(
    Object.fromEntries(
      Object.keys(homeDefaults).map((field) => [field, text(formData, field)]),
    ),
  );
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  // Solo viaja lo que se escribió. Un campo en blanco se saca del objeto.
  const guardado: Record<string, string | string[]> = {};
  for (const [field, value] of Object.entries(parsed.data)) {
    if (Array.isArray(value)) {
      if (value.length > 0) guardado[field] = value;
    } else if (value !== "") {
      guardado[field] = value;
    }
  }

  const { error } = await supabase.rpc("set_settings", {
    p_values: { home_texts: guardado },
  });
  if (error) return { error: dbErrorMessage(error, "No se pudo guardar.") };

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { message: "Textos guardados." };
}

async function currentHeroImage(supabase: Supabase): Promise<string | null> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "home_hero_image_path")
    .maybeSingle();
  return typeof data?.value === "string" && data.value !== ""
    ? data.value
    : null;
}

export async function uploadHeroImage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0)
    return { errors: { file: "Elegí una foto." } };
  if (file.size > MAX_UPLOAD_BYTES)
    return { errors: { file: "La foto pesa demasiado. Probá con otra." } };

  // 4:5, que es la forma del arco del hero (§5).
  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await file.arrayBuffer()), {
      failOn: "error",
    })
      .rotate()
      .resize({ width: 1200, height: 1500, fit: "cover" })
      .webp({ quality: 90 })
      .toBuffer();
  } catch {
    return {
      errors: { file: "No pudimos leer esa foto. Probá con una JPG o PNG." },
    };
  }

  const anterior = await currentHeroImage(supabase);
  const path = `home/hero/${randomUUID()}.webp`;
  const storage = supabase.storage.from(PRODUCT_IMAGES_BUCKET);
  const { error: uploadError } = await storage.upload(path, webp, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError)
    return { error: "No se pudo subir la foto. Probá de nuevo." };

  const { error } = await supabase.rpc("set_settings", {
    p_values: { home_hero_image_path: path },
  });
  if (error) {
    await storage.remove([path]);
    return { error: dbErrorMessage(error, "No se pudo guardar la foto.") };
  }
  if (anterior) await storage.remove([anterior]);

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { message: "Foto subida." };
}

export async function removeHeroImage(): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const anterior = await currentHeroImage(supabase);
  if (!anterior) return { message: "No tenía foto." };

  const { error } = await supabase.rpc("set_settings", {
    p_values: { home_hero_image_path: null },
  });
  if (error)
    return { error: dbErrorMessage(error, "No se pudo sacar la foto.") };

  await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([anterior]);
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { message: "Foto borrada." };
}
