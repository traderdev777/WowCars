/**
 * WowCars — buyer-facing listing helpers.
 * Pure, deterministic functions shared by cards, search and the detail page.
 */
import type { PublicCar } from "@/lib/db/types";

export type Listing = PublicCar;

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** 675000 → "₹6.75 L", 12000000 → "₹1.2 Cr" */
export function priceShort(amount: number): string {
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${trimZeros(cr.toFixed(2))}\u00A0Cr`;
  }
  const l = amount / 100000;
  return `₹${trimZeros(l.toFixed(2))}\u00A0L`;
}

function trimZeros(v: string) {
  return v.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

/** 25000 → "₹25,000" */
export function rupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function kmText(km: number): string {
  return `${km.toLocaleString("en-IN")}\u00A0km`;
}

export function fuelLabel(fuel: string): string {
  return fuel === "Electric" ? "EV" : fuel;
}

export function ownerLabel(n: number): string {
  if (n <= 1) return "1st owner";
  if (n === 2) return "2nd owner";
  if (n === 3) return "3rd owner";
  return `${n}th owner`;
}

export function listingTitle(car: Pick<Listing, "year" | "make" | "model">): string {
  return `${car.year} ${car.make} ${car.model}`;
}

export function carHref(car: Pick<Listing, "listingCode">): string {
  return `/cars/${car.listingCode.toLowerCase()}`;
}

/** "2021 · 42,300 km · Diesel · Manual · 1st owner · KA-01" */
export function specParts(car: Listing): string[] {
  return [
    String(car.year),
    kmText(car.kmDriven),
    fuelLabel(car.fuelType),
    car.transmission,
    ownerLabel(car.numOwners),
    car.rtoCode,
  ];
}

/* ------------------------------------------------------------------ */
/* EMI                                                                 */
/* ------------------------------------------------------------------ */

export const EMI_DEFAULTS = { downPct: 0.2, rate: 10, months: 60 } as const;

export function emiFor(price: number, opts: { downPct?: number; rate?: number; months?: number } = {}): number {
  const downPct = opts.downPct ?? EMI_DEFAULTS.downPct;
  const rate = opts.rate ?? EMI_DEFAULTS.rate;
  const n = opts.months ?? EMI_DEFAULTS.months;
  const principal = price * (1 - downPct);
  const r = rate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi / 10) * 10;
}

/** Inverse of emiFor: the max car price a monthly budget covers. */
export function priceForEmi(emi: number): number {
  const r = EMI_DEFAULTS.rate / 12 / 100;
  const n = EMI_DEFAULTS.months;
  const principal = (emi * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));
  return principal / (1 - EMI_DEFAULTS.downPct);
}

export const EMI_FOOTNOTE = "*EMI estimate: 20% down, 10% p.a., 60 months. Actual rate depends on your lender and credit profile.";

/* ------------------------------------------------------------------ */
/* WowPrice deal rating (estimate)                                     */
/* ------------------------------------------------------------------ */

export type DealRating = "great" | "good" | "fair" | "high" | "over";

export const DEAL_LABEL: Record<DealRating, string> = {
  great: "Great price",
  good: "Good price",
  fair: "Fair price",
  high: "High price",
  over: "Overpriced",
};

export const DEAL_ORDER: DealRating[] = ["great", "good", "fair", "high", "over"];

/** Fixed reference year so ratings are reproducible between builds. */
const MARKET_REFERENCE_YEAR = 2026;

export interface DealEstimate {
  rating: DealRating;
  /** Estimated market value for a car like this in good condition. */
  marketValue: number;
  low: number;
  high: number;
  /** asking price ÷ market value */
  ratio: number;
}

/**
 * Deterministic estimate: on-road price when new × age retention, adjusted for
 * kilometres vs. the ~11,000 km/yr norm, extra owners and EV depreciation.
 * Returns null when the listing has no new-price reference (shown as "Not rated").
 */
export function dealEstimate(car: Listing): DealEstimate | null {
  if (!car.newPriceINR || car.newPriceINR <= 0) return null;
  const age = Math.max(1, MARKET_REFERENCE_YEAR - car.year);
  const retention = 0.88 * Math.pow(0.93, age - 1);
  const kmAdj = clamp(((11000 * age - car.kmDriven) / 10000) * 0.015, -0.1, 0.06);
  const ownerAdj = -0.04 * Math.max(0, car.numOwners - 1);
  const fuelFactor = car.fuelType === "Electric" ? 0.92 : 1;
  const marketValue = roundTo(car.newPriceINR * retention * (1 + kmAdj + ownerAdj) * fuelFactor, 5000);
  const ratio = car.priceINR / marketValue;
  const rating: DealRating =
    ratio <= 0.92 ? "great" : ratio <= 0.98 ? "good" : ratio <= 1.05 ? "fair" : ratio <= 1.12 ? "high" : "over";
  return {
    rating,
    marketValue,
    low: roundTo(marketValue * 0.88, 5000),
    high: roundTo(marketValue * 1.15, 5000),
    ratio,
  };
}

export const DEAL_TOOLTIP =
  "WowPrice is an estimate that compares this asking price with similar cars (model, year, km, owners, fuel). It assumes good condition and is not a valuation. Sellers can't buy or change it.";

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
function roundTo(v: number, step: number) {
  return Math.round(v / step) * step;
}

/* ------------------------------------------------------------------ */
/* Price drop, listing age, registration                               */
/* ------------------------------------------------------------------ */

export function priceDrop(car: Listing): number {
  if (car.previousPriceINR && car.previousPriceINR > car.priceINR) return car.previousPriceINR - car.priceINR;
  return 0;
}

/** ISO date (YYYY-MM-DD) the listing went live. */
export function listedDate(car: Listing): string | null {
  if (car.listedOn) return car.listedOn;
  const m = /(\d{4}-\d{2}-\d{2})/.exec(car.createdAt || "");
  return m ? m[1] : null;
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function daysSince(iso: string, now = Date.now()): number {
  const d = new Date(`${iso}T00:00:00+05:30`).getTime();
  return Math.max(0, Math.floor((now - d) / 86400000));
}

const STATE_BY_CODE: Record<string, string> = {
  KA: "Karnataka", MH: "Maharashtra", TN: "Tamil Nadu", KL: "Kerala", AP: "Andhra Pradesh",
  TS: "Telangana", TG: "Telangana", DL: "Delhi", HR: "Haryana", UP: "Uttar Pradesh", GJ: "Gujarat",
  RJ: "Rajasthan", GA: "Goa", WB: "West Bengal", PB: "Punjab", MP: "Madhya Pradesh",
};

export function regStateOf(car: Pick<Listing, "regState" | "rtoCode">): string {
  if (car.regState) return car.regState;
  const code = (car.rtoCode || "").slice(0, 2).toUpperCase();
  return STATE_BY_CODE[code] || code || "Unknown";
}

/** States per city, for the interstate NOC hint. */
const CITY_STATE: Record<string, string> = {
  Bengaluru: "Karnataka", Mysuru: "Karnataka", Hubballi: "Karnataka", Mangaluru: "Karnataka",
  Chennai: "Tamil Nadu", Hyderabad: "Telangana", Pune: "Maharashtra", Mumbai: "Maharashtra", "Delhi NCR": "Delhi",
};

export function needsNoc(car: Listing): boolean {
  const carCityState = CITY_STATE[car.city] || "Karnataka";
  return regStateOf(car) !== carCityState;
}

export const CITIES = ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Chennai", "Hyderabad", "Pune", "Mumbai", "Delhi NCR"];

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "March 2027" / "Mar 2027" → end of that month (ms), or null when unparseable. */
export function monthYearEnd(text?: string): number | null {
  if (!text) return null;
  const m = /([a-z]{3})[a-z]*\.?\s+(\d{4})/i.exec(text);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[1].toLowerCase());
  if (mi < 0) return null;
  return new Date(Number(m[2]), mi + 1, 0, 23, 59, 59).getTime();
}
