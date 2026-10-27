import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCarByCode, getAllCars, getRelatedCars } from "@/lib/mockData";
import { formatLakhs } from "@/lib/formatters";
import CarDetailClient from "./CarDetailClient";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams() {
  const cars = getAllCars();
  return cars.map((car) => ({
    code: car.listingCode.toLowerCase(),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const car = getCarByCode(code);

  if (!car) {
    return {
      title: "Vehicle Not Found — WOwCars Bengaluru",
      description: "The requested vehicle listing could not be found on WOwCars.",
    };
  }

  return {
    title: `${car.year} ${car.make} ${car.model} ${car.variant} for Sale in ${car.locality}, Bengaluru | WOwCars`,
    description: `Verified ${car.year} ${car.make} ${car.model} (${car.fuelType}, ${car.transmission}) with ${car.kmDriven.toLocaleString("en-IN")} km, ${car.numOwners} owner, RTO ${car.rtoCode} (${car.rtoArea}). Price: ₹${formatLakhs(car.priceINR)} Lakhs. Direct WhatsApp inquiry with ₹0 buyer fee.`,
    openGraph: {
      title: `${car.year} ${car.make} ${car.model} ${car.variant} — ₹${formatLakhs(car.priceINR)} Lakhs`,
      description: `Verified in ${car.locality}, Bengaluru. ${car.fuelType} · ${car.transmission} · ${car.kmDriven.toLocaleString("en-IN")} km · RTO ${car.rtoCode}`,
    },
  };
}

export default async function CarDetailPage({ params }: PageProps) {
  const { code } = await params;
  const car = getCarByCode(code);

  if (!car) {
    notFound();
  }

  const relatedCars = getRelatedCars(car, 3);

  return <CarDetailClient car={car} relatedCars={relatedCars} />;
}
