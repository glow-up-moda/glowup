// ¿Hay que construir este commit? (§16)
//
// Netlify corre este guion antes de cada build: si termina con código 0, se
// saltea; con cualquier otro, construye. Es al revés de lo que uno espera,
// pero es como funciona.
//
// Por defecto se saltea. El plan gratis trae 300 créditos por mes y un build
// de Next.js se come varios, así que no tiene sentido publicar en cada commit
// mientras la tienda no esté abierta.
//
// Se construye cuando:
//   - el mensaje del commit dice [deploy], o
//   - lo pidió un hook de build (`npm run deploy`).

import { execSync } from "node:child_process";

function saltear(motivo) {
  console.log(`Sin publicar: ${motivo}.`);
  console.log('Para publicar: "npm run deploy", o poné [deploy] en el commit.');
  process.exit(0);
}

function construir(motivo) {
  console.log(`A publicar: ${motivo}.`);
  process.exit(1);
}

if (process.env.INCOMING_HOOK_TITLE) {
  construir(`lo pidió ${process.env.INCOMING_HOOK_TITLE}`);
}

let mensaje = "";
try {
  mensaje = execSync("git log -1 --pretty=%B", { encoding: "utf8" });
} catch {
  // Sin historial no se puede decidir, y quedarse sin publicar es peor que
  // gastar un build.
  construir("no pude leer el mensaje del commit");
}

if (/\[deploy\]/i.test(mensaje)) {
  construir("el commit lo pide");
}

saltear("el commit no lo pide");
