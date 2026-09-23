import { Analytics } from "@/components/store/analytics";
import { AnnouncementBar } from "@/components/store/announcement-bar";
import { CartDrawer } from "@/components/store/cart-drawer";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { WhatsappButton } from "@/components/store/whatsapp-button";
import { CartProvider } from "@/lib/store/cart";
import { getStoreSettings } from "@/lib/store/settings";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const settings = await getStoreSettings();

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
      />
      <Analytics />
    </CartProvider>
  );
}
