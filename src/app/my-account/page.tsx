import { Metadata } from "next";
import { Suspense } from "react";
import CustomerPortalClient from "./CustomerPortalClient";


export const metadata: Metadata = {
  title: "My Account & Connected Garage | WowCars India",
  description:
    "Manage your vehicles in My Garage, review service estimates, track spare parts orders, view GST invoices, and access 24x7 customer support.",
};

export default function MyAccountPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "80vh", background: "#0A0A0A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Loading your WowCars dashboard...
        </div>
      }
    >
      <CustomerPortalClient />
    </Suspense>
  );
}
