"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin, Fuel, Settings, Users, MessageCircle, Eye, BadgeCheck,
  Shield, CheckCircle2, Share2, Calendar, Phone,
  X, Award, Sparkles, Info, FileText
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarCard from "@/components/cars/CarCard";
import EmiCalculator from "@/components/cars/EmiCalculator";
import LiveActivityTicker from "@/components/common/LiveActivityTicker";
import ResponsiveGallery from "@/components/common/ResponsiveGallery";
import CTASection from "@/components/common/CTASection";
import StaffBrandingImage from "@/components/common/StaffBrandingImage";
import { formatLakhs, formatKM, generateWhatsAppLink } from "@/lib/formatters";
import type { Car } from "@/lib/mockData";
import { WHATSAPP_CONCIERGE_PHONE } from "@/lib/mockData";
import styles from "./CarDetail.module.css";

interface CarDetailClientProps {
  car: Car;
  relatedCars: Car[];
}

const GALLERY_ANGLES = [
  { id: "front", label: "Front 3/4", emoji: "🏎️" },
  { id: "side", label: "Side Profile", emoji: "🚗" },
  { id: "rear", label: "Rear View", emoji: "🚙" },
  { id: "interior", label: "Interior Cockpit", emoji: "💺" },
  { id: "engine", label: "Engine Bay", emoji: "⚙️" },
  { id: "tyres", label: "Tyres & Alloys", emoji: "🛞" },
];

