"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Wrench,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Award,
  Layers,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/common/PageHero";
import TrustIndicators from "@/components/common/TrustIndicators";
import CTASection from "@/components/common/CTASection";
import ProductCard from "@/components/parts/ProductCard";
import VehicleFitmentSelector from "@/components/parts/VehicleFitmentSelector";
import PinCodeChecker from "@/components/parts/PinCodeChecker";
import { PartCategory, PartProduct } from "@/lib/db/types";
import styles from "./SparePartsHome.module.css";

interface SparePartsHomeClientProps {
  categories: PartCategory[];
  featuredProducts: PartProduct[];
  bestSellers: PartProduct[];
  newArrivals: PartProduct[];
}

export default function SparePartsHomeClient({
  categories,
  featuredProducts,
  bestSellers,
  newArrivals,
}: SparePartsHomeClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"FEATURED" | "BEST_SELLERS" | "NEW_ARRIVALS">("FEATURED");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/spare-parts/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const displayedProducts =
    activeTab === "FEATURED"
      ? featuredProducts
      : activeTab === "BEST_SELLERS"
      ? bestSellers
      : newArrivals;

  return (
    <div className={styles.pageWrapper}>
      <Navbar />

      {/* Official PageHero with Arjun holding Brembo brake disc */}
      <PageHero
        badge="PAN-INDIA SPARE PARTS & TOOLS · 19,000+ PIN CODES"
        title={
          <>
            Quality Car Spare Parts & <span>Workshop Tools</span>
          </>
        }
        subtitle="100% verified vehicle fitment for Maruti, Hyundai, Tata, Mahindra, Honda, Toyota and German vehicles. Real Indian INR pricing, itemized GST invoices, and fast PAN-India dispatch."
        stats={[
          { label: "Catalog Parts", value: "12,000+" },
          { label: "Authenticity", value: "100% Genuine" },
          { label: "Dispatch Window", value: "24-48 Hrs" },
          { label: "PIN Code Coverage", value: "PAN-India" },
        ]}
        imageSrc="/images/staff-spare-parts.jpg"
        imageAlt="WowCars specialist Arjun holding genuine Brembo brake disc at parts counter"
        staffName="Arjun Sharma"
        staffRole="Parts Fulfillment Specialist"
        staffBadge="OEM EPC Certified"
        primaryAction={{
          label: "View All Categories",
          href: "/spare-parts/categories",
        }}
        secondaryAction={{
          label: "Service Centres",
          href: "/service-centres",
        }}
      />

      {/* Trust Guarantee Strip */}
      <TrustIndicators />

      {/* Search and Selector Section */}
      <section className={styles.heroSection}>
        <div className="container">
          <div className={styles.heroContent}>

            {/* Quick Keyword Search */}
            <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
              <Search className={styles.searchIcon} size={20} />
              <input
                type="text"
                placeholder="Search spare parts, brands, part numbers (e.g. 16510-M68K00, Brembo, Spark Plug)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchBtn}>
                Find Parts
              </button>
            </form>

            {/* Quick Popular Searches */}
            <div className={styles.quickTags}>
              <span className={styles.tagLabel}>Popular:</span>
              {["Oil Filters", "Brake Pads", "Shock Absorbers", "Clutch Kits", "Microfiber Cloths", "Torque Wrenches"].map((tag) => (
                <Link
                  key={tag}
                  href={`/spare-parts/search?q=${encodeURIComponent(tag)}`}
                  className={styles.tagPill}
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>

          {/* Vehicle Compatibility Selector Box */}
          <div className={styles.selectorWrapper}>
            <VehicleFitmentSelector />
          </div>
        </div>
      </section>

      {/* Value Pillars Banner */}
      <section className={styles.trustBar}>
        <div className="container">
          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>
              <div className={styles.trustIconCircle}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4>Guaranteed Vehicle Fitment</h4>
                <p>Validated against OEM Electronic Parts Catalogs</p>
              </div>
            </div>

            <div className={styles.trustItem}>
              <div className={styles.trustIconCircle}>
                <Truck size={22} />
              </div>
              <div>
                <h4>PAN-India Reliable Dispatch</h4>
                <p>Safe shipping from regional fulfillment centers</p>
              </div>
            </div>

            <div className={styles.trustItem}>
              <div className={styles.trustIconCircle}>
                <RotateCcw size={22} />
              </div>
              <div>
                <h4>Hassle-Free Returns</h4>
                <p>7 to 10 days return window on uninstalled items</p>
              </div>
            </div>

            <div className={styles.trustItem}>
              <div className={styles.trustIconCircle}>
                <Award size={22} />
              </div>
              <div>
                <h4>Verified INR Market Prices</h4>
                <p>Transparent pricing with manufacturer warranty</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories Grid */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionTag}>AUTOMOTIVE TAXONOMY</span>
              <h2 className={styles.sectionTitle}>Explore by System & Category</h2>
            </div>
            <Link href="/spare-parts/categories" className={styles.viewAllLink}>
              View All Categories <ChevronRight size={16} />
            </Link>
          </div>

          <div className={styles.categoryGrid}>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/spare-parts/category/${cat.slug}`}
                className={styles.categoryCard}
              >
                <div className={styles.catImageWrapper}>
                  <Image
                    src={cat.image || `/parts/categories/${cat.slug}.svg`}
                    alt={cat.name}
                    width={200}
                    height={150}
                    className={styles.catImage}
                  />
                </div>
                <div className={styles.catContent}>
                  <h3 className={styles.catName}>{cat.name}</h3>
                  <p className={styles.catDesc}>{cat.description}</p>
                  <span className={styles.catExplore}>
                    Browse Parts <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Curated Products Section (Featured / Best Sellers / New Arrivals) */}
      <section className={styles.sectionDark}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionTag}>CURATED CATALOGUE</span>
              <h2 className={styles.sectionTitle}>High-Demand Spare Parts & Equipment</h2>
            </div>

            {/* Filter Tabs */}
            <div className={styles.tabGroup}>
              <button
                onClick={() => setActiveTab("FEATURED")}
                className={`${styles.tabBtn} ${activeTab === "FEATURED" ? styles.activeTab : ""}`}
              >
                Featured
              </button>
              <button
                onClick={() => setActiveTab("BEST_SELLERS")}
                className={`${styles.tabBtn} ${activeTab === "BEST_SELLERS" ? styles.activeTab : ""}`}
              >
                Best Sellers
              </button>
              <button
                onClick={() => setActiveTab("NEW_ARRIVALS")}
                className={`${styles.tabBtn} ${activeTab === "NEW_ARRIVALS" ? styles.activeTab : ""}`}
              >
                New Arrivals
              </button>
            </div>
          </div>

          {displayedProducts.length > 0 ? (
            <div className={styles.productGrid}>
              {displayedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No products available under this filter currently.</p>
            </div>
          )}
        </div>
      </section>

      {/* Part Type Differentiation (Genuine OEM vs OES vs Aftermarket) */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.oemInfoCard}>
            <div className={styles.oemHeader}>
              <Layers className={styles.oemIcon} size={28} />
              <div>
                <h3>Understanding Spare Part Types</h3>
                <p>We maintain strict transparency: we never mislabel aftermarket parts as genuine OEM.</p>
              </div>
            </div>

            <div className={styles.oemGrid}>
              <div className={styles.oemCol}>
                <span className={`${styles.typeBadge} ${styles.badgeOem}`}>Genuine / OEM</span>
                <h4>Original Equipment Manufacturer</h4>
                <p>Manufactured specifically for the carmaker under direct branding (Maruti Genuine Parts, Hyundai Mobis, Tata Motors Genuine Parts).</p>
                <Link href="/spare-parts/search?partType=GENUINE_OEM" className={styles.typeLink}>
                  Browse OEM Parts →
                </Link>
              </div>

              <div className={styles.oemCol}>
                <span className={`${styles.typeBadge} ${styles.badgeOes}`}>OES Quality</span>
                <h4>Original Equipment Supplier</h4>
                <p>Produced by Tier-1 suppliers who supply to the factory assembly lines (Bosch, Denso, Valeo, Brembo, Sachs, Mann-Filter) in their own branding.</p>
                <Link href="/spare-parts/search?partType=OES" className={styles.typeLink}>
                  Browse OES Parts →
                </Link>
              </div>

              <div className={styles.oemCol}>
                <span className={`${styles.typeBadge} ${styles.badgeAftermarket}`}>Aftermarket</span>
                <h4>Certified Replacement Parts</h4>
                <p>Cost-effective replacement parts meeting or exceeding automotive safety regulations, ideal for older or out-of-warranty models.</p>
                <Link href="/spare-parts/search?partType=AFTERMARKET" className={styles.typeLink}>
                  Browse Aftermarket →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PIN Code Delivery Serviceability Checker */}
      <section className={styles.sectionDark}>
        <div className="container">
          <div className={styles.pinSectionCard}>
            <div className={styles.pinContent}>
              <span className={styles.sectionTag}>PAN-INDIA LOGISTICS</span>
              <h3>Check Delivery Eligibility in Your City</h3>
              <p>
                We deliver spare parts across 19,000+ Indian PIN codes through insured surface and express air logistics partners. Enter your PIN code to see real dispatch timelines.
              </p>
              <div className={styles.pinWrapper}>
                <PinCodeChecker />
              </div>
            </div>
            <div className={styles.pinStats}>
              <div className={styles.pinStatBox}>
                <span className={styles.statNum}>19k+</span>
                <span className={styles.statLabel}>Postal PIN codes served</span>
              </div>
              <div className={styles.pinStatBox}>
                <span className={styles.statNum}>24-48h</span>
                <span className={styles.statLabel}>Dispatch window for in-stock parts</span>
              </div>
              <div className={styles.pinStatBox}>
                <span className={styles.statNum}>100%</span>
                <span className={styles.statLabel}>Transit insurance covered</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seller Onboarding Callout */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sellerBanner}>
            <div className={styles.sellerText}>
              <Wrench size={32} className={styles.sellerIcon} />
              <div>
                <h3>Are you an Authorized Distributor, Dealer or Manufacturer?</h3>
                <p>Expand your sales across India. List verified automotive parts, manage live stock, and fulfill customer orders through WowCars Marketplace.</p>
              </div>
            </div>
            <Link href="/seller" className={styles.sellerBtn}>
              Join as a Seller
            </Link>
          </div>
        </div>
      </section>

      {/* Parts Concierge CTA */}
      <CTASection
        badge="NEED EPC FITMENT VERIFICATION?"
        title="Can't Find Your Exact Part Number or SKU?"
        subtitle="Our Electronic Parts Catalogue (EPC) specialists will look up your VIN / chassis number and confirm authentic fitment with live inventory in Bengaluru."
        primaryActionLabel="Seller Portal"
        primaryActionHref="/seller"
        imageSrc="/images/staff-spare-parts.jpg"
        imageAlt="WowCars parts specialist Arjun advising customer"
      />

      <Footer />
    </div>
  );
}
