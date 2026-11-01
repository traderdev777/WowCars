import { Metadata } from "next";
import { db } from "@/lib/db";
import SellerDashboardClient from "./SellerDashboardClient";

export const metadata: Metadata = {
  title: "Seller & Supplier Portal — Spare Parts Marketplace | WowCars India",
  description:
    "Private portal for authorized spare parts manufacturers, distributors, and dealers to manage catalogue items, adjust live inventory and prices, and dispatch customer orders.",
};

export default async function SellerPortalPage() {
  const [categories, sellers] = await Promise.all([
    db.getPartCategories(),
    db.getPartSellers(),
  ]);

  const defaultSeller = sellers.find((s) => s.status === "APPROVED") || sellers[0] || null;

  return (
    <SellerDashboardClient
      initialSeller={defaultSeller}
      categories={categories.filter((c) => c.isActive)}
    />
  );
}
