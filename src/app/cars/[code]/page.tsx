import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatLakhs } from "@/lib/formatters";
import { toPublicCar } from "@/lib/db/serializers";
import CarDetailClient from "./CarDetailClient";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams() {
  const result = await db.getCars({ status: "ACTIVE" });
  return result.cars.map((car) => ({
    code: car.listingCode.toLowerCase(),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const car = await db.getCarByListingCode(code);

  if (!car || car.status !== "ACTIVE") {
    return {
      title: "Vehicle Not Found — WowCars Bengaluru",
      description: "The requested vehicle listing could not be found on WowCars.",
    };
  }

  return {
    title: `${car.year} ${car.make} ${car.model} ${car.variant} for Sale in ${car.locality}, Bengaluru | WowCars`,
    description: `Verified ${car.year} ${car.make} ${car.model} (${car.fuelType}, ${car.transmission}) with ${car.kmDriven.toLocaleString("en-IN")} km, ${car.numOwners} owner, RTO ${car.rtoCode} (${car.rtoArea}). Price: ₹${formatLakhs(car.priceINR)} Lakhs. Direct WhatsApp inquiry with ₹0 buyer fee.`,
    openGraph: {
      title: `${car.year} ${car.make} ${car.model} ${car.variant} — ₹${formatLakhs(car.priceINR)} Lakhs`,
      description: `Verified in ${car.locality}, Bengaluru. ${car.fuelType} · ${car.transmission} · ${car.kmDriven.toLocaleString("en-IN")} km · RTO ${car.rtoCode}`,
    },
  };
}

export default async function CarDetailPage({ params }: PageProps) {
  const { code } = await params;
  const car = await db.getCarByListingCode(code);

  if (!car || car.status !== "ACTIVE") {
    notFound();
  }

  const relatedResult = await db.getCars({ status: "ACTIVE", bodyType: car.bodyType, limit: 4 });
  const relatedCars = relatedResult.cars
    .filter((c) => c.id !== car.id)
    .map(toPublicCar);

  return <CarDetailClient car={toPublicCar(car) as unknown as import("@/lib/mockData").Car} relatedCars={relatedCars as unknown as import("@/lib/mockData").Car[]} />;
}
