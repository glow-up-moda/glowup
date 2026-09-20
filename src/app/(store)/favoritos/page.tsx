import type { Metadata } from "next";

import { FavoritesList } from "@/components/store/favorites-list";

export const metadata: Metadata = {
  title: "Tus favoritos · GLOW UP",
  description: "Lo que guardaste en GLOW UP desde este navegador.",
};

export default function FavoritesPage() {
  return <FavoritesList />;
}
