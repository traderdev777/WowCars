import { Metadata } from "next";
import { db } from "@/lib/db";
import CategoriesClient from "./CategoriesClient";

export const metadata: Metadata = {
  title: "All Spare Parts Categories & System Catalog | WowCars India",
  description:
    "Browse the full spare parts category taxonomy: Engine maintenance, brakes, suspension, electrical systems, body panels, clutch & drivetrain, and automotive workshop tools.",
  openGraph: {
    title: "All Auto Spare Parts Categories | WowCars India",
    description: "Browse 7 key automotive replacement categories with verified fitment.",
    url: "https://wowcars.in/spare-parts/categories",
  },
};

export default async function CategoriesPage() {
  const categories = await db.getPartCategories();
  const activeCategories = categories.filter((c) => c.isActive);

  return <CategoriesClient categories={activeCategories} />;
}
