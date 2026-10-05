"use client";

// Achicar la foto en el navegador antes de subirla: sube rápido con datos del
// celular y entra en el límite del servidor. El servidor la pasa a WebP (§7).

/** Tope antes de achicar: una foto de celular pesa de 2 a 12 MB. */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
const MAX_SIDE = 2000;

export async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))),
      "image/jpeg",
      0.9,
    ),
  );
}
