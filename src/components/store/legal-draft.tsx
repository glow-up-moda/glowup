import { IconAlert } from "@/components/ui/icons";

/**
 * Los textos legales son un borrador hasta que los revise alguien del rubro
 * (§15). El cartel lo dice con todas las letras: es preferible que una clienta
 * sepa que esto todavía no está revisado a que lo lea como si lo estuviera.
 */
export function LegalDraft() {
  return (
    <div className="flex gap-3 rounded-card border border-error bg-crema-oscuro px-4 py-3 text-error">
      <IconAlert className="mt-0.5 shrink-0" />
      <p>
        <strong>Pendiente de revisión.</strong> Este texto es un borrador que
        todavía no revisó un profesional. Si necesitás algo puntual, escribinos
        y te respondemos.
      </p>
    </div>
  );
}
