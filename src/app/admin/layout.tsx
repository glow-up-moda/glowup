import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s · Panel GLOW UP", default: "Panel GLOW UP" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
