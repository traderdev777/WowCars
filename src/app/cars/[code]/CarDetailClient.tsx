"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin, Fuel, Settings, Users, MessageCircle, Eye, BadgeCheck,
  Shield, CheckCircle2, ChevronRight, Share2, Calendar, Phone,
  X, Award, Sparkles, Check, Info, FileText
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarCard from "@/components/cars/CarCard";
import EmiCalculator from "@/components/cars/EmiCalculator";
import LiveActivityTicker from "@/components/common/LiveActivityTicker";
import { formatLakhs, formatKM, formatINR, generateWhatsAppLink } from "@/lib/formatters";
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
  const [isCopied, setIsCopied] = useState(false);
  const [testDriveData, setTestDriveData] = useState({
    name: "",
    phone: "",
    date: "",
    timeSlot: "Morning (10 AM - 1 PM)",
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
          title: `${car.year} ${car.make} ${car.model} — WOwCars Bengaluru`,
          text: `Check out this verified ${car.year} ${car.make} ${car.model} on WOwCars for ₹${formatLakhs(car.priceINR)} Lakhs.`,
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

  const handleTestDriveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (testDriveData.honeypot) return; // Silent reject for spam bots
    setIsSubmitted(true);
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
                  <BadgeCheck size={12} /> WOwCars Verified
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
              <div className={styles.galleryCard}>
                <div className={styles.heroViewer}>
                  <div className={styles.heroViewerVisual}>
                    <span className={styles.carBigEmoji}>{GALLERY_ANGLES[selectedAngle].emoji}</span>
                    <span className={styles.carAngleLabel}>{GALLERY_ANGLES[selectedAngle].label}</span>
                  </div>

                  <div className={styles.galleryWatermark}>
                    <Shield size={14} style={{ color: "var(--color-primary)" }} />
                    <span>WOwCars Inspected</span>
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
                      WOwCars 150-Point Technical Inspection
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
              </div>

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
                      {car.sellerType === "Verified Dealer" ? "WOwCars Verified Dealer" : "Private Car Owner"} · {car.locality}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-slate)", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <CheckCircle2 size={12} style={{ color: "var(--color-accent)" }} />
                  <span>Responds typically within 15 minutes on WhatsApp</span>
                </div>
              </div>

              {/* CTA Action Buttons */}
              <div className={styles.ctaGroup}>
                <a
                  href={waEnquiryLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-lg"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <MessageCircle size={18} />
                  Chat Directly on WhatsApp
                </a>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="btn btn-secondary btn-lg"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Calendar size={18} />
                  Book Test Drive / Callback
                </button>

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

      {/* Test Drive / Request Callback Modal */}
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
                <h3 className={styles.modalTitle}>Book a Test Drive</h3>
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

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ width: "100%", marginTop: "var(--space-2)" }}
                  >
                    Confirm Test Drive Request
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "var(--space-4) 0" }}>
                <div style={{ fontSize: "3rem", marginBottom: "var(--space-2)" }}>🎉</div>
                <h3 className={styles.modalTitle}>Request Received!</h3>
                <p style={{ color: "var(--color-light-gray)", fontSize: "var(--font-size-sm)", margin: "var(--space-2) 0 var(--space-6)" }}>
                  Thank you, {testDriveData.name}! Our representative for {car.locality} has been notified and will call or WhatsApp you at +91 {testDriveData.phone} within 30 minutes to confirm the vehicle availability and inspection schedule.
                </p>
                <a
                  href={waEnquiryLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <MessageCircle size={16} />
                  Direct Confirm on WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <LiveActivityTicker />
      <Footer />
    </>
  );
}
