"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, RotateCcw, BadgeCheck } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarCard from "@/components/cars/CarCard";
import LiveActivityTicker from "@/components/common/LiveActivityTicker";
import type { Car } from "@/lib/mockData";
import styles from "./CarsCatalog.module.css";

interface CarsCatalogClientProps {
  initialCars: Car[];
}

export default function CarsCatalogClient({ initialCars }: CarsCatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("all");
  const [selectedFuel, setSelectedFuel] = useState("all");
  const [selectedTrans, setSelectedTrans] = useState("all");
  const [selectedBody, setSelectedBody] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("featured");

  const filteredCars = useMemo(() => {
    return initialCars.filter((car) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          car.make.toLowerCase().includes(q) ||
          car.model.toLowerCase().includes(q) ||
          car.variant.toLowerCase().includes(q) ||
          car.listingCode.toLowerCase().includes(q) ||
          car.locality.toLowerCase().includes(q);
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
    }).sort((a, b) => {
      if (sortBy === "price-asc") return a.priceINR - b.priceINR;
      if (sortBy === "price-desc") return b.priceINR - a.priceINR;
      if (sortBy === "km-asc") return a.kmDriven - b.kmDriven;
      if (sortBy === "year-desc") return b.year - a.year;
      // Default: featured first, then newest
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return b.year - a.year;
    });
  }, [initialCars, searchQuery, selectedBudget, selectedFuel, selectedTrans, selectedBody, verifiedOnly, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery("");
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

      <main className={styles.page}>
        <div className="container">
          {/* Header */}
          <div className={styles.catalogHeader}>
            <nav className={styles.breadcrumb}>
              <Link href="/" className={styles.breadcrumbLink}>Home</Link>
              <span>/</span>
              <span style={{ color: "var(--color-white)" }}>Used Cars in Bengaluru</span>
            </nav>
            <h1 className={styles.title}>Explore Verified Pre-Owned Cars</h1>
            <p className={styles.subtitle}>
              Browse quality inspected cars in Bengaluru with transparent pricing, zero buyer commission, and direct WhatsApp contact.
            </p>
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
                  Reset All
                </button>
              </div>

              {/* Search Box */}
              <div className={styles.filterGroup}>
                <label className={styles.filterGroupTitle}>Keyword Search</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="e.g. Creta, Swift, KA-50..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 34px",
                      background: "var(--color-surface-elevated)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--color-white)",
                      fontSize: "var(--font-size-xs)",
                      outline: "none",
                    }}
                  />
                  <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--color-slate)" }} />
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
                      className={`${styles.pillBtn} ${selectedBudget === b.id ? styles.pillBtnActive : ""}`}
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
                    { id: "all", label: "All" },
                    { id: "petrol", label: "Petrol" },
                    { id: "diesel", label: "Diesel" },
                    { id: "cng", label: "CNG" },
                    { id: "electric", label: "Electric" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFuel(f.id)}
                      className={`${styles.pillBtn} ${selectedFuel === f.id ? styles.pillBtnActive : ""}`}
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
                      className={`${styles.pillBtn} ${selectedTrans === t.id ? styles.pillBtnActive : ""}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Type */}
              <div className={styles.filterGroup}>
                <label className={styles.filterGroupTitle}>Body Type</label>
                <div className={styles.filterPills}>
                  {[
                    { id: "all", label: "All" },
                    { id: "suv", label: "SUV" },
                    { id: "hatchback", label: "Hatchback" },
                    { id: "sedan", label: "Sedan" },
                    { id: "muv", label: "MUV" },
                  ].map((bt) => (
                    <button
                      key={bt.id}
                      type="button"
                      onClick={() => setSelectedBody(bt.id)}
                      className={`${styles.pillBtn} ${selectedBody === bt.id ? styles.pillBtnActive : ""}`}
                    >
                      {bt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verified Toggle */}
              <div className={styles.filterGroup}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "var(--font-size-xs)", color: "var(--color-light-gray)" }}>
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    style={{ accentColor: "var(--color-primary)", cursor: "pointer" }}
                  />
                  <span>WowCars Verified Only</span>
                  <BadgeCheck size={14} style={{ color: "var(--color-accent)" }} />
                </label>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className={styles.mainContent}>
              {/* Top Controls Bar */}
              <div className={styles.topBar}>
                <div className={styles.resultsCount}>
                  Showing <span className={styles.countNumber}>{filteredCars.length}</span> verified cars in Bengaluru
                </div>

                <div className={styles.sortBox}>
                  <span>Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={styles.sortSelect}
                  >
                    <option value="featured">Featured & Newest</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="km-asc">Kilometers: Low to High</option>
                    <option value="year-desc">Model Year: Newest First</option>
                  </select>
                </div>
              </div>

              {/* Cars Grid or Empty State */}
              {filteredCars.length > 0 ? (
                <div className={styles.carsGrid}>
                  {filteredCars.map((car) => (
                    <CarCard key={car.id} car={car} />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyEmoji}>🔍</div>
                  <h3 className={styles.emptyTitle}>No Matching Cars Found</h3>
                  <p className={styles.emptySubtitle}>
                    We couldn&apos;t find any vehicles matching your selected filters. Try broadening your budget or fuel type.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn btn-primary"
                  >
                    <RotateCcw size={16} />
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <LiveActivityTicker />
      <Footer />
    </>
  );
}
