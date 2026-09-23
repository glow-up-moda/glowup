import { Analytics } from "@/components/store/analytics";
import { AnnouncementBar } from "@/components/store/announcement-bar";
import { CartDrawer } from "@/components/store/cart-drawer";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { WhatsappButton } from "@/components/store/whatsapp-button";
import { CartProvider } from "@/lib/store/cart";
import { getNavigation, listProducts } from "@/lib/store/catalog";
import { getStoreSettings } from "@/lib/store/settings";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [settings, navigation] = await Promise.all([
    getStoreSettings(),
    getNavigation(),
  ]);

  // El accesorio que sugiere el carrito (§7). Si todavía no hay categoría de
  // accesorios, no se sugiere nada.
  const accesorios = navigation.find(
    (category) => category.slug === "accesorios",
  );
  const suggestions = accesorios
    ? (
        await listProducts({
          categoryIds: [accesorios.id, ...accesorios.children.map((c) => c.id)],
          onlyAvailable: true,
          limit: 4,
        })
      ).map((product) => ({
        name: product.name,
        slug: product.slug,
        priceCents: product.priceCents,
        imagePath: product.images[0]?.path ?? null,
      }))
    : [];

  return (
    <CartProvider>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-crema focus:px-4 focus:py-2"
      >
        Ir al contenido
      </a>
      <AnnouncementBar messages={settings.announcementMessages} />
      <StoreHeader />
      <main id="contenido">{children}</main>
      <StoreFooter />
      <WhatsappButton />
      <CartDrawer
        freeShippingThresholdCents={settings.freeShippingThresholdCents}
        suggestions={suggestions}
      />
      <Analytics />
    </CartProvider>
  );
}
