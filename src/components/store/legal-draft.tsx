import { IconInfo } from "@/components/ui/icons";

/**
 * Los textos legales se publican recién después de una revisión profesional
 * (§15). Hasta entonces la página lo dice, en vez de mostrar un texto a medias.
 */
export function LegalDraft() {
  return (
    <div className="flex gap-3 rounded-card bg-rosa px-4 py-3">
      <IconInfo className="mt-0.5 shrink-0" />
      <p>
        Estamos terminando de redactar este texto con asesoramiento legal. Si
        necesitás algo puntual mientras tanto, escribinos y te respondemos.
      </p>
    </div>
  );
}
