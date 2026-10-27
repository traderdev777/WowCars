"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, SlidersHorizontal, MapPin, TrendingUp, Shield, PhoneCall,
  ChevronDown, X, Zap, Award, Users, MessageCircle, Star,
  Volume2, VolumeX,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarCard from "@/components/cars/CarCard";
import EmiCalculator from "@/components/cars/EmiCalculator";
import HeroSpeedometer from "@/components/cars/HeroSpeedometer";
import LiveActivityTicker from "@/components/common/LiveActivityTicker";
import { MOCK_CARS } from "@/lib/mockData";
import styles from "./page.module.css";

const PLACEHOLDER_HINTS = [
  "Search 'Creta in Yelahanka'...",
  "Search 'Swift under 8 Lakhs'...",
  "Search 'Automatic Petrol SUVs'...",
  "Search 'Single Owner in Indiranagar'...",
  "Search 'Toyota Innova Crysta'...",
  "Search 'Low KM Baleno in Malleshwaram'...",
];

const MAKES = ["All Makes", "Hyundai", "Maruti Suzuki", "Tata", "Honda", "Kia", "Toyota", "Volkswagen", "MG", "Mahindra", "Renault"];
const BODY_TYPES = ["All Types", "Hatchback", "Sedan", "SUV", "MUV", "Luxury"];
const FUEL_TYPES = ["All Fuels", "Petrol", "Diesel", "CNG", "Electric", "Hybrid"];
const TRANSMISSION = ["Any", "Manual", "Automatic"];
const BUDGETS = [
  { label: "Any Budget", min: 0, max: Infinity },
  { label: "Under ₹3 Lakhs", min: 0, max: 300000 },
  { label: "₹3 – ₹5 Lakhs", min: 300000, max: 500000 },
  { label: "₹5 – ₹8 Lakhs", min: 500000, max: 800000 },
  { label: "₹8 – ₹12 Lakhs", min: 800000, max: 1200000 },
  { label: "₹12 – ₹20 Lakhs", min: 1200000, max: 2000000 },
  { label: "Above ₹20 Lakhs", min: 2000000, max: Infinity },
];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [make, setMake] = useState("All Makes");
  const [bodyType, setBodyType] = useState("All Types");
  const [fuelType, setFuelType] = useState("All Fuels");
  const [transmission, setTransmission] = useState("Any");
  const [budget, setBudget] = useState(0); // index into BUDGETS
  const [showFilters, setShowFilters] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  // Background Car Video Motion State (Crimson Red Supercar highway by default)
  const [bgMode, setBgMode] = useState<"highway" | "sprint" | "showroom">("highway");
  const [isBgMuted, setIsBgMuted] = useState(true);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  // Rock-solid autoPlay and continuous loop watchdog - ALWAYS keeps running!
  useEffect(() => {
    const video = bgVideoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    video.muted = isBgMuted;
    video.loop = true;
    video.playsInline = true;

    const playVideo = () => {
      if (video.paused) {
        video.play().catch(() => {});
      }
    };

    playVideo();

    // Ensure it NEVER pauses or stops
    video.addEventListener("pause", playVideo);
    video.addEventListener("ended", playVideo);
    video.addEventListener("waiting", playVideo);
    video.addEventListener("canplay", playVideo);

    const handleVisibility = () => {
      if (!document.hidden) playVideo();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Continuous heartbeat to ensure playback never stalls
    const heartbeat = setInterval(playVideo, 1200);

    return () => {
      video.removeEventListener("pause", playVideo);
      video.removeEventListener("ended", playVideo);
      video.removeEventListener("waiting", playVideo);
      video.removeEventListener("canplay", playVideo);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(heartbeat);
    };
  }, [bgMode, isBgMuted]);

  useEffect(() => {
    const timer = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % PLACEHOLDER_HINTS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const bud = BUDGETS[budget];
    return MOCK_CARS.filter((car) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        car.make.toLowerCase().includes(q) ||
        car.model.toLowerCase().includes(q) ||
        car.variant.toLowerCase().includes(q) ||
        car.city.toLowerCase().includes(q) ||
        car.locality.toLowerCase().includes(q);
      const matchMake = make === "All Makes" || car.make === make;
      const matchBody = bodyType === "All Types" || car.bodyType === bodyType;
      const matchFuel = fuelType === "All Fuels" || car.fuelType === fuelType;
      const matchTrans = transmission === "Any" || car.transmission === transmission;
      const matchBudget = car.priceINR >= bud.min && car.priceINR <= bud.max;
      return matchSearch && matchMake && matchBody && matchFuel && matchTrans && matchBudget;
    });
  }, [search, make, bodyType, fuelType, transmission, budget]);

  const activeFilterCount = [
    make !== "All Makes",
    bodyType !== "All Types",
    fuelType !== "All Fuels",
    transmission !== "Any",
    budget !== 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setMake("All Makes");
    setBodyType("All Types");
    setFuelType("All Fuels");
    setTransmission("Any");
    setBudget(0);
    setSearch("");
  };

  const featured = MOCK_CARS.filter((c) => c.isFeatured).slice(0, 4);

  return (
    <>
      <Navbar />
      <main>
        {/* ========== HERO SECTION ========== */}
        <section className={styles.hero} aria-label="Hero search">
          {/* Cinematic Moving Car Background Video - ALWAYS RUNS */}
          <div className={styles.heroBg} aria-hidden="true">
            <video
              ref={bgVideoRef}
              key={bgMode}
              className={styles.heroBgVideo}
              src={
                bgMode === "highway"
                  ? "/videos/trailer2.mp4"
                  : bgMode === "sprint"
                  ? "/videos/trailer1.mp4"
                  : "/videos/car3.mp4"
              }
              autoPlay
              loop
              muted={isBgMuted}
              playsInline
              preload="auto"
            />
            <div className={styles.heroBgOverlay} />
            <div className={styles.heroGlow} />
          </div>

          {/* Subtle Floating 4K Live Motion HUD Status in corner */}
          <div className={styles.heroLiveHud} aria-label="Live car video status">
            <span className={styles.heroLivePulse} />
            <span>4K Live Motion</span>
            <span className={styles.heroHudSep} />
            <button
              type="button"
              className={`${styles.heroHudBtn} ${!isBgMuted ? styles.heroHudBtnActive : ""}`}
              onClick={() => {
                const video = bgVideoRef.current;
                if (!video) return;
                video.muted = !video.muted;
                setIsBgMuted(video.muted);
              }}
              title={isBgMuted ? "Click to hear engine sound" : "Mute engine sound"}
              aria-label="Toggle audio"
            >
              {isBgMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              <span>{isBgMuted ? "Sound Off" : "Engine Sound ON"}</span>
            </button>
            <button
              type="button"
              className={styles.heroHudBtn}
              onClick={() => {
                setBgMode((prev) => (prev === "highway" ? "sprint" : prev === "sprint" ? "showroom" : "highway"));
              }}
              title="Switch Car Video"
              aria-label="Switch car video"
            >
              <span>{bgMode === "highway" ? "🏎️ Red 720S" : bgMode === "sprint" ? "⚡ Sprint" : "🔄 360°"}</span>
            </button>
          </div>

          <div className={`container ${styles.heroContent}`}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              <MapPin size={13} style={{ color: "#FF2E3A" }} />
              <span>India&apos;s Most Trusted Used Car Marketplace</span>
            </div>

            <h1 className={`text-display ${styles.heroTitle}`}>
              Find Your{" "}
              <span className={styles.heroAccent}>Perfect</span>
              <br />
              Pre-Owned Car
            </h1>

            <p className={styles.heroSubtitle}>
              Thousands of verified pre-owned cars across India. Transparent pricing, RTO verification,
              direct WhatsApp contact — <strong>no broker fees, no hidden charges.</strong>
            </p>

            {/* Search Bar with Animated Placeholder */}
            <div className={styles.searchBar}>
              <Search size={18} className={styles.searchIcon} />
              <input
                id="hero-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={PLACEHOLDER_HINTS[hintIndex]}
                className={styles.searchInput}
                aria-label="Search cars"
              />
              {search && (
                <button
                  className={styles.searchClear}
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
              <a href="#browse" className={`btn btn-primary ${styles.searchBtn}`}>
                Search Cars
              </a>
            </div>

            {/* Quick Budget Pills */}
            <div className={styles.quickFilters} role="group" aria-label="Quick budget filters">
              {BUDGETS.slice(1, 5).map((b, idx) => (
                <button
                  key={b.label}
                  className={`${styles.quickPill} ${budget === idx + 1 ? styles.quickPillActive : ""}`}
                  onClick={() => setBudget(budget === idx + 1 ? 0 : idx + 1)}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Interactive Automotive Tachometer & HUD */}
            <HeroSpeedometer />

            {/* Trust Stats */}
            <div className={styles.heroStats}>
              {[
                { icon: "🚗", val: "100+", label: "Verified Cars" },
                { icon: "🏪", val: "15+", label: "Trusted Dealers" },
                { icon: "✅", val: "100%", label: "Verified Listings" },
                { icon: "💬", val: "₹0", label: "Broker Commission" },
              ].map((stat) => (
                <div key={stat.label} className={styles.heroStat}>
                  <span className={styles.statEmoji}>{stat.icon}</span>
                  <span className={styles.statVal}>{stat.val}</span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Continuous Animated Automotive Marquee Ticker */}
        <div style={{ background: "rgba(18, 18, 18, 0.95)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", padding: "14px 0", overflow: "hidden" }}>
          <div className="marquee-container">
            <div className="marquee-content">
              <span>🚗 <strong style={{ color: "var(--color-white)" }}>Hyundai Creta SX (O)</strong> · KA-50 Yelahanka</span>
              <span>⚡ <strong style={{ color: "var(--color-white)" }}>Maruti Swift ZXi</strong> · 18,500 KM</span>
              <span>🛡️ <strong style={{ color: "var(--color-trust-green)" }}>150-Point Inspection</strong> Guaranteed</span>
              <span>💰 <strong style={{ color: "var(--color-primary)" }}>₹0 Buyer Brokerage</strong></span>
              <span>🏢 <strong style={{ color: "var(--color-white)" }}>Sri Balaji Motors</strong> · Verified Dealer</span>
              <span>📱 <strong style={{ color: "var(--color-trust-green)" }}>Direct WhatsApp Inquiries</strong></span>
              <span>✨ <strong style={{ color: "var(--color-white)" }}>2020 Innova Crysta</strong> · Single Owner</span>
              <span>🚗 <strong style={{ color: "var(--color-white)" }}>Tata Nexon Dark Edition</strong> · KA-04 Whitefield</span>
            </div>
            <div className="marquee-content" aria-hidden="true">
              <span>🚗 <strong style={{ color: "var(--color-white)" }}>Hyundai Creta SX (O)</strong> · KA-50 Yelahanka</span>
              <span>⚡ <strong style={{ color: "var(--color-white)" }}>Maruti Swift ZXi</strong> · 18,500 KM</span>
              <span>🛡️ <strong style={{ color: "var(--color-trust-green)" }}>150-Point Inspection</strong> Guaranteed</span>
              <span>💰 <strong style={{ color: "var(--color-primary)" }}>₹0 Buyer Brokerage</strong></span>
              <span>🏢 <strong style={{ color: "var(--color-white)" }}>Sri Balaji Motors</strong> · Verified Dealer</span>
              <span>📱 <strong style={{ color: "var(--color-trust-green)" }}>Direct WhatsApp Inquiries</strong></span>
              <span>✨ <strong style={{ color: "var(--color-white)" }}>2020 Innova Crysta</strong> · Single Owner</span>
              <span>🚗 <strong style={{ color: "var(--color-white)" }}>Tata Nexon Dark Edition</strong> · KA-04 Whitefield</span>
            </div>
          </div>
        </div>

        {/* ========== BROWSE / FILTER SECTION ========== */}
        <section id="browse" className={styles.browseSection} aria-label="Browse cars">
          <div className="container">
            {/* Section Header */}
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  {filtered.length > 0
                    ? `${filtered.length} Car${filtered.length !== 1 ? "s" : ""} Available`
                    : "No Cars Found"}
                </h2>
                <p className={styles.sectionSubtitle}>Bengaluru · Updated daily</p>
              </div>
              <div className={styles.headerActions}>
                {activeFilterCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                    <X size={14} />
                    Clear ({activeFilterCount})
                  </button>
                )}
                <button
                  className={`btn btn-secondary btn-sm ${showFilters ? styles.filtersActive : ""}`}
                  onClick={() => setShowFilters((f) => !f)}
                  aria-expanded={showFilters}
                >
                  <SlidersHorizontal size={14} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className={styles.filterBadge}>{activeFilterCount}</span>
                  )}
                  <ChevronDown size={12} className={showFilters ? styles.chevronUp : ""} />
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className={styles.filterPanel} role="region" aria-label="Search filters">
                <div className={styles.filterGrid}>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Budget</label>
                    <select
                      className="select"
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      id="filter-budget"
                    >
                      {BUDGETS.map((b, i) => (
                        <option key={b.label} value={i}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Make / Brand</label>
                    <select
                      className="select"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      id="filter-make"
                    >
                      {MAKES.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Body Type</label>
                    <select
                      className="select"
                      value={bodyType}
                      onChange={(e) => setBodyType(e.target.value)}
                      id="filter-body-type"
                    >
                      {BODY_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Fuel Type</label>
                    <select
                      className="select"
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                      id="filter-fuel-type"
                    >
                      {FUEL_TYPES.map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Transmission</label>
                    <select
                      className="select"
                      value={transmission}
                      onChange={(e) => setTransmission(e.target.value)}
                      id="filter-transmission"
                    >
                      {TRANSMISSION.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Car Grid */}
            {filtered.length > 0 ? (
              <div className="grid-cars" style={{ marginTop: "var(--space-6)" }}>
                {filtered.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className={styles.emptyState}>
                <span className={styles.emptyEmoji}>🔍</span>
                <h3 className={styles.emptyTitle}>No cars match your filters</h3>
                <p className={styles.emptyDesc}>
                  We&apos;re adding new verified cars daily. Try adjusting your budget or fuel type,
                  or{" "}
                  <a
                    href="https://wa.me/919019088160?text=Hi%20WOwCars!%20I%20am%20looking%20for%20a%20specific%20car%20and%20couldn't%20find%20it.%20Can%20you%20help%3F"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.emptyLink}
                  >
                    WhatsApp us your requirement
                  </a>.
                </p>
                <button className="btn btn-primary" onClick={clearFilters}>
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ========== EMI CALCULATOR BAND ========== */}
        <section className={styles.emiSection} id="emi" aria-label="EMI Calculator">
          <div className="container">
            <div className={styles.emiGrid}>
              <div className={styles.emiText}>
                <h2 className={`text-display ${styles.emiTitle}`}>
                  Plan Your <span className="text-red">Budget</span>
                </h2>
                <p className={styles.emiDesc}>
                  Use our interactive EMI calculator to estimate your monthly payment.
                  We partner with leading banks in Bengaluru to get you the best rates.
                </p>
                <ul className={styles.emiFeatures}>
                  {[
                    "Interest rates from 8.5% p.a.",
                    "Loan tenure up to 7 years",
                    "No hidden processing fees",
                    "Get pre-approval in 24 hours",
                  ].map((f) => (
                    <li key={f} className={styles.emiFeatureItem}>
                      <span className={styles.emiFeatureDot} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="https://wa.me/919019088160?text=Hi%20WOwCars!%20I%20need%20help%20with%20a%20car%20loan.%20Can%20you%20assist%3F"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp"
                >
                  <MessageCircle size={16} />
                  Get Loan Assistance
                </a>
              </div>
              <div className={styles.emiCalcWrap}>
                <EmiCalculator carPrice={featured[0]?.priceINR ?? 1000000} />
              </div>
            </div>
          </div>
        </section>

        {/* ========== WHY WOWCARS SECTION ========== */}
        <section id="services" className={styles.whySection} aria-label="Why WOwCars">
          <div className="container">
            <div className={styles.whyHeader}>
              <h2 className={`text-display ${styles.whyTitle}`}>
                Why <span className="text-red">WOwCars</span>?
              </h2>
              <p className={styles.whySubtitle}>
                Built for Bengaluru car buyers who value honesty, transparency and their time.
              </p>
            </div>

            <div className={styles.featuresGrid}>
              {[
                {
                  icon: <Shield size={28} />,
                  title: "Verified Listings",
                  desc: "Every car is reviewed by our team before going live. No duplicate, fraudulent or odometer-tampered listings.",
                  color: "var(--color-trust-green)",
                },
                {
                  icon: <TrendingUp size={28} />,
                  title: "Transparent Pricing",
                  desc: "No broker markups. Prices reflect real market value. Use our EMI calculator to plan your budget.",
                  color: "var(--brand-red)",
                },
                {
                  icon: <MessageCircle size={28} />,
                  title: "Direct WhatsApp Contact",
                  desc: "Chat directly with verified sellers or our concierge on WhatsApp. No middlemen, no spam calls.",
                  color: "#25D366",
                },
                {
                  icon: <MapPin size={28} />,
                  title: "Local RTO Intelligence",
                  desc: "We display complete RTO registration codes (KA-04, KA-50), insurance status and hypothecation details.",
                  color: "var(--color-info-blue)",
                },
                {
                  icon: <Award size={28} />,
                  title: "Verified Dealer Network",
                  desc: "Partnered with trusted, KYC-verified independent dealers in Bengaluru. No fly-by-night operators.",
                  color: "var(--color-warning-amber)",
                },
                {
                  icon: <PhoneCall size={28} />,
                  title: "Concierge Support",
                  desc: "Need help finding the right car? Our expert team at +91 901 908 8160 is here 7 days a week.",
                  color: "var(--color-light-gray)",
                },
              ].map((f) => (
                <div key={f.title} className={styles.featureCard}>
                  <div className={styles.featureIcon} style={{ color: f.color, background: `${f.color}15` }}>
                    {f.icon}
                  </div>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureDesc}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== SELLER CTA ========== */}
        <section className={styles.sellSection} aria-label="Sell your car">
          <div className="container">
            <div className={styles.sellCard}>
              <div className={styles.sellGlow} aria-hidden="true" />
              <div className={styles.sellContent}>
                <div className={styles.sellBadge}>
                  <Zap size={12} /> Free Listing
                </div>
                <h2 className={`text-display ${styles.sellTitle}`}>
                  Sell Your Car at the{" "}
                  <span className="text-red">Right Price</span>
                </h2>
                <p className={styles.sellDesc}>
                  List your pre-owned car for free. Reach genuine Bengaluru buyers directly
                  on WhatsApp. No middlemen. No spam. No hidden fees.
                </p>
                <div className={styles.sellStats}>
                  {[
                    { icon: <Users size={16} />, text: "2,000+ Active Buyers" },
                    { icon: <Star size={16} />, text: "Free for Individuals" },
                    { icon: <Shield size={16} />, text: "Phone Privacy Protected" },
                  ].map((s) => (
                    <div key={s.text} className={styles.sellStat}>
                      {s.icon}
                      <span>{s.text}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.sellActions}>
                  <a href="/sell" className="btn btn-primary btn-lg">
                    + List Your Car Free
                  </a>
                  <a
                    href="https://wa.me/919019088160?text=Hi%20WOwCars!%20I%20want%20to%20sell%20my%20car.%20Can%20you%20help%3F"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp btn-lg"
                  >
                    <MessageCircle size={18} />
                    WhatsApp Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== DEALER CTA ========== */}
        <section id="dealers" className={styles.dealerSection} aria-label="Dealer signup">
          <div className="container">
            <div className={styles.dealerGrid}>
              <div className={styles.dealerText}>
                <h2 className={`text-display ${styles.dealerTitle}`}>
                  Are You a{" "}
                  <span className="text-red">Used Car Dealer</span>?
                </h2>
                <p className={styles.dealerDesc}>
                  Join Bengaluru&apos;s fastest-growing verified dealer network. Get a free branded
                  digital showroom, reach high-intent buyers and manage all leads from WhatsApp.
                </p>
                <ul className={styles.dealerPoints}>
                  {[
                    "Free digital showroom on wowcars.in",
                    "List up to 5 cars free during pilot",
                    "Direct qualified buyer leads on WhatsApp",
                    "WOwCars Verified Dealer badge",
                    "No monthly aggregator subscription fees",
                  ].map((p) => (
                    <li key={p} className={styles.dealerPoint}>
                      <span className={styles.pointDot}>✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <div className={styles.dealerActions}>
                  <a href="/dealers/apply" className="btn btn-primary btn-lg">
                    Join as Dealer — Free
                  </a>
                  <a
                    href="https://wa.me/919019088160?text=Hi%20WOwCars!%20I%20am%20a%20used%20car%20dealer%20and%20want%20to%20list%20my%20inventory.%20Please%20assist."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-lg"
                  >
                    <MessageCircle size={18} />
                    WhatsApp for Details
                  </a>
                </div>
              </div>
              <div className={styles.dealerStats}>
                {[
                  { val: "₹0", label: "Platform Fee During Pilot", sub: "Completely free to start" },
                  { val: "100+", label: "Active Car Buyers", sub: "Bengaluru, daily traffic" },
                  { val: "<2 hrs", label: "Listing Go-Live Time", sub: "After admin approval" },
                ].map((s) => (
                  <div key={s.label} className={styles.dealerStatCard}>
                    <span className={styles.dealerStatVal}>{s.val}</span>
                    <span className={styles.dealerStatLabel}>{s.label}</span>
                    <span className={styles.dealerStatSub}>{s.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <LiveActivityTicker />
      <Footer />
    </>
  );
}
