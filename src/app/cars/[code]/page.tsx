import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { loadPublicListings } from "@/lib/listings/server";
import { priceShort } from "@/lib/listings/listing";
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
      title: "Car not found | WowCars",
      description: "The requested vehicle listing could not be found on WowCars.",
    };
  }

  const title = `${car.year} ${car.make} ${car.model} ${car.variant} — ${priceShort(car.priceINR)} in ${car.locality}, ${car.city} | WowCars`;
  const desc = `${car.year} ${car.make} ${car.model} (${car.fuelType}, ${car.transmission}), ${car.kmDriven.toLocaleString("en-IN")} km, ${car.numOwners} owner, RTO ${car.rtoCode}. ${priceShort(car.priceINR)}. Direct WhatsApp enquiry.`;
  return {
    title,
    description: desc,
    openGraph: { title, description: desc },
  };
}

export default async function CarDetailPage({ params }: PageProps) {
  const { code } = await params;
  const all = await loadPublicListings();
  const car = all.find((c) => c.listingCode.toLowerCase() === code.toLowerCase());

  if (!car) {
    notFound();
  }

  // Similar cars: same body type first, then closest price.
  const related = all
    .filter((c) => c.id !== car.id)
    .map((c) => ({ c, score: (c.bodyType === car.bodyType ? 0 : 1) + Math.abs(c.priceINR - car.priceINR) / Math.max(1, car.priceINR) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((x) => x.c);

  return <CarDetailClient car={car} relatedCars={related} />;
}
