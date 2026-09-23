"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  forgetCart,
  placeOrder,
  quoteCheckout,
  rememberCart,
} from "@/app/(store)/checkout/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { IconAlert } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/lib/store/cart";
import { type CheckoutTotals, couponMessage } from "@/lib/store/checkout";

export type ShippingZone = {
  id: string;
  name: string;
  price_cents: number;
  eta_text: string;
  same_day: boolean;
};

type ShippingMethod = "delivery" | "same_day" | "pickup";
type PaymentMethod = "card" | "transfer";

const emptyAddress = {
  name: "",
  street: "",
  number: "",
  floor: "",
  apartment: "",
  city: "",
  province: "",
  postal_code: "",
  notes: "",
};

const fieldClass =
  "min-h-11 w-full rounded-input border-2 border-transparent bg-crema-oscuro px-3 text-base text-chocolate placeholder:text-chocolate/60 focus:border-chocolate";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-sm text-chocolate/80">{hint}</span>}
    </label>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card bg-crema-oscuro/40 p-4 md:p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        <span className="flex size-7 items-center justify-center rounded-full bg-chocolate text-sm text-crema">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function CheckoutForm({
  zones,
  transferDiscountPercent,
  sameDayCutoffTime,
  sameDayOpen,
  pickup,
}: {
  zones: ShippingZone[];
  transferDiscountPercent: number;
  sameDayCutoffTime: string | null;
  sameDayOpen: boolean;
  pickup: { address: string | null; hours: string | null };
}) {
  const router = useRouter();
  const { items, clear } = useCart();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>("delivery");
  const [zoneId, setZoneId] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [couponDraft, setCouponDraft] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transfer");
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();

  const sameDayZones = zones.filter((zone) => zone.same_day);
  const deliveryZones = zones.filter((zone) => !zone.same_day);
  const zonesForMethod =
    shippingMethod === "same_day"
      ? sameDayZones
      : shippingMethod === "delivery"
        ? deliveryZones
        : [];
  const needsAddress = shippingMethod !== "pickup";
  const ready = shippingMethod === "pickup" || Boolean(zoneId);

  const payload = {
    items: items.map((item) => ({
      kind: item.kind,
      id: item.id,
      quantity: item.quantity,
    })),
    couponCode: coupon,
    paymentMethod,
    shippingMethod,
    shippingZoneId: shippingMethod === "pickup" ? null : zoneId || null,
  };
  const quoteKey = JSON.stringify(payload);

  // El total lo calcula la base en cada cambio (§10): nunca se suma acá.
  const [quote, setQuote] = useState<{
    key: string;
    totals: CheckoutTotals | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (items.length === 0 || !ready) return;
    let active = true;
    quoteCheckout(JSON.parse(quoteKey)).then((result) => {
      if (!active) return;
      setQuote({
        key: quoteKey,
        totals: "totals" in result ? result.totals : null,
        error: "error" in result ? result.error : null,
      });
    });
    return () => {
      active = false;
    };
  }, [quoteKey, items.length, ready]);

  // Copia del carrito para el aviso de carrito abandonado (§13). Se guarda
  // solo con email válido y el consentimiento marcado, y se borra si lo
  // desmarca (§15). Espera un momento para no escribir en cada tecla.
  const cartEmail = email.trim().toLowerCase();
  const validEmail = /^[^@s]+@[^@s]+.[^@s]+$/.test(cartEmail);
  const cartLines = JSON.stringify(
    items.map((line) => ({
      kind: line.kind,
      id: line.id,
      quantity: line.quantity,
    })),
  );

  useEffect(() => {
    if (!validEmail) return;
    const timer = setTimeout(() => {
      if (acceptsMarketing) {
        void rememberCart({ email: cartEmail, items: JSON.parse(cartLines) });
      } else {
        void forgetCart(cartEmail);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [validEmail, cartEmail, acceptsMarketing, cartLines]);

  const totals = quote?.key === quoteKey ? quote.totals : null;
  const quoteError = quote?.key === quoteKey ? quote.error : null;
  const couponError = couponMessage(totals?.coupon?.error ?? null);
  const couponApplied = totals?.coupon?.applied === true;

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-start gap-4 px-4 py-16">
        <h1 className="font-display text-2xl font-semibold">
          Tu carrito está vacío
        </h1>
        <p>Sumá algo y volvé: te lo guardamos mientras elegís.</p>
        <ButtonLink href="/ropa-interior">Ver la colección</ButtonLink>
      </div>
    );
  }

  function submit() {
    setError(null);
    startSending(async () => {
      const result = await placeOrder({
        ...payload,
        email: email.trim(),
        phone: phone.trim(),
        address: needsAddress ? address : null,
        isGift,
        giftMessage,
        acceptsTerms,
        acceptsMarketing,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      clear();
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      router.push(`/pedido/${result.number}`);
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
    >
      <div className="flex flex-col gap-4">
        <Step number={1} title="Tus datos">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Email"
              hint="Te escribimos acá en cada paso del pedido."
            >
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tuemail@ejemplo.com"
                className={fieldClass}
              />
            </Field>
            <Field
              label="WhatsApp"
              hint="Con característica, sin el 0 ni el 15."
            >
              <input
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="3434000000"
                className={fieldClass}
              />
            </Field>
          </div>
        </Step>

        <Step number={2} title="Cómo lo recibís">
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Forma de entrega</legend>
            {(
              [
                {
                  value: "delivery",
                  label: "Envío a domicilio",
                  available: deliveryZones.length > 0,
                },
                {
                  value: "same_day",
                  label: sameDayCutoffTime
                    ? `Envío en el día (comprando antes de las ${sameDayCutoffTime})`
                    : "Envío en el día",
                  // Pasada la hora de corte no se ofrece: ya no llega hoy (§12).
                  available: sameDayZones.length > 0 && sameDayOpen,
                },
                {
                  value: "pickup",
                  label: "Retiro en Paraná, sin cargo",
                  available: true,
                },
              ] as const
            )
              .filter((option) => option.available)
              .map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 cursor-pointer items-center gap-3"
                >
                  <input
                    type="radio"
                    name="entrega"
                    value={option.value}
                    checked={shippingMethod === option.value}
                    onChange={() => {
                      setShippingMethod(option.value);
                      setZoneId("");
                    }}
                    className="size-5 accent-chocolate"
                  />
                  {option.label}
                </label>
              ))}
          </fieldset>

          {shippingMethod === "pickup" && (pickup.address || pickup.hours) && (
            <div className="rounded-card bg-crema-oscuro px-4 py-3 text-sm">
              <p className="font-medium">Dónde lo retirás</p>
              {pickup.address && <p>{pickup.address}</p>}
              {pickup.hours && <p>{pickup.hours}</p>}
            </div>
          )}

          {zonesForMethod.length > 0 && (
            <Field label="Zona">
              <select
                required
                value={zoneId}
                onChange={(event) => setZoneId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Elegí tu zona</option>
                {zonesForMethod.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} · {formatMoney(zone.price_cents)} ·{" "}
                    {zone.eta_text}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {needsAddress && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quién recibe">
                <input
                  required
                  autoComplete="name"
                  value={address.name}
                  onChange={(event) =>
                    setAddress({ ...address, name: event.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="Calle">
                <input
                  required
                  autoComplete="address-line1"
                  value={address.street}
                  onChange={(event) =>
                    setAddress({ ...address, street: event.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Altura">
                  <input
                    required
                    inputMode="numeric"
                    value={address.number}
                    onChange={(event) =>
                      setAddress({ ...address, number: event.target.value })
                    }
                    className={fieldClass}
                  />
                </Field>
                <Field label="Piso">
                  <input
                    value={address.floor}
                    onChange={(event) =>
                      setAddress({ ...address, floor: event.target.value })
                    }
                    className={fieldClass}
                  />
                </Field>
                <Field label="Depto">
                  <input
                    value={address.apartment}
                    onChange={(event) =>
                      setAddress({ ...address, apartment: event.target.value })
                    }
                    className={fieldClass}
                  />
                </Field>
              </div>
              <Field label="Localidad">
                <input
                  required
                  autoComplete="address-level2"
                  value={address.city}
                  onChange={(event) =>
                    setAddress({ ...address, city: event.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="Provincia">
                <input
                  required
                  autoComplete="address-level1"
                  value={address.province}
                  onChange={(event) =>
                    setAddress({ ...address, province: event.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="Código postal">
                <input
                  required
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={address.postal_code}
                  onChange={(event) =>
                    setAddress({ ...address, postal_code: event.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label="Indicaciones"
                  hint="Opcional: timbre, entre qué calles, horarios."
                >
                  <input
                    value={address.notes}
                    onChange={(event) =>
                      setAddress({ ...address, notes: event.target.value })
                    }
                    className={fieldClass}
                  />
                </Field>
              </div>
            </div>
          )}

          <p className="text-sm">
            Todo viaja en embalaje discreto: desde afuera no se ve qué hay
            adentro.
          </p>
        </Step>

        <Step number={3} title="¿Es para regalo?">
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={isGift}
              onChange={(event) => setIsGift(event.target.checked)}
              className="size-5 accent-chocolate"
            />
            Sí, va sin precios y con una tarjeta
          </label>
          {isGift && (
            <Field label="Mensaje para la tarjeta" hint="Hasta 200 caracteres.">
              <textarea
                rows={3}
                maxLength={200}
                value={giftMessage}
                onChange={(event) => setGiftMessage(event.target.value)}
                className={`${fieldClass} py-2`}
              />
            </Field>
          )}
        </Step>

        <Step number={4} title="Cupón">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1">
              <Field label="Código">
                <input
                  value={couponDraft}
                  onChange={(event) => setCouponDraft(event.target.value)}
                  placeholder="BIENVENIDA15"
                  className={`${fieldClass} uppercase`}
                />
              </Field>
            </div>
            <Button
              variant="secondary"
              onClick={() => setCoupon(couponDraft.trim() || null)}
            >
              Aplicar
            </Button>
          </div>
          {coupon && couponError && (
            <p
              className="flex items-start gap-1.5 text-sm text-error"
              role="alert"
            >
              <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
              {couponError}
            </p>
          )}
          {coupon && couponApplied && (
            <p className="text-sm text-exito" role="status">
              Cupón {coupon.toUpperCase()} aplicado.
            </p>
          )}
          {coupon && !couponApplied && !couponError && totals && (
            <p className="text-sm">
              El descuento por transferencia te conviene más, así que dejamos el
              cupón sin usar.
            </p>
          )}
        </Step>

        <Step number={5} title="Cómo pagás">
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Medio de pago</legend>
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="pago"
                checked={paymentMethod === "transfer"}
                onChange={() => setPaymentMethod("transfer")}
                className="size-5 accent-chocolate"
              />
              Transferencia bancaria
              {transferDiscountPercent > 0 &&
                ` (${transferDiscountPercent}% off)`}
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="pago"
                checked={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
                className="size-5 accent-chocolate"
              />
              Tarjeta de crédito o débito
            </label>
          </fieldset>
          <p className="text-sm">
            {paymentMethod === "transfer"
              ? "Te mostramos el alias y el CBU al confirmar. Guardamos tu pedido 24 horas."
              : "Te llevamos al pago seguro de Ualá Bis y volvés acá con la confirmación."}
          </p>
        </Step>

        <Step number={6} title="Para terminar">
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acceptsTerms}
              onChange={(event) => setAcceptsTerms(event.target.checked)}
              className="mt-3 size-5 accent-chocolate"
            />
            <span className="py-2">
              Acepto los{" "}
              <Link href="/terminos" className="underline underline-offset-4">
                términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" className="underline underline-offset-4">
                política de privacidad
              </Link>
              .
            </span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acceptsMarketing}
              onChange={(event) => setAcceptsMarketing(event.target.checked)}
              className="mt-3 size-5 accent-chocolate"
            />
            <span className="py-2">
              Quiero recibir novedades y descuentos por email. (Opcional)
            </span>
          </label>
        </Step>
      </div>

      <aside className="rounded-card bg-crema-oscuro/60 p-4 lg:sticky lg:top-24">
        <h2 className="font-display text-xl font-semibold">Tu pedido</h2>

        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0">
                {item.quantity} × {item.name}
                {item.color && (
                  <span className="block text-chocolate/80">
                    {item.color} · Talle {item.size}
                  </span>
                )}
              </span>
              <span className="shrink-0">
                {formatMoney(item.priceCents * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1 border-t border-crema-oscuro pt-3 text-sm">
          <dt>Subtotal</dt>
          <dd className="text-right">
            {totals ? formatMoney(totals.subtotalCents) : "—"}
          </dd>

          {totals && totals.couponDiscountCents > 0 && (
            <>
              <dt>Cupón {totals.coupon?.code}</dt>
              <dd className="text-right">
                −{formatMoney(totals.couponDiscountCents)}
              </dd>
            </>
          )}

          {totals && totals.transferDiscountCents > 0 && (
            <>
              <dt>Descuento por transferencia</dt>
              <dd className="text-right">
                −{formatMoney(totals.transferDiscountCents)}
              </dd>
            </>
          )}

          <dt>{shippingMethod === "pickup" ? "Retiro" : "Envío"}</dt>
          <dd className="text-right">
            {!ready
              ? "Elegí la zona"
              : totals == null
                ? "—"
                : totals.shippingCents === 0
                  ? shippingMethod === "pickup"
                    ? "Sin cargo"
                    : "Gratis"
                  : formatMoney(totals.shippingCents ?? 0)}
          </dd>

          <dt className="mt-2 font-display text-lg font-semibold">Total</dt>
          <dd className="mt-2 text-right font-display text-lg font-semibold">
            {totals ? formatMoney(totals.totalCents) : "—"}
          </dd>
        </dl>

        {totals?.remainingForFreeShippingCents ? (
          <p className="mt-2 text-sm">
            Te faltan {formatMoney(totals.remainingForFreeShippingCents)} para
            el envío gratis.
          </p>
        ) : null}

        {(quoteError || error) && (
          <p
            className="mt-3 flex items-start gap-1.5 rounded-card bg-crema-oscuro px-3 py-2 text-sm text-error"
            role="alert"
          >
            <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
            {error ?? quoteError}
          </p>
        )}

        <Button
          type="submit"
          disabled={sending || !ready || !acceptsTerms || totals == null}
          className="mt-4 w-full"
        >
          {sending
            ? "Confirmando…"
            : paymentMethod === "transfer"
              ? "Confirmar el pedido"
              : "Ir a pagar"}
        </Button>

        <p className="mt-2 text-sm">
          Al confirmar te guardamos el stock mientras pagás.
        </p>
      </aside>
    </form>
  );
}
