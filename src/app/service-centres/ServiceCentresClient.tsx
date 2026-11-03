"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Wrench,
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  Shield,
  Star,
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Car,
  Bike,
  Sparkles,
  ExternalLink,
  X,
  AlertCircle,
  Zap,
} from "lucide-react";
import PageHero from "@/components/common/PageHero";
import TrustIndicators from "@/components/common/TrustIndicators";
import CTASection from "@/components/common/CTASection";
import StaffBrandingImage from "@/components/common/StaffBrandingImage";
import styles from "./ServiceCentres.module.css";

interface OutletData {
  id: string;
  code: string;
  name: string;
  type: string;
  badge: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  landmark: string;
  phone: string;
  phoneRaw: string;
  whatsapp: string;
  email: string;
  managerName: string;
  managerTitle: string;
  operatingHours: string;
  image: string;
  googleMapsUrl: string;
  totalBays: number;
  carBays: number;
  bikeBays: number;
  rating: number;
  reviewsCount: number;
  pickupDropAvailable: boolean;
  facilities: string[];
}

interface ServiceData {
  code: string;
  name: string;
  category: string;
  vehicleType: "CAR" | "TWO_WHEELER";
  labourChargeINR: number;
  standardLabourHours: number;
  popular: boolean;
  description: string;
  included: string[];
}

interface UpcomingHub {
  name: string;
  location: string;
  city: string;
  category: string;
  timeline: string;
  coverage: string;
}

interface Guarantee {
  title: string;
  desc: string;
}

interface Props {
  initialOutlets: OutletData[];
  initialUpcoming: UpcomingHub[];
  initialServices: ServiceData[];
  initialGuarantees: Guarantee[];
}

