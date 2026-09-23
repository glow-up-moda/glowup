"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Carga de Meta Pixel y GA4 (§14). Sin los ids cargados no se baja ningún
// script: en desarrollo y hasta que existan las cuentas, la tienda no habla
// con nadie.
//
// Las dos herramientas cuentan la primera vista sola. Como la tienda navega
// sin recargar, las siguientes hay que contarlas a mano.

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;

function PageViews() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
    if (ga4Id) window.gtag?.("event", "page_view", { page_path: pathname });
  }, [pathname]);

  return null;
}

export function Analytics() {
  if (!pixelId && !ga4Id) return null;

  return (
    <>
      {pixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');`}
        </Script>
      )}

      {ga4Id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
window.gtag=gtag;gtag('js',new Date());
gtag('config','${ga4Id}');`}
          </Script>
        </>
      )}

      <PageViews />
    </>
  );
}
