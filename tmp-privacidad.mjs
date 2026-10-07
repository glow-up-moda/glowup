import { readFileSync, writeFileSync } from "node:fs";
const ruta = "src/app/(store)/privacidad/page.tsx";
let s = readFileSync(ruta, "utf8");

const quitar = (desde, hasta) => {
  const i = s.indexOf(desde);
  if (i === -1) throw new Error("no encontré: " + desde.slice(0, 45));
  const j = s.indexOf(hasta, i);
  if (j === -1) throw new Error("no encontré el cierre de: " + desde.slice(0, 45));
  s = s.slice(0, i) + s.slice(j + hasta.length);
};

// Los cuatro apartados, cada uno desde su <Block> hasta su </Block>.
for (const titulo of [
  'Con quién los compartimos',
  'Medición',
  'Cuánto tiempo los guardamos',
  'Qué podés hacer',
]) {
  quitar(`      <Block title="${titulo}">`, "      </Block>\n\n");
}

// El cartel de borrador, solo acá: términos y arrepentimiento lo conservan.
s = s.replace("      <LegalDraft />\n\n", "");
s = s.replace('import { LegalDraft } from "@/components/store/legal-draft";\n', "");

// Lo que ya no es cierto del encabezado del archivo.
s = s.replace(
  `// Borrador (§15). Nombra de verdad a quién le pasan los datos, porque es lo
// que una clienta necesita saber y lo que exige la Ley 25.326.`,
  `// Reducida a pedido de la dueña: quedan qué datos se piden y para qué. Los
// apartados de con quién se comparten, medición, plazos y derechos del titular
// se sacaron el 7 de octubre de 2026 (§15).`,
);

s = s.replace(
  '  description: "Qué datos pedimos, para qué y qué podés hacer con ellos.",',
  '  description: "Qué datos pedimos y para qué los usamos.",',
);

writeFileSync(ruta, s);
console.log("ok");
