"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, BadgeCheck, Lock, ArrowRight, Search, Car, Check, IndianRupee } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarCard from "@/components/cars/CarCard";
import EmiCalculator from "@/components/cars/EmiCalculator";
import { getAssetPath } from "@/lib/assets";
import { dealEstimate, EMI_FOOTNOTE, type Listing } from "@/lib/listings/listing";
import {
  activeChips, BODY_OPTIONS, bucketsFor, countMatching, EMI_BUCKETS, EMPTY_FILTERS, filtersToQuery,
  PRESETS, presetFilters, type BudgetMode, type SearchFilters,
} from "@/lib/listings/filters";
import { useCity, useRecentlyViewed } from "@/lib/listings/storage";
import styles from "./page.module.css";

const SHORTCUTS: { label: string; filters: Partial<SearchFilters> }[] = [
  { label: "Under ₹5 L", filters: { budget: "p0-5" } },
  { label: "First car", filters: PRESETS[0].filters },
  { label: "Family 7-seater", filters: { bodies: ["MUV"] } },
  { label: "CNG", filters: { fuels: ["CNG"] } },
  { label: "EV", filters: { fuels: ["Electric"] } },
  { label: "Automatic", filters: { transmissions: ["Automatic"] } },
  { label: "1st owner", filters: { owners: ["1"] } },
];

