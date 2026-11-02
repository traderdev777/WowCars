"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MessageCircle, Phone, CalendarCheck, HandCoins, Heart, Share2, ChevronLeft, ChevronRight,
  CheckCircle2, AlertTriangle, ShieldCheck, Star, Flag, X, BadgeCheck, Info,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarCard from "@/components/cars/CarCard";
import EmiCalculator from "@/components/cars/EmiCalculator";
import DealBadge from "@/components/cars/DealBadge";
import { generateWhatsAppLink } from "@/lib/formatters";
import { WHATSAPP_CONCIERGE_PHONE } from "@/lib/mockData";
import { getAssetPath } from "@/lib/assets";
import {
  daysSince, dealEstimate, DEAL_LABEL, EMI_FOOTNOTE, emiFor, formatDate, fuelLabel, kmText, listedDate,
  listingTitle, monthYearEnd, needsNoc, ownerLabel, priceDrop, priceShort, regStateOf, rupees, specParts, type Listing,
} from "@/lib/listings/listing";
import { pushRecentlyViewed, useSavedCars } from "@/lib/listings/storage";
import styles from "./CarDetail.module.css";

interface CarDetailClientProps {
  car: Listing;
  relatedCars: Listing[];
}

type ContactMode = "TEST_DRIVE" | "CALLBACK" | "OFFER";