export default function ServiceCentresClient({
  initialOutlets,
  initialUpcoming,
  initialServices,
  initialGuarantees,
}: Props) {
  const [activeTab, setActiveTab] = useState<"ALL" | "BLR" | "MYS" | "UPCOMING">("ALL");
  const [vehicleTab, setVehicleTab] = useState<"CAR" | "TWO_WHEELER">("CAR");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Booking Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOutletId, setSelectedOutletId] = useState("outlet-blr-01");
  const [selectedServiceCode, setSelectedServiceCode] = useState("PMS-CAR-BASIC");
  const [bookingVehicleType, setBookingVehicleType] = useState<"CAR" | "TWO_WHEELER">("CAR");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleRegNo, setVehicleRegNo] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredSlot, setPreferredSlot] = useState("Morning (09:00 AM – 12:00 PM)");
  const [pickupRequired, setPickupRequired] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<null | {
    bookingId: string;
    workshopName: string;
    whatsappUrl: string;
    message: string;
  }>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const openBookingFor = (outletId?: string, serviceCode?: string, vType?: "CAR" | "TWO_WHEELER") => {
    if (outletId) setSelectedOutletId(outletId);
    if (serviceCode) {
      setSelectedServiceCode(serviceCode);
      const svc = initialServices.find((s) => s.code === serviceCode);
      if (svc) setBookingVehicleType(svc.vehicleType);
    } else if (vType) {
      setBookingVehicleType(vType);
      const firstSvc = initialServices.find((s) => s.vehicleType === vType);
      if (firstSvc) setSelectedServiceCode(firstSvc.code);
    }
    setSubmitSuccess(null);
    setErrorMessage("");
    setModalOpen(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const chosenService = initialServices.find((s) => s.code === selectedServiceCode);

    try {
      const res = await fetch("/api/service-centres/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          outletId: selectedOutletId,
          vehicleType: bookingVehicleType,
          vehicleMake,
          vehicleModel,
          vehicleRegNo,
          serviceCode: selectedServiceCode,
          serviceName: chosenService?.name || selectedServiceCode,
          preferredDate,
          preferredTimeSlot: preferredSlot,
          pickupRequired,
          pickupAddress,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit booking request.");
      }

      setSubmitSuccess({
        bookingId: data.bookingId,
        workshopName: data.workshopName,
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

  const filteredOutlets = initialOutlets.filter((outlet) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "BLR") return outlet.city.toLowerCase().includes("bengaluru");
    if (activeTab === "MYS") return outlet.city.toLowerCase().includes("mysuru");
    return false;
  });

  const filteredServices = initialServices.filter((s) => s.vehicleType === vehicleTab);

  const faqs = [
    {
      q: "How do I schedule a service appointment at a WowCars Service Centre?",
      a: "You can book directly using the online form on this page, or click 'Chat on WhatsApp' to connect instantly with the workshop manager at Koramangala (+91 98801 23456) or Mysuru (+91 98450 87654). We will confirm your dedicated lift/bay slot in minutes.",
    },
    {
      q: "Is doorstep vehicle pickup and drop available?",
      a: "Yes! We provide doorstep vehicle pickup and drop across Bengaluru (within 15 km of our Koramangala Hub) and throughout Mysuru city limits. Our verified drivers inspect and photograph the vehicle prior to dispatch.",
    },
    {
      q: "Are the spare parts used 100% genuine?",
      a: "Absolutely. All lubricants, filters, brake pads, batteries, tyres, and suspension parts are sourced directly from verified manufacturers (Bosch, Brembo, Castrol, Motul, CEAT, Exide). We provide an itemized GST bill and return all old replaced parts in a sealed transparent bag.",
    },
    {
      q: "Can I buy spare parts over the counter without garage labour?",
      a: "Yes. Both our Koramangala Flagship Hub and Mysuru Express Garage feature Over-The-Counter (OTC) parts sales desks for retail customers, DIY enthusiasts, and local mechanics.",
    },
    {
      q: "Will servicing at WowCars void my car's manufacturer warranty?",
      a: "No. Routine periodic maintenance, fluid flushes, brake jobs, and tyre/battery replacements performed to OEM specifications with approved lubricants do not void manufacturer warranties under standard fair trade practices in India.",
    },
    {
      q: "What payment methods are accepted at the workshops?",
      a: "We accept UPI (GPay, PhonePe, Paytm), Credit & Debit Cards (Visa, MasterCard, RuPay), Net Banking, and Cash.",
    },
  ];

  return (
    <div className={styles.page}>
      {/* ========== HERO SECTION WITH ARJUN SPECIALIST GARAGE IMAGE ========== */}
      <PageHero
        badge="FLAGSHIP BENGALURU WORKSHOP · 100% GENUINE OEM SPARES"
        title={
          <>
            Precision Automotive Garages & <span>Service Centres</span>
          </>
        }
        subtitle="Factory-grade multi-brand car and two-wheeler servicing across Karnataka. 100% genuine spares, fixed itemized labour charges, certified master technicians, and digital job tracking."
        stats={[
          { label: "Workshop Rating", value: "4.9 / 5.0" },
          { label: "Spares Genuine", value: "100% OEM/OES" },
          { label: "Labour Transparency", value: "₹0 Hidden" },
          { label: "Workmanship", value: "6 Months" },
        ]}
        imageSrc="/images/staff-service-garage.jpg"
        imageAlt="WowCars specialist Arjun inspecting vehicle on hydraulic lift with technician"
        staffName="Arjun Sharma"
        staffRole="Workshop Service Lead"
        staffBadge="Master Diagnostic Specialist"
        primaryAction={{
          label: "Book Workshop Appointment",
          onClick: () => openBookingFor(),
        }}
        secondaryAction={{
          label: "Browse Spare Parts",
          href: "/spare-parts",
        }}
      />

      {/* Trust Guarantee Strip */}
      <TrustIndicators />

      <div className="container">
        {/* ========== WORKSHOPS DIRECTORY SECTION ========== */}
        <section id="workshops" className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>State-of-the-Art Facilities</span>
          <h2 className={styles.sectionTitle}>Our Workshop & Garage Network</h2>
          <p className={styles.sectionSubtitle}>
            Equipped with heavy hydraulic lifts, 3D laser alignment, OBD-II ECM scanners, and dedicated customer lounges.
          </p>
        </section>

        {/* Filter Tabs */}
        <div className={styles.filterTabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "ALL" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("ALL")}
          >
            All Active Workshops ({initialOutlets.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "BLR" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("BLR")}
          >
            Bengaluru Hub (Koramangala)
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "MYS" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("MYS")}
          >
            Mysuru Express (Hebbal)
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "UPCOMING" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("UPCOMING")}
          >
            Upcoming Hubs ({initialUpcoming.length})
          </button>
        </div>

        {/* Active Outlets Grid */}
        {activeTab !== "UPCOMING" && (
          <div className={styles.outletsGrid}>
            {filteredOutlets.map((outlet) => (
              <div key={outlet.id} className={styles.outletCard}>
                <div className={styles.outletImageWrap}>
                  <Image
                    src={outlet.image}
                    alt={outlet.name}
                    fill
                    className={outlet.image ? styles.outletImage : ""}
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className={styles.outletStatusOverlay}>
                    <span className={`${styles.statusPill} ${styles.statusOpen}`}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
                      Open Today
                    </span>
                    <span className={`${styles.statusPill} ${styles.typeBadge}`}>
                      {outlet.badge}
                    </span>
                  </div>
                  <div className={styles.ratingPill}>
                    <Star size={14} fill="#fbbf24" color="#fbbf24" />
                    <span>{outlet.rating}</span>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>
                      ({outlet.reviewsCount})
                    </span>
                  </div>
                </div>

                <div className={styles.outletBody}>
                  <h3 className={styles.outletTitle}>{outlet.name}</h3>
                  <div className={styles.outletAddress}>
                    <MapPin size={16} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
                    <span>
                      {outlet.address}, {outlet.city} - {outlet.pinCode}
                      <br />
                      <strong style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.82rem" }}>
                        Landmark:
                      </strong>{" "}
                      {outlet.landmark}
                    </span>
                  </div>

                  <div className={styles.outletMeta}>
                    <div className={styles.metaItem}>
                      <Clock size={15} />
                      <span>{outlet.operatingHours}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <Wrench size={15} />
                      <span>{outlet.carBays} Car Bays + {outlet.bikeBays} Bike Bays</span>
                    </div>
                  </div>

                  <div className={styles.facilitiesTitle}>Workshop Capabilities & Amenities</div>
                  <ul className={styles.facilitiesList}>
                    {outlet.facilities.map((fac, idx) => (
                      <li key={idx} className={styles.facilityItem}>
                        <CheckCircle2 size={14} />
                        <span>{fac}</span>
                      </li>
                    ))}
                  </ul>

                  <div className={styles.outletCardActions}>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.btnPrimary} ${styles.outletCardActionsFull}`}
                      onClick={() => openBookingFor(outlet.id)}
                    >
                      <Calendar size={15} /> Book Appointment at this Hub
                    </button>

                    <a
                      href={`tel:${outlet.phoneRaw}`}
                      className={`${styles.actionBtn} ${styles.btnSecondary}`}
                    >
                      <Phone size={14} /> Call Workshop
                    </a>

                    <a
                      href={`https://wa.me/${outlet.whatsapp}?text=${encodeURIComponent(
                        `Hi ${outlet.name}! I would like to enquire about workshop service for my vehicle.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.actionBtn} ${styles.btnWhatsApp}`}
                    >
                      <MessageCircle size={14} /> WhatsApp Us
                    </a>

                    <a
                      href={outlet.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.actionBtn} ${styles.btnSecondary} ${styles.outletCardActionsFull}`}
                    >
                      <ExternalLink size={14} /> Open in Google Maps
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Hubs Display */}
        {(activeTab === "ALL" || activeTab === "UPCOMING") && (
          <>
            <div className={styles.sectionHeader} style={{ marginTop: "2rem" }}>
              <span className={styles.sectionBadge}>PAN-Karnataka Expansion</span>
              <h3 className={styles.sectionTitle}>Upcoming Service Hubs & Garages</h3>
              <p className={styles.sectionSubtitle}>
                Bringing transparent, factory-grade service closer to your neighbourhood across Karnataka.
              </p>
            </div>

            <div className={styles.upcomingGrid}>
              {initialUpcoming.map((hub, idx) => (
                <div key={idx} className={styles.upcomingCard}>
                  <span className={styles.upcomingBadge}>{hub.timeline}</span>
                  <h4 className={styles.upcomingTitle}>{hub.name}</h4>
                  <div className={styles.upcomingLocation}>
                    <MapPin size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                    {hub.location}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#e5e7eb", marginBottom: "0.5rem" }}>
                    {hub.category}
                  </div>
                  <div className={styles.upcomingCoverage}>
                    <strong>Coverage:</strong> {hub.coverage}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Franchise Partnership Banner */}
        <div className={styles.franchiseBanner}>
          <div className={styles.franchiseText}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f87171", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.35rem" }}>
              <Sparkles size={16} /> FRANCHISE OPPORTUNITY
            </div>
            <h3 className={styles.franchiseTitle}>
              Launch a WowCars Express Garage in Your City
            </h3>
            <p className={styles.franchiseSubtitle}>
              Lean pilot investment assumption (₹5–10 Lakh). Start with a combined garage & genuine spare parts store.
              Benefit from centralized procurement, multi-brand OEM distributor access, and digital booking leads.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/franchise" className="btn btn-primary btn-lg">
              Explore Franchise & Partner Blueprint
            </Link>
            <a
              href="https://wa.me/919019088160?text=Hi%20WowCars!%20I%20am%20interested%20in%20launching%20a%20WowCars%20Franchise%20Garage%20and%20Parts%20Store."
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-lg"
            >
              <MessageCircle size={18} /> WhatsApp Details
            </a>
          </div>
        </div>

        {/* ========== SERVICES & LABOUR RATE CARD ========== */}
        <section className={styles.servicesWrap} id="services-menu">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Transparent Pricing</span>
            <h2 className={styles.sectionTitle}>Multi-Brand Service Menu & Labour Rate Card</h2>
            <p className={styles.sectionSubtitle}>
              Zero hidden charges. Factory-trained mechanics, standardized torque procedures, and digital checklist reports.
            </p>
          </div>

          <div className={styles.servicesFilter}>
            <button
              type="button"
              className={`${styles.typeFilterBtn} ${vehicleTab === "CAR" ? styles.typeFilterBtnActive : ""}`}
              onClick={() => setVehicleTab("CAR")}
            >
              <Car size={18} /> Cars (Hatchback / Sedan / SUV)
            </button>
            <button
              type="button"
              className={`${styles.typeFilterBtn} ${vehicleTab === "TWO_WHEELER" ? styles.typeFilterBtnActive : ""}`}
              onClick={() => setVehicleTab("TWO_WHEELER")}
            >
              <Bike size={18} /> Two-Wheelers (Motorcycles & Scooters)
            </button>
          </div>

          <div className={styles.servicesGrid}>
            {filteredServices.map((svc) => (
              <div key={svc.code} className={styles.serviceCard}>
                {svc.popular && <span className={styles.popularBadge}>Most Popular</span>}
                <h3 className={styles.serviceName}>{svc.name}</h3>
                <div className={styles.servicePriceRow}>
                  <span className={styles.servicePrice}>₹{svc.labourChargeINR.toLocaleString("en-IN")}</span>
                  <span className={styles.servicePriceNote}>
                    Fixed Labour Charge • {svc.standardLabourHours} hrs
                  </span>
                </div>
                <p className={styles.serviceDesc}>{svc.description}</p>

                <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem" }}>
                  Key Service Inclusions:
                </div>
                <ul className={styles.serviceInclusions}>
                  {svc.included.map((inc, i) => (
                    <li key={i} className={styles.inclusionItem}>
                      <CheckCircle2 size={13} />
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.btnPrimary}`}
                  style={{ marginTop: "auto" }}
                  onClick={() => openBookingFor(undefined, svc.code)}
                >
                  <Calendar size={14} /> Book This Service
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ========== EV & TYRES/BATTERIES SPECIALIZED BAYS ========== */}
        <section style={{ margin: "48px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            {/* EV Specialization Card */}
            <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, #202020 100%)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative", aspectRatio: "16/9" }}>
                <img src="/images/staff-ev-specialist.jpg" alt="EV diagnostics with Arjun" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(16,185,129,0.9)", color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700 }}>
                  IEC 60900 EV CERTIFIED
                </div>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                <h3 style={{ color: "#fff", fontSize: "1.2rem", fontWeight: 700 }}>Electric Vehicle High-Voltage Hub</h3>
                <p style={{ color: "#9ca3af", fontSize: "0.85rem", lineHeight: 1.5 }}>
                  State of Health (SoH) diagnostics, 400V traction battery cell balancing, CCS2 high-speed charge testing, and thermal loop servicing by certified EV specialists.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  <span style={{ background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 4, color: "#d1d5db", fontSize: "0.75rem" }}>Tata Nexon / Tiago EV</span>
                  <span style={{ background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 4, color: "#d1d5db", fontSize: "0.75rem" }}>MG ZS EV</span>
                  <span style={{ background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 4, color: "#d1d5db", fontSize: "0.75rem" }}>Ather & Ola 2W</span>
                </div>
                <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: "auto" }} onClick={() => openBookingFor()}>
                  Book EV Diagnostic Check
                </button>
              </div>
            </div>

            {/* Tyres & Battery Bay */}
            <div style={{ background: "linear-gradient(135deg, rgba(237,28,36,0.08) 0%, #202020 100%)", border: "1px solid rgba(237,28,36,0.3)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative", aspectRatio: "16/9" }}>
                <img src="/images/staff-tyres-batteries.jpg" alt="Tyres and battery test with Arjun" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(237,28,36,0.9)", color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700 }}>
                  EXIDE · AMARON · MICHELIN
                </div>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                <h3 style={{ color: "#fff", fontSize: "1.2rem", fontWeight: 700 }}>Precision Tyres & Battery Testing Bay</h3>
                <p style={{ color: "#9ca3af", fontSize: "0.85rem", lineHeight: 1.5 }}>
                  Free computerized battery load test, 3D laser wheel alignment, dynamic wheel balancing, and instant replacement with manufacturer warranty certificates.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  <span style={{ background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 4, color: "#d1d5db", fontSize: "0.75rem" }}>Amaron & Exide Warranties</span>
                  <span style={{ background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 4, color: "#d1d5db", fontSize: "0.75rem" }}>Bridgestone, Michelin, MRF</span>
                </div>
                <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: "auto" }} onClick={() => openBookingFor()}>
                  Book Battery / Tyre Service
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========== GUARANTEES & TRUST PILLARS ========== */}
        <section className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Our Uncompromising Standards</span>
          <h2 className={styles.sectionTitle}>The WowCars Workshop Guarantee</h2>
          <p className={styles.sectionSubtitle}>
            We built WowCars Service Centres to eliminate the dishonest practices plaguing the unorganized garage sector.
          </p>
        </section>

        <div className={styles.guaranteesGrid}>
          {initialGuarantees.map((g, idx) => (
            <div key={idx} className={styles.guaranteeCard}>
              <div className={styles.guaranteeIcon}>
                <Shield size={22} />
              </div>
              <h3 className={styles.guaranteeTitle}>{g.title}</h3>
              <p className={styles.guaranteeDesc}>{g.desc}</p>
            </div>
          ))}
        </div>

        {/* ========== FAQS SECTION ========== */}
        <section className={styles.faqSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>Frequently Asked Questions</span>
            <h2 className={styles.sectionTitle}>Service Centre FAQs</h2>
          </div>

          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {isOpen && <div className={styles.faqAnswer}>{faq.a}</div>}
              </div>
            );
          })}
        </section>
      </div>

      {/* Workshop Booking & WhatsApp Concierge CTA */}
      <CTASection
        badge="BENGALURU FLAGSHIP WORKSHOP"
        title="Schedule Your Car or Bike Service Today"
        subtitle="Complimentary doorstep pickup within 15 km of Koramangala Hub. Fixed labour pricing, 100% genuine spares, and live WhatsApp progress updates."
        primaryActionLabel="Book Appointment"
        onPrimaryClick={() => openBookingFor()}
        imageSrc="/images/staff-vehicle-delivery.jpg"
        imageAlt="WowCars specialist handing over a serviced car"
      />

      {/* ========== BOOKING MODAL ========== */}
      {modalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setModalOpen(false)}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {!submitSuccess ? (
              <form onSubmit={handleBookingSubmit}>
                <h3 className={styles.modalTitle}>Book Workshop Appointment</h3>
                <p className={styles.modalSubtitle}>
                  Choose your workshop, service and time slot. Our service advisor will call you to confirm bay availability.
                </p>

                {errorMessage && (
                  <div
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      background: "rgba(220,38,38,0.15)",
                      border: "1px solid #dc2626",
                      color: "#fca5a5",
                      fontSize: "0.85rem",
                      marginBottom: "1rem",
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
                  {/* Workshop Selection */}
                  <div className={styles.formGroupFull}>
                    <label className={styles.formLabel}>Select Workshop Location *</label>
                    <select
                      className={styles.formSelect}
                      value={selectedOutletId}
                      onChange={(e) => setSelectedOutletId(e.target.value)}
                      required
                    >
                      {initialOutlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vehicle Type */}
                  <div>
                    <label className={styles.formLabel}>Vehicle Category *</label>
                    <select
                      className={styles.formSelect}
                      value={bookingVehicleType}
                      onChange={(e) => {
                        const val = e.target.value as "CAR" | "TWO_WHEELER";
                        setBookingVehicleType(val);
                        const match = initialServices.find((s) => s.vehicleType === val);
                        if (match) setSelectedServiceCode(match.code);
                      }}
                    >
                      <option value="CAR">Car (Hatchback / Sedan / SUV)</option>
                      <option value="TWO_WHEELER">Two-Wheeler (Bike / Scooter)</option>
                    </select>
                  </div>

                  {/* Service Code */}
                  <div>
                    <label className={styles.formLabel}>Service Required *</label>
                    <select
                      className={styles.formSelect}
                      value={selectedServiceCode}
                      onChange={(e) => setSelectedServiceCode(e.target.value)}
                    >
                      {initialServices
                        .filter((s) => s.vehicleType === bookingVehicleType)
                        .map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name} (₹{s.labourChargeINR})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className={styles.formLabel}>Your Full Name *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Ramesh Kumar"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Customer Phone */}
                  <div>
                    <label className={styles.formLabel}>Mobile Number *</label>
                    <input
                      type="tel"
                      className={styles.formInput}
                      placeholder="10-digit mobile number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                    />
                  </div>

                  {/* Vehicle Make */}
                  <div>
                    <label className={styles.formLabel}>Vehicle Make / Brand</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Maruti Suzuki, Hyundai, Honda"
                      value={vehicleMake}
                      onChange={(e) => setVehicleMake(e.target.value)}
                    />
                  </div>

                  {/* Vehicle Model */}
                  <div>
                    <label className={styles.formLabel}>Model & Year</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Swift 2021, Creta 2022"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                    />
                  </div>

                  {/* Vehicle Registration Number */}
                  <div>
                    <label className={styles.formLabel}>Registration Number (Optional)</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. KA-01-MJ-5050"
                      value={vehicleRegNo}
                      onChange={(e) => setVehicleRegNo(e.target.value.toUpperCase())}
                    />
                  </div>

                  {/* Preferred Date */}
                  <div>
                    <label className={styles.formLabel}>Preferred Service Date</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                    />
                  </div>

                  {/* Preferred Time Slot */}
                  <div className={styles.formGroupFull}>
                    <label className={styles.formLabel}>Preferred Time Slot</label>
                    <select
                      className={styles.formSelect}
                      value={preferredSlot}
                      onChange={(e) => setPreferredSlot(e.target.value)}
                    >
                      <option value="Morning (08:30 AM – 11:30 AM)">Morning (08:30 AM – 11:30 AM)</option>
                      <option value="Afternoon (12:00 PM – 03:00 PM)">Afternoon (12:00 PM – 03:00 PM)</option>
                      <option value="Evening (03:30 PM – 06:30 PM)">Evening (03:30 PM – 06:30 PM)</option>
                    </select>
                  </div>

                  {/* Doorstep Pickup Checkbox */}
                  <div className={styles.formGroupFull}>
                    <label className={styles.checkboxWrap}>
                      <input
                        type="checkbox"
                        checked={pickupRequired}
                        onChange={(e) => setPickupRequired(e.target.checked)}
                      />
                      <span>Request complimentary Doorstep Vehicle Pickup & Drop</span>
                    </label>
                  </div>

                  {pickupRequired && (
                    <div className={styles.formGroupFull}>
                      <label className={styles.formLabel}>Pickup Address & Landmark *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="Complete address for doorstep driver pickup"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        required={pickupRequired}
                      />
                    </div>
                  )}

                  {/* Special Notes */}
                  <div className={styles.formGroupFull}>
                    <label className={styles.formLabel}>Symptoms or Specific Issues</label>
                    <textarea
                      rows={2}
                      className={styles.formTextarea}
                      placeholder="e.g. AC cooling low, squeaking noise while braking, general service"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Booking Bay..." : "Confirm Appointment"}
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.successBox}>
                <div className={styles.successIcon}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 className={styles.modalTitle}>Appointment Request Confirmed!</h3>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
                  {submitSuccess.message}
                </p>

                <div className={styles.bookingRefBadge}>
                  Booking Ref: {submitSuccess.bookingId}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                  <a
                    href={submitSuccess.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp btn-full"
                  >
                    <MessageCircle size={18} /> Confirm Instantly on WhatsApp
                  </a>

                  <button
                    type="button"
                    className="btn btn-secondary btn-full"
                    onClick={() => setModalOpen(false)}
                  >
                    Close Window
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
