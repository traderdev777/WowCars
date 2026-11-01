"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  AlertCircle,
  X,
  Car,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/parts/ProductCard";
import VehicleFitmentSelector from "@/components/parts/VehicleFitmentSelector";
import FitmentEnquiryModal from "@/components/parts/FitmentEnquiryModal";
import { PartCategory, PartProduct } from "@/lib/db/types";
import styles from "./Search.module.css";

interface SearchClientProps {
  initialProducts: PartProduct[];
  total: number;
  page: number;
  totalPages: number;
  categories: PartCategory[];
  currentQuery?: string;
  currentCategory?: string;
  currentBrand?: string;
  currentPartType?: string;
  currentCondition?: string;
  currentSort?: string;
  currentMake?: string;
  currentModel?: string;
  currentYear?: string;
  inStockOnly?: boolean;
}

export default function SearchClient({
  initialProducts,
  total,
  page,
  totalPages,
  categories,
  currentQuery = "",
  currentCategory = "",
  currentBrand = "",
  currentPartType = "",
  currentCondition = "",
  currentSort = "relevance",
  currentMake = "",
  currentModel = "",
  currentYear = "",
  inStockOnly = false,
}: SearchClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(currentQuery);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ q: searchTerm, page: 1 });
  };

  const applyFilters = (overrides: Record<string, any>) => {
    const params = new URLSearchParams();

    const merged = {
      q: searchTerm,
      category: currentCategory,
      brand: currentBrand,
      partType: currentPartType,
      condition: currentCondition,
      sort: currentSort,
      make: currentMake,
      model: currentModel,
      year: currentYear,
      inStock: inStockOnly ? "true" : "",
      page: 1,
      ...overrides,
    };

    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        params.set(k, String(v));
      }
    });

    router.push(`/spare-parts/search?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.push("/spare-parts/search");
  };

  return (
    <div className={styles.pageWrapper}>
      <Navbar />

      <main className="container" style={{ paddingTop: "calc(var(--nav-height, 68px) + 2rem)", paddingBottom: "4rem" }}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight size={14} />
          <Link href="/spare-parts">Spare Parts</Link>
          <ChevronRight size={14} />
          <span>Search & Filter</span>
        </nav>

        {/* Search Bar in Header */}
        <div className={styles.searchHeader}>
          <form onSubmit={handleSearch} className={styles.searchBar}>
            <Search className={styles.searchIcon} size={20} />
            <input
              type="text"
              placeholder="Search by part name, part number, brand, or car model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchBtn}>
              Search
            </button>
          </form>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className={styles.mobileFilterBtn}
          >
            <Filter size={16} /> Filters
          </button>
        </div>

        {/* Vehicle Bar if selected */}
        {(currentMake || currentModel) && (
          <div className={styles.activeVehicleBar}>
            <Car size={16} className={styles.carIcon} />
            <span>
              Filtering for: <strong>{currentYear} {currentMake} {currentModel}</strong>
            </span>
            <button
              onClick={() => applyFilters({ make: "", model: "", year: "", page: 1 })}
              className={styles.removeVehicleBtn}
              title="Remove vehicle filter"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Layout: Sidebar Filters + Main Results */}
        <div className={styles.searchLayout}>
          {/* Sidebar Filters */}
          <aside className={`${styles.sidebar} ${mobileFilterOpen ? styles.mobileOpen : ""}`}>
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarTitle}>
                <Filter size={16} />
                <span>Filters</span>
              </div>
              <button onClick={clearAllFilters} className={styles.clearAllBtn}>
                Clear All
              </button>
            </div>

            {/* Vehicle Selector in Sidebar */}
            <div className={styles.filterGroup}>
              <h4 className={styles.filterHeading}>Vehicle Fitment</h4>
              <VehicleFitmentSelector
                compact
                onVehicleSelected={(v) => {
                  applyFilters({
                    make: v.make,
                    model: v.model,
                    year: v.year,
                    page: 1,
                  });
                }}
              />
            </div>

            {/* Categories Filter */}
            <div className={styles.filterGroup}>
              <h4 className={styles.filterHeading}>Category</h4>
              <div className={styles.filterOptions}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="category"
                    checked={!currentCategory}
                    onChange={() => applyFilters({ category: "", page: 1 })}
                  />
                  <span>All Categories</span>
                </label>
                {categories.map((c) => (
                  <label key={c.id} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="category"
                      checked={currentCategory === c.slug}
                      onChange={() => applyFilters({ category: c.slug, page: 1 })}
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Part Type Filter */}
            <div className={styles.filterGroup}>
              <h4 className={styles.filterHeading}>Part Type</h4>
              <div className={styles.filterOptions}>
                {[
                  { id: "", label: "All Part Types" },
                  { id: "GENUINE_OEM", label: "Genuine OEM" },
                  { id: "OES", label: "OES Quality" },
                  { id: "AFTERMARKET", label: "Aftermarket" },
                ].map((t) => (
                  <label key={t.id} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="partType"
                      checked={currentPartType === t.id}
                      onChange={() => applyFilters({ partType: t.id, page: 1 })}
                    />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Condition Filter */}
            <div className={styles.filterGroup}>
              <h4 className={styles.filterHeading}>Condition</h4>
              <div className={styles.filterOptions}>
                {[
                  { id: "", label: "All Conditions" },
                  { id: "NEW", label: "Brand New" },
                  { id: "REFURBISHED", label: "Refurbished" },
                  { id: "USED", label: "Tested Pre-Owned" },
                ].map((c) => (
                  <label key={c.id} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="condition"
                      checked={currentCondition === c.id}
                      onChange={() => applyFilters({ condition: c.id, page: 1 })}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* In-Stock Only Toggle */}
            <div className={styles.filterGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => applyFilters({ inStock: e.target.checked ? "true" : "", page: 1 })}
                />
                <span>In-Stock Items Only</span>
              </label>
            </div>
          </aside>

          {/* Results Column */}
          <div className={styles.resultsCol}>
            {/* Sorting Toolbar */}
            <div className={styles.resultsToolbar}>
              <span className={styles.resultCount}>
                Showing <strong>{initialProducts.length}</strong> of <strong>{total}</strong> verified items
              </span>

              <div className={styles.sortWrapper}>
                <SlidersHorizontal size={14} />
                <span className={styles.sortLabel}>Sort By:</span>
                <select
                  value={currentSort}
                  onChange={(e) => applyFilters({ sort: e.target.value })}
                  className={styles.sortSelect}
                >
                  <option value="relevance">Relevance</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newest Arrivals</option>
                  <option value="discount">Highest Discount</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {initialProducts.length > 0 ? (
              <>
                <div className={styles.grid}>
                  {initialProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      selectedVehicle={
                        currentMake && currentModel
                          ? `${currentYear} ${currentMake} ${currentModel}`.trim()
                          : null
                      }
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      onClick={() => applyFilters({ page: Math.max(1, page - 1) })}
                      disabled={page <= 1}
                      className={styles.pageBtn}
                    >
                      Previous
                    </button>
                    <span className={styles.pageIndicator}>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => applyFilters({ page: Math.min(totalPages, page + 1) })}
                      disabled={page >= totalPages}
                      className={styles.pageBtn}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.emptyState}>
                <AlertCircle size={40} className={styles.emptyIcon} />
                <h3>No exact spare parts matched your filters</h3>
                <p>
                  We have access to over 50,000+ OEM references across India. Tell us your car details or part number and our catalog engineers will track it down for you.
                </p>
                <div className={styles.emptyActions}>
                  <button onClick={() => setIsEnquiryOpen(true)} className={styles.requestPartBtn}>
                    Request a Part / Fitment Verification
                  </button>
                  <button onClick={clearAllFilters} className={styles.resetBtn}>
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <FitmentEnquiryModal
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
        initialVehicle={{
          make: currentMake,
          model: currentModel,
          year: currentYear,
        }}
      />

      <Footer />
    </div>
  );
}