export default function CarDetailClient({ car, relatedCars }: CarDetailClientProps) {
  const title = listingTitle(car);
  const images = (car.images || []).filter(Boolean);
  const est = dealEstimate(car);
  const drop = priceDrop(car);
  const listed = listedDate(car);
  const emi = emiFor(car.priceINR);
  const { isSaved, toggle } = useSavedCars();
  const saved = isSaved(car.listingCode);

  const [slide, setSlide] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Enquiry modal state (existing CRM submission logic)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactMode, setContactMode] = useState<ContactMode>("TEST_DRIVE");
  const [submittedEnquiryCode, setSubmittedEnquiryCode] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", date: "", timeSlot: "Morning (10 AM – 1 PM)", message: "", offer: "", honeypot: "",
  });

  useEffect(() => {
    pushRecentlyViewed(car.listingCode);
    setNow(Date.now());
  }, [car.listingCode]);

  const waLink = generateWhatsAppLink(WHATSAPP_CONCIERGE_PHONE, {
    listingCode: car.listingCode,
    title: `${title} ${car.variant}`,
    priceLakhs: priceShort(car.priceINR),
    url: `https://wowcars.in/cars/${car.listingCode.toLowerCase()}`,
  });

  const logWhatsAppClick = () => {
    fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId: car.id, type: "WHATSAPP_CLICK", buyerName: "WhatsApp Buyer", buyerPhone: "Direct WhatsApp" }),
    }).catch(() => {});
  };

  const openModal = (mode: ContactMode) => {
    setContactMode(mode);
    setIsSubmitted(false);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.honeypot) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const type = contactMode === "TEST_DRIVE" ? "TEST_DRIVE_REQUEST" : "CALLBACK_REQUEST";
      const message =
        contactMode === "OFFER"
          ? `Offer: ₹${Number(form.offer || 0).toLocaleString("en-IN")}${form.message ? ` — ${form.message}` : ""}`
          : form.message || undefined;
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: car.id,
          type,
          buyerName: form.name,
          buyerPhone: form.phone,
          buyerEmail: form.email || undefined,
          preferredDate: form.date,
          preferredTime: form.timeSlot,
          message,
          preferredContactMethod: contactMode === "CALLBACK" ? "PHONE" : "WHATSAPP",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit request.");
      setSubmittedEnquiryCode(json.enquiryCode || json.enquiryId || "WC-ENQ-REGISTERED");
      setIsSubmitted(true);
    } catch {
      setSubmitError("We couldn't send this right now. Please message us on WhatsApp instead — it reaches the same team.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} — WowCars`, url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const n = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
    setSlide(n);
  };

  // Market range bar geometry
  const bar = est
    ? (() => {
        const lo = Math.min(est.low, car.priceINR) * 0.97;
        const hi = Math.max(est.high, car.priceINR) * 1.03;
        const pos = (v: number) => ((v - lo) / (hi - lo)) * 100;
        return { price: pos(car.priceINR), fairL: pos(est.low), fairR: pos(est.high), market: pos(est.marketValue) };
      })()
    : null;

  const noc = needsNoc(car);
  const state = regStateOf(car);
  const isDealer = car.sellerType === "Verified Dealer";

  const flags: { ok: boolean; label: string }[] = [];
  if (car.accidentFree !== undefined) flags.push({ ok: car.accidentFree, label: car.accidentFree ? "No accident history" : "Accident repair reported" });
  if (car.floodFree) flags.push({ ok: true, label: "No flood damage" });
  const insEnd = monthYearEnd(car.insuranceValidity);
  const insExpired = insEnd !== null && now !== null && insEnd < now;
  if (car.insuranceValidity) {
    flags.push(
      insExpired
        ? { ok: false, label: `Insurance expired ${car.insuranceValidity} — renew before driving` }
        : { ok: true, label: `Insurance valid till ${car.insuranceValidity} (${car.insuranceType})` },
    );
  }
  if (car.serviceRecords !== undefined) flags.push({ ok: car.serviceRecords, label: car.serviceRecords ? "Service records available" : "Service records incomplete" });
  if (car.numOwners === 1) flags.push({ ok: true, label: "Single owner" });

  const paperwork: [string, string, ("ok" | "warn" | undefined)?][] = [
    ["RTO", `${car.rtoCode} — ${car.rtoArea}`],
    ["Registered in", state],
    ["First registration", car.registrationDate || "Ask seller"],
    ["RC", car.rcType ? `${car.rcType} RC` : "Ask seller"],
    ["Hypothecation (loan)", car.hypothecationStatus || "Ask seller", car.hypothecationStatus && /clear|closed|none/i.test(car.hypothecationStatus) ? "ok" : undefined],
    ["NOC for transfer", noc ? `Needed — registered in ${state}, car is in ${car.city}` : "Not needed (same state)", noc ? "warn" : "ok"],
    ["Road tax", car.roadTax || "Ask seller"],
    ["PUC valid till", car.pucValidTill || "Ask seller"],
    ["Insurance", car.insuranceValidity ? `${car.insuranceType}, ${insExpired ? "expired" : "valid till"} ${car.insuranceValidity}` : car.insuranceType || "Ask seller", insExpired ? "warn" : undefined],
  ];

  const facts: [string, string][] = [
    ["Year", String(car.year)],
    ["Kilometres", kmText(car.kmDriven)],
    ["Fuel", fuelLabel(car.fuelType)],
    ["Transmission", car.transmission],
    ["Owners", ownerLabel(car.numOwners)],
    ["Body type", car.bodyType],
    ["Registration", car.rtoCode],
    ["Colour", car.color],
  ];
  if (car.engineDisplacement) facts.push(["Engine", car.engineDisplacement]);
  if (car.batteryCapacityKwh) facts.push(["Battery", `${car.batteryCapacityKwh} kWh`]);
  if (car.seatingCapacity) facts.push(["Seats", String(car.seatingCapacity)]);
  if (car.mileageARAI) facts.push(["Mileage (ARAI)", car.mileageARAI]);

  const history = car.priceHistory && car.priceHistory.length ? car.priceHistory : listed ? [{ date: listed, priceINR: car.priceINR }] : [];
  const days = listed && now ? daysSince(listed, now) : null;

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <div className={`container ${styles.container}`}>
          <nav className={styles.crumbs} aria-label="Breadcrumb">
            <Link href="/cars" className={styles.back}><ChevronLeft size={15} /> Back to results</Link>
            <span className={styles.crumbTrail}>
              <Link href="/">Home</Link> / <Link href="/cars">Used cars</Link> / <span>{car.make} {car.model}</span>
            </span>
          </nav>

          <div className={styles.layout}>
            {/* ---------------- Gallery ---------------- */}
            <div className={styles.galleryArea}>
              <div className={styles.gallery}>
                <div
                  className={styles.track}
                  ref={trackRef}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    setSlide(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
                  }}
                >
                  {images.length ? (
                    images.map((src, i) => (
                      <div className={styles.slide} key={src + i}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getAssetPath(src)} alt={i === 0 ? `${title} ${car.variant}` : `${title} photo ${i + 1}`} width={1376} height={768} />
                      </div>
                    ))
                  ) : (
                    <div className={styles.slide}><span className={styles.noPhoto}>Photos coming soon</span></div>
                  )}
                </div>
                {images.length > 0 && (
                  <span className={styles.counter}>{slide + 1} / {images.length}</span>
                )}
                {images.length > 1 && (
                  <>
                    <button type="button" className={`${styles.nav} ${styles.navPrev}`} onClick={() => goTo(slide - 1)} aria-label="Previous photo"><ChevronLeft size={20} /></button>
                    <button type="button" className={`${styles.nav} ${styles.navNext}`} onClick={() => goTo(slide + 1)} aria-label="Next photo"><ChevronRight size={20} /></button>
                  </>
                )}
                <div className={styles.galleryActions}>
                  <button type="button" onClick={() => toggle(car.listingCode)} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save car"} className={saved ? styles.on : ""}>
                    <Heart size={18} fill={saved ? "currentColor" : "none"} />
                  </button>
                  <button type="button" onClick={share} aria-label="Share">
                    <Share2 size={18} />
                  </button>
                </div>
                {copied && <span className={styles.toast}>Link copied</span>}
              </div>
              {images.length > 1 && (
                <div className={styles.thumbs}>
                  {images.map((src, i) => (
                    <button key={src + i} type="button" onClick={() => goTo(i)} className={i === slide ? styles.thumbOn : ""} aria-label={`Photo ${i + 1}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getAssetPath(src)} alt="" width={120} height={90} loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ---------------- Title ---------------- */}
            <header className={styles.headArea}>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.variant}>{car.variant}</p>
              <p className={styles.spec}>
                {specParts(car).map((part, i) => (
                  <span key={i}>{i > 0 ? " · " : ""}<span className={styles.nowrap}>{part}</span></span>
                ))}
              </p>
              <p className={styles.loc}>
                {car.locality}, {car.city} · Listing {car.listingCode}
                {car.isSeedData && <span className={styles.sampleTag}>Sample listing</span>}
              </p>
            </header>

            {/* ---------------- Price panel ---------------- */}
            <aside className={styles.panelArea} aria-label="Price and contact">
              <div className={styles.panel}>
                <div className={styles.priceBlock}>
                  <div className={styles.price}>{priceShort(car.priceINR)}</div>
                  <div className={styles.emi}>
                    EMI from <strong className="tnum">{rupees(emi)}/mo*</strong>
                  </div>
                  {drop > 0 && car.previousPriceINR && (
                    <div className={styles.drop}>
                      <span>↓ {rupees(drop)}</span> <s>{priceShort(car.previousPriceINR)}</s>
                    </div>
                  )}
                </div>

                <div className={styles.dealBox}>
                  <div className={styles.dealHead}>
                    <DealBadge car={car} size="md" />
                    <span className={styles.estTag}>Estimated</span>
                  </div>
                  {est && bar ? (
                    <>
                      <div className={styles.rangeBar} aria-hidden="true">
                        <span className={styles.rangeFair} style={{ left: `${bar.fairL}%`, width: `${bar.fairR - bar.fairL}%` }} />
                        <span className={`${styles.rangeMarker} deal-${est.rating}`} style={{ left: `${bar.price}%` }} />
                      </div>
                      <div className={styles.rangeLabels}>
                        <span>{priceShort(est.low)}</span>
                        <span>Similar cars</span>
                        <span>{priceShort(est.high)}</span>
                      </div>
                      <p className={styles.dealText}>
                        {DEAL_LABEL[est.rating]}: this asking price is {Math.abs(Math.round((est.ratio - 1) * 100))}% {est.ratio <= 1 ? "below" : "above"} our {priceShort(est.marketValue)} estimate for a car like this in good condition.
                      </p>
                    </>
                  ) : (
                    <p className={styles.dealText}>Not enough comparable data to rate this price yet.</p>
                  )}
                </div>

                <div className={styles.ctas}>
                  <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={logWhatsAppClick} className="btn btn-whatsapp btn-lg btn-full">
                    <MessageCircle size={18} /> WhatsApp seller
                  </a>
                  <div className={styles.ctaRow}>
                    <a href="tel:+919019088160" className="btn btn-secondary"><Phone size={16} /> Call</a>
                    <button type="button" className="btn btn-secondary" onClick={() => openModal("TEST_DRIVE")}><CalendarCheck size={16} /> Test drive</button>
                  </div>
                  <button type="button" className="btn btn-ghost btn-full" onClick={() => openModal("OFFER")}>
                    <HandCoins size={16} /> Make an offer
                  </button>
                </div>

                <div className={styles.sellerMini}>
                  {isDealer ? (
                    <>
                      <BadgeCheck size={16} />
                      <span>
                        <strong>{car.dealerName || "Verified dealer"}</strong>
                        {car.dealerRating ? <> · <Star size={12} fill="currentColor" className={styles.star} /> {car.dealerRating.toFixed(1)} ({car.dealerReviews || 0})</> : null}
                      </span>
                    </>
                  ) : (
                    <>
                      <BadgeCheck size={16} />
                      <span><strong>Individual seller</strong>{car.idVerified ? " · ID verified" : " · ID not verified yet"}</span>
                    </>
                  )}
                </div>
                <p className={styles.panelNote}>{EMI_FOOTNOTE}</p>
              </div>
            </aside>

            {/* ---------------- Content ---------------- */}
            <div className={styles.contentArea}>
              <section className={styles.card} aria-labelledby="facts-h">
                <h2 id="facts-h" className={styles.h2}>Key facts</h2>
                <dl className={styles.facts}>
                  {facts.map(([k, v]) => (
                    <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
                {flags.length > 0 && (
                  <ul className={styles.flags}>
                    {flags.map((f) => (
                      <li key={f.label} className={f.ok ? styles.flagOk : styles.flagWarn}>
                        {f.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {f.label}
                      </li>
                    ))}
                  </ul>
                )}
                {car.keySellingPoints && car.keySellingPoints.length > 0 && (
                  <p className={styles.ksp}>
                    <span>Seller highlights:</span> {car.keySellingPoints.slice(0, 3).join(" · ")}
                  </p>
                )}
              </section>

              <section className={styles.card} aria-labelledby="paper-h">
                <h2 id="paper-h" className={styles.h2}>Registration &amp; paperwork</h2>
                <dl className={styles.paper}>
                  {paperwork.map(([k, v, tone]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd className={tone === "warn" ? styles.warnText : tone === "ok" ? styles.okText : ""}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className={styles.note}><Info size={13} /> Seller-declared; WowCars checks the RC, insurance and loan status before any token is paid.</p>
              </section>

              {history.length > 0 && (
                <section className={styles.card} aria-labelledby="hist-h">
                  <h2 id="hist-h" className={styles.h2}>Price history</h2>
                  <p className={styles.histSummary}>
                    Listed {listed ? formatDate(listed) : ""}{days !== null ? ` · ${days} ${days === 1 ? "day" : "days"} on WowCars` : ""}
                    {history.length > 1 ? ` · price changed ${history.length - 1} ${history.length - 1 === 1 ? "time" : "times"}` : " · no price changes"}
                  </p>
                  {history.length > 1 && <PriceSteps history={history} />}
                  <ol className={styles.histList}>
                    {history.map((h, i) => {
                      const diff = i > 0 ? h.priceINR - history[i - 1].priceINR : 0;
                      return (
                        <li key={h.date + i}>
                          <span>{formatDate(h.date)}</span>
                          <strong className="tnum">{priceShort(h.priceINR)}</strong>
                          <span className={diff < 0 ? styles.okText : ""}>{i === 0 ? "Listed" : diff < 0 ? `↓ ${rupees(-diff)}` : `↑ ${rupees(diff)}`}</span>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              <section className={styles.card} aria-labelledby="insp-h">
                <h2 id="insp-h" className={styles.h2}>Inspection report</h2>
                {car.inspectedByWowCars ? (
                  <div className={styles.insp}>
                    <div className={styles.score}>
                      <ShieldCheck size={22} />
                      <div>
                        <strong className="tnum">{car.inspectionScore ? `${car.inspectionScore.toFixed(1)}/10` : "Passed"}</strong>
                        <span>WowCars 140-point inspection</span>
                      </div>
                    </div>
                    {car.inspectionHighlights && car.inspectionHighlights.length > 0 && (
                      <ul className={styles.inspList}>
                        {car.inspectionHighlights.map((h) => (
                          <li key={h}><CheckCircle2 size={15} /> {h}</li>
                        ))}
                      </ul>
                    )}
                    {car.isSeedData && <p className={styles.note}><Info size={13} /> Sample report for a demonstration listing.</p>}
                  </div>
                ) : (
                  <p className={styles.muted}>
                    This car hasn&apos;t been inspected by WowCars yet. Ask the seller for a report, or book a WowCars inspection before you pay a token.
                  </p>
                )}
              </section>

              {(car.overview || (car.features && car.features.length > 0)) && (
                <section className={styles.card} aria-labelledby="ov-h">
                  <h2 id="ov-h" className={styles.h2}>About this car</h2>
                  {car.overview && <p className={styles.overview}>{car.overview}</p>}
                  {car.features && car.features.length > 0 && (
                    <ul className={styles.features}>
                      {car.features.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                  )}
                </section>
              )}

              <section aria-labelledby="emi-h">
                <h2 id="emi-h" className="sr-only">EMI calculator</h2>
                <EmiCalculator carPrice={car.priceINR} title="EMI calculator" />
              </section>

              <section className={styles.card} aria-labelledby="seller-h">
                <h2 id="seller-h" className={styles.h2}>Seller</h2>
                <div className={styles.seller}>
                  <div className={styles.sellerAvatar} aria-hidden="true">{(car.dealerName || "I").slice(0, 1)}</div>
                  <div>
                    <strong>{isDealer ? car.dealerName || "Verified dealer" : "Individual seller"}</strong>
                    <p>
                      {isDealer ? "KYC-verified dealer" : car.idVerified ? "ID verified" : "ID not verified yet"}
                      {isDealer && car.dealerRating ? (
                        <> · <Star size={12} fill="currentColor" className={styles.star} /> {car.dealerRating.toFixed(1)} from {car.dealerReviews || 0} reviews</>
                      ) : null}
                    </p>
                    <p>{car.locality}, {car.city}</p>
                  </div>
                </div>
                <p className={styles.note}><Info size={13} /> Your number is shared only when you contact the seller. All chats go through the WowCars concierge.</p>
              </section>

              <p className={styles.report}>
                <Flag size={14} /> Something wrong with this listing?{" "}
                <a href={`https://wa.me/${WHATSAPP_CONCIERGE_PHONE}?text=${encodeURIComponent(`Report listing ${car.listingCode}: `)}`} target="_blank" rel="noopener noreferrer">Report it</a>
              </p>
            </div>
          </div>

          {relatedCars.length > 0 && (
            <section className={styles.related} aria-labelledby="rel-h">
              <h2 id="rel-h" className={styles.h2}>Similar cars</h2>
              <div className={styles.relatedGrid}>
                {relatedCars.map((c) => <CarCard key={c.id} car={c} />)}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Mobile fixed bottom bar */}
      <div className={styles.bottomBar}>
        <div>
          <div className={styles.bbPrice}>{priceShort(car.priceINR)}</div>
          <div className={styles.bbEmi}>{rupees(emi)}/mo*</div>
        </div>
        <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={logWhatsAppClick} className="btn btn-whatsapp">
          <MessageCircle size={18} /> WhatsApp
        </a>
      </div>

      {isModalOpen && (
        <div className={styles.backdrop} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-h" onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={() => setIsModalOpen(false)} aria-label="Close">
              <X size={20} />
            </button>
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className={styles.form}>
                <h3 id="modal-h" className={styles.modalTitle}>
                  {contactMode === "TEST_DRIVE" ? "Book a test drive" : contactMode === "OFFER" ? "Make an offer" : "Request a callback"}
                </h3>
                <p className={styles.muted}>{title} · {car.listingCode} · {car.locality}</p>
                <input type="text" name="website_url" value={form.honeypot} onChange={(e) => setForm({ ...form, honeypot: e.target.value })} style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
                <label className={styles.formField}>
                  <span>Your name</span>
                  <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul Sharma" />
                </label>
                <label className={styles.formField}>
                  <span>Mobile / WhatsApp</span>
                  <input className="input" required type="tel" pattern="[0-9]{10}" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit number" />
                </label>
                {contactMode === "OFFER" && (
                  <label className={styles.formField}>
                    <span>Your offer (₹)</span>
                    <input className="input" required type="number" inputMode="numeric" min={0} step={5000} value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} placeholder={String(Math.round((car.priceINR * 0.95) / 5000) * 5000)} />
                  </label>
                )}
                {contactMode === "TEST_DRIVE" && (
                  <div className={styles.formRow}>
                    <label className={styles.formField}>
                      <span>Date</span>
                      <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                    </label>
                    <label className={styles.formField}>
                      <span>Time</span>
                      <select className="select" value={form.timeSlot} onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}>
                        <option>Morning (10 AM – 1 PM)</option>
                        <option>Afternoon (1 PM – 4 PM)</option>
                        <option>Evening (4 PM – 7 PM)</option>
                      </select>
                    </label>
                  </div>
                )}
                <label className={styles.formField}>
                  <span>Message (optional)</span>
                  <textarea className="input" rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </label>
                {submitError && (
                  <p className={styles.formError}>
                    {submitError} <a href={waLink} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>
                  </p>
                )}
                <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending…" : contactMode === "TEST_DRIVE" ? "Request test drive" : contactMode === "OFFER" ? "Send offer" : "Request callback"}
                </button>
              </form>
            ) : (
              <div className={styles.done}>
                <CheckCircle2 size={36} />
                <h3 className={styles.modalTitle}>Request sent</h3>
                <p className={styles.muted}>Reference {submittedEnquiryCode}. The WowCars team will WhatsApp you shortly.</p>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PriceSteps({ history }: { history: { date: string; priceINR: number }[] }) {
  const w = 320;
  const h = 70;
  const prices = history.map((x) => x.priceINR);
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const span = Math.max(1, max - min);
  const y = (p: number) => 10 + ((max - p) / span) * (h - 20);
  const step = w / history.length;
  let d = "";
  history.forEach((pt, i) => {
    const x0 = i * step;
    const x1 = (i + 1) * step;
    d += `${i === 0 ? "M" : "L"}${x0},${y(pt.priceINR)} L${x1},${y(pt.priceINR)} `;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.steps} role="img" aria-label="Asking price over time">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
