import { formatMoney } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";

export type CouponType = Database["public"]["Enums"]["coupon_type"];

export const COUPON_TYPES: { value: CouponType; label: string }[] = [
  { value: "percent", label: "Porcentaje" },
  { value: "fixed", label: "Monto fijo" },
];

/** Lo que descuenta, escrito como se lee en la tienda. */
export function couponValueText(type: CouponType, value: number): string {
  return type === "percent"
    ? `${value}% de descuento`
    : `${formatMoney(value)} de descuento`;
}

type CouponWindow = {
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  used_count: number;
};

export type CouponState = {
  label: string;
  tone: "success" | "accent" | "neutral" | "error";
};

/** Estado de un cupón: lo mismo que mira `coupon_error` en la base (§10). */
export function couponState(
  coupon: CouponWindow,
  now = new Date(),
): CouponState {
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return { label: "Agotado", tone: "neutral" };
  }
  if (coupon.ends_at && new Date(coupon.ends_at) < now) {
    return { label: "Vencido", tone: "neutral" };
  }
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { label: "Programado", tone: "accent" };
  }
  return { label: "Activo", tone: "success" };
}
