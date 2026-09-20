"use client";

import { useCallback, useSyncExternalStore } from "react";

// Favoritos guardados en el navegador (§7). Guarda solo los ids: los precios y
// el stock se leen frescos cada vez que se muestran.
//
// Cuando haya cuentas de clientas, esto se sincroniza con la tabla favorites.

const STORAGE_KEY = "glowup-favoritos";

const EMPTY: string[] = [];
let snapshot: string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function readStored(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return EMPTY;
    const ids = parsed.filter((id): id is string => typeof id === "string");
    return ids.length ? ids : EMPTY;
  } catch {
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

function getSnapshot(): string[] {
  if (!loaded) {
    snapshot = readStored();
    loaded = true;
  }
  return snapshot;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function write(ids: string[]) {
  snapshot = ids.length ? ids : EMPTY;
  loaded = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Sin almacenamiento, los favoritos duran lo que dura la pestaña.
  }
  emit();
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((productId: string) => {
    const current = getSnapshot();
    write(
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [productId, ...current],
    );
  }, []);

  return { ids, toggle, has: (productId: string) => ids.includes(productId) };
}
