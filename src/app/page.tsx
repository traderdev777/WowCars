import { loadPublicListings } from "@/lib/listings/server";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const cars = await loadPublicListings();
  return <HomeClient cars={cars} />;
}
