// Da acceso al panel a una cuenta (la crea si no existe).
//
//   npm run admin:create
//
// La contraseña se escribe en la terminal y no queda en ningún archivo. Usa la
// clave secreta de .env.local, así que corre solo en esta computadora.

import readline from "node:readline";

import { createClient } from "@supabase/supabase-js";

// El largo mínimo de la contraseña. El panel pide además un segundo factor
// (§7), así que la contraseña sola nunca alcanza para entrar.
const MIN_PASSWORD_LENGTH = 8;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Una sola lectura de teclado para todo el comando: abrir y cerrar una por
// pregunta dejaba la entrada cerrada a la tercera, y el comando terminaba sin
// pedir la contraseña.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

// Si la entrada se cierra (por ejemplo, si el comando no corre en una terminal
// donde se pueda escribir), la pregunta que quedó abierta nunca vuelve: hay
// que avisarlo en vez de terminar en silencio.
let onInputClosed = null;
rl.on("close", () => onInputClosed?.());

function question(text, transform = (answer) => answer) {
  return new Promise((resolve, reject) => {
    onInputClosed = () =>
      reject(
        new Error(
          "se cerró la entrada del teclado. Corré `npm run admin:create` en una terminal donde puedas escribir.",
        ),
      );
    rl.question(text, (answer) => {
      onInputClosed = null;
      resolve(transform(answer));
    });
  });
}

function ask(text) {
  return question(text, (answer) => answer.trim());
}

// La contraseña se escribe con asteriscos, así se ve que la terminal está
// tomando lo que se teclea. Hay tres casos: la terminal redibuja la línea
// entera (y hay que volver a escribir la pregunta, si no desaparece), llega
// una tecla suelta (un asterisco por carácter) o se termina la línea.
function askHidden(text) {
  const plain = rl._writeToOutput.bind(rl);
  rl._writeToOutput = (output) => {
    if (output.includes(text)) {
      rl.output.write(text + "*".repeat(rl.line.length));
    } else if (/[\r\n]/.test(output)) {
      rl.output.write("\n");
    } else if (!/[\p{Cc}\p{Cf}]/u.test(output)) {
      rl.output.write("*".repeat(output.length));
    }
  };
  return question(text, (answer) => {
    rl._writeToOutput = plain;
    return answer;
  });
}

async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user || data.users.length < 1000) return user ?? null;
  }
}

async function main() {
  const email = (await ask("Email: ")).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw new Error("Ese email no es válido.");

  const name = await ask("Nombre (así saluda el panel): ");
  if (!name) throw new Error("Falta el nombre.");

  const password = await askHidden(
    `Contraseña (${MIN_PASSWORD_LENGTH} caracteres o más): `,
  );
  if (password.length < MIN_PASSWORD_LENGTH)
    throw new Error(
      `La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  const repeated = await askHidden("Repetila: ");
  if (password !== repeated) throw new Error("Las contraseñas no coinciden.");

  let user = await findUserByEmail(email);

  if (user) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;

    const { data: mfa } = await supabase.auth.admin.mfa.listFactors({
      userId: user.id,
    });
    if (mfa?.factors?.length) {
      const reset = await ask(
        "Esta cuenta ya tiene el segundo paso configurado. ¿Lo borramos para configurarlo de nuevo? (s/N): ",
      );
      if (/^s/i.test(reset)) {
        for (const factor of mfa.factors) {
          const { error: deleteError } =
            await supabase.auth.admin.mfa.deleteFactor({
              userId: user.id,
              id: factor.id,
            });
          if (deleteError) throw deleteError;
        }
      }
    }
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: adminError } = await supabase
    .from("admin_users")
    .upsert({ user_id: user.id, name }, { onConflict: "user_id" });
  if (adminError) throw adminError;

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  console.log(`\nListo: ${email} ya tiene acceso al panel.`);
  console.log(
    `Entrá a ${site}/admin/ingresar y configurá el segundo paso con la app de autenticación de tu celular.`,
  );
}

main()
  .then(() => {
    rl.close();
  })
  .catch((error) => {
    rl.close();
    console.error(`\nNo se pudo completar: ${error.message}`);
    process.exit(1);
  });
