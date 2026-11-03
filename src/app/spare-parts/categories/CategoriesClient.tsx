"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ArrowRight, Layers } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { PartCategory } from "@/lib/db/types";
import styles from "./Categories.module.css";

interface CategoriesClientProps {
  categories: PartCategory[];
}

export default function CategoriesClient({ categories }: CategoriesClientProps) {
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
          <span>All Categories</span>
        </nav>

        <div className={styles.header}>
          <div className={styles.badge}>
            <Layers size={14} />
            <span>Automotive Taxonomy</span>
          </div>
          <h1 className={styles.title}>All Spare Parts Categories</h1>
          <p className={styles.subtitle}>
            Explore our comprehensive catalog across engine systems, brakes, suspension, electrical components, transmission kits, and professional workshop equipment.
          </p>
        </div>

        <div className={styles.categoryList}>
          {categories.map((cat, idx) => (
            <div key={cat.id} className={styles.categorySection}>
              <div className={styles.categoryCard}>
                <div className={styles.imageCol}>
                  <Image
                    src={cat.image || `/parts/categories/${cat.slug}.jpg`}
                    alt={cat.name}
                    width={320}
                    height={220}
                    className={styles.image}
                  />
                </div>
                <div className={styles.infoCol}>
                  <div className={styles.catMeta}>
                    <span className={styles.indexTag}>0{idx + 1}</span>
                    <h2 className={styles.catName}>
                      <Link href={`/spare-parts/category/${cat.slug}`}>{cat.name}</Link>
                    </h2>
                  </div>
                  <p className={styles.catDesc}>{cat.description}</p>

                  {/* Subcategories Pills */}
                  <div className={styles.subcatSection}>
                    <span className={styles.subcatLabel}>Subcategories:</span>
                    <div className={styles.subcatPills}>
                      {cat.subcategories?.map((sub) => {
                        const name = typeof sub === "string" ? sub : sub.name;
                        const slug = typeof sub === "string" ? sub.toLowerCase().replace(/[^a-z0-9]+/g, "-") : sub.slug;
                        return (
                          <Link
                            key={slug}
                            href={`/spare-parts/category/${cat.slug}?sub=${encodeURIComponent(slug)}`}
                            className={styles.subcatPill}
                          >
                            {name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.actionRow}>
                    <Link href={`/spare-parts/category/${cat.slug}`} className={styles.viewBtn}>
                      Browse All {cat.name} <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
