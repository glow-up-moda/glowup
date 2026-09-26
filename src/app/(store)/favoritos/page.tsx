import type { Metadata } from "next";

import { FavoritesList } from "@/components/store/favorites-list";

export const metadata: Metadata = {
  title: "Tus favoritos · MAREA",
  description: "Lo que guardaste en MAREA desde este navegador.",
};

export default function FavoritesPage() {
  return <FavoritesList />;
}
