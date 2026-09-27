// Abre el panel de administración en esta computadora (CLAUDE.md §7).
//
//   npm run panel
//
// Si el servidor de desarrollo no está andando lo levanta, espera a que
// conteste y abre /admin en el navegador. La ventana que queda abierta es el
// servidor: cerrarla lo apaga.
//
// Lo usa el acceso directo del escritorio, que apunta a panel-local.cmd. No
// tiene ninguna ruta de esta computadora escrita adentro: se ubica sola desde
// el lugar del archivo.

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 3000;
const ADDRESS = `http://localhost:${PORT}/admin`;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Si el puerto contesta, el servidor ya está levantado. */
async function isUp() {
  try {
    await fetch(`http://localhost:${PORT}/`, {
      signal: AbortSignal.timeout(1500),
    });
    return true;
  } catch {
    return false;
  }
}

function openBrowser() {
  // `start` necesita un primer argumento vacío: es el título de la ventana.
  spawn("cmd", ["/c", "start", "", ADDRESS], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }).unref();
}

if (await isUp()) {
  console.log("El servidor ya estaba andando. Abriendo el panel…");
  openBrowser();
  process.exit(0);
}

console.log("Levantando el servidor. Cerrá esta ventana para apagarlo.\n");

// Se llama a Next directamente y no a `npm run dev`: desde Node 20, spawn se
// niega a ejecutar un .cmd (y npm en Windows es npm.cmd) sin abrir una shell.
const server = spawn(
  process.execPath,
  [resolve(root, "node_modules/next/dist/bin/next"), "dev"],
  { cwd: root, stdio: "inherit" },
);
server.on("exit", (code) => process.exit(code ?? 0));

// La primera compilación tarda, así que se espera hasta un minuto y medio.
for (let attempt = 0; attempt < 90; attempt++) {
  await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  if (await isUp()) {
    openBrowser();
    break;
  }
}
