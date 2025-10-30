import "ress";
import "@/styles/globals.scss";
import ReduxProvider from "@/contexts/global/provider";
import QueryProvider from "@/providers/QueryProvider";
import SolanaProvider from "@/providers/SolanaProvider";
import AppProvider from "@/providers/AppProvider";
import { colorCSSVariables } from "@/styles/colors";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buff.Trade",
  description: "buff your bag better with trading agents",
  icons: {
    icon: [
      { url: "/icons/logoHover.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icons/logoHover.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/logoHover.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/logoHover.svg" />
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-58XM6J8X');
            `,
          }}
        />
        {/* Google tag (gtag.js) */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-BQJSZMD9MV"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-BQJSZMD9MV');
            `,
          }}
        />
        <style
          id="app-color-variables"
          dangerouslySetInnerHTML={{ __html: colorCSSVariables }}
        />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `
              <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-58XM6J8X"
              height="0" width="0" style="display:none;visibility:hidden"></iframe>
            `,
          }}
        />
        <ReduxProvider>
          <QueryProvider>
            <SolanaProvider>
              <AppProvider>{children}</AppProvider>
            </SolanaProvider>
          </QueryProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
