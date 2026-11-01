import { Suspense } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { toPublicCar } from "@/lib/db/serializers";
import CarsCatalogClient from "./CarsCatalogClient";

export const metadata: Metadata = {
  title: "Used Cars in Bengaluru — 100% Inspected & Verified | WowCars",
  description:
    "Browse verified pre-owned cars for sale in Bengaluru. Filter by budget, make, fuel type, transmission, and RTO code. Direct WhatsApp contact with zero buyer commission.",
  openGraph: {
    title: "Used Cars in Bengaluru — Verified & Inspected | WowCars",
    description: "Browse verified used cars in Bengaluru with transparent pricing and direct WhatsApp contact.",
  },
};

export default async function CarsPage() {
  const result = await db.getCars({ status: "ACTIVE" });

  return (
    <Suspense fallback={<div style={{ minHeight: "60vh", background: "#0b1120" }} />}>
      <CarsCatalogClient
        initialCars={result.cars.map(toPublicCar) as any}
      />
    </Suspense>
  );
}
