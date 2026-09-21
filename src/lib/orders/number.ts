/** "gu-001000" -> "GU-001000"; null si no tiene la forma de un número de pedido. */
export function parseOrderNumber(value: string): string | null {
  const number = value.trim().toUpperCase();
  return /^GU-\d{6,}$/.test(number) ? number : null;
}
