import { Metadata } from "next";
import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Secure Checkout — Spare Parts Order | WowCars India",
  description:
    "Complete your automotive spare parts and workshop tools purchase with guaranteed vehicle fitment, instant server stock revalidation, and PAN-India insured delivery.",
};

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Loading checkout...
        </div>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}
