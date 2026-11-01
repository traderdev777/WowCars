import { Metadata } from "next";
import { Suspense } from "react";
import OrdersClient from "./OrdersClient";

export const metadata: Metadata = {
  title: "Track Spare Part Orders & Shipment | WowCars India",
  description:
    "Look up your WowCars spare parts orders, view live courier tracking numbers, dispatch status timelines, item price snapshots, and return eligibility.",
};

export default function MyOrdersPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Loading orders...
        </div>
      }
    >
      <OrdersClient />
    </Suspense>
  );
}
