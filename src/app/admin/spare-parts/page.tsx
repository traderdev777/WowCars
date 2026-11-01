import { Metadata } from "next";
import AdminSparePartsClient from "./AdminSparePartsClient";

export const metadata: Metadata = {
  title: "Admin Spare Parts Control Center | WowCars India",
  description:
    "Manage spare parts catalogue, inventory, pricing, seller onboarding applications, order fulfillment lifecycle, and customer fitment enquiries.",
};

export default function AdminSparePartsPage() {
  return <AdminSparePartsClient />;
}
