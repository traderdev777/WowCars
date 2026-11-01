"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  BadgeCheck,
  Zap,
  Truck,
  Bike,
  Car as CarIcon,
  CheckCircle2,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarCard from "@/components/cars/CarCard";
import PageHero from "@/components/common/PageHero";
import TrustIndicators from "@/components/common/TrustIndicators";
import CTASection from "@/components/common/CTASection";
import LiveActivityTicker from "@/components/common/LiveActivityTicker";
import type { Car } from "@/lib/mockData";
import styles from "./CarsCatalog.module.css";

interface CarsCatalogClientProps {
  initialCars: Car[];
  initialFuel?: string;
  initialCategory?: string;
  initialBudget?: string;
}

export default function CarsCatalogClient({
  initialCars,
  initialFuel,
  initialCategory,
  initialBudget,
}: CarsCatalogClientProps) {
  const searchParams = useSearchParams();
  const paramFuel = searchParams.get("fuel");
  const paramCategory = searchParams.get("category");
  const paramBudget = searchParams.get("budget");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(paramCategory || initialCategory || "all");
  const [selectedBudget, setSelectedBudget] = useState(paramBudget || initialBudget || "all");
  const [selectedFuel, setSelectedFuel] = useState(
    (paramFuel || initialFuel) ? (paramFuel || initialFuel)!.toLowerCase() : "all"
  );
  const [selectedTrans, setSelectedTrans] = useState("all");
  const [selectedBody, setSelectedBody] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("featured");

  const filteredCars = useMemo(() => {
    return initialCars
      .filter((car) => {
        // Vehicle category filter
        if (selectedCategory !== "all") {
          const cat = (car as any).vehicleCategory || "CAR";
          if (cat !== selectedCategory) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            car.make.toLowerCase().includes(q) ||
            car.model.toLowerCase().includes(q) ||
            car.variant.toLowerCase().includes(q) ||
            car.listingCode.toLowerCase().includes(q) ||
            car.locality.toLowerCase().includes(q) ||
            (car.city && car.city.toLowerCase().includes(q));
          if (!matches) return false;
        }

        // Budget filter
        if (selectedBudget === "under-8") {
          if (car.priceINR > 800000) return false;
        } else if (selectedBudget === "8-15") {
          if (car.priceINR < 800000 || car.priceINR > 1500000) return false;
        } else if (selectedBudget === "above-15") {
          if (car.priceINR < 1500000) return false;
        }

        // Fuel filter
        if (selectedFuel !== "all" && car.fuelType.toLowerCase() !== selectedFuel) {
          return false;
        }

        // Transmission
        if (selectedTrans !== "all" && car.transmission.toLowerCase() !== selectedTrans) {
          return false;
        }

        // Body Type
        if (selectedBody !== "all" && car.bodyType.toLowerCase() !== selectedBody) {
          return false;
        }

        // Verified Only
        if (verifiedOnly && !car.isVerified) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.priceINR - b.priceINR;
        if (sortBy === "price-desc") return b.priceINR - a.priceINR;
        if (sortBy === "km-asc") return a.kmDriven - b.kmDriven;
        if (sortBy === "year-desc") return b.year - a.year;
        // Default: featured first, then newest
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return b.year - a.year;
      });
  }, [
    initialCars,
    searchQuery,
    selectedCategory,
    selectedBudget,
    selectedFuel,
    selectedTrans,
    selectedBody,
    verifiedOnly,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedBudget("all");
    setSelectedFuel("all");
    setSelectedTrans("all");
    setSelectedBody("all");
    setVerifiedOnly(false);
    setSortBy("featured");
  };

  return (
    <>
      <Navbar />

      {/* Premium Hero Banner */}
      <PageHero
        badge="BENGALURU PILOT · 140-POINT INSPECTED"
        title={
          <>
            Explore Verified <span>Pre-Owned Vehicles</span>
          </>
        }
        subtitle="Transparent pricing, guaranteed documentation, zero buyer commission, and direct verified seller contact across Bengaluru."
        stats={[
          { label: "Inspection Check", value: "140-Point" },
          { label: "Buyer Commission", value: "₹0" },
          { label: "Active Listings", value: `${initialCars.length}+` },
          { label: "Bengaluru Hubs", value: "2 Outlets" },
        ]}
        imageSrc="/images/staff-used-cars.jpg"
        imageAlt="WowCars specialist Arjun inspecting pre-owned vehicle with customer"
        staffName="Arjun Sharma"
        staffRole="Vehicle Evaluation Lead"
        staffBadge="140-Point Certified Inspector"
        primaryAction={{
          label: "+ Sell Your Car Free",
          href: "/sell",
        }}
        secondaryAction={{
          label: "View Service Centres",
          href: "/service-centres",
        }}
      />

      {/* Trust Guarantee Strip */}
      <TrustIndicators />

      {/* Live Activity Ticker */}
      <LiveActivityTicker />

      <main className={styles.page}>
        <div className="container">
          {/* Breadcrumb & Title */}
          <div className={styles.catalogHeader}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/" className={styles.breadcrumbLink}>
                Home
              </Link>
              <span>/</span>
              <span style={{ color: "var(--brand-white, #FFFFFF)" }}>
                Verified Inventory in Bengaluru
              </span>
            </nav>

            <div className={styles.headerFlex}>
              <div>
                <h2 className={styles.sectionHeading}>
                  {selectedCategory === "ELECTRIC" || selectedFuel === "electric"
                    ? "Electric Vehicles (EVs)"
                    : selectedCategory === "COMMERCIAL"
                    ? "Commercial Vehicles & Vans"
                    : selectedCategory === "TWO_WHEELER"
                    ? "Pre-Owned Two-Wheelers"
                    : "Verified Used Cars Catalog"}
                </h2>
                <p className={styles.resultCount}>
                  Showing <strong>{filteredCars.length}</strong> verified{" "}
                  {filteredCars.length === 1 ? "vehicle" : "vehicles"} available in Bengaluru
                </p>
              </div>

              {/* Quick Category Switcher Tabs */}
              <div className={styles.categoryPills}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedFuel("all");
                  }}
                  className={`${styles.catTab} ${
                    selectedCategory === "all" && selectedFuel === "all"
                      ? styles.catTabActive
                      : ""
                  }`}
                >
                  <CarIcon size={14} /> All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("CAR");
                    if (selectedFuel === "electric") setSelectedFuel("all");
                  }}
                  className={`${styles.catTab} ${
                    selectedCategory === "CAR" && selectedFuel !== "electric"
                      ? styles.catTabActive
                      : ""
                  }`}
                >
                  <CarIcon size={14} /> Cars
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFuel("electric");
                    setSelectedCategory("all");
                  }}
                  className={`${styles.catTab} ${
                    selectedFuel === "electric" ? styles.catTabActive : ""
                  }`}
                >
                  <Zap size={14} style={{ color: "#34D399" }} /> Electric
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("COMMERCIAL");
                    setSelectedFuel("all");
                  }}
                  className={`${styles.catTab} ${
                    selectedCategory === "COMMERCIAL" ? styles.catTabActive : ""
                  }`}
                >
                  <Truck size={14} /> Commercial
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("TWO_WHEELER");
                    setSelectedFuel("all");
                  }}
                  className={`${styles.catTab} ${
                    selectedCategory === "TWO_WHEELER" ? styles.catTabActive : ""
                  }`}
                >
                  <Bike size={14} /> Two-Wheelers
                </button>
              </div>
            </div>
          </div>

          {/* Layout: Sidebar + Cars Grid */}
          <div className={styles.catalogLayout}>
            {/* Filter Sidebar */}
            <aside className={styles.filterSidebar}>
              <div className={styles.filterHeader}>
                <div className={styles.filterHeading}>
                  <SlidersHorizontal size={16} />
                  <span>Filters</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className={styles.resetBtn}
                >
                  <RotateCcw size={12} />
                  <span>Reset All</span>
                </button>
              </div>

              {/* Search Box */}
              <div className={styles.filterGroup}>
                <label className={styles.filterGroupTitle}>Keyword Search</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="e.g. Creta, Nexon EV, KA-01..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                  <Search size={14} className={styles.searchIcon} />
                </div>
              </div>

              {/* Budget Filter */}
              <div className={styles.filterGroup}>
                <label className={styles.filterGroupTitle}>Budget</label>
                <div className={styles.filterPills}>
                  {[
                    { id: "all", label: "All Prices" },
                    { id: "under-8", label: "Under ₹8L" },
                    { id: "8-15", label: "₹8L - ₹15L" },
                    { id: "above-15", label: "Above ₹15L" },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBudget(b.id)}
                      className={`${styles.pillBtn} ${
                        selectedBudget === b.id ? styles.pillBtnActive : ""
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fuel Type */}
              <div className={styles.filterGroup}>
                <label className={styles.filterGroupTitle}>Fuel Type</label>
                <div className={styles.filterPills}>
                  {[
                    { id: "all", label: "All Fuels" },
                    { id: "petrol", label: "Petrol" },
                    { id: "diesel", label: "Diesel" },
                    { id: "cng", label: "CNG" },
                    { id: "electric", label: "Electric ⚡" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFuel(f.id)}
                      className={`${styles.pillBtn} ${
                        selectedFuel === f.id ? styles.pillBtnActive : ""
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transmission */}
              <div className={styles.filterGroup}>
                <label className={styles.filterGroupTitle}>Transmission</label>
                <div className={styles.filterPills}>
                  {[
                    { id: "all", label: "All" },
                    { id: "manual", label: "Manual" },
                    { id: "automatic", label: "Automatic" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTrans(t.id)}
                      className={`${styles.pillBtn} ${
                        selectedTrans === t.id ? styles.pillBtnActive : ""
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Type */}
              <div className={styles.filterGroup}>
                <label className={styles.filterGroupTitle}>Body Style</label>
                <div className={styles.filterPills}>
                  {[
                    { id: "all", label: "All Styles" },
                    { id: "suv", label: "SUV" },
                    { id: "hatchback", label: "Hatchback" },
                    { id: "sedan", label: "Sedan" },
                    { id: "muv", label: "MUV" },
                  ].map((bt) => (
                    <button
                      key={bt.id}
                      type="button"
                      onClick={() => setSelectedBody(bt.id)}
                      className={`${styles.pillBtn} ${
                        selectedBody === bt.id ? styles.pillBtnActive : ""
                      }`}
                    >
                      {bt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verified Filter */}
              <div className={styles.filterGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>
                    <BadgeCheck size={14} style={{ color: "#10B981" }} />
                    Verified Listings Only
                  </span>
                </label>
              </div>

              {/* Specialist Assistance Box */}
              <div className={styles.specialistHelpBox}>
                <div className={styles.helpHeader}>
                  <span className={styles.helpDot} />
                  <span>Looking for a Specific Model?</span>
                </div>
                <p className={styles.helpText}>
                  Our concierge team will search our dealer and consignment networks across Bengaluru.
                </p>
                <a
                  href="https://wa.me/919019088160?text=Hi%20WowCars!%20I%20am%20looking%20for%20a%20specific%20used%20car."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-sm btn-full"
                >
                  WhatsApp Specialist
                </a>
              </div>
            </aside>

            {/* Cars Grid Area */}
            <div className={styles.catalogMain}>
              {/* Sorting Bar */}
              <div className={styles.sortBar}>
                <div className={styles.sortLabel}>
                  Sort by:
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={styles.sortSelect}
                  aria-label="Sort vehicles"
                >
                  <option value="featured">Featured & Recommended</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="year-desc">Year: Newest First</option>
                  <option value="km-asc">Kilometres: Lowest First</option>
                </select>
              </div>

              {/* Grid or Empty State */}
              {filteredCars.length > 0 ? (
                <div className={styles.carsGrid}>
                  {filteredCars.map((car) => (
                    <CarCard key={car.id} car={car} />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🚗</div>
                  <h3 className={styles.emptyTitle}>No Matching Vehicles Found</h3>
                  <p className={styles.emptyDesc}>
                    Try adjusting your budget, fuel type, or keyword search to view more verified cars.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn btn-primary btn-sm"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom CTA with Arjun Specialist Handover */}
      <CTASection
        badge="BENGALURU EXPERIENCE CENTRE"
        title="Ready to Test Drive or Inspect a Car?"
        subtitle="Visit our Koramangala or Yelahanka Hubs. 140-point inspection documentation provided upfront with transparent RTO paperwork."
        primaryActionLabel="Sell Your Car Free"
        primaryActionHref="/sell"
        imageSrc="/images/staff-vehicle-delivery.jpg"
        imageAlt="WowCars specialist Arjun handing over keys with customer in Bengaluru"
      />

      <Footer />
    </>
  );
}
