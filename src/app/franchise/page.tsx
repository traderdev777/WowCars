import { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FranchiseClient from "./FranchiseClient";

export const metadata: Metadata = {
  title: "Open a Service Centre & Spare Parts Store | Franchise & Co-Owned Outlets | WowCars",
  description:
    "Launch your own WowCars multi-brand car and bike service centre with a retail spare parts store. Proven ₹5–10 Lakh lean pilot blueprint, direct OEM distributor pricing, turnkey cloud ERP, and digital customer leads.",
  keywords: [
    "car service franchise india",
    "open auto workshop bengaluru",
    "spare parts store franchise karnataka",
    "multi-brand garage setup cost",
    "automobile business opportunity ₹5-10 lakh",
    "two wheeler bike garage franchise",
    "wowcars franchise partner",
  ],
  openGraph: {
    title: "Open a WowCars Service Centre & Spare Parts Store",
    description:
      "Lean ₹5–10 Lakh pilot setup. Combine vehicle servicing with over-the-counter genuine spare parts sales.",
    url: "https://wowcars.in/franchise",
    siteName: "WowCars",
    images: [
      {
        url: "/images/workshop-mysuru.jpg",
        width: 1200,
        height: 675,
        alt: "WowCars Express Garage & Parts Store",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
};

export default function FranchisePage() {
  return (
    <>
      <Navbar />
      <main>
        <FranchiseClient />
      </main>
      <Footer />
    </>
  );
}
