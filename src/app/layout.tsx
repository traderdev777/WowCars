import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://wowcars.in"),
  title: "WowCars — India's Most Trusted Pre-Owned Cars Marketplace",
  description:
    "Discover verified pre-owned cars across India. Trusted by thousands of buyers and dealers. Browse quality used cars — Hatchbacks, Sedans, SUVs — with transparent pricing, RTO details & WhatsApp contact.",
  keywords: [
    "used cars bangalore",
    "pre-owned cars bengaluru",
    "second hand cars yelahanka",
    "buy used car bangalore",
    "verified used cars india",
    "WowCars",
  ],
  authors: [{ name: "WowCars" }],
  creator: "WowCars",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://wowcars.in",
    siteName: "WowCars",
    title: "WowCars — Pre-Owned Cars You Can Trust",
    description:
      "Browse verified pre-owned cars in Bengaluru with transparent pricing, RTO details & direct WhatsApp contact.",
    images: [{ url: "/wowcars-logo.png", width: 1024, height: 576, alt: "WowCars Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WowCars — India's Most Trusted Pre-Owned Cars Marketplace",
    description: "Discover verified pre-owned cars across India.",
    images: ["/wowcars-logo.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/wowcars-logo.png",
    apple: "/wowcars-logo.png",
  },
};

import { CartProvider } from "@/lib/cart/CartContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";

const themeInitScript = `(function() {
  try {
    var stored = localStorage.getItem('wowcars-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.add(theme);
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ED1C24" />
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <CartProvider>{children}</CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
