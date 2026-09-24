// Publica lo que está en main, a pedido (§16).
//
// Netlify no construye en cada push: el guion `netlify-ignore.mjs` saltea los
// commits que no lo piden, porque cada build gasta créditos del plan gratis.
// Esto dispara uno cuando de verdad hace falta.
//
// La dirección del hook vive en NETLIFY_BUILD_HOOK (.env.local): quien la
// tenga puede publicar, así que no va al repositorio.

import { readFileSync } from "node:fs";

for (const linea of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const hook = process.env.NETLIFY_BUILD_HOOK;
if (!hook) {
  console.error(
    "Falta NETLIFY_BUILD_HOOK en .env.local.\n" +
      "Se saca de Netlify: Site configuration -> Build & deploy -> Build hooks.",
  );
  process.exit(1);
}

const motivo = process.argv.slice(2).join(" ") || "a pedido";

const respuesta = await fetch(hook, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ trigger_title: motivo }),
});

if (!respuesta.ok) {
  console.error(`Netlify respondió ${respuesta.status}.`);
  console.error((await respuesta.text()).slice(0, 300));
  process.exit(1);
}

console.log("Publicación pedida. Tarda unos minutos.");
console.log("Se sigue en https://app.netlify.com/sites/glowupind/deploys");
