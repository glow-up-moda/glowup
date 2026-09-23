"use client";

import { useEffect, useRef } from "react";

import { track, type TrackedEvent } from "@/lib/store/analytics";

/**
 * Avisa a Meta y a GA4 de un hecho que pasa al abrir una página: ver un
 * producto, arrancar el checkout, terminar una compra (§14). Se manda una sola
 * vez aunque la página se vuelva a dibujar.
 */
export function TrackEvent({ event }: { event: TrackedEvent }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event);
  }, [event]);

  return null;
}
