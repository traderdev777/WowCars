import { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FranchiseClient from "./FranchiseClient";

export const metadata: Metadata = {
  title: "Franchise & Partner Onboarding | Open a Service Centre & Store | WowCars",
  description:
    "Partner with WowCars to launch an authorized multi-brand car & bike service centre and retail spare parts store. Apply today for turnkey workshop architecture, direct OEM supply, and digital booking leads.",
  keywords: [
    "car service franchise india",
    "open auto workshop bengaluru",
    "spare parts store franchise karnataka",
    "multi-brand garage setup",
    "automobile business partnership",
    "two wheeler bike garage franchise",
    "wowcars franchise partner",
  ],
  openGraph: {
    title: "Open a WowCars Service Centre & Spare Parts Store",
    description:
      "Partner onboarding application. Turnkey workshop setup, direct OEM spare parts pricing, and digital customer bookings.",
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
