/**
 * Server-only loader: ACTIVE listings, sanitised for the public with the
 * dealer's trade name + rating (never phone, email or address).
 */
import { db } from "@/lib/db";
import { toPublicCar } from "@/lib/db/serializers";
import type { Dealer, PublicCar } from "@/lib/db/types";

export async function loadPublicListings(): Promise<PublicCar[]> {
  const result = await db.getCars({ status: "ACTIVE" });
  const dealerIds = Array.from(new Set(result.cars.map((c) => c.dealerId).filter(Boolean))) as string[];
  const dealers = new Map<string, Dealer | null>();
  await Promise.all(dealerIds.map(async (id) => dealers.set(id, await db.getDealerById(id))));
  return result.cars.map((c) => toPublicCar(c, c.dealerId ? dealers.get(c.dealerId) : null));
}
