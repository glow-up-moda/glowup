// Copia de seguridad de la base (§16, fase 9).
//
// El esquema ya está versionado en supabase/migrations, así que lo que hay que
// guardar de verdad son los datos: pedidos, productos, stock y configuración.
//
// `supabase db dump` necesita Docker y acá no lo hay, así que la copia se pide
// por SQL: se listan las tablas de public y se baja cada una como JSON. La
// lista sale de la base, no de este archivo, así que una tabla nueva entra
// sola en la copia siguiente.
//
// Se corre a mano con `npm run db:backup`. Queda en backups/, que no se sube
// al repositorio: adentro hay emails y direcciones de clientas.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporal = mkdtempSync(join(tmpdir(), "glowup-backup-"));

function consultar(sql) {
  const archivo = join(temporal, "consulta.sql");
  writeFileSync(archivo, sql);
  // shell: true para que en Windows encuentre npx sin depender de la extensión.
  const res = spawnSync(`npx supabase db query --linked -f "${archivo}"`, {
    encoding: "utf8",
    shell: true,
  });
  // La respuesta viene por stdout; por stderr salen los avisos de la CLI.
  const salida = res.stdout ?? "";
  const inicio = salida.indexOf("{");
  if (res.status !== 0 || inicio < 0) {
    throw new Error(
      (res.stderr || salida).trim() || "no hubo respuesta de la base",
    );
  }
  const datos = JSON.parse(salida.slice(inicio));
  if (datos.error) throw new Error(JSON.stringify(datos.error));
  return datos.rows ?? [];
}

const tablas = consultar(`
  select c.relname as tabla
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname;
`).map((fila) => fila.tabla);

if (tablas.length === 0) {
  console.error("No encontré tablas. ¿Está enlazado el proyecto de Supabase?");
  process.exit(1);
}

// Una sola consulta con todas las tablas adentro.
const partes = tablas
  .map(
    (tabla) =>
      `'${tabla}', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public."${tabla}" x)`,
  )
  .join(",\n    ");

const [fila] = consultar(
  `select jsonb_build_object(\n    ${partes}\n  ) as copia;`,
);
const copia = fila?.copia ?? {};

const fecha = new Date().toISOString().slice(0, 10);
const carpeta = join("backups", fecha);
mkdirSync(carpeta, { recursive: true });
const destino = join(carpeta, "datos.json");
writeFileSync(destino, `${JSON.stringify(copia, null, 2)}\n`);

for (const tabla of tablas) {
  console.log(`${tabla}: ${copia[tabla]?.length ?? 0}`);
}
console.log(`\nCopia guardada en ${destino}.`);
console.log(
  "Guardala fuera de la computadora: si se pierde el disco, se pierde la copia.",
);
