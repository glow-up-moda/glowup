"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

// El carrito vive en el navegador (§7). Guarda lo justo para dibujarlo; los
// precios de verdad los recalcula siempre el servidor (§10).
//
// localStorage es un dato de afuera de React, así que se lee con
// useSyncExternalStore: nada de efectos que copien el valor a un estado. De
// paso, dos pestañas abiertas ven el mismo carrito.

const STORAGE_KEY = "glowup-carrito";

/** Tope por línea: una reserva por transferencia inmoviliza stock 24 horas (§8). */
export const MAX_PER_LINE = 10;

export type CartItem = {
  variantId: string;
  productSlug: string;
  name: string;
  color: string;
  size: string;
  priceCents: number;
  imagePath: string | null;
  quantity: number;
};

const EMPTY: CartItem[] = [];

let snapshot: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function readStored(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return EMPTY;
    const items = parsed.filter(
      (item): item is CartItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as CartItem).variantId === "string" &&
        typeof (item as CartItem).quantity === "number",
    );
    return items.length ? items : EMPTY;
  } catch {
    // Navegación privada o almacenamiento bloqueado: el carrito arranca vacío.
    return EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function handleStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  snapshot = readStored();
  emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", handleStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

function getSnapshot(): CartItem[] {
  if (!loaded) {
    snapshot = readStored();
    loaded = true;
  }
  return snapshot;
}

/** En el servidor el carrito siempre está vacío: es del navegador. */
function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function write(items: CartItem[]) {
  snapshot = items;
  loaded = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Si no se puede guardar, el carrito igual funciona en esta pestaña.
  }
  emit();
}

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isOpen, setIsOpen] = useState(false);

  const add = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    const current = getSnapshot();
    const existing = current.find((line) => line.variantId === item.variantId);
    write(
      existing
        ? current.map((line) =>
            line.variantId === item.variantId
              ? {
                  ...line,
                  ...item,
                  quantity: Math.min(line.quantity + quantity, MAX_PER_LINE),
                }
              : line,
          )
        : [...current, { ...item, quantity: Math.min(quantity, MAX_PER_LINE) }],
    );
    setIsOpen(true);
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    const current = getSnapshot();
    write(
      quantity <= 0
        ? current.filter((line) => line.variantId !== variantId)
        : current.map((line) =>
            line.variantId === variantId
              ? { ...line, quantity: Math.min(quantity, MAX_PER_LINE) }
              : line,
          ),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    write(getSnapshot().filter((line) => line.variantId !== variantId));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((total, line) => total + line.quantity, 0),
      subtotalCents: items.reduce(
        (total, line) => total + line.priceCents * line.quantity,
        0,
      ),
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add,
      setQuantity,
      remove,
      clear: () => write(EMPTY),
    }),
    [items, isOpen, add, setQuantity, remove],
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart necesita estar dentro de CartProvider.");
  }
  return context;
}
