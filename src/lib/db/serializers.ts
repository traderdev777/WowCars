/**
 * WowCars — Public Response Serialization & Privacy Barrier
 * Guarantees that internal database objects (Dealer, Seller, Enquiry, Car)
 * are NEVER serialized directly to anonymous or unauthorized users.
 * 
 * Non-negotiable business rules:
 * - WowCars is NOT a public dealer directory.
 * - Dealer phone numbers, personal emails, physical street addresses,
 *   login identifiers, internal IDs, and KYC documents must NEVER leak.
 */

import { Car, Dealer, PublicCar, PublicDealer } from "./types";

/**
 * Transforms an internal Car model into a strictly sanitized PublicCar schema.
 * Explicitly removes sellerId, internal dealerId, private notes, and internal flags.
 */
export function toPublicCar(car: Car): PublicCar {
  return {
    id: car.id,
    listingCode: car.listingCode,
    make: car.make,
    model: car.model,
    variant: car.variant,
    year: car.year,
    priceINR: car.priceINR,
    kmDriven: car.kmDriven,
    fuelType: car.fuelType,
    transmission: car.transmission,
    bodyType: car.bodyType,
    color: car.color,
    numOwners: car.numOwners,
    rtoCode: car.rtoCode,
    rtoArea: car.rtoArea,
    insuranceType: car.insuranceType,
    city: car.city,
    locality: car.locality,
    status: car.status,
    isVerified: car.isVerified,
    isFeatured: car.isFeatured,
    isSeedData: Boolean(car.isSeedData),
    images: car.images || [],
    overview: car.overview,
    features: car.features || [],
    inspectionScore: car.inspectionScore,
    engineDisplacement: car.engineDisplacement,
    mileageARAI: car.mileageARAI,
    seatingCapacity: car.seatingCapacity,
    createdAt: car.createdAt,
  };
}

/**
 * Sanitizes a Dealer record for public presentation.
 * Exposes ONLY business trade name, locality, city, rating, and verified badge.
 * Strictly OMITS whatsappNumber, phone, email, street address, GSTIN, PAN, and KYC notes.
 */
export function toPublicDealer(dealer?: Dealer | null): PublicDealer | null {
  if (!dealer) return null;
  return {
    name: dealer.name,
    locality: dealer.locality,
    cityName: dealer.cityName,
    stateName: dealer.stateName,
    rating: dealer.rating || 5.0,
    reviewsCount: dealer.reviewsCount || 0,
    isVerified: Boolean(dealer.isVerified),
    avatarEmoji: dealer.avatarEmoji || "🏢",
    speciality: dealer.speciality,
    isSeedData: Boolean(dealer.isSeedData),
  };
}