export default function HomeClient({ cars }: { cars: Listing[] }) {
  const router = useRouter();
  const { city } = useCity();
  const recentCodes = useRecentlyViewed();

  const [mode, setMode] = useState<BudgetMode>("price");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [budget, setBudget] = useState("");
  const [cityChoice, setCityChoice] = useState<string | null>(null);
  const searchCity = cityChoice ?? city;

  const cities = useMemo(() => Array.from(new Set(cars.map((c) => c.city))).sort(), [cars]);
  const makes = useMemo(() => Array.from(new Set(cars.map((c) => c.make))).sort(), [cars]);
  const models = useMemo(
    () => Array.from(new Set(cars.filter((c) => !make || c.make === make).map((c) => c.model))).sort(),
    [cars, make],
  );

  const heroFilters: SearchFilters = {
    ...EMPTY_FILTERS,
    makes: make ? [make] : [],
    models: model ? [model] : [],
    budgetMode: mode,
    budget,
    cities: searchCity && cities.includes(searchCity) ? [searchCity] : [],
  };
  const heroCount = countMatching(cars, heroFilters);
  const cityHasCars = cities.includes(searchCity);

  const go = (f: SearchFilters) => router.push(`/cars${filtersToQuery(f)}`);

  const deals = useMemo(
    () =>
      cars
        .map((c) => ({ c, d: dealEstimate(c) }))
        .filter((x) => x.d && (x.d.rating === "great" || x.d.rating === "good"))
        .sort((a, b) => a.d!.ratio - b.d!.ratio)
        .slice(0, 6)
        .map((x) => x.c),
    [cars],
  );

  const recent = recentCodes.map((code) => cars.find((c) => c.listingCode === code)).filter(Boolean).slice(0, 3) as Listing[];

  const bodyCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of cars) m[c.bodyType] = (m[c.bodyType] || 0) + 1;
    return m;
  }, [cars]);

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        {/* ================= HERO ================= */}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={`container ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <h1 id="hero-title" className={styles.heroTitle}>
                Find a used car you can trust.
              </h1>
              <p className={styles.heroSub}>
                Every car shows an honest WowPrice rating, its EMI, and the paperwork that matters — RC, insurance, NOC.
              </p>

              <form
                className={styles.searchCard}
                onSubmit={(e) => {
                  e.preventDefault();
                  go(heroFilters);
                }}
              >
                <div className={styles.modeToggle} role="group" aria-label="Search by">
                  <button type="button" aria-pressed={mode === "price"} onClick={() => { setMode("price"); setBudget(""); }}>
                    Cash price
                  </button>
                  <button type="button" aria-pressed={mode === "emi"} onClick={() => { setMode("emi"); setBudget(""); }}>
                    Monthly EMI
                  </button>
                </div>

                <div className={styles.fields}>
                  <label className={styles.field}>
                    <span>Make</span>
                    <select value={make} onChange={(e) => { setMake(e.target.value); setModel(""); }}>
                      <option value="">All makes</option>
                      {makes.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Model</span>
                    <select value={model} onChange={(e) => setModel(e.target.value)}>
                      <option value="">All models</option>
                      {models.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{mode === "emi" ? "EMI budget" : "Budget"}</span>
                    <select value={budget} onChange={(e) => setBudget(e.target.value)}>
                      <option value="">Any {mode === "emi" ? "EMI" : "budget"}</option>
                      {bucketsFor(mode).map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>City</span>
                    <select value={cityHasCars ? searchCity : ""} onChange={(e) => setCityChoice(e.target.value)}>
                      <option value="">All cities</option>
                      {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                </div>

                <button type="submit" className={`btn btn-primary btn-lg btn-full ${styles.showBtn}`} disabled={heroCount === 0}>
                  <Search size={18} />
                  {heroCount === 0 ? "No cars match — widen your search" : `Show ${heroCount} ${heroCount === 1 ? "car" : "cars"}`}
                </button>
                {mode === "emi" && <p className={styles.formNote}>EMI at 20% down, 10% p.a., 60 months.</p>}
              </form>

              <div className={styles.shortcuts} aria-label="Popular searches">
                {SHORTCUTS.map((s) => {
                  const f = { ...EMPTY_FILTERS, ...s.filters };
                  const n = countMatching(cars, f);
                  return (
                    <Link key={s.label} href={`/cars${filtersToQuery(f)}`} className={styles.shortcut}>
                      {s.label} <span className={styles.shortcutCount}>{n}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className={styles.heroMedia} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getAssetPath("/demo/seltos.jpg")} alt="" width={1376} height={768} />
            </div>
          </div>
        </section>

        {/* ================= TRUST STRIP ================= */}
        <section className={styles.trust} aria-label="Why buy on WowCars">
          <div className={`container ${styles.trustGrid}`}>
            <div className={styles.trustItem}>
              <ShieldCheck size={22} />
              <div>
                <strong>WowCars-inspected</strong>
                <span>140-point check on cars marked Inspected, with the report on the listing.</span>
              </div>
            </div>
            <div className={styles.trustItem}>
              <BadgeCheck size={22} />
              <div>
                <strong>Verified sellers</strong>
                <span>Dealers are KYC-checked; private sellers can verify their ID.</span>
              </div>
            </div>
            <div className={styles.trustItem}>
              <Lock size={22} />
              <div>
                <strong>Token held until RC transfer</strong>
                <span>Your booking token is released to the seller only once the RC is in your name.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= BODY TYPES ================= */}
        <section className={styles.section} aria-labelledby="body-title">
          <div className="container">
            <div className={styles.sectionHead}>
              <h2 id="body-title" className={styles.h2}>Browse by body type</h2>
            </div>
            <div className={styles.bodyGrid}>
              {BODY_OPTIONS.filter((b) => b.id !== "Luxury" || bodyCounts.Luxury).map((b) => (
                <Link key={b.id} href={`/cars?body=${b.id}`} className={styles.bodyTile}>
                  <Car size={22} aria-hidden="true" />
                  <span className={styles.bodyName}>{b.label}</span>
                  <span className={styles.bodyCount}>{bodyCounts[b.id] || 0} {(bodyCounts[b.id] || 0) === 1 ? "car" : "cars"}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ================= PRESET COLLECTIONS ================= */}
        <section className={styles.section} aria-labelledby="presets-title">
          <div className="container">
            <div className={styles.sectionHead}>
              <h2 id="presets-title" className={styles.h2}>Ready-made searches</h2>
              <p className={styles.sectionSub}>Each one is just a set of filters — open it and tweak.</p>
            </div>
            <div className={styles.presetGrid}>
              {PRESETS.map((p) => {
                const f = presetFilters(p);
                const n = countMatching(cars, f);
                return (
                  <Link key={p.id} href={`/cars${filtersToQuery(f)}`} className={styles.preset}>
                    <div className={styles.presetTop}>
                      <h3>{p.title}</h3>
                      <span className={styles.presetCount}>{n} {n === 1 ? "car" : "cars"}</span>
                    </div>
                    <p>{p.blurb}</p>
                    <div className={styles.presetChips}>
                      {activeChips(f).map((c) => <span key={c.key}>{c.label}</span>)}
                    </div>
                    <span className={styles.presetGo}>See cars <ArrowRight size={14} /></span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= GREAT DEALS ================= */}
        {deals.length > 0 && (
          <section className={styles.section} aria-labelledby="deals-title">
            <div className="container">
              <div className={styles.sectionHead}>
                <div>
                  <h2 id="deals-title" className={styles.h2}>Great and good prices right now</h2>
                  <p className={styles.sectionSub}>Rated by WowPrice against similar cars — an estimate, never a paid placement.</p>
                </div>
                <Link href="/cars?sort=deals" className={styles.seeAll}>All deals <ArrowRight size={14} /></Link>
              </div>
              <div className={styles.cardGrid}>
                {deals.map((c) => <CarCard key={c.id} car={c} />)}
              </div>
              <p className={styles.footnote}>{EMI_FOOTNOTE}</p>
            </div>
          </section>
        )}

        {/* ================= RECENTLY VIEWED ================= */}
        {recent.length > 0 && (
          <section className={styles.section} aria-labelledby="recent-title">
            <div className="container">
              <div className={styles.sectionHead}>
                <h2 id="recent-title" className={styles.h2}>Pick up where you left off</h2>
              </div>
              <div className={styles.cardGrid}>
                {recent.map((c) => <CarCard key={c.id} car={c} />)}
              </div>
            </div>
          </section>
        )}

        {/* ================= FINANCE ================= */}
        <section id="finance" className={styles.section} aria-labelledby="finance-title">
          <div className={`container ${styles.financeGrid}`}>
            <div>
              <h2 id="finance-title" className={styles.h2}>Shop by monthly budget</h2>
              <p className={styles.sectionSub}>Know your EMI before you fall for a car. Pick a monthly range to see what fits.</p>
              <div className={styles.emiChips}>
                {EMI_BUCKETS.map((b) => {
                  const f = { ...EMPTY_FILTERS, budgetMode: "emi" as const, budget: b.id };
                  const n = countMatching(cars, f);
                  return (
                    <Link key={b.id} href={`/cars${filtersToQuery(f)}`} className={styles.emiChip}>
                      <IndianRupee size={15} aria-hidden="true" />
                      <span>{b.label}</span>
                      <span className={styles.shortcutCount}>{n}</span>
                    </Link>
                  );
                })}
              </div>
              <ul className={styles.financeList}>
                <li><Check size={16} /> Interest from 8.5% p.a. with partner banks</li>
                <li><Check size={16} /> Tenure from 1 to 7 years</li>
                <li><Check size={16} /> Pre-approval in about 24 hours, no hidden processing fees</li>
              </ul>
            </div>
            <EmiCalculator carPrice={800000} editablePrice title="What will my EMI be?" />
          </div>
        </section>

        {/* ================= SELL CTA ================= */}
        <section className={styles.section}>
          <div className="container">
            <div className={styles.sellBand}>
              <div>
                <h2 className={styles.sellTitle}>Selling your car?</h2>
                <p>Enter your registration number for an instant price estimate. Free listing, ₹0 broker fee and verified WhatsApp enquiries only.</p>
              </div>
              <Link href="/sell" className="btn btn-primary btn-lg">
                Get my car&apos;s price <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
