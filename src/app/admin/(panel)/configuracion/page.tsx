import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { Notice } from "@/components/ui/notice";
import { settingsToForm } from "@/lib/admin/settings";
import { requireAdmin } from "@/lib/auth/admin";

import { saveSettings } from "./actions";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase.from("settings").select("key, value");
  const stored = new Map((data ?? []).map((row) => [row.key, row.value]));
  const values = settingsToForm(stored);
  const missing =
    !values.bank_alias || !values.bank_cbu || !values.whatsapp_number;

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Lo que usa la tienda para calcular precios, avisar del stock y hablar con las clientas."
      />

      {error ? (
        <Notice tone="error">
          No pudimos cargar la configuración. Recargá la página.
        </Notice>
      ) : (
        <div className="flex flex-col gap-4">
          {missing && (
            <Notice title="Faltan datos">
              Sin alias, CBU y WhatsApp, el checkout no puede mostrar cómo
              transferir ni el botón para escribirte.
            </Notice>
          )}
          <SettingsForm action={saveSettings} initial={values} />
        </div>
      )}
    </>
  );
}
