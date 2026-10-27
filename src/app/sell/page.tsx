import type { Metadata } from "next";
import SellClient from "./SellClient";

export const metadata: Metadata = {
  title: "Sell Your Car Free in Bengaluru — Instant Valuation & Direct Buyers | WOwCars",
  description:
    "List your pre-owned car for free on WOwCars Bengaluru. Get instant fair-market valuation, protect your phone privacy with WhatsApp-only inquiries, and pay ₹0 broker commission.",
  openGraph: {
    title: "Sell Your Car Free in Bengaluru | WOwCars",
    description: "Get genuine buyers, instant fair market valuation, and zero broker fees.",
  },
};

export default function SellPage() {
  return <SellClient />;
}
