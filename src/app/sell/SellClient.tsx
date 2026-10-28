"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Shield, CheckCircle2, ChevronLeft, ArrowRight,
  MessageCircle, Sparkles
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LiveActivityTicker from "@/components/common/LiveActivityTicker";
import { WHATSAPP_CONCIERGE_PHONE } from "@/lib/mockData";
import styles from "./Sell.module.css";

const POPULAR_MAKES = [
  "Hyundai", "Maruti Suzuki", "Tata", "Honda",
  "Kia", "Toyota", "Volkswagen", "Mahindra"
];

const BENGALURU_RTOS = [
  { code: "KA-01", area: "Koramangala / Central" },
  { code: "KA-02", area: "Rajajinagar / West" },
  { code: "KA-03", area: "Indiranagar / East" },
  { code: "KA-04", area: "Yeshwanthpur / North" },
  { code: "KA-05", area: "Jayanagar / South" },
  { code: "KA-50", area: "Yelahanka / Airport Rd" },
  { code: "KA-51", area: "Electronic City" },
  { code: "KA-53", area: "KR Puram / Whitefield" },
  { code: "KA-41", area: "Devanahalli / North Ext." },
  { code: "OTHER", area: "Other Karnataka / Outstation" },
];

const BENGALURU_LOCALITIES = [
  "Yelahanka", "Indiranagar", "Koramangala", "Whitefield",
  "HSR Layout", "Jayanagar", "Rajajinagar", "Hebbal",
  "Malleshwaram", "JP Nagar", "Electronic City", "Marathahalli"
];

