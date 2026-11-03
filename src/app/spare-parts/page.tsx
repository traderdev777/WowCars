import { Metadata } from "next";
import { db } from "@/lib/db";
import SparePartsHomeClient from "./SparePartsHomeClient";

export const metadata: Metadata = {
  title: "Auto Spare Parts & Workshop Equipment Marketplace | WowCars India",
  description:
    "Buy 100% verified car spare parts, engine components, brake pads, shock absorbers & automotive tools across India. Guaranteed vehicle fitment, real photography, genuine OEM & OES parts with transparent INR pricing.",
  keywords: [
    "car spare parts india",
    "genuine auto parts",
    "maruti suzuki spare parts",
    "hyundai parts online",
    "car brake pads",
    "shock absorbers",
    "car maintenance tools",
    "WowCars spare parts",
  ],
  openGraph: {
    title: "Car Spare Parts & Automotive Tools | WowCars PAN-India",
    description:
      "Order genuine OEM, OES and certified replacement parts. Check vehicle fitment for Swift, Creta, City, Scorpio and more.",
    url: "https://wowcars.in/spare-parts",
    images: [{ url: "/parts/categories/engine-maintenance.jpg", width: 800, height: 600, alt: "WowCars Spare Parts" }],
  },
};

export default async function SparePartsHomePage() {
  const [categories, productsRes] = await Promise.all([
    db.getPartCategories(),
    db.getPartProducts({ status: "PUBLISHED", limit: 50 }),
  ]);

  const activeCategories = categories.filter((c) => c.isActive);
  const products = productsRes.products;

  // Split into curated buckets
  const featuredProducts = products.slice(0, 8);
  const bestSellers = [...products].sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0)).slice(0, 8);
  const newArrivals = [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);

  return (
    <SparePartsHomeClient
      categories={activeCategories}
      featuredProducts={featuredProducts}
      bestSellers={bestSellers}
      newArrivals={newArrivals}
    />
  );
}
