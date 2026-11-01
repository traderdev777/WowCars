import { Suspense } from "react";
import OperationsClient from "./OperationsClient";

export const metadata = {
  title: "Automotive Operations, Garage & Procurement Hub | WowCars Admin",
  description: "Operations control center for multi-brand garage services, parts store inventory, supplier procurement, and outlet profitability.",
};

export default function AdminOperationsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", color: "#9ca3af", textAlign: "center" }}>Loading WowCars Operations Hub...</div>}>
      <OperationsClient />
    </Suspense>
  );
}