export default function SellClient() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1
    make: "Hyundai",
    model: "Creta",
    variant: "SX (O)",
    year: 2021,
    fuelType: "Petrol",
    transmission: "Manual",
    kmDriven: 35000,
    color: "Polar White",

    // Step 2
    rtoCode: "KA-50",
    numOwners: 1,
    insuranceType: "Comprehensive",
    hypothecation: "Cleared (Bank NOC Available)",

    // Step 3
    expectedPriceLakhs: "12.50",
    locality: "Yelahanka",
    fullName: "",
    phone: "",
    whatsapp: "",
    uploadedPhotosCount: 4,
    honeypot: "",
  });

  // Real-time Fair Price Estimator algorithm based on Indian used-car benchmarks
  const estimatedFairRange = useMemo(() => {
    const age = 2025 - Number(formData.year);
    // Base estimated market anchor
    let basePriceLakhs = 14.0;
    if (formData.make === "Maruti Suzuki") basePriceLakhs = 9.0;
    else if (formData.make === "Hyundai") basePriceLakhs = 13.5;
    else if (formData.make === "Tata") basePriceLakhs = 12.0;
    else if (formData.make === "Honda") basePriceLakhs = 11.5;
    else if (formData.make === "Toyota") basePriceLakhs = 20.0;
    else if (formData.make === "Kia") basePriceLakhs = 13.0;

    // Depreciation: 10% per year + KM factor
    const depreciationFactor = Math.max(0.35, 1 - age * 0.09 - (Number(formData.kmDriven) / 100000) * 0.12);
    const estimatedMid = basePriceLakhs * depreciationFactor;
    const low = (estimatedMid * 0.94).toFixed(2);
    const high = (estimatedMid * 1.06).toFixed(2);

    return { low, high };
  }, [formData.make, formData.year, formData.kmDriven]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.honeypot) return; // Anti-bot check
    setIsSubmitted(true);
  };

  const waListingMessage = encodeURIComponent(
    `Hi WowCars! I've submitted my car for sale:\n\n` +
    `🚗 Vehicle: ${formData.year} ${formData.make} ${formData.model} ${formData.variant}\n` +
    `⛽ Fuel: ${formData.fuelType} | ⚙️ Trans: ${formData.transmission}\n` +
    `🛣️ KM Driven: ${Number(formData.kmDriven).toLocaleString("en-IN")} km\n` +
    `📍 Location: ${formData.locality}, Bengaluru (RTO ${formData.rtoCode})\n` +
    `💰 Expected Price: ₹${formData.expectedPriceLakhs} Lakhs\n` +
    `👤 Seller: ${formData.fullName || "Car Owner"} (+91 ${formData.phone})\n\n` +
    `Please review and publish my listing on WowCars.`
  );

  const waListingUrl = `https://wa.me/${WHATSAPP_CONCIERGE_PHONE}?text=${waListingMessage}`;

  return (
    <>
      <Navbar />

      <main className={styles.page}>
        <div className="container">
          {/* Hero Header */}
          <div className={styles.heroHeader}>
            <div className={styles.heroBadge}>
              <span className="badge badge-green">
                <Shield size={12} /> 100% Free Listing
              </span>
              <span className="badge badge-dark">₹0 Broker Commission</span>
            </div>

            <h1 className={styles.title}>
              Sell Your Car to Genuine Buyers in <span className={styles.titleHighlight}>Bengaluru</span>
            </h1>

            <p className={styles.subtitle}>
              List in under 3 minutes. Zero spam calls — your phone number is protected, and buyers connect directly via verified WhatsApp inquiries.
            </p>

            <div className={styles.trustBar}>
              <div className={styles.trustItem}>
                <CheckCircle2 size={16} className={styles.trustIcon} />
                <span>Fair Market Valuation</span>
              </div>
              <div className={styles.trustItem}>
                <CheckCircle2 size={16} className={styles.trustIcon} />
                <span>Direct WhatsApp Inquiries</span>
              </div>
              <div className={styles.trustItem}>
                <CheckCircle2 size={16} className={styles.trustIcon} />
                <span>Live within 2 Hours</span>
              </div>
            </div>
          </div>

          {/* Stepper Card */}
          <div className={styles.wizardCard}>
            {!isSubmitted ? (
              <>
                {/* Stepper Bar */}
                <div className={styles.stepper}>
                  <div className={styles.stepperLine} />
                  <div
                    className={styles.stepperLineActive}
                    style={{ width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%" }}
                  />

                  <div className={styles.stepNode}>
                    <div className={`${styles.stepCircle} ${currentStep === 1 ? styles.stepCircleActive : currentStep > 1 ? styles.stepCircleDone : ""}`}>
                      {currentStep > 1 ? "✓" : "1"}
                    </div>
                    <span className={`${styles.stepLabel} ${currentStep >= 1 ? styles.stepLabelActive : ""}`}>
                      Vehicle Details
                    </span>
                  </div>

                  <div className={styles.stepNode}>
                    <div className={`${styles.stepCircle} ${currentStep === 2 ? styles.stepCircleActive : currentStep > 2 ? styles.stepCircleDone : ""}`}>
                      {currentStep > 2 ? "✓" : "2"}
                    </div>
                    <span className={`${styles.stepLabel} ${currentStep >= 2 ? styles.stepLabelActive : ""}`}>
                      Legal & RTO
                    </span>
                  </div>

                  <div className={styles.stepNode}>
                    <div className={`${styles.stepCircle} ${currentStep === 3 ? styles.stepCircleActive : ""}`}>
                      3
                    </div>
                    <span className={`${styles.stepLabel} ${currentStep === 3 ? styles.stepLabelActive : ""}`}>
                      Price & Contact
                    </span>
                  </div>
                </div>

                {/* Step 1: Vehicle Details */}
                {currentStep === 1 && (
                  <div className={styles.stepContent}>
                    <div>
                      <h2 className={styles.stepTitle}>Tell us about your vehicle</h2>
                      <p className={styles.stepSubtitle}>Basic car information helps buyers identify your exact variant.</p>
                    </div>

                    <div className={styles.formGrid}>
                      {/* Make */}
                      <div className={styles.formFieldFull}>
                        <label className={styles.label}>Car Brand / Manufacturer *</label>
                        <div className={styles.pillGrid}>
                          {POPULAR_MAKES.map((make) => (
                            <button
                              key={make}
                              type="button"
                              onClick={() => setFormData({ ...formData, make })}
                              className={`${styles.pillBtn} ${formData.make === make ? styles.pillBtnActive : ""}`}
                            >
                              {make}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Model */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Model Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Creta, Swift, City, Nexon"
                          value={formData.model}
                          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                          className={styles.input}
                        />
                      </div>

                      {/* Variant */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Variant / Trim *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. SX (O), ZXi Plus, V"
                          value={formData.variant}
                          onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                          className={styles.input}
                        />
                      </div>

                      {/* Year */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Registration Year *</label>
                        <select
                          value={formData.year}
                          onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                          className={styles.select}
                        >
                          {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014].map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      {/* Fuel Type */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Fuel Type *</label>
                        <select
                          value={formData.fuelType}
                          onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                          className={styles.select}
                        >
                          <option value="Petrol">Petrol</option>
                          <option value="Diesel">Diesel</option>
                          <option value="CNG">CNG</option>
                          <option value="Electric">Electric (EV)</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </div>

                      {/* Transmission */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Transmission *</label>
                        <select
                          value={formData.transmission}
                          onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                          className={styles.select}
                        >
                          <option value="Manual">Manual</option>
                          <option value="Automatic">Automatic (AT / CVT / DCT / AMT)</option>
                        </select>
                      </div>

                      {/* KM Driven */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Kilometers Driven (Odometer) *</label>
                        <input
                          type="number"
                          required
                          min={1000}
                          max={300000}
                          step={1000}
                          placeholder="e.g. 35000"
                          value={formData.kmDriven}
                          onChange={(e) => setFormData({ ...formData, kmDriven: Number(e.target.value) })}
                          className={styles.input}
                        />
                      </div>

                      {/* Color */}
                      <div className={styles.formFieldFull}>
                        <label className={styles.label}>Exterior Color *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Polar White, Nexa Blue, Daytona Grey"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className={styles.input}
                        />
                      </div>
                    </div>

                    <div className={styles.navRow}>
                      <div />
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="btn btn-primary btn-lg"
                      >
                        Next: Legal & RTO
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Legal & RTO */}
                {currentStep === 2 && (
                  <div className={styles.stepContent}>
                    <div>
                      <h2 className={styles.stepTitle}>Ownership & Legal Registration</h2>
                      <p className={styles.stepSubtitle}>Bengaluru buyers value transparent RTO KA-codes and clear titles.</p>
                    </div>

                    <div className={styles.formGrid}>
                      {/* RTO Code */}
                      <div className={styles.formFieldFull}>
                        <label className={styles.label}>Bengaluru RTO Registration Code *</label>
                        <select
                          value={formData.rtoCode}
                          onChange={(e) => setFormData({ ...formData, rtoCode: e.target.value })}
                          className={styles.select}
                        >
                          {BENGALURU_RTOS.map((rto) => (
                            <option key={rto.code} value={rto.code}>
                              {rto.code} — {rto.area}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Number of Owners */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Number of Previous Owners *</label>
                        <select
                          value={formData.numOwners}
                          onChange={(e) => setFormData({ ...formData, numOwners: Number(e.target.value) })}
                          className={styles.select}
                        >
                          <option value={1}>1st Owner (Single Owner)</option>
                          <option value={2}>2nd Owner</option>
                          <option value={3}>3rd Owner</option>
                          <option value={4}>4th Owner or more</option>
                        </select>
                      </div>

                      {/* Insurance Status */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Insurance Coverage *</label>
                        <select
                          value={formData.insuranceType}
                          onChange={(e) => setFormData({ ...formData, insuranceType: e.target.value })}
                          className={styles.select}
                        >
                          <option value="Zero Dep">Zero Depreciation (Bumper to Bumper)</option>
                          <option value="Comprehensive">Comprehensive Policy</option>
                          <option value="Third Party">Third Party Only</option>
                          <option value="Expired">Expired / Needs Renewal</option>
                        </select>
                      </div>

                      {/* Hypothecation / Loan */}
                      <div className={styles.formFieldFull}>
                        <label className={styles.label}>Bank Loan / Hypothecation Status *</label>
                        <select
                          value={formData.hypothecation}
                          onChange={(e) => setFormData({ ...formData, hypothecation: e.target.value })}
                          className={styles.select}
                        >
                          <option value="Cleared (Bank NOC Available)">Cleared (Bank NOC & Form 35 available)</option>
                          <option value="None (Cash Purchased)">Never Financed / Cash Purchased</option>
                          <option value="Active Loan (Will clear upon sale)">Active Loan (Will be closed with buyer advance)</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.navRow}>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="btn btn-secondary"
                      >
                        <ChevronLeft size={16} />
                        Back
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="btn btn-primary btn-lg"
                      >
                        Next: Price & Contact
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Valuation, Price & Contact */}
                {currentStep === 3 && (
                  <form onSubmit={handleSubmit} className={styles.stepContent}>
                    {/* Honeypot field for bot suppression */}
                    <input
                      type="text"
                      name="company_website"
                      value={formData.honeypot}
                      onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                      style={{ display: "none" }}
                      tabIndex={-1}
                      autoComplete="off"
                    />

                    <div>
                      <h2 className={styles.stepTitle}>Fair Valuation & Contact Information</h2>
                      <p className={styles.stepSubtitle}>Set your expected price and let qualified buyers contact you.</p>
                    </div>

                    {/* Fair Valuation Box */}
                    <div className={styles.valuationBox}>
                      <div className={styles.valuationHeader}>
                        <span className={styles.valuationTitle}>
                          <Sparkles size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                          WowCars Estimated Bengaluru Market Valuation
                        </span>
                        <span className={styles.valuationRange}>
                          ₹{estimatedFairRange.low}L – ₹{estimatedFairRange.high}L
                        </span>
                      </div>
                      <p className={styles.valuationHint}>
                        Calculated based on {formData.year} {formData.make} {formData.model} with {Number(formData.kmDriven).toLocaleString("en-IN")} km in Bengaluru market. Pricing competitively helps close sales within 7 days.
                      </p>
                    </div>

                    <div className={styles.formGrid}>
                      {/* Expected Price */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Your Expected Price (in Lakhs INR) *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 12.50"
                          value={formData.expectedPriceLakhs}
                          onChange={(e) => setFormData({ ...formData, expectedPriceLakhs: e.target.value })}
                          className={styles.input}
                        />
                      </div>

                      {/* Locality */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Your Locality in Bengaluru *</label>
                        <select
                          value={formData.locality}
                          onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                          className={styles.select}
                        >
                          {BENGALURU_LOCALITIES.map((loc) => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>

                      {/* Full Name */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Your Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ananya Hegde"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className={styles.input}
                        />
                      </div>

                      {/* Phone / WhatsApp */}
                      <div className={styles.formField}>
                        <label className={styles.label}>WhatsApp / Phone Number *</label>
                        <input
                          type="tel"
                          required
                          pattern="[0-9]{10}"
                          placeholder="10-digit mobile number"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={styles.input}
                        />
                      </div>

                      {/* Photo Dropzone Simulation */}
                      <div className={styles.formFieldFull}>
                        <label className={styles.label}>Car Photos (Exterior front, side, interior, odometer)</label>
                        <div className={styles.dropzone}>
                          <div className={styles.dropzoneIcon}>📸</div>
                          <div className={styles.dropzoneText}>
                            Drop 4–8 car photos here, or click to browse
                          </div>
                          <div className={styles.dropzoneSub}>
                            High-res photos increase buyer inquiries by 400%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.navRow}>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="btn btn-secondary"
                      >
                        <ChevronLeft size={16} />
                        Back
                      </button>

                      <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                      >
                        Submit Car for Free Listing
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              /* Success Screen */
              <div className={styles.successCard}>
                <div className={styles.successIcon}>🎉</div>
                <h2 className={styles.successTitle}>Car Submitted for Verification!</h2>
                <p className={styles.subtitle}>
                  Thank you, {formData.fullName || "Car Owner"}! Your listing for the {formData.year} {formData.make} {formData.model} in {formData.locality} has been received and queued for review.
                </p>

                {/* Listing Summary Box */}
                <div className={styles.summaryBox}>
                  <div className={styles.summaryRow}>
                    <span style={{ color: "var(--color-slate)" }}>Vehicle</span>
                    <span style={{ fontWeight: 700, color: "var(--color-white)" }}>
                      {formData.year} {formData.make} {formData.model} {formData.variant}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span style={{ color: "var(--color-slate)" }}>Expected Price</span>
                    <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                      ₹{formData.expectedPriceLakhs} Lakhs
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span style={{ color: "var(--color-slate)" }}>RTO & Area</span>
                    <span style={{ color: "var(--color-white)" }}>
                      {formData.rtoCode} · {formData.locality}, Bengaluru
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span style={{ color: "var(--color-slate)" }}>Listing Status</span>
                    <span className="badge badge-amber">Under Review (ETA: 2 Hours)</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: 450, margin: "0 auto" }}>
                  <a
                    href={waListingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp btn-lg"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <MessageCircle size={18} />
                    Fast-Track Approval on WhatsApp
                  </a>

                  <Link href="/cars" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
                    Browse Existing Verified Cars
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <LiveActivityTicker />
      <Footer />
    </>
  );
}
