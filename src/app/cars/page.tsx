import type { Metadata } from "next";
import { getAllCars } from "@/lib/mockData";
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

export default function CarsPage() {
  const cars = getAllCars();
  return <CarsCatalogClient initialCars={cars} />;
}
