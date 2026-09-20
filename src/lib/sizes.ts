// Orden natural de talles: numéricos de menor a mayor (85, 90, 95, 100), letras
// en el orden de siempre (S, M, L, XL) y el resto alfabético.

const letterOrder = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function sizeRank(size: string): [number, number, string] {
  const trimmed = size.trim().toUpperCase();
  if (/^\d+$/.test(trimmed)) return [0, Number(trimmed), trimmed];
  const letter = letterOrder.indexOf(trimmed);
  if (letter >= 0) return [1, letter, trimmed];
  return [2, 0, trimmed];
}

export function compareSizes(a: string, b: string): number {
  const [groupA, valueA, textA] = sizeRank(a);
  const [groupB, valueB, textB] = sizeRank(b);
  return groupA - groupB || valueA - valueB || textA.localeCompare(textB, "es");
}

export function compareVariants(
  a: { color: string; size: string },
  b: { color: string; size: string },
): number {
  return a.color.localeCompare(b.color, "es") || compareSizes(a.size, b.size);
}
