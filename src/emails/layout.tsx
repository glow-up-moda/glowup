import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

// Armazón de todos los emails (§13), con la paleta y la voz de la marca (§5).
//
// Todo va con estilos en línea y sin fuentes web: Gmail y Outlook descartan
// las hojas de estilo y los @font-face, así que la tipografía redondeada se
// pide por nombre y cae en la del sistema cuando no está.

export const colors = {
  chocolate: "#3A2925",
  rosa: "#EFA3B5",
  coral: "#F27F73",
  crema: "#FFF7EE",
  cremaOscuro: "#F3E6D8",
  error: "#B42318",
  exito: "#2F6B3A",
} as const;

export const fonts = {
  display: '"Fredoka", "Trebuchet MS", "Segoe UI", Verdana, sans-serif',
  text: '"DM Sans", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
} as const;

const body: CSSProperties = {
  backgroundColor: colors.crema,
  color: colors.chocolate,
  fontFamily: fonts.text,
  fontSize: "16px",
  lineHeight: 1.6,
  margin: 0,
  padding: "24px 0",
};

const container: CSSProperties = {
  backgroundColor: colors.crema,
  margin: "0 auto",
  maxWidth: "560px",
  padding: "0 16px",
};

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: fonts.display,
        fontSize: "25px",
        fontWeight: 600,
        lineHeight: 1.15,
        margin: "0 0 12px",
      }}
    >
      {children}
    </Text>
  );
}

export function Subtitle({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: fonts.display,
        fontSize: "20px",
        fontWeight: 600,
        lineHeight: 1.15,
        margin: "24px 0 8px",
      }}
    >
      {children}
    </Text>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <Text style={{ margin: "0 0 12px" }}>{children}</Text>;
}

export function Small({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontSize: "14px", margin: "0 0 8px" }}>{children}</Text>
  );
}

/** Botón principal: fondo coral y texto chocolate, en píldora (§5). */
export function Button({ href, children }: { href: string; children: string }) {
  return (
    <Section style={{ margin: "20px 0" }}>
      <Link
        href={href}
        style={{
          backgroundColor: colors.coral,
          borderRadius: "999px",
          color: colors.chocolate,
          display: "inline-block",
          fontWeight: 500,
          padding: "12px 24px",
          textDecoration: "none",
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

/**
 * Bloque destacado. `tono` sigue §5: rosa para lo neutro, crema oscuro con
 * borde para los avisos de error y de éxito. Esos dos llevan además un signo,
 * porque el color por sí solo no puede ser lo que comunica el estado.
 */
export function Panel({
  tone = "rosa",
  children,
}: {
  tone?: "rosa" | "crema" | "error" | "exito";
  children: ReactNode;
}) {
  const accent =
    tone === "error" ? colors.error : tone === "exito" ? colors.exito : null;
  const sign = tone === "error" ? "!" : tone === "exito" ? "✓" : null;

  return (
    <Section
      style={{
        backgroundColor: tone === "rosa" ? colors.rosa : colors.cremaOscuro,
        border: accent ? `1px solid ${accent}` : undefined,
        borderRadius: "20px",
        color: accent ?? colors.chocolate,
        margin: "20px 0",
        padding: "16px 20px",
      }}
    >
      {sign ? (
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          style={{ borderCollapse: "collapse", width: "100%" }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  paddingRight: "12px",
                  verticalAlign: "top",
                  width: "28px",
                }}
              >
                <span
                  style={{
                    border: `1px solid ${accent}`,
                    borderRadius: "999px",
                    display: "inline-block",
                    fontWeight: 600,
                    height: "24px",
                    lineHeight: "24px",
                    textAlign: "center",
                    width: "24px",
                  }}
                >
                  {sign}
                </span>
              </td>
              <td>{children}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        children
      )}
    </Section>
  );
}

/** Pares etiqueta/valor: datos de transferencia, dirección, totales. */
export function Rows({
  rows,
  strongLast = false,
}: {
  rows: { label: string; value: string }[];
  strongLast?: boolean;
}) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{ borderCollapse: "collapse", width: "100%" }}
    >
      <tbody>
        {rows.map((row, index) => {
          const last = strongLast && index === rows.length - 1;
          const cell: CSSProperties = {
            fontFamily: last ? fonts.display : undefined,
            fontSize: last ? "20px" : "16px",
            fontWeight: last ? 600 : undefined,
            paddingTop: last ? "8px" : "2px",
          };
          return (
            <tr key={row.label}>
              <td style={cell}>{row.label}</td>
              <td style={{ ...cell, textAlign: "right" }}>{row.value}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function EmailLayout({
  preview,
  children,
  footer = "store",
}: {
  preview: string;
  children: ReactNode;
  footer?: "store" | "internal" | "marketing";
}) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "0.01em",
              margin: "0 0 24px",
            }}
          >
            GLOW UP
          </Text>

          {children}

          <Hr
            style={{
              border: "none",
              borderTop: `1px solid ${colors.cremaOscuro}`,
              margin: "32px 0 16px",
            }}
          />
          <Text style={{ fontSize: "14px", margin: 0 }}>
            {footer === "internal" ? (
              "Aviso automático del panel de GLOW UP."
            ) : (
              <>
                GLOW UP · Ropa interior y accesorios · Paraná, Entre Ríos.
                {footer === "store" && (
                  <>
                    <br />
                    Te escribimos por una compra que hiciste en nuestra tienda.
                  </>
                )}
              </>
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
