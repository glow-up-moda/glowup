import { IconWhatsApp } from "@/components/ui/icons";
import { getStoreSettings, storeWhatsappLink } from "@/lib/store/settings";

/**
 * Botón flotante de WhatsApp (§7). No aparece en el checkout ni mientras no
 * haya número cargado en la configuración.
 */
export async function WhatsappButton() {
  const { whatsappNumber } = await getStoreSettings();
  const link = storeWhatsappLink(whatsappNumber, "¡Hola! Tengo una consulta.");
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="fixed right-4 bottom-4 z-30 flex size-14 items-center justify-center rounded-full bg-coral text-chocolate shadow-soft transition-colors duration-150 ease-brand hover:bg-rosa"
    >
      <IconWhatsApp width={26} height={26} />
    </a>
  );
}
