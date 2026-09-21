import { getStoreSettings, storeWhatsappLink } from "@/lib/store/settings";

import { WhatsappFab } from "./whatsapp-fab";

/**
 * Botón flotante de WhatsApp (§7). El número sale de la configuración, así que
 * el link se arma en el servidor; esconderlo en el checkout lo hace el cliente,
 * que es el que sabe en qué página está.
 */
export async function WhatsappButton() {
  const { whatsappNumber } = await getStoreSettings();
  const link = storeWhatsappLink(whatsappNumber, "¡Hola! Tengo una consulta.");
  if (!link) return null;

  return <WhatsappFab href={link} />;
}
