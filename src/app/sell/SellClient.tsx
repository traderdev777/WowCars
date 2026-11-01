"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Shield, CheckCircle2, ChevronLeft, ArrowRight,
  MessageCircle, Sparkles
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/common/PageHero";
import TrustIndicators from "@/components/common/TrustIndicators";
import CTASection from "@/components/common/CTASection";
import LiveActivityTicker from "@/components/common/LiveActivityTicker";
import { WHATSAPP_CONCIERGE_PHONE } from "@/lib/mockData";
import {
  ALL_MANUFACTURERS,
  POPULAR_MAKES,
  COMPREHENSIVE_COLORS,
  getModelsForMake,
  getVariantsForModel,
  getColorsForModel,
} from "@/lib/vehicleCatalogData";
import styles from "./Sell.module.css";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedListingCode, setSubmittedListingCode] = useState<string>("WC-1050");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

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
    overview: "",
    honeypot: "",
  });

  // Dynamic dropdown options based on selections
  const availableModels = useMemo(() => {
    return getModelsForMake(formData.make);
  }, [formData.make]);

  const availableVariants = useMemo(() => {
    return getVariantsForModel(formData.make, formData.model);
  }, [formData.make, formData.model]);

  const availableColors = useMemo(() => {
    return getColorsForModel(formData.make, formData.model);
  }, [formData.make, formData.model]);

  const selectedColorObj = useMemo(() => {
    return (
      availableColors.find(
        (c) => c.name.toLowerCase() === formData.color.toLowerCase()
      ) ||
      COMPREHENSIVE_COLORS.find(
        (c) => c.name.toLowerCase() === formData.color.toLowerCase()
      ) || { name: formData.color, hex: "#ED1C24" }
    );
  }, [availableColors, formData.color]);

  // Dynamic dropdown handlers
  const handleMakeChange = (newMake: string) => {
    const models = getModelsForMake(newMake);
    const newModel = models[0] || "Standard Model";
    const variants = getVariantsForModel(newMake, newModel);
    const newVariant = variants[0] || "Base Variant";
    const colors = getColorsForModel(newMake, newModel);
    const isColorCompatible = colors.some(
      (c) => c.name.toLowerCase() === formData.color.toLowerCase()
    );
    const newColor = isColorCompatible ? formData.color : (colors[0]?.name || "Polar White");

    setFormData((prev) => ({
      ...prev,
      make: newMake,
      model: newModel,
      variant: newVariant,
      color: newColor,
    }));
  };

  const handleModelChange = (newModel: string) => {
    const variants = getVariantsForModel(formData.make, newModel);
    const newVariant = variants[0] || "Base Variant";
    const colors = getColorsForModel(formData.make, newModel);
    const isColorCompatible = colors.some(
      (c) => c.name.toLowerCase() === formData.color.toLowerCase()
    );
    const newColor = isColorCompatible ? formData.color : (colors[0]?.name || "Polar White");

    setFormData((prev) => ({
      ...prev,
      model: newModel,
      variant: newVariant,
      color: newColor,
    }));
  };

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhotos(true);
    setErrorMessage(null);

    try {
      const data = new FormData();
      Array.from(files).slice(0, 8).forEach((f) => data.append("photos", f));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to upload photos.");
      }

      if (json.urls && Array.isArray(json.urls)) {
        setUploadedPhotos((prev) => [...prev, ...json.urls]);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error uploading photos. Ensure JPEG/PNG/WebP under 8MB.");
    } finally {
      setIsUploadingPhotos(false);
      e.target.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Real-time Fair Price Estimator algorithm based on Indian used-car benchmarks
  const estimatedFairRange = useMemo(() => {
    const age = 2026 - Number(formData.year);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.honeypot) return; // Anti-bot check

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          images: uploadedPhotos.length > 0 ? uploadedPhotos : ["/demo/creta.jpg"],
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Submission failed. Please check the fields and try again.");
      }

      setSubmittedListingCode(json.listingCode || "WC-1050");
      setIsSubmitted(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const waListingMessage = encodeURIComponent(
    `Hi WowCars! I've submitted my car for sale (Listing Code: ${submittedListingCode}):\n\n` +
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

      {/* Hero Banner with Arjun Specialist Inspection */}
      <PageHero
        badge="SELL YOUR CAR FREE · BENGALURU PILOT"
        title={
          <>
            Sell Your Car to Genuine Buyers with <span>₹0 Broker Fee</span>
          </>
        }
        subtitle="100% Free listing. Fair market price estimation, transparent paperwork assistance, and zero spam calls with verified WhatsApp inquiries."
        stats={[
          { label: "Broker Commission", value: "₹0" },
          { label: "Listing Approval", value: "Under 2 Hrs" },
          { label: "Active Buyers", value: "12,000+" },
          { label: "Evaluation Hubs", value: "Bengaluru" },
        ]}
        imageSrc="/images/staff-sell-car.jpg"
        imageAlt="WowCars specialist Arjun inspecting engine bay for valuation"
        staffName="Arjun Sharma"
        staffRole="Lead Vehicle Evaluator"
        staffBadge="140-Point Technical Inspector"
        primaryAction={{
          label: "Browse Current Catalog",
          href: "/cars",
        }}
        secondaryAction={{
          label: "Service Centres",
          href: "/service-centres",
        }}
      />

      {/* 4-Pillar Trust Strip */}
      <TrustIndicators />

      <main className={styles.page}>
        <div className="container">

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
                        <div className={styles.pillGrid} style={{ marginBottom: "8px" }}>
                          {POPULAR_MAKES.map((make) => (
                            <button
                              key={make}
                              type="button"
                              onClick={() => handleMakeChange(make)}
                              className={`${styles.pillBtn} ${formData.make === make ? styles.pillBtnActive : ""}`}
                            >
                              {make}
                            </button>
                          ))}
                        </div>
                        <select
                          value={formData.make}
                          onChange={(e) => handleMakeChange(e.target.value)}
                          className={styles.select}
                          required
                        >
                          <option value="" disabled>-- Select Manufacturer --</option>
                          {ALL_MANUFACTURERS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      {/* Model */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Model Name *</label>
                        <select
                          value={formData.model}
                          onChange={(e) => handleModelChange(e.target.value)}
                          className={styles.select}
                          required
                        >
                          <option value="" disabled>-- Select Model --</option>
                          {availableModels.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      {/* Variant */}
                      <div className={styles.formField}>
                        <label className={styles.label}>Variant / Trim *</label>
                        <select
                          value={formData.variant}
                          onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                          className={styles.select}
                          required
                        >
                          <option value="" disabled>-- Select Variant / Trim --</option>
                          {availableVariants.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <label className={styles.label}>Exterior Color *</label>
                          {selectedColorObj && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--color-white)", fontWeight: 500 }}>
                              <span
                                className={styles.colorDot}
                                style={{
                                  background: selectedColorObj.hex,
                                  border: selectedColorObj.border ? "1px solid #d1d5db" : "1px solid rgba(255,255,255,0.25)",
                                }}
                              />
                              {formData.color}
                            </span>
                          )}
                        </div>

                        <select
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className={styles.select}
                          required
                        >
                          <option value="" disabled>-- Select Exterior Color --</option>
                          <optgroup label={`Verified Factory Colors (${formData.make})`}>
                            {availableColors.map((c) => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Other Standard Factory Paint Options">
                            {COMPREHENSIVE_COLORS.filter(
                              (cc) => !availableColors.some((ac) => ac.name.toLowerCase() === cc.name.toLowerCase())
                            ).map((c) => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </optgroup>
                        </select>

                        {/* Selectable Color Swatches */}
                        <div className={styles.colorSwatchGrid}>
                          {availableColors.map((c) => {
                            const isSelected = formData.color.toLowerCase() === c.name.toLowerCase();
                            return (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => setFormData({ ...formData, color: c.name })}
                                className={`${styles.colorSwatchBtn} ${isSelected ? styles.colorSwatchBtnActive : ""}`}
                                title={c.name}
                              >
                                <span
                                  className={styles.colorDot}
                                  style={{
                                    background: c.hex,
                                    border: c.border ? "1px solid #d1d5db" : "1px solid rgba(255,255,255,0.15)",
                                  }}
                                />
                                <span className={styles.colorName}>{c.name}</span>
                              </button>
                            );
                          })}
                        </div>
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

                      {/* Error Banner */}
                      {errorMessage && (
                        <div className={styles.formFieldFull} style={{ padding: "12px 16px", background: "rgba(229, 9, 20, 0.15)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", color: "#ff8b8b", fontSize: "14px" }}>
                          ⚠️ {errorMessage}
                        </div>
                      )}

                      {/* Photo Dropzone & Upload */}
                      <div className={styles.formFieldFull}>
                        <label className={styles.label}>
                          Car Photos (Exterior front, side, interior, odometer) — {uploadedPhotos.length} uploaded
                        </label>
                        <label className={styles.dropzone} style={{ display: "block", cursor: "pointer" }}>
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePhotoUpload}
                            style={{ display: "none" }}
                            disabled={isUploadingPhotos}
                          />
                          <div className={styles.dropzoneIcon}>
                            {isUploadingPhotos ? "⏳" : "📸"}
                          </div>
                          <div className={styles.dropzoneText}>
                            {isUploadingPhotos
                              ? "Verifying and uploading photos..."
                              : "Click to upload car photos (JPEG, PNG, WebP up to 8MB)"}
                          </div>
                          <div className={styles.dropzoneSub}>
                            High-res photos increase buyer inquiries by 400%. Safe storage with randomized names.
                          </div>
                        </label>

                        {/* Uploaded Thumbnails */}
                        {uploadedPhotos.length > 0 && (
                          <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                            {uploadedPhotos.map((url, idx) => (
                              <div
                                key={url}
                                style={{
                                  position: "relative",
                                  width: "80px",
                                  height: "60px",
                                  borderRadius: "6px",
                                  overflow: "hidden",
                                  border: "1px solid var(--color-border)",
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Upload ${idx + 1}`}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    removePhoto(idx);
                                  }}
                                  style={{
                                    position: "absolute",
                                    top: "2px",
                                    right: "2px",
                                    background: "rgba(0,0,0,0.7)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "18px",
                                    height: "18px",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.navRow}>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="btn btn-secondary"
                        disabled={isSubmitting}
                      >
                        <ChevronLeft size={16} />
                        Back
                      </button>

                      <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={isSubmitting || isUploadingPhotos}
                      >
                        {isSubmitting ? "Submitting Listing..." : "Submit Car for Free Listing"}
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
                    <span style={{ color: "var(--color-slate)" }}>Listing ID / Code</span>
                    <span style={{ fontWeight: 700, color: "var(--color-accent)", letterSpacing: "1px" }}>
                      {submittedListingCode}
                    </span>
                  </div>
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
                    <span className="badge badge-amber">PENDING_APPROVAL (Under Moderation)</span>
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

      {/* Selling Assistance & Concierge CTA */}
      <CTASection
        badge="WOWCARS EVALUATION SERVICE"
        title="Need an In-Person Physical Evaluation?"
        subtitle="Book a physical inspection at our Koramangala or Yelahanka Hubs. Our technicians provide an objective 140-point verification report."
        primaryActionLabel="Browse All Vehicles"
        primaryActionHref="/cars"
        imageSrc="/images/staff-vehicle-delivery.jpg"
        imageAlt="WowCars specialist Arjun at vehicle delivery hub"
      />

      <LiveActivityTicker />
      <Footer />
    </>
  );
}