export default function CarDetailClient({ car, relatedCars }: CarDetailClientProps) {
  const [selectedAngle, setSelectedAngle] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactMode, setContactMode] = useState<"TEST_DRIVE" | "ENQUIRY" | "CALLBACK">("TEST_DRIVE");
  const [submittedEnquiryCode, setSubmittedEnquiryCode] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [testDriveData, setTestDriveData] = useState({
    name: "",
    phone: "",
    email: "",
    date: "",
    timeSlot: "Morning (10 AM - 1 PM)",
    message: "",
    honeypot: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Pre-calculated estimated EMI (20% down, 5 yrs, 9.5% rate)
  const principal = car.priceINR * 0.8;
  const monthlyRate = 0.095 / 12;
  const tenureMonths = 60;
  const estimatedEmi = Math.round(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1)
  );

  const waEnquiryLink = generateWhatsAppLink(WHATSAPP_CONCIERGE_PHONE, {
    listingCode: car.listingCode,
    title: `${car.year} ${car.make} ${car.model} ${car.variant}`,
    priceLakhs: formatLakhs(car.priceINR),
    url: typeof window !== "undefined" ? window.location.href : `https://wowcars.in/cars/${car.listingCode.toLowerCase()}`,
  });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${car.year} ${car.make} ${car.model} — WowCars Bengaluru`,
          text: `Check out this verified ${car.year} ${car.make} ${car.model} on WowCars for ₹${formatLakhs(car.priceINR)} Lakhs.`,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const logWhatsAppClick = () => {
    try {
      fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: car.id,
          type: "WHATSAPP_CLICK",
          buyerName: "WhatsApp Buyer",
          buyerPhone: "Direct WhatsApp",
        }),
      }).catch(() => {});
    } catch {
      // Non-blocking telemetry
    }
  };

  const handleTestDriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (testDriveData.honeypot) return; // Silent reject for spam bots

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const requestType =
        contactMode === "TEST_DRIVE"
          ? "TEST_DRIVE_REQUEST"
          : contactMode === "CALLBACK"
          ? "CALLBACK_REQUEST"
          : "LOAN_INQUIRY";

      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: car.id,
          type: requestType,
          buyerName: testDriveData.name,
          buyerPhone: testDriveData.phone,
          buyerEmail: testDriveData.email || undefined,
          preferredDate: testDriveData.date,
          preferredTime: testDriveData.timeSlot,
          message: testDriveData.message || undefined,
          preferredContactMethod: contactMode === "CALLBACK" ? "PHONE" : "WHATSAPP",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit request.");
      }

      setSubmittedEnquiryCode(json.enquiryCode || json.enquiryId || "WC-ENQ-REGISTERED");
      setIsSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Error submitting request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className={styles.page}>
        <div className="container">
          {/* Breadcrumb Navigation */}
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/" className={styles.breadcrumbLink}>Home</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <Link href="/#browse" className={styles.breadcrumbLink}>Used Cars in Bengaluru</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{car.year} {car.make} {car.model}</span>
          </nav>

          {/* Title Header */}
          <div className={styles.headerArea}>
            <div className={styles.topBadges}>
              <span className="badge badge-white">{car.listingCode}</span>
              {car.isVerified && (
                <span className="badge badge-green">
                  <span className="radar-dot" style={{ width: 6, height: 6 }} />
                  <BadgeCheck size={12} /> WowCars Verified
                </span>
              )}
              {car.isFeatured && (
                <span className="badge badge-red">★ Featured</span>
              )}
              {car.numOwners === 1 && (
                <span className="badge badge-amber">1st Owner</span>
              )}
            </div>

            <h1 className={styles.title}>
              {car.year} {car.make} {car.model}
            </h1>

            <div className={styles.subhead}>
              <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>{car.variant}</span>
              <span className={styles.dot}>·</span>
              <span>{car.color}</span>
              <span className={styles.dot}>·</span>
              <span><MapPin size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />{car.locality}, {car.city}</span>
              <span className={styles.dot}>·</span>
              <span>RTO {car.rtoCode} ({car.rtoArea})</span>
            </div>
          </div>

          {/* Main 2-Column Content Grid */}
          <div className={styles.mainGrid}>
            {/* Left Column: Visual Showcase, Specs & Details */}
            <div className={styles.leftCol}>
              {/* Photo Showcase */}
              {car.images && car.images.length > 0 ? (
                <div style={{ marginBottom: "1.5rem" }}>
                  <ResponsiveGallery
                    images={car.images}
                    title={`${car.year} ${car.make} ${car.model}`}
                  />
                </div>
              ) : (
                <div className={styles.galleryCard}>
                  <div className={styles.heroViewer}>
                    <div className={styles.heroViewerVisual}>
                      <span className={styles.carBigEmoji}>{GALLERY_ANGLES[selectedAngle].emoji}</span>
                      <span className={styles.carAngleLabel}>{GALLERY_ANGLES[selectedAngle].label}</span>
                    </div>

                    <div className={styles.galleryWatermark}>
                      <Shield size={14} style={{ color: "var(--color-primary)" }} />
                      <span>WowCars Inspected</span>
                    </div>

                    <div className={styles.galleryCounter}>
                      {selectedAngle + 1} / {GALLERY_ANGLES.length}
                    </div>
                  </div>

                  {/* Angle Thumbnails */}
                  <div className={styles.thumbRow}>
                    {GALLERY_ANGLES.map((angle, idx) => (
                      <button
                        key={angle.id}
                        type="button"
                        onClick={() => setSelectedAngle(idx)}
                        className={`${styles.thumbBtn} ${selectedAngle === idx ? styles.thumbBtnActive : ""}`}
                      >
                        <span style={{ fontSize: "1.2rem" }}>{angle.emoji}</span>
                        <span>{angle.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Specs 4-Box Strip */}
              <div className={styles.quickSpecsStrip}>
                <div className={styles.quickSpecItem}>
                  <div className={styles.quickSpecIcon}><Eye size={18} /></div>
                  <div className={styles.quickSpecContent}>
                    <span className={styles.quickSpecLabel}>Kilometers</span>
                    <span className={styles.quickSpecValue}>{formatKM(car.kmDriven)}</span>
                  </div>
                </div>

                <div className={styles.quickSpecItem}>
                  <div className={styles.quickSpecIcon}><Fuel size={18} /></div>
                  <div className={styles.quickSpecContent}>
                    <span className={styles.quickSpecLabel}>Fuel Type</span>
                    <span className={styles.quickSpecValue}>{car.fuelType}</span>
                  </div>
                </div>

                <div className={styles.quickSpecItem}>
                  <div className={styles.quickSpecIcon}><Settings size={18} /></div>
                  <div className={styles.quickSpecContent}>
                    <span className={styles.quickSpecLabel}>Transmission</span>
                    <span className={styles.quickSpecValue}>{car.transmission}</span>
                  </div>
                </div>

                <div className={styles.quickSpecItem}>
                  <div className={styles.quickSpecIcon}><Users size={18} /></div>
                  <div className={styles.quickSpecContent}>
                    <span className={styles.quickSpecLabel}>Ownership</span>
                    <span className={styles.quickSpecValue}>{car.numOwners} {car.numOwners === 1 ? "Owner" : "Owners"}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Overview Narrative */}
              {car.overview && (
                <div className={styles.sectionCard}>
                  <h2 className={styles.sectionTitle}>
                    <FileText size={18} className={styles.sectionTitleIcon} />
                    Seller Overview
                  </h2>
                  <p className={styles.overviewText}>{car.overview}</p>
                </div>
              )}

              {/* Detailed Specifications Table */}
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>
                  <Settings size={18} className={styles.sectionTitleIcon} />
                  Vehicle Specifications
                </h2>

                <div className={styles.specsGrid}>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>Make & Model</span>
                    <span className={styles.specRowVal}>{car.make} {car.model}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>Variant</span>
                    <span className={styles.specRowVal}>{car.variant}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>Year of Registration</span>
                    <span className={styles.specRowVal}>{car.year}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>RTO Location</span>
                    <span className={styles.specRowVal}>{car.rtoCode} — {car.rtoArea}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>Body Style</span>
                    <span className={styles.specRowVal}>{car.bodyType}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>Exterior Color</span>
                    <span className={styles.specRowVal}>{car.color}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>Engine Displacement</span>
                    <span className={styles.specRowVal}>{car.engineDisplacement || "1497 cc"}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>ARAI Fuel Economy</span>
                    <span className={styles.specRowVal}>{car.mileageARAI || "18.0 kmpl"}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>Seating Capacity</span>
                    <span className={styles.specRowVal}>{car.seatingCapacity || 5} Seater</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>Boot Space</span>
                    <span className={styles.specRowVal}>{car.bootSpace || "430 Litres"}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>Ground Clearance</span>
                    <span className={styles.specRowVal}>{car.groundClearance || "180 mm"}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>Insurance Type</span>
                    <span className={styles.specRowVal}>{car.insuranceType} ({car.insuranceValidity || "Active"})</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>Hypothecation / Loan</span>
                    <span className={styles.specRowVal} style={{ color: "var(--color-accent)" }}>
                      {car.hypothecationStatus || "Cleared (NOC Available)"}
                    </span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specRowLabel}>Listing Date</span>
                    <span className={styles.specRowVal}>{car.createdAt}</span>
                  </div>
                </div>
              </div>

              {/* Key Features & Equipment */}
              {car.features && car.features.length > 0 && (
                <div className={styles.sectionCard}>
                  <h2 className={styles.sectionTitle}>
                    <Sparkles size={18} className={styles.sectionTitleIcon} />
                    Key Features & Equipment
                  </h2>
                  <div className={styles.featuresGrid}>
                    {car.features.map((feature) => (
                      <div key={feature} className={styles.featurePill}>
                        <CheckCircle2 size={16} className={styles.featureCheck} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 150-Point Inspection Report */}
              <div className={styles.inspectionCard}>
                <div className={styles.inspectionHeader}>
                  <div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 800, color: "var(--color-white)", display: "flex", alignItems: "center", gap: 8 }}>
                      <Shield size={20} style={{ color: "var(--color-accent)" }} />
                      WowCars 150-Point Technical Inspection
                    </h2>
                    <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-light-gray)", marginTop: 4 }}>
                      Verified by certified automotive technicians in Bengaluru. No flood or structural accidental damage.
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <svg width="44" height="44" viewBox="0 0 60 60" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="30" cy="30" r="24" stroke="rgba(255,255,255,0.12)" strokeWidth="6" fill="none" />
                      <circle
                        cx="30"
                        cy="30"
                        r="24"
                        stroke="var(--color-trust-green)"
                        strokeWidth="6"
                        strokeDasharray="150.8"
                        strokeDashoffset={150.8 * (1 - ((car.inspectionScore || 9.4) / 10))}
                        strokeLinecap="round"
                        fill="none"
                        style={{ transition: "stroke-dashoffset 0.8s ease" }}
                      />
                    </svg>

                    <div className={styles.scoreBadge}>
                      <Award size={18} />
                      <span>{car.inspectionScore || 9.4} / 10 Score</span>
                    </div>
                  </div>
                </div>

                <div className={styles.inspectionList}>
                  {(car.inspectionHighlights || [
                    "Engine compression and smooth idle tested with zero vibration",
                    "Chassis and structural pillars certified free from accidental impacts",
                    "Electrical wiring, ECU diagnostic scan, and sensors pass 100%",
                    "Brake discs and pads inspected with >75% remaining life",
                    "Valid registration and clean title with RTO verification"
                  ]).map((point) => (
                    <div key={point} className={styles.inspectionItem}>
                      <CheckCircle2 size={18} className={styles.inspectionItemCheck} />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>

                {/* Lead Inspector Endorsement */}
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 14, alignItems: "center", marginTop: 18, padding: 14, background: "rgba(17,17,17,0.75)", borderRadius: 10, border: "1px solid rgba(237,28,36,0.3)" }}>
                  <img src="/images/staff-sell-car.jpg" alt="Lead Inspector Arjun" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(237,28,36,0.35)" }} />
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.875rem" }}>Evaluated by Arjun Sharma</div>
                    <div style={{ color: "#9ca3af", fontSize: "0.75rem" }}>Lead Automotive Inspector · WowCars Bengaluru Hub</div>
                    <div style={{ color: "var(--brand-red, #ED1C24)", fontSize: "0.7rem", fontWeight: 600, marginTop: 2 }}>✓ Certified 140-Point Diagnostic Protocol Passed</div>
                  </div>
                </div>
              </div>

              {/* EV Powertrain & Battery Health (If Electric) */}
              {(car.fuelType === "Electric" || (car as any).batteryChemistry) && (
                <div className={styles.sectionCard} style={{ borderLeft: "4px solid #10B981" }}>
                  <h2 className={styles.sectionTitle}>
                    <Shield size={18} style={{ color: "#10B981" }} className={styles.sectionTitleIcon} />
                    High-Voltage Battery & EV Diagnostics
                  </h2>
                  <div className={styles.specsGrid}>
                    <div className={styles.specRow}>
                      <span className={styles.specRowLabel}>Battery Chemistry</span>
                      <span className={styles.specRowVal}>{(car as any).batteryChemistry || "LFP"}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specRowLabel}>Pack Capacity</span>
                      <span className={styles.specRowVal}>{(car as any).batteryCapacityKwh ? `${(car as any).batteryCapacityKwh} kWh` : "40.5 kWh"}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specRowLabel}>Voltage Architecture</span>
                      <span className={styles.specRowVal}>{(car as any).voltageClass || "HIGH_VOLTAGE_400V"}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specRowLabel}>Charging Port</span>
                      <span className={styles.specRowVal}>{(car as any).chargingConnector || "CCS2 Fast Charge"}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specRowLabel}>State of Health (SoH)</span>
                      <span className={styles.specRowVal} style={{ color: "#34D399", fontWeight: 700 }}>
                        {(car as any).stateOfHealthPercent ? `${(car as any).stateOfHealthPercent}%` : "98.2% Health"}
                      </span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specRowLabel}>Battery Warranty</span>
                      <span className={styles.specRowVal}>{(car as any).batteryWarrantyExpiry || "Active Manufacturer Warranty"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive EMI Calculator for this specific car */}
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>
                  <Info size={18} className={styles.sectionTitleIcon} />
                  Calculate EMI for this {car.model}
                </h2>
                <EmiCalculator carPrice={car.priceINR} />
              </div>
            </div>

            {/* Right Column: Sticky Action Card & Seller Box */}
            <aside className={styles.stickyCard}>
              <div className={styles.priceBlock}>
                <div className={styles.priceLabel}>Price in Bengaluru</div>
                <div className={styles.priceAmount}>
                  <span className={styles.rupeeSym}>₹</span>
                  <span className={styles.lakhsVal}>{formatLakhs(car.priceINR)}</span>
                  <span className={styles.lakhsWord}>Lakhs</span>
                </div>
                <div className={styles.emiHint}>
                  <span>Est. EMI:</span>
                  <span className={styles.emiHighlight}>₹{estimatedEmi.toLocaleString("en-IN")}/mo</span>
                  <span>(60 mos @ 9.5%)</span>
                </div>
              </div>

              {/* Seller Information */}
              <div className={styles.sellerBox}>
                <div className={styles.sellerBoxHeader}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", fontWeight: 800 }}>
                    {car.sellerType === "Verified Dealer" ? "🏢" : "👤"}
                  </div>
                  <div>
                    <div className={styles.sellerName}>
                      {car.dealerName || "Direct Individual Seller"}
                    </div>
                    <div className={styles.sellerMeta}>
                      {car.sellerType === "Verified Dealer" ? "WowCars Verified Dealer" : "Private Car Owner"} · {car.locality}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-slate)", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <CheckCircle2 size={12} style={{ color: "var(--color-accent)" }} />
                  <span>Responds typically within 15 minutes on WhatsApp</span>
                </div>
              </div>

              {/* Managed Marketplace Safe Buyer Action CTAs */}
              <div className={styles.ctaGroup}>
                <button
                  type="button"
                  onClick={() => {
                    setContactMode("TEST_DRIVE");
                    setIsSubmitted(false);
                    setIsModalOpen(true);
                  }}
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Calendar size={18} />
                  Request a Test Drive
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setContactMode("ENQUIRY");
                    setIsSubmitted(false);
                    setIsModalOpen(true);
                  }}
                  className="btn btn-secondary btn-lg"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <MessageCircle size={18} />
                  Enquire About This Car
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setContactMode("CALLBACK");
                    setIsSubmitted(false);
                    setIsModalOpen(true);
                  }}
                  className="btn btn-ghost"
                  style={{ width: "100%", justifyContent: "center", border: "1px solid rgba(255, 255, 255, 0.12)" }}
                >
                  <Phone size={15} />
                  Request a Callback
                </button>

                <a
                  href={waEnquiryLink}
                  onClick={logWhatsAppClick}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp"
                  style={{ width: "100%", justifyContent: "center", fontSize: "var(--font-size-xs)" }}
                >
                  <MessageCircle size={15} />
                  Chat with WowCars Concierge
                </a>

                <button
                  type="button"
                  onClick={handleShare}
                  className="btn btn-ghost"
                  style={{ width: "100%", justifyContent: "center", gap: 6, fontSize: "var(--font-size-xs)" }}
                >
                  <Share2 size={14} />
                  {isCopied ? "Link Copied to Clipboard!" : "Share Vehicle Details"}
                </button>
              </div>

              {/* Trust Safeguard */}
              <div className={styles.guaranteeNote}>
                <Shield size={13} style={{ color: "var(--color-accent)" }} />
                <span>Zero Buyer Commission · Transparent Pricing</span>
              </div>
            </aside>
          </div>

          {/* Similar / Related Cars Recommendation Section */}
          {relatedCars && relatedCars.length > 0 && (
            <section className={styles.relatedSection}>
              <h2 className={styles.relatedTitle}>Similar Verified Cars in Bengaluru</h2>
              <div className={styles.relatedGrid}>
                {relatedCars.map((relatedCar) => (
                  <CarCard key={relatedCar.id} car={relatedCar} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Managed Marketplace Ingestion Modal */}
      {isModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setIsModalOpen(false)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            {!isSubmitted ? (
              <>
                <h3 className={styles.modalTitle}>
                  {contactMode === "TEST_DRIVE"
                    ? "Request a Test Drive"
                    : contactMode === "CALLBACK"
                    ? "Request a Callback"
                    : "Enquire About This Car"}
                </h3>
                <p className={styles.modalSubtitle}>
                  For {car.year} {car.make} {car.model} ({car.listingCode}) in {car.locality}
                </p>

                <form onSubmit={handleTestDriveSubmit}>
                  {/* Honeypot field for bot suppression */}
                  <input
                    type="text"
                    name="website_url"
                    value={testDriveData.honeypot}
                    onChange={(e) => setTestDriveData({ ...testDriveData, honeypot: e.target.value })}
                    style={{ display: "none" }}
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={testDriveData.name}
                      onChange={(e) => setTestDriveData({ ...testDriveData, name: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>WhatsApp / Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      placeholder="10-digit mobile number"
                      value={testDriveData.phone}
                      onChange={(e) => setTestDriveData({ ...testDriveData, phone: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>

                  {contactMode === "TEST_DRIVE" && (
                    <>
                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Preferred Date</label>
                        <input
                          type="date"
                          value={testDriveData.date}
                          onChange={(e) => setTestDriveData({ ...testDriveData, date: e.target.value })}
                          className={styles.formInput}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Preferred Time Slot</label>
                        <select
                          value={testDriveData.timeSlot}
                          onChange={(e) => setTestDriveData({ ...testDriveData, timeSlot: e.target.value })}
                          className={styles.formInput}
                        >
                          <option>Morning (10:00 AM - 1:00 PM)</option>
                          <option>Afternoon (1:00 PM - 4:00 PM)</option>
                          <option>Evening (4:00 PM - 7:00 PM)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {contactMode === "CALLBACK" && (
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Best Time for Callback</label>
                      <select
                        value={testDriveData.timeSlot}
                        onChange={(e) => setTestDriveData({ ...testDriveData, timeSlot: e.target.value })}
                        className={styles.formInput}
                      >
                        <option>Immediate / Within 15 minutes</option>
                        <option>Morning (10:00 AM - 1:00 PM)</option>
                        <option>Afternoon (1:00 PM - 4:00 PM)</option>
                        <option>Evening (4:00 PM - 7:00 PM)</option>
                      </select>
                    </div>
                  )}

                  {contactMode === "ENQUIRY" && (
                    <>
                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Email Address (Optional)</label>
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={testDriveData.email}
                          onChange={(e) => setTestDriveData({ ...testDriveData, email: e.target.value })}
                          className={styles.formInput}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Your Message / Question</label>
                        <textarea
                          rows={3}
                          placeholder="Ask about service history, price negotiation, or warranty details..."
                          value={testDriveData.message}
                          onChange={(e) => setTestDriveData({ ...testDriveData, message: e.target.value })}
                          className={styles.formInput}
                        />
                      </div>
                    </>
                  )}

                  {submitError && (
                    <div style={{ padding: "8px 12px", background: "rgba(229, 9, 20, 0.15)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", color: "#ff8b8b", fontSize: "13px", marginBottom: "var(--space-3)" }}>
                      ⚠️ {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={isSubmitting}
                    style={{ width: "100%", marginTop: "var(--space-2)" }}
                  >
                    {isSubmitting
                      ? "Submitting to WowCars CRM..."
                      : contactMode === "TEST_DRIVE"
                      ? "Confirm Test Drive Request"
                      : contactMode === "CALLBACK"
                      ? "Request Callback"
                      : "Submit Enquiry"}
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "var(--space-4) 0" }}>
                <div style={{ fontSize: "3rem", marginBottom: "var(--space-2)" }}>🎉</div>
                <h3 className={styles.modalTitle}>Enquiry Logged in WowCars CRM</h3>
                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "8px",
                    color: "#34d399",
                    fontWeight: 700,
                    fontSize: "14px",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  Official Reference: {submittedEnquiryCode}
                </div>
                <p style={{ color: "var(--color-light-gray)", fontSize: "var(--font-size-sm)", margin: "var(--space-2) 0 var(--space-6)" }}>
                  Thank you, <strong>{testDriveData.name}</strong>! Your inquiry for <strong>{car.year} {car.make} {car.model}</strong> ({car.listingCode}) has been received by the WowCars relationship team. A qualified advisor will contact you at +91 {testDriveData.phone} to assist with vehicle inspection, availability, and scheduling.
                </p>
                <a
                  href={waEnquiryLink}
                  onClick={logWhatsAppClick}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <MessageCircle size={16} />
                  Connect with WowCars Concierge
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Experience & Concierge CTA */}
      <CTASection
        badge="BENGALURU SHOWROOM & WORKSHOP"
        title={`Interested in this ${car.year} ${car.make} ${car.model}?`}
        subtitle="Book an in-person test drive at our Koramangala or Yelahanka Hubs. 140-point inspection documentation provided upfront."
        primaryActionLabel="Request Free Callback"
        onPrimaryClick={() => {
          setContactMode("CALLBACK");
          setIsModalOpen(true);
        }}
        imageSrc="/images/staff-used-cars.jpg"
        imageAlt={`WowCars specialist with ${car.make} ${car.model}`}
      />

      <LiveActivityTicker />
      <Footer />
    </>
  );
}
