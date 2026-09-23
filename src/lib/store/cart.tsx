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
  /** Qué se vende: una variante suelta o un kit armado (§8). */
  kind: "variant" | "kit";
  /** Id de la variante o del kit, según kind: identifica la línea. */
  id: string;
  /** A dónde lleva el nombre en el carrito. */
  href: string;
  name: string;
  /** Solo las variantes tienen color y talle. */
  color: string | null;
  size: string | null;
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
        typeof (item as CartItem).id === "string" &&
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
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  /** Corrige el precio con el que responde el servidor (§10). */
  setPrice: (id: string, priceCents: number) => void;
  /** Reemplaza todo el carrito: lo usa el link del email de carrito abandonado. */
  replace: (items: CartItem[]) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isOpen, setIsOpen] = useState(false);

  const add = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    const current = getSnapshot();
    const existing = current.find((line) => line.id === item.id);
    write(
      existing
        ? current.map((line) =>
            line.id === item.id
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

  const setQuantity = useCallback((id: string, quantity: number) => {
    const current = getSnapshot();
    write(
      quantity <= 0
        ? current.filter((line) => line.id !== id)
        : current.map((line) =>
            line.id === id
              ? { ...line, quantity: Math.min(quantity, MAX_PER_LINE) }
              : line,
          ),
    );
  }, []);

  const remove = useCallback((id: string) => {
    write(getSnapshot().filter((line) => line.id !== id));
  }, []);

  const setPrice = useCallback((id: string, priceCents: number) => {
    const current = getSnapshot();
    if (
      !current.some((line) => line.id === id && line.priceCents !== priceCents)
    ) {
      return;
    }
    write(
      current.map((line) => (line.id === id ? { ...line, priceCents } : line)),
    );
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
      setPrice,
      replace: (next: CartItem[]) =>
        write(
          next.slice(0, 50).map((line) => ({
            ...line,
            quantity: Math.min(Math.max(1, line.quantity), MAX_PER_LINE),
          })),
        ),
      clear: () => write(EMPTY),
    }),
    [items, isOpen, add, setQuantity, remove, setPrice],
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
