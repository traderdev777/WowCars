import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://wowcars.in"),
  title: "WOwCars — India's Most Trusted Pre-Owned Cars Marketplace",
  description:
    "Discover verified pre-owned cars across India. Trusted by thousands of buyers and dealers. Browse quality used cars — Hatchbacks, Sedans, SUVs — with transparent pricing, RTO details & WhatsApp contact.",
  keywords: [
    "used cars bangalore",
    "pre-owned cars bengaluru",
    "second hand cars yelahanka",
    "buy used car bangalore",
    "verified used cars india",
    "WOwCars",
  ],
  authors: [{ name: "WOwCars" }],
  creator: "WOwCars",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://wowcars.in",
    siteName: "WOwCars",
    title: "WOwCars — Pre-Owned Cars You Can Trust",
    description:
      "Browse verified pre-owned cars in Bengaluru with transparent pricing, RTO details & direct WhatsApp contact.",
    images: [{ url: "/wowcars-logo.jpg", width: 1200, height: 630, alt: "WOwCars Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WOwCars — Pre-Owned Cars You Can Trust",
    description: "Browse verified pre-owned cars in Bengaluru.",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/wowcars-logo.jpg",
    apple: "/wowcars-logo.jpg",
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#E50914" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
