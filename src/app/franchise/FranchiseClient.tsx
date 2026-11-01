"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wrench,
  Store,
  Building2,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  MessageCircle,
  HelpCircle,
  Clock,
  Phone,
  Coins,
  AlertCircle,
} from "lucide-react";
import PageHero from "@/components/common/PageHero";
import TrustIndicators from "@/components/common/TrustIndicators";
import CTASection from "@/components/common/CTASection";
import styles from "./Franchise.module.css";

export default function FranchiseClient() {
  const [selectedModel, setSelectedModel] = useState<"FRANCHISE" | "COMPANY_OWNED">("FRANCHISE");

  // ROI Calculator Sliders
  const [carsPerDay, setCarsPerDay] = useState(5);
  const [bikesPerDay, setBikesPerDay] = useState(8);
  const [dailyPartsSales, setDailyPartsSales] = useState(8000);

  // Application Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Karnataka");
  const [pinCode, setPinCode] = useState("");
  const [spaceAvailable, setSpaceAvailable] = useState("1,200 – 1,800 sq.ft");
  const [propertyStatus, setPropertyStatus] = useState("Rented / Leased");
  const [capitalAvailable, setCapitalAvailable] = useState("₹5 – ₹10 Lakhs (Lean Setup)");
  const [targetTimeline, setTargetTimeline] = useState("1-2 Months");
  const [experienceType, setExperienceType] = useState("Automotive Garage Owner / Mechanic");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState<null | {
    applicationId: string;
    whatsappUrl: string;
    message: string;
  }>(null);

  // Calculator Financial Computations (30 Days Operating Month)
  // Average Labour: ₹1,400 per car (PMS/brakes/electrical blend), ₹500 per bike
  const monthlyCarLabour = carsPerDay * 1400 * 26; // 26 working days
  const monthlyBikeLabour = bikesPerDay * 500 * 26;
  const totalLabourRevenue = monthlyCarLabour + monthlyBikeLabour;

  // Spare Parts Retail + In-Garage Consumption Margin (Average 32% gross margin)
  const monthlyPartsTurnover = dailyPartsSales * 26;
  const monthlyPartsGrossMargin = Math.round(monthlyPartsTurnover * 0.32);

  const monthlyGrossRevenue = totalLabourRevenue + monthlyPartsTurnover;
  const monthlyGrossProfit = totalLabourRevenue + monthlyPartsGrossMargin;

  // Monthly Operating Expenses (2 Techs @ ₹22k, 1 Helper @ ₹14k, Shop Rent ₹35k, Electricity ₹7k, Consumables ₹8k, Software ₹2k)
  const estimatedOpex = 22000 * 2 + 14000 + 35000 + 7000 + 8000 + 2000; // ₹1,10,000

  // Net Profit
  const estimatedNetProfit = Math.max(0, monthlyGrossProfit - estimatedOpex);
  const investmentBenchmark = selectedModel === "FRANCHISE" ? 750000 : 1800000;
  const estimatedPaybackMonths = estimatedNetProfit > 0 ? (investmentBenchmark / estimatedNetProfit).toFixed(1) : "N/A";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/franchise/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          city,
          state,
          pinCode,
          modelType: selectedModel,
          spaceAvailableSqFt: spaceAvailable,
          propertyStatus,
          capitalAvailableINR: capitalAvailable,
          targetTimeline,
          experienceType,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit partner application.");
      }

      setSubmitSuccess({
        applicationId: data.applicationId,
        whatsappUrl: data.whatsappUrl,
        message: data.message,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ========== HERO SECTION WITH ARJUN FRANCHISE PRESENTATION IMAGE ========== */}
      <PageHero
        badge="BENGALURU EXPANSION · FRANCHISE OPPORTUNITY"
        title={
          <>
            Open a WowCars <span>Service Centre & Parts Store</span>
          </>
        }
        subtitle="Combine multi-brand vehicle service garage operations with high-margin genuine spare parts retail. Choose between our lean ₹5–10 Lakh Franchise Model or partner on a Company-Owned Hub."
        stats={[
          { label: "Lean Capital", value: "₹5–10 Lakh" },
          { label: "Expected Break-Even", value: "4–7 Months" },
          { label: "Dual Revenue", value: "Labour + Parts" },
          { label: "OEM Suppliers", value: "Bosch, Brembo" },
        ]}
        imageSrc="/images/staff-franchise-b2b.jpg"
        imageAlt="WowCars representative Arjun presenting franchise expansion model to partners"
        staffName="Arjun Sharma"
        staffRole="Expansion & Franchise Lead"
        staffBadge="Network Operations Director"
        primaryAction={{
          label: "Apply to Open an Outlet",
          href: "#apply",
        }}
        secondaryAction={{
          label: "Simulate Monthly ROI",
          href: "#calculator",
        }}
      />

      {/* Trust Guarantee Strip */}
      <TrustIndicators />

      <div className="container">
        {/* ========== MODEL COMPARISON SECTION ========== */}
        <section className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Select Your Business Model</span>
          <h2 className={styles.sectionTitle}>Two Proven Paths to Ownership</h2>
          <p className={styles.sectionSubtitle}>
            Whether you are an ambitious auto technician, workshop owner, property landlord, or investor,
            we have a tailored operational blueprint for your city.
          </p>
        </section>

        <div className={styles.modelsGrid}>
          {/* FRANCHISE MODEL CARD */}
          <div
            className={`${styles.modelCard} ${selectedModel === "FRANCHISE" ? styles.modelCardHighlighted : ""}`}
            onClick={() => setSelectedModel("FRANCHISE")}
            style={{ cursor: "pointer" }}
          >
            <div className={`${styles.modelBadge} ${styles.badgeFranchise}`}>
              Most Popular • Lean Setup
            </div>
            <h3 className={styles.modelTitle}>Franchisee Model (FOFO)</h3>
            <p className={styles.modelDescription}>
              You own and operate the combined workshop and auto store under the WowCars authorized brand.
              Access our centralized procurement supply chain, digital appointment bookings, and cloud ERP.
            </p>

            <div className={styles.modelMetrics}>
              <div className={styles.metricBox}>
                <span className={styles.metricVal}>₹5–10 Lakh</span>
                <span className={styles.metricLbl}>Initial Capital</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricVal}>1,200 – 2,200 sq.ft</span>
                <span className={styles.metricLbl}>Space Footprint</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricVal}>2 Car + 1 Bike</span>
                <span className={styles.metricLbl}>Minimum Bays</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricVal}>5% Royalty</span>
                <span className={styles.metricLbl}>Monthly Revenue</span>
              </div>
            </div>

            <ul className={styles.featuresList}>
              <li className={styles.featureItem}>
                <CheckCircle2 size={16} />
                <span><strong>100% Labour Revenue:</strong> Keep all service labour charges earned at your garage.</span>
              </li>
              <li className={styles.featureItem}>
                <CheckCircle2 size={16} />
                <span><strong>Direct OEM Distributor Pricing:</strong> Wholesale rates on Bosch, Brembo, Castrol, Motul, CEAT, Exide.</span>
              </li>
              <li className={styles.featureItem}>
                <CheckCircle2 size={16} />
                <span><strong>Turnkey Cloud Garage ERP:</strong> Digital job cards, inventory WAC costing, and GST invoicing included.</span>
              </li>
              <li className={styles.featureItem}>
                <CheckCircle2 size={16} />
                <span><strong>Digital Inbound Leads:</strong> Real-time service booking requests from the WowCars website and WhatsApp.</span>
              </li>
              <li className={styles.featureItem}>
                <CheckCircle2 size={16} />
                <span><strong>Fast Setup:</strong> Go live in under 30 days with standardized branding and initial parts kit.</span>
              </li>
            </ul>

            <button
              type="button"
              className={`btn ${selectedModel === "FRANCHISE" ? "btn-primary" : "btn-secondary"} btn-full`}
              onClick={() => setSelectedModel("FRANCHISE")}
            >
              {selectedModel === "FRANCHISE" ? "✓ Selected Franchise Model" : "Choose Franchise Model"}
            </button>
          </div>

          {/* COMPANY-OWNED MODEL CARD */}
          <div
            className={`${styles.modelCard} ${selectedModel === "COMPANY_OWNED" ? styles.modelCardHighlighted : ""}`}
            onClick={() => setSelectedModel("COMPANY_OWNED")}
            style={{ cursor: "pointer" }}
          >
            <div className={`${styles.modelBadge} ${styles.badgeOwned}`}>
              Property / Capital Partner
            </div>
            <h3 className={styles.modelTitle}>Company-Owned Hub (COCO)</h3>
            <p className={styles.modelDescription}>
              Partner with WowCars by providing commercial land, warehouse space, or strategic capital.
              WowCars centrally manages all technical staff, daily operations, procurement, and customer service.
            </p>

            <div className={styles.modelMetrics}>
              <div className={styles.metricBox}>
                <span className={styles.metricVal}>₹15–25 Lakh / Space</span>
                <span className={styles.metricLbl}>Capital / Property</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricVal}>2,500 – 5,000 sq.ft</span>
                <span className={styles.metricLbl}>Commercial Space</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricVal}>4–8 Car Bays</span>
                <span className={styles.metricLbl}>Full Flagship Hub</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricVal}>Rent + Profit Share</span>
                <span className={styles.metricLbl}>Partner Returns</span>
              </div>
            </div>

            <ul className={styles.featuresList}>
              <li className={styles.featureItem}>
                <CheckCircle2 size={16} />
                <span><strong>Passive Partnership:</strong> Zero daily management headaches; operated by WowCars master technicians.</span>
              </li>
              <li className={styles.featureItem}>
                <CheckCircle2 size={16} />
                <span><strong>Assured Rental + Upside:</strong> Commercial long-term lease with 10%–15% net profit distribution.</span>
              </li>
              <li className={styles.featureItem}>
                <CheckCircle2 size={16} />
                <span><strong>Full 3D Laser Alignment & Paint Booth:</strong> Flagship multi-bay facility handling cars, SUVs, and commercial fleets.</span>
              </li>
              <li className={styles.featureItem}>
                <CheckCircle2 size={16} />
                <span><strong>Regional Spare Parts Depot:</strong> Serves as a distribution hub for surrounding franchise garages.</span>
              </li>
              <li className={styles.featureItem}>
                <CheckCircle2 size={16} />
                <span><strong>Marketplace Synergy:</strong> Pre-owned vehicle inspection, refurbishment, and certification station.</span>
              </li>
            </ul>

            <button
              type="button"
              className={`btn ${selectedModel === "COMPANY_OWNED" ? "btn-primary" : "btn-secondary"} btn-full`}
              onClick={() => setSelectedModel("COMPANY_OWNED")}
            >
              {selectedModel === "COMPANY_OWNED" ? "✓ Selected Company Hub" : "Choose Company Hub Model"}
            </button>
          </div>
        </div>

        {/* ========== CAPEX BREAKDOWN TABLE ========== */}
        <div className={styles.capexCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ff4d4f", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            <Coins size={16} /> CAPITAL EXPENDITURE BLUEPRINT
          </div>
          <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginBottom: "0.5rem" }}>
            Lean ₹5–10 Lakh Pilot Allocation (Combined Garage + Parts Store)
          </h3>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Engineered to keep upfront capital lean while ensuring high garage throughput and rapid breakeven.
          </p>

          <table className={styles.capexTable}>
            <thead>
              <tr>
                <th>Category</th>
                <th>Equipment & Assets Included</th>
                <th>Estimated Cost (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1. Service Bay Equipment</strong></td>
                <td>1 Hydraulic 4-Tonne Car Lift, 1 Two-Wheeler Service Ramp, 3HP Air Compressor, Oil Drainer Pit Unit</td>
                <td>₹2,80,000 – ₹3,40,000</td>
              </tr>
              <tr>
                <td><strong>2. Fast-Moving Parts Stock</strong></td>
                <td>OEM Filters (Oil/Air/Cabin), Castrol & Motul Synthetic Oils, Bosch/Brembo Brake Pads, Bulbs, Wipers, Coolant</td>
                <td>₹1,80,000 – ₹2,40,000</td>
              </tr>
              <tr>
                <td><strong>3. Diagnostics & Specialist Tools</strong></td>
                <td>Multi-Protocol OBD-II ECM Scanner Tablet, Battery Digital Load Tester, Pneumatic Wrench Set & Torque Drivers</td>
                <td>₹60,000 – ₹90,000</td>
              </tr>
              <tr>
                <td><strong>4. Store Branding & AC Lounge</strong></td>
                <td>Fascia 3D Glow-Sign Board, OTC Parts Glass Display Racks, Reception Desk, Live CCTV Bay Screen</td>
                <td>₹90,000 – ₹1,20,000</td>
              </tr>
              <tr>
                <td><strong>5. Working Capital & Licensing</strong></td>
                <td>Trade License, GST Registration, Initial Consumables (rags, degreaser, brake cleaner) & 1-Month Contingency</td>
                <td>₹70,000 – ₹1,10,000</td>
              </tr>
              <tr className={styles.capexTotalRow}>
                <td><strong>TOTAL LEAN PILOT INVESTMENT</strong></td>
                <td><strong>Complete Turnkey Setup ready to service cars & sell spare parts</strong></td>
                <td><strong>₹6,80,000 – ₹9,00,000</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ========== ROI & PROFITABILITY CALCULATOR ========== */}
        <section id="calculator" className={styles.calculatorCard}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <span className={styles.sectionBadge}>Interactive Simulation</span>
            <h2 className={styles.sectionTitle} style={{ fontSize: "1.9rem" }}>
              Outlet Profitability & Payback Calculator
            </h2>
            <p className={styles.sectionSubtitle}>
              Adjust your daily vehicle volume and OTC spare parts counter sales to estimate your monthly net profit.
            </p>
          </div>

          <div className={styles.calcGrid}>
            <div className={styles.slidersCol}>
              <div className={styles.sliderGroup}>
                <div className={styles.sliderLabelRow}>
                  <span className={styles.sliderLabel}>Cars Serviced / Day</span>
                  <span className={styles.sliderVal}>{carsPerDay} Cars</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={carsPerDay}
                  onChange={(e) => setCarsPerDay(Number(e.target.value))}
                  className={styles.rangeInput}
                />
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                  Avg labour charge: ₹1,400 / car
                </span>
              </div>

              <div className={styles.sliderGroup}>
                <div className={styles.sliderLabelRow}>
                  <span className={styles.sliderLabel}>Two-Wheelers Serviced / Day</span>
                  <span className={styles.sliderVal}>{bikesPerDay} Bikes</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="25"
                  value={bikesPerDay}
                  onChange={(e) => setBikesPerDay(Number(e.target.value))}
                  className={styles.rangeInput}
                />
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                  Avg labour charge: ₹500 / bike
                </span>
              </div>

              <div className={styles.sliderGroup}>
                <div className={styles.sliderLabelRow}>
                  <span className={styles.sliderLabel}>Daily Spare Parts Retail Counter Sales</span>
                  <span className={styles.sliderVal}>₹{dailyPartsSales.toLocaleString("en-IN")} / day</span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="35000"
                  step="1000"
                  value={dailyPartsSales}
                  onChange={(e) => setDailyPartsSales(Number(e.target.value))}
                  className={styles.rangeInput}
                />
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                  Lubricants, filters, brake pads & batteries OTC
                </span>
              </div>
            </div>

            <div className={styles.resultsCol}>
              <div className={styles.resultRow}>
                <span style={{ color: "rgba(255,255,255,0.7)" }}>Monthly Service Labour Revenue:</span>
                <strong style={{ color: "#fff" }}>₹{totalLabourRevenue.toLocaleString("en-IN")}</strong>
              </div>

              <div className={styles.resultRow}>
                <span style={{ color: "rgba(255,255,255,0.7)" }}>Monthly Parts Counter Turnover:</span>
                <strong style={{ color: "#fff" }}>₹{monthlyPartsTurnover.toLocaleString("en-IN")}</strong>
              </div>

              <div className={styles.resultRow}>
                <span style={{ color: "rgba(255,255,255,0.7)" }}>Estimated Spare Parts Gross Margin (32%):</span>
                <strong style={{ color: "#60a5fa" }}>+₹{monthlyPartsGrossMargin.toLocaleString("en-IN")}</strong>
              </div>

              <div className={styles.resultRow}>
                <span style={{ color: "rgba(255,255,255,0.7)" }}>Estimated Monthly Operating Expenses (Staff, Rent, Power):</span>
                <strong style={{ color: "#f87171" }}>-₹{estimatedOpex.toLocaleString("en-IN")}</strong>
              </div>

              <div className={styles.resultHighlightRow}>
                <div>
                  <span style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#10b981", fontWeight: 700 }}>
                    Estimated Monthly Net Profit
                  </span>
                  <div className={styles.resultHighlightVal}>
                    ₹{estimatedNetProfit.toLocaleString("en-IN")} / mo
                  </div>
                </div>
              </div>

              <div className={styles.paybackBadge}>
                <TrendingUp size={15} /> Projected Payback Period: ~{estimatedPaybackMonths} Months
              </div>
            </div>
          </div>
        </section>

        {/* ========== APPLICATION FORM SECTION ========== */}
        <section id="apply" className={styles.formSection}>
          {!submitSuccess ? (
            <form onSubmit={handleSubmit}>
              <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
                <span className={styles.sectionBadge}>Get Started Today</span>
                <h3 className={styles.sectionTitle} style={{ fontSize: "1.85rem", marginBottom: "0.4rem" }}>
                  Partner Onboarding Application
                </h3>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem" }}>
                  Fill out your details below to receive the detailed Franchise Information Kit and schedule a location feasibility inspection.
                </p>
              </div>

              {errorMessage && (
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "0.5rem",
                    background: "rgba(220,38,38,0.15)",
                    border: "1px solid #dc2626",
                    color: "#fca5a5",
                    fontSize: "0.88rem",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className={styles.formGrid}>
                {/* Full Name */}
                <div>
                  <label className={styles.inputLabel}>Full Name *</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    placeholder="e.g. Anand Murthy"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className={styles.inputLabel}>Mobile Number (WhatsApp Enabled) *</label>
                  <input
                    type="tel"
                    className={styles.inputField}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className={styles.inputLabel}>Email Address</label>
                  <input
                    type="email"
                    className={styles.inputField}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Target City */}
                <div>
                  <label className={styles.inputLabel}>Target City / Town *</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    placeholder="e.g. Bengaluru, Mysuru, Hubballi, Belagavi"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                {/* Preferred Model */}
                <div>
                  <label className={styles.inputLabel}>Preferred Model *</label>
                  <select
                    className={styles.selectField}
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as "FRANCHISE" | "COMPANY_OWNED")}
                  >
                    <option value="FRANCHISE">Franchise Model (FOFO) — ₹5–10L Capital</option>
                    <option value="COMPANY_OWNED">Company-Owned Hub (COCO) — Property / Investor</option>
                  </select>
                </div>

                {/* Available Capital */}
                <div>
                  <label className={styles.inputLabel}>Available Investment Capital</label>
                  <select
                    className={styles.selectField}
                    value={capitalAvailable}
                    onChange={(e) => setCapitalAvailable(e.target.value)}
                  >
                    <option value="₹5 – ₹10 Lakhs (Lean Setup)">₹5 – ₹10 Lakhs (Lean Setup Model)</option>
                    <option value="₹10 – ₹20 Lakhs (Expanded Hub)">₹10 – ₹20 Lakhs (Expanded Multi-Bay Hub)</option>
                    <option value="₹20+ Lakhs (Regional Flagship)">₹20+ Lakhs (Regional Flagship)</option>
                  </select>
                </div>

                {/* Commercial Space Available */}
                <div>
                  <label className={styles.inputLabel}>Commercial Space Size</label>
                  <select
                    className={styles.selectField}
                    value={spaceAvailable}
                    onChange={(e) => setSpaceAvailable(e.target.value)}
                  >
                    <option value="1,000 – 1,800 sq.ft">1,000 – 1,800 sq.ft (Standard Lean Outlet)</option>
                    <option value="1,800 – 3,000 sq.ft">1,800 – 3,000 sq.ft (Multi-Bay Garage + Store)</option>
                    <option value="3,000+ sq.ft">3,000+ sq.ft (Full Service Hub + Body Shop)</option>
                    <option value="Currently Searching">Currently Searching for Commercial Space</option>
                  </select>
                </div>

                {/* Property Status */}
                <div>
                  <label className={styles.inputLabel}>Property Ownership Status</label>
                  <select
                    className={styles.selectField}
                    value={propertyStatus}
                    onChange={(e) => setPropertyStatus(e.target.value)}
                  >
                    <option value="Rented / Leased">Rented / Leased Commercial Property</option>
                    <option value="Self-Owned Property">Self-Owned Land / Commercial Building</option>
                    <option value="Yet to Finalize">Yet to Finalize Property</option>
                  </select>
                </div>

                {/* Applicant Background */}
                <div className={styles.fullWidth}>
                  <label className={styles.inputLabel}>Your Professional Background</label>
                  <select
                    className={styles.selectField}
                    value={experienceType}
                    onChange={(e) => setExperienceType(e.target.value)}
                  >
                    <option value="Automotive Garage Owner / Mechanic">Existing Garage Owner / Auto Mechanic</option>
                    <option value="Automotive Spare Parts Retailer">Existing Spare Parts / Lubricants Retailer</option>
                    <option value="First-Time Entrepreneur / Investor">First-Time Automotive Entrepreneur / Business Investor</option>
                    <option value="Real Estate Owner / Landlord">Commercial Real Estate Owner / Landlord</option>
                  </select>
                </div>

                {/* Specific Location / Notes */}
                <div className={styles.fullWidth}>
                  <label className={styles.inputLabel}>Proposed Location Address or Specific Questions</label>
                  <textarea
                    rows={3}
                    className={styles.textareaField}
                    placeholder="e.g. Near main ring road junction, 1,400 sq.ft road-facing shutter with parking for 6 cars..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center" }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={isSubmitting}
                  style={{ minWidth: "280px" }}
                >
                  {isSubmitting ? "Submitting Application..." : "Submit Partner Application"}
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.successCard}>
              <div className={styles.successIcon}>
                <CheckCircle2 size={44} />
              </div>
              <h3 className={styles.sectionTitle} style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                Application Successfully Received!
              </h3>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.05rem", maxWidth: "600px", margin: "0 auto" }}>
                {submitSuccess.message}
              </p>

              <div className={styles.refBadge}>
                Application Reference: {submitSuccess.applicationId}
              </div>

              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                <a
                  href={submitSuccess.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-lg"
                >
                  <MessageCircle size={18} /> Chat with Expansion Head on WhatsApp
                </a>
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  onClick={() => setSubmitSuccess(null)}
                >
                  Submit Another Location
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Franchise Concierge CTA */}
      <CTASection
        badge="TALK TO EXPANSION DIRECTORS"
        title="Schedule a Discovery Meeting in Bengaluru"
        subtitle="Meet our leadership at our Koramangala Hub. We will walk you through live workshop operations, parts distribution margins, and turnkey franchise setup."
        primaryActionLabel="View Live Workshops"
        primaryActionHref="/service-centres"
        imageSrc="/images/staff-franchise-b2b.jpg"
        imageAlt="WowCars expansion lead Arjun meeting prospective franchise partners"
      />
    </div>
  );
}
