"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Filter, SlidersHorizontal, AlertCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/parts/ProductCard";
import VehicleFitmentSelector from "@/components/parts/VehicleFitmentSelector";
import FitmentEnquiryModal from "@/components/parts/FitmentEnquiryModal";
import { PartCategory, PartProduct } from "@/lib/db/types";
import styles from "./CategoryDetail.module.css";

interface CategoryDetailClientProps {
  category: PartCategory;
  initialProducts: PartProduct[];
  selectedSubcategory?: string;
}

export default function CategoryDetailClient({
  category,
  initialProducts,
  selectedSubcategory,
}: CategoryDetailClientProps) {
  const searchParams = useSearchParams();
  const subParam = searchParams.get("sub");
  const [activeSub, setActiveSub] = useState<string>(subParam || selectedSubcategory || "ALL");
  const [selectedPartType, setSelectedPartType] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);

  // Filter products by subcategory and partType
  const filtered = initialProducts.filter((p) => {
    if (activeSub !== "ALL") {
      const match =
        (p.subcategorySlug && p.subcategorySlug.toLowerCase() === activeSub.toLowerCase()) ||
        (p.subcategory && p.subcategory.toLowerCase() === activeSub.toLowerCase()) ||
        (p.subcategory && p.subcategory.toLowerCase().replace(/[^a-z0-9]+/g, "-") === activeSub.toLowerCase());
      if (!match) return false;
    }
    if (selectedPartType !== "ALL" && p.partType !== selectedPartType) return false;
    return true;
  });

  // Sort
  if (sortBy === "price_asc") {
    filtered.sort((a, b) => (a.price || a.priceINR) - (b.price || b.priceINR));
  } else if (sortBy === "price_desc") {
    filtered.sort((a, b) => (b.price || b.priceINR) - (a.price || a.priceINR));
  } else if (sortBy === "discount") {
    filtered.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
  }

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
          <Link href="/spare-parts/categories">Categories</Link>
          <ChevronRight size={14} />
          <span>{category.name}</span>
        </nav>

        {/* Category Header Banner */}
        <div className={styles.header}>
          <div>
            <span className={styles.headerTag}>CATEGORY SHOWCASE</span>
            <h1 className={styles.title}>{category.name}</h1>
            <p className={styles.desc}>{category.description}</p>
          </div>
          <button onClick={() => setIsEnquiryOpen(true)} className={styles.requestPartBtn}>
            Request Fitment Check
          </button>
        </div>

        {/* Subcategories Filter Bar */}
        {category.subcategories && category.subcategories.length > 0 && (
          <div className={styles.subcatBar}>
            <button
              onClick={() => setActiveSub("ALL")}
              className={`${styles.subcatBtn} ${activeSub === "ALL" ? styles.activeSubcat : ""}`}
            >
              All Items ({initialProducts.length})
            </button>
            {category.subcategories.map((sub) => {
              const name = typeof sub === "string" ? sub : sub.name;
              const slug = typeof sub === "string" ? sub.toLowerCase().replace(/[^a-z0-9]+/g, "-") : sub.slug;
              const count = initialProducts.filter(
                (p) =>
                  (p.subcategorySlug && p.subcategorySlug.toLowerCase() === slug.toLowerCase()) ||
                  (p.subcategory && p.subcategory.toLowerCase() === name.toLowerCase())
              ).length;
              return (
                <button
                  key={slug}
                  onClick={() => setActiveSub(slug)}
                  className={`${styles.subcatBtn} ${activeSub === slug ? styles.activeSubcat : ""}`}
                >
                  {name} {count > 0 ? `(${count})` : ""}
                </button>
              );
            })}
          </div>
        )}

        {/* Vehicle Fitment Filter Bar */}
        <div className={styles.fitmentBar}>
          <VehicleFitmentSelector
            compact
            onVehicleSelected={(v) => {
              if (v.make && v.model) {
                setSelectedVehicle(`${v.year || ""} ${v.make} ${v.model}`.trim());
              } else {
                setSelectedVehicle(null);
              }
            }}
          />
        </div>

        {/* Filter and Sorting Bar */}
        <div className={styles.toolbar}>
          <div className={styles.typeFilterGroup}>
            <span className={styles.toolbarLabel}>
              <Filter size={14} /> Part Type:
            </span>
            {[
              { id: "ALL", label: "All Types" },
              { id: "GENUINE_OEM", label: "Genuine OEM" },
              { id: "OES", label: "OES Quality" },
              { id: "AFTERMARKET", label: "Aftermarket" },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedPartType(type.id)}
                className={`${styles.typePill} ${selectedPartType === type.id ? styles.activeType : ""}`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className={styles.sortGroup}>
            <SlidersHorizontal size={14} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.sortSelect}
              aria-label="Sort products"
            >
              <option value="featured">Featured / Best Match</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="discount">Highest Discount</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                selectedVehicle={selectedVehicle}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <AlertCircle size={36} className={styles.emptyIcon} />
            <h3>No products found under selected filters</h3>
            <p>
              Looking for a specific part number or vehicle variant? Submit a fitment verification request and our engineering specialists will source it for you.
            </p>
            <button onClick={() => setIsEnquiryOpen(true)} className={styles.enquiryBtn}>
              Submit Fitment Request
            </button>
          </div>
        )}
      </main>

      <FitmentEnquiryModal
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
      />

      <Footer />
    </div>
  );
}
