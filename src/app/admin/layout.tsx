import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s · Panel MAREA", default: "Panel MAREA" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
