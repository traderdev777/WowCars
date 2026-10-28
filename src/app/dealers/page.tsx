import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin, MessageCircle, Star, ArrowRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LiveActivityTicker from "@/components/common/LiveActivityTicker";
import { WHATSAPP_CONCIERGE_PHONE } from "@/lib/mockData";
import styles from "./Dealers.module.css";

export const metadata: Metadata = {
  title: "Verified Pre-Owned Car Dealers in Bengaluru | WowCars",
  description:
    "Discover certified pre-owned car dealers across Bengaluru. Buy genuine used cars with verified titles, inspection warranties, and transparent pricing.",
  openGraph: {
    title: "Verified Used Car Dealers in Bengaluru | WowCars",
    description: "Browse trusted digital showrooms with verified pre-owned car inventory in Bengaluru.",
  },
};

const VERIFIED_DEALERS = [
  {
    id: "dealer-1",
    name: "Sri Balaji Motors",
    locality: "Yelahanka New Town",
    address: "Major Sandeep Unnikrishnan Rd, Yelahanka, Bengaluru",
    rating: 4.8,
    reviewsCount: 142,
    inventoryCount: 18,
    speciality: "SUVs & Premium Sedans (Innova, Creta, Fortuner)",
    whatsapp: "919019088160",
    establishedYear: 2016,
    avatarEmoji: "🏢",
  },
  {
    id: "dealer-2",
    name: "AutoTrust Cars",
    locality: "Hebbal & Malleshwaram",
    address: "Outer Ring Rd, Near Manyata Tech Park, Bengaluru",
    rating: 4.9,
    reviewsCount: 215,
    inventoryCount: 24,
    speciality: "Single Owner Hatchbacks & Automatic Compacts",
    whatsapp: "919019088160",
    establishedYear: 2018,
    avatarEmoji: "🚗",
  },
  {
    id: "dealer-3",
    name: "Deccan Auto Hub",
    locality: "Indiranagar",
    address: "100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru",
    rating: 4.7,
    reviewsCount: 98,
    inventoryCount: 12,
    speciality: "German & Luxury Sedans (VW Polo, Skoda, Honda City)",
    whatsapp: "919019088160",
    establishedYear: 2020,
    avatarEmoji: "🏎️",
  },
  {
    id: "dealer-4",
    name: "Nexus Pre-Owned",
    locality: "Koramangala & HSR",
    address: "80 Feet Rd, 4th Block, Koramangala, Bengaluru",
    rating: 4.8,
    reviewsCount: 176,
    inventoryCount: 15,
    speciality: "Low Mileage Techie-Owned Cars (Swift, Nexon, Baleno)",
    whatsapp: "919019088160",
    establishedYear: 2019,
    avatarEmoji: "⭐",
  },
  {
    id: "dealer-5",
    name: "Cauvery Car Zone",
    locality: "Jayanagar & JP Nagar",
    address: "9th Main Rd, 4th Block, Jayanagar, Bengaluru",
    rating: 4.6,
    reviewsCount: 84,
    inventoryCount: 11,
    speciality: "Reliable Family Hatchbacks & MUVs",
    whatsapp: "919019088160",
    establishedYear: 2017,
    avatarEmoji: "🛡️",
  },
  {
    id: "dealer-6",
    name: "Whitefield Motor Garage",
    locality: "Whitefield",
    address: "ITPL Main Rd, Near Hope Farm, Whitefield, Bengaluru",
    rating: 4.9,
    reviewsCount: 162,
    inventoryCount: 16,
    speciality: "Certified Compact SUVs & First-Owner Automatics",
    whatsapp: "919019088160",
    establishedYear: 2021,
    avatarEmoji: "✨",
  },
];

export default function DealersPage() {
  return (
    <>
      <Navbar />

      <main className={styles.page}>
        <div className="container">
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.badgeHeader}>
              <span className="badge badge-green">
                <BadgeCheck size={12} /> WowCars Certified Dealerships
              </span>
            </div>

            <h1 className={styles.title}>
              India&apos;s Most Trusted <span className={styles.titleHighlight}>Pre-Owned Car Dealers</span>
            </h1>

            <p className={styles.subtitle}>
              Every dealer in the WowCars network is KYC verified with physical lot inspection. No accidental titles, no meter tampering, and complete paperwork support.
            </p>
          </div>

          {/* Dealers Grid */}
          <div className={styles.dealersGrid}>
            {VERIFIED_DEALERS.map((dealer) => {
              const waLink = `https://wa.me/${dealer.whatsapp}?text=${encodeURIComponent(
                `Hi ${dealer.name}! I found your verified dealership on WowCars. I am looking for a used car in Bengaluru.`
              )}`;

              return (
                <div key={dealer.id} className={styles.dealerCard}>
                  <div className={styles.dealerTop}>
                    <div className={styles.dealerAvatar}>
                      {dealer.avatarEmoji}
                    </div>

                    <div className={styles.dealerRating}>
                      <Star size={12} fill="#FBBF24" />
                      <span>{dealer.rating}</span>
                      <span style={{ color: "var(--color-slate)", fontWeight: 400 }}>({dealer.reviewsCount})</span>
                    </div>
                  </div>

                  <div className={styles.dealerInfo}>
                    <h3 className={styles.dealerName}>{dealer.name}</h3>
                    <div className={styles.dealerAddress}>
                      <MapPin size={12} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                      <span>{dealer.address}</span>
                    </div>
                    <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-light-gray)", marginTop: 4 }}>
                      {dealer.speciality}
                    </p>
                  </div>

                  <div className={styles.dealerStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statVal}>{dealer.inventoryCount}</span>
                      <span className={styles.statLabel}>Cars in Stock</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statVal}>Est. {dealer.establishedYear}</span>
                      <span className={styles.statLabel}>Years Active</span>
                    </div>
                  </div>

                  <div className={styles.dealerActions}>
                    <Link
                      href="/cars"
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      View Inventory
                    </Link>

                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-whatsapp btn-sm"
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Join As Dealer Banner */}
          <section className={styles.joinBanner}>
            <div style={{ fontSize: "2.5rem", marginBottom: "var(--space-2)" }}>🤝</div>
            <h2 className={styles.joinTitle}>Are You a Pre-Owned Car Dealer in Bengaluru?</h2>
            <p className={styles.joinText}>
              Join WowCars verified dealer network for zero upfront listing fee. Get qualified customer leads directly on your WhatsApp and increase your monthly car turn rate.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_CONCIERGE_PHONE}?text=${encodeURIComponent(
                "Hi WowCars! I operate a pre-owned car dealership in Bengaluru and want to list my inventory."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <MessageCircle size={18} />
              Apply for Dealer Verification
              <ArrowRight size={18} />
            </a>
          </section>
        </div>
      </main>
      <LiveActivityTicker />
      <Footer />
    </>
  );
}
