// Traduce los códigos de error de la base (CLAUDE.md §8) a textos del panel.

type DbError = { message?: string; code?: string } | null | undefined;

const byMessage: Record<string, string> = {
  insufficient_stock: "No alcanza el stock disponible para ese movimiento.",
  invalid_movement: "Revisá la cantidad y la nota del movimiento.",
  variant_not_found: "Esa variante ya no existe.",
  order_not_found: "No encontramos ese pedido.",
  // El panel solo ofrece pasos válidos: si falla, el pedido cambió en otra pestaña.
  invalid_transition:
    "El pedido cambió mientras lo mirabas. Recargá la página para ver cómo quedó.",
  invalid_price_change:
    "Revisá el porcentaje, el redondeo y los productos elegidos.",
};

const byCode: Record<string, string> = {
  "23505": "Ya existe otro registro con ese dato.",
  "23503": "Está en uso y no se puede borrar.",
  "23514": "Algún dato no cumple las reglas de la tienda.",
  "42501": "No tenés permiso para hacer esto. Volvé a ingresar.",
};

export function dbErrorMessage(
  error: DbError,
  fallback = "No se pudo guardar. Probá de nuevo.",
): string {
  if (!error) return fallback;
  if (error.message && byMessage[error.message])
    return byMessage[error.message];
  if (error.code && byCode[error.code]) return byCode[error.code];
  return fallback;
}
