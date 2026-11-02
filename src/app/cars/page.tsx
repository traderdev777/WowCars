import { Suspense } from "react";
import type { Metadata } from "next";
import CarsCatalogClient from "./CarsCatalogClient";
import { loadPublicListings } from "@/lib/listings/server";

export const metadata: Metadata = {
  title: "Used Cars for Sale — Inspected, with EMI & Fair-Price Ratings | WowCars",
  description:
    "Browse inspected pre-owned cars. Filter by budget or EMI, fuel, owners, registration state and WowPrice deal rating. Direct WhatsApp contact.",
  openGraph: {
    title: "Used Cars — Inspected & Verified | WowCars",
    description: "Browse inspected used cars with EMI estimates, honest price ratings and direct WhatsApp contact.",
  },
};

export default async function CarsPage() {
  const cars = await loadPublicListings();

  return (
    <Suspense fallback={<div style={{ minHeight: "70vh", background: "var(--bg)" }} />}>
      <CarsCatalogClient initialCars={cars} />
    </Suspense>
  );
}
