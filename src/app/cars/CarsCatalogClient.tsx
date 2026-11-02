"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Search, Bookmark, BookmarkCheck, LayoutGrid, List, Heart, RotateCcw } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarCard from "@/components/cars/CarCard";
import FilterPanel from "@/components/cars/FilterPanel";
import type { Listing } from "@/lib/listings/listing";
import { EMI_FOOTNOTE, DEAL_TOOLTIP } from "@/lib/listings/listing";
import {
  activeChips, applyFilters, countMatching, EMPTY_FILTERS, filtersFromQuery, filtersToQuery,
  SORT_OPTIONS, type SearchFilters, type SortKey,
} from "@/lib/listings/filters";
import { useSavedCars, useSavedSearches } from "@/lib/listings/storage";
import styles from "./CarsCatalog.module.css";

interface CarsCatalogClientProps {
  initialCars: Listing[];
}

export default function CarsCatalogClient({ initialCars }: CarsCatalogClientProps) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>(() => filtersFromQuery(new URLSearchParams(searchParams.toString())));
  const [savedOnly, setSavedOnly] = useState(() => searchParams.get("saved") === "1");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const { saved } = useSavedCars();
  const savedSearches = useSavedSearches();

  // Keep the URL shareable without a navigation.
  useEffect(() => {
    const q = filtersToQuery(filters);
    const extra = savedOnly ? (q ? "&saved=1" : "?saved=1") : "";
    const url = `${window.location.pathname}${q}${extra}`;
    window.history.replaceState(window.history.state, "", url);
  }, [filters, savedOnly]);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  const pool = useMemo(
    () => (savedOnly ? initialCars.filter((c) => saved.includes(c.listingCode)) : initialCars),
    [initialCars, savedOnly, saved],
  );
  const results = useMemo(() => applyFilters(pool, filters), [pool, filters]);
  const chips = activeChips(filters);
  const count = results.length;
  const query = filtersToQuery({ ...filters, sort: "recommended" });
  const searchSaved = query !== "" && savedSearches.has(query);

  const reset = () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort });
  const showN = `Show ${count} ${count === 1 ? "car" : "cars"}`;

  const saveSearch = () => {
    if (!query) return;
    savedSearches.save({
      query,
      label: chips.map((c) => c.label).join(" · ") || "All cars",
      savedAt: new Date().toISOString(),
    });
  };

  const heading = filters.cities.length === 1 ? `Used cars in ${filters.cities[0]}` : "Used cars for sale";

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <div className="container">
          <nav className={styles.crumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Used cars</span>
          </nav>

          <div className={styles.head}>
            <div>
              <h1 className={styles.h1}>{savedOnly ? "Saved cars" : heading}</h1>
              <p className={styles.sub}>
                <span className="tnum">{count}</span> {count === 1 ? "car" : "cars"} · every price shows an EMI estimate and a WowPrice rating
              </p>
            </div>
            <label className={styles.search}>
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                placeholder="Search make, model or area"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                aria-label="Search cars"
              />
            </label>
          </div>

          {savedOnly && (
            <div className={styles.savedBanner}>
              <Heart size={16} /> Showing the {saved.length} {saved.length === 1 ? "car" : "cars"} you saved on this device.
              <button type="button" onClick={() => setSavedOnly(false)}>Show all cars</button>
            </div>
          )}

          {/* Mobile sticky bar */}
          <div className={styles.mobileBar}>
            <button type="button" className={styles.filterBtn} onClick={() => setSheetOpen(true)}>
              <SlidersHorizontal size={16} /> Filters{chips.length ? ` (${chips.length})` : ""}
            </button>
            <label className={styles.sortMobile}>
              <span className="sr-only">Sort</span>
              <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value as SortKey })}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.layout}>
            <aside className={styles.aside} aria-label="Filters">
              <div className={styles.asideHead}>
                <h2>Filters</h2>
                {chips.length > 0 && (
                  <button type="button" onClick={reset} className={styles.linkBtn}>
                    <RotateCcw size={13} /> Reset
                  </button>
                )}
              </div>
              <FilterPanel cars={pool} filters={filters} onChange={setFilters} />
            </aside>

            <section className={styles.results} aria-label="Results">
              <div className={styles.toolbar}>
                <p className={styles.count}>
                  <strong className="tnum">{count}</strong> {count === 1 ? "result" : "results"}
                </p>
                <div className={styles.toolbarRight}>
                  <button type="button" className={styles.saveBtn} onClick={saveSearch} disabled={!query || searchSaved}>
                    {searchSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    {searchSaved ? "Search saved" : "Save search"}
                  </button>
                  <div className={styles.viewToggle} role="group" aria-label="Layout">
                    <button type="button" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")} aria-label="Grid view">
                      <LayoutGrid size={16} />
                    </button>
                    <button type="button" aria-pressed={layout === "list"} onClick={() => setLayout("list")} aria-label="List view">
                      <List size={16} />
                    </button>
                  </div>
                  <label className={styles.sortDesk}>
                    <span>Sort</span>
                    <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value as SortKey })}>
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {chips.length > 0 && (
                <div className={styles.chips}>
                  {chips.map((c) => (
                    <button key={c.key} type="button" className={styles.chip} onClick={() => setFilters(c.remove(filters))} aria-label={`Remove filter ${c.label}`}>
                      {c.label} <X size={13} />
                    </button>
                  ))}
                  <button type="button" className={styles.clearAll} onClick={reset}>Clear all</button>
                </div>
              )}

              {count > 0 ? (
                <div className={layout === "list" ? styles.list : styles.grid}>
                  {results.map((car) => (
                    <CarCard key={car.id} car={car} layout={layout} />
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>
                  <h2>No cars match all of these filters</h2>
                  <p>Remove a filter to see more cars{savedOnly ? ", or show all cars instead of only saved ones" : ""}.</p>
                  <div className={styles.emptyActions}>
                    {chips.slice(0, 3).map((c) => (
                      <button key={c.key} type="button" className={styles.chip} onClick={() => setFilters(c.remove(filters))}>
                        Remove {c.label} <X size={13} />
                      </button>
                    ))}
                    {savedOnly && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSavedOnly(false)}>Show all cars</button>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.footnotes}>
                <p>{EMI_FOOTNOTE}</p>
                <p>{DEAL_TOOLTIP}</p>
                <p>Listings marked “Sample listing” are demonstration data.</p>
              </div>
            </section>
          </div>
        </div>

        {/* Mobile filter sheet */}
        {sheetOpen && (
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Filters">
            <div className={styles.sheetHead}>
              <button type="button" className={styles.sheetClose} onClick={() => setSheetOpen(false)} aria-label="Close filters">
                <X size={20} />
              </button>
              <h2>Filters</h2>
              <button type="button" className={styles.linkBtn} onClick={reset} disabled={!chips.length}>
                Reset
              </button>
            </div>
            <div className={styles.sheetBody}>
              {chips.length > 0 && (
                <div className={styles.chips}>
                  {chips.map((c) => (
                    <button key={c.key} type="button" className={styles.chip} onClick={() => setFilters(c.remove(filters))}>
                      {c.label} <X size={13} />
                    </button>
                  ))}
                </div>
              )}
              <FilterPanel cars={pool} filters={filters} onChange={setFilters} />
            </div>
            <div className={styles.sheetFoot}>
              <button type="button" className="btn btn-primary btn-full btn-lg" onClick={() => setSheetOpen(false)} data-testid="sheet-apply">
                {countMatching(pool, filters) === 0 ? "No cars match — adjust filters" : showN}
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
