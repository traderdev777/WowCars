/**
 * WowCars — search filter model shared by the home hero, /cars and /dealers.
 * Everything is client-side over the static listing data.
 */
import { dealEstimate, emiFor, listedDate, regStateOf, type DealRating, type Listing } from "./listing";

export type SortKey = "recommended" | "deals" | "price-asc" | "price-desc" | "newest" | "km-asc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "deals", label: "Best deals first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest listed" },
  { value: "km-asc", label: "Lowest km" },
];

export type BudgetMode = "price" | "emi";

export interface SearchFilters {
  q: string;
  makes: string[];
  models: string[];
  budgetMode: BudgetMode;
  /** id of a bucket in PRICE_BUCKETS / EMI_BUCKETS, "" = any */
  budget: string;
  year: string;
  km: string;
  fuels: string[];
  transmissions: string[];
  bodies: string[];
  owners: string[];
  regStates: string[];
  deals: DealRating[];
  sellerTypes: string[];
  inspected: boolean;
  cities: string[];
  sort: SortKey;
}

export const EMPTY_FILTERS: SearchFilters = {
  q: "", makes: [], models: [], budgetMode: "price", budget: "", year: "", km: "",
  fuels: [], transmissions: [], bodies: [], owners: [], regStates: [], deals: [],
  sellerTypes: [], inspected: false, cities: [], sort: "recommended",
};

export interface Bucket { id: string; label: string; min: number; max: number }

export const PRICE_BUCKETS: Bucket[] = [
  { id: "p0-5", label: "Under ₹5 L", min: 0, max: 500000 },
  { id: "p5-8", label: "₹5 L – ₹8 L", min: 500000, max: 800000 },
  { id: "p8-12", label: "₹8 L – ₹12 L", min: 800000, max: 1200000 },
  { id: "p12-20", label: "₹12 L – ₹20 L", min: 1200000, max: 2000000 },
  { id: "p20+", label: "Above ₹20 L", min: 2000000, max: Infinity },
];

export const EMI_BUCKETS: Bucket[] = [
  { id: "e0-10", label: "Under ₹10,000/mo", min: 0, max: 10000 },
  { id: "e10-15", label: "₹10k – ₹15k/mo", min: 10000, max: 15000 },
  { id: "e15-20", label: "₹15k – ₹20k/mo", min: 15000, max: 20000 },
  { id: "e20-30", label: "₹20k – ₹30k/mo", min: 20000, max: 30000 },
  { id: "e30+", label: "Above ₹30k/mo", min: 30000, max: Infinity },
];

export const YEAR_OPTIONS = [
  { id: "2023", label: "2023 & newer", min: 2023 },
  { id: "2021", label: "2021 & newer", min: 2021 },
  { id: "2019", label: "2019 & newer", min: 2019 },
  { id: "2016", label: "2016 & newer", min: 2016 },
];

export const KM_OPTIONS = [
  { id: "20000", label: "Under 20,000 km", max: 20000 },
  { id: "40000", label: "Under 40,000 km", max: 40000 },
  { id: "60000", label: "Under 60,000 km", max: 60000 },
  { id: "100000", label: "Under 1,00,000 km", max: 100000 },
];

export const FUEL_OPTIONS = [
  { id: "Petrol", label: "Petrol" },
  { id: "Diesel", label: "Diesel" },
  { id: "CNG", label: "CNG" },
  { id: "Hybrid", label: "Hybrid" },
  { id: "Electric", label: "EV" },
];
export const TRANSMISSION_OPTIONS = [{ id: "Manual", label: "Manual" }, { id: "Automatic", label: "Automatic" }];
export const BODY_OPTIONS = [
  { id: "Hatchback", label: "Hatchback" }, { id: "Sedan", label: "Sedan" }, { id: "SUV", label: "SUV" },
  { id: "MUV", label: "MUV / 7-seater" }, { id: "Luxury", label: "Luxury" },
];
export const OWNER_OPTIONS = [{ id: "1", label: "1st owner" }, { id: "2", label: "2nd owner" }, { id: "3+", label: "3rd owner +" }];
export const SELLER_OPTIONS = [{ id: "Verified Dealer", label: "Verified dealer" }, { id: "Individual", label: "Individual" }];
export const DEAL_OPTIONS: { id: DealRating; label: string }[] = [
  { id: "great", label: "Great price" }, { id: "good", label: "Good price" }, { id: "fair", label: "Fair price" },
  { id: "high", label: "High price" }, { id: "over", label: "Overpriced" },
];

export function bucketsFor(mode: BudgetMode) {
  return mode === "emi" ? EMI_BUCKETS : PRICE_BUCKETS;
}

/* ------------------------------------------------------------------ */

type FacetKey = "makes" | "models" | "budget" | "year" | "km" | "fuels" | "transmissions" | "bodies" | "owners" | "regStates" | "deals" | "sellerTypes" | "inspected" | "cities" | "q";

function ownerBucket(n: number) {
  return n >= 3 ? "3+" : String(Math.max(1, n));
}

function matches(car: Listing, f: SearchFilters, skip?: FacetKey): boolean {
  if (skip !== "q" && f.q.trim()) {
    const hay = `${car.year} ${car.make} ${car.model} ${car.variant} ${car.city} ${car.locality} ${car.listingCode} ${car.fuelType} ${car.bodyType}`.toLowerCase();
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.every((w) => hay.includes(w))) return false;
  }
  if (skip !== "makes" && f.makes.length && !f.makes.includes(car.make)) return false;
  if (skip !== "models" && f.models.length && !f.models.includes(car.model)) return false;
  if (skip !== "budget" && f.budget) {
    const b = bucketsFor(f.budgetMode).find((x) => x.id === f.budget);
    if (b) {
      const v = f.budgetMode === "emi" ? emiFor(car.priceINR) : car.priceINR;
      if (v < b.min || v > b.max) return false;
    }
  }
  if (skip !== "year" && f.year) {
    const y = YEAR_OPTIONS.find((x) => x.id === f.year);
    if (y && car.year < y.min) return false;
  }
  if (skip !== "km" && f.km) {
    const k = KM_OPTIONS.find((x) => x.id === f.km);
    if (k && car.kmDriven > k.max) return false;
  }
  if (skip !== "fuels" && f.fuels.length && !f.fuels.includes(car.fuelType)) return false;
  if (skip !== "transmissions" && f.transmissions.length && !f.transmissions.includes(car.transmission)) return false;
  if (skip !== "bodies" && f.bodies.length && !f.bodies.includes(car.bodyType)) return false;
  if (skip !== "owners" && f.owners.length && !f.owners.includes(ownerBucket(car.numOwners))) return false;
  if (skip !== "regStates" && f.regStates.length && !f.regStates.includes(regStateOf(car))) return false;
  if (skip !== "deals" && f.deals.length) {
    const d = dealEstimate(car);
    if (!d || !f.deals.includes(d.rating)) return false;
  }
  if (skip !== "sellerTypes" && f.sellerTypes.length && !f.sellerTypes.includes(car.sellerType || "Individual")) return false;
  if (skip !== "inspected" && f.inspected && !car.inspectedByWowCars) return false;
  if (skip !== "cities" && f.cities.length && !f.cities.includes(car.city)) return false;
  return true;
}

export function applyFilters(cars: Listing[], f: SearchFilters): Listing[] {
  return sortCars(cars.filter((c) => matches(c, f)), f.sort);
}

export function countMatching(cars: Listing[], f: SearchFilters): number {
  return cars.filter((c) => matches(c, f)).length;
}

/** Count of results if `option` were the (only added) value for a facet. */
export function facetCounts(cars: Listing[], f: SearchFilters, facet: FacetKey, keyOf: (c: Listing) => string | string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of cars) {
    if (!matches(c, f, facet)) continue;
    const keys = keyOf(c);
    for (const k of Array.isArray(keys) ? keys : [keys]) out[k] = (out[k] || 0) + 1;
  }
  return out;
}

export function allFacetCounts(cars: Listing[], f: SearchFilters) {
  const budgetKeys = (c: Listing) => {
    const v = f.budgetMode === "emi" ? emiFor(c.priceINR) : c.priceINR;
    return bucketsFor(f.budgetMode).filter((b) => v >= b.min && v <= b.max).map((b) => b.id);
  };
  return {
    makes: facetCounts(cars, f, "makes", (c) => c.make),
    models: facetCounts(cars, f, "models", (c) => c.model),
    budget: facetCounts(cars, f, "budget", budgetKeys),
    year: facetCounts(cars, f, "year", (c) => YEAR_OPTIONS.filter((y) => c.year >= y.min).map((y) => y.id)),
    km: facetCounts(cars, f, "km", (c) => KM_OPTIONS.filter((k) => c.kmDriven <= k.max).map((k) => k.id)),
    fuels: facetCounts(cars, f, "fuels", (c) => c.fuelType),
    transmissions: facetCounts(cars, f, "transmissions", (c) => c.transmission),
    bodies: facetCounts(cars, f, "bodies", (c) => c.bodyType),
    owners: facetCounts(cars, f, "owners", (c) => ownerBucket(c.numOwners)),
    regStates: facetCounts(cars, f, "regStates", (c) => regStateOf(c)),
    deals: facetCounts(cars, f, "deals", (c) => dealEstimate(c)?.rating || "none"),
    sellerTypes: facetCounts(cars, f, "sellerTypes", (c) => c.sellerType || "Individual"),
    inspected: facetCounts(cars, f, "inspected", (c) => (c.inspectedByWowCars ? "yes" : "no")),
    cities: facetCounts(cars, f, "cities", (c) => c.city),
  };
}

export function sortCars(cars: Listing[], sort: SortKey): Listing[] {
  const arr = [...cars];
  const ratio = (c: Listing) => dealEstimate(c)?.ratio ?? 9;
  const listed = (c: Listing) => listedDate(c) || "";
  switch (sort) {
    case "deals": return arr.sort((a, b) => ratio(a) - ratio(b));
    case "price-asc": return arr.sort((a, b) => a.priceINR - b.priceINR);
    case "price-desc": return arr.sort((a, b) => b.priceINR - a.priceINR);
    case "newest": return arr.sort((a, b) => listed(b).localeCompare(listed(a)));
    case "km-asc": return arr.sort((a, b) => a.kmDriven - b.kmDriven);
    default: {
      // Recommended: inspected + photo-complete first, then better price ratio, then newest.
      const score = (c: Listing) => (c.inspectedByWowCars ? 0 : 0.3) + (c.isVerified ? 0 : 0.2) + Math.min(ratio(c), 2);
      return arr.sort((a, b) => score(a) - score(b) || listed(b).localeCompare(listed(a)));
    }
  }
}

/* ------------------------------------------------------------------ */
/* Active chips + URL                                                  */
/* ------------------------------------------------------------------ */

export interface ActiveChip { key: string; label: string; remove: (f: SearchFilters) => SearchFilters }

const labelOf = (list: { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label || id;

export function activeChips(f: SearchFilters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const multi = (key: keyof SearchFilters, list: { id: string; label: string }[] | null) => {
    for (const v of f[key] as string[]) {
      chips.push({
        key: `${key}:${v}`,
        label: list ? labelOf(list, v) : v,
        remove: (s) => ({ ...s, [key]: (s[key] as string[]).filter((x) => x !== v) }),
      });
    }
  };
  if (f.q.trim()) chips.push({ key: "q", label: `“${f.q.trim()}”`, remove: (s) => ({ ...s, q: "" }) });
  multi("makes", null);
  multi("models", null);
  if (f.budget) chips.push({ key: "budget", label: labelOf(bucketsFor(f.budgetMode), f.budget), remove: (s) => ({ ...s, budget: "" }) });
  if (f.year) chips.push({ key: "year", label: labelOf(YEAR_OPTIONS, f.year), remove: (s) => ({ ...s, year: "" }) });
  if (f.km) chips.push({ key: "km", label: labelOf(KM_OPTIONS, f.km), remove: (s) => ({ ...s, km: "" }) });
  multi("fuels", FUEL_OPTIONS);
  multi("transmissions", TRANSMISSION_OPTIONS);
  multi("bodies", BODY_OPTIONS);
  multi("owners", OWNER_OPTIONS);
  multi("regStates", null);
  multi("deals", DEAL_OPTIONS);
  multi("sellerTypes", SELLER_OPTIONS);
  if (f.inspected) chips.push({ key: "inspected", label: "WowCars-inspected", remove: (s) => ({ ...s, inspected: false }) });
  multi("cities", null);
  return chips;
}

export function activeCount(f: SearchFilters): number {
  return activeChips(f).length;
}

const LIST_KEYS: [keyof SearchFilters, string][] = [
  ["makes", "make"], ["models", "model"], ["fuels", "fuel"], ["transmissions", "trans"], ["bodies", "body"],
  ["owners", "owners"], ["regStates", "reg"], ["deals", "deal"], ["sellerTypes", "seller"], ["cities", "city"],
];

/** Legacy query values used by older links (e.g. ?fuel=electric). */
const FUEL_ALIASES: Record<string, string> = { electric: "Electric", ev: "Electric", petrol: "Petrol", diesel: "Diesel", cng: "CNG", hybrid: "Hybrid" };

export function filtersToQuery(f: SearchFilters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  for (const [key, param] of LIST_KEYS) {
    const v = f[key] as string[];
    if (v.length) p.set(param, v.join(","));
  }
  if (f.budget) p.set("budget", f.budget);
  if (f.year) p.set("year", f.year);
  if (f.km) p.set("km", f.km);
  if (f.inspected) p.set("inspected", "1");
  if (f.sort !== "recommended") p.set("sort", f.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function filtersFromQuery(params: URLSearchParams): SearchFilters {
  const f: SearchFilters = { ...EMPTY_FILTERS };
  f.q = params.get("q") || "";
  for (const [key, param] of LIST_KEYS) {
    const raw = params.get(param);
    if (raw) (f as unknown as Record<string, string[]>)[key] = raw.split(",").filter(Boolean);
  }
  f.fuels = f.fuels.map((x) => FUEL_ALIASES[x.toLowerCase()] || x);
  const budget = params.get("budget") || "";
  if (budget.startsWith("e")) f.budgetMode = "emi";
  f.budget = bucketsFor(f.budgetMode).some((b) => b.id === budget) ? budget : "";
  f.year = params.get("year") || "";
  f.km = params.get("km") || "";
  f.inspected = params.get("inspected") === "1";
  const sort = params.get("sort") as SortKey | null;
  if (sort && SORT_OPTIONS.some((o) => o.value === sort)) f.sort = sort;
  return f;
}

/* ------------------------------------------------------------------ */
/* Preset collections (mobile.de style: the card prints its filters)  */
/* ------------------------------------------------------------------ */

export interface Preset { id: string; title: string; blurb: string; filters: Partial<SearchFilters> }

export const PRESETS: Preset[] = [
  {
    id: "first-car", title: "First car", blurb: "Easy to drive, cheap to run",
    filters: { budget: "p5-8", fuels: ["Petrol", "CNG"], bodies: ["Hatchback"], owners: ["1", "2"] },
  },
  {
    id: "family", title: "Family 7-seater", blurb: "Room for everyone and the luggage",
    filters: { bodies: ["MUV"] },
  },
  {
    id: "auto-commute", title: "Automatic for city traffic", blurb: "No clutch in stop-go traffic",
    filters: { transmissions: ["Automatic"], budget: "p12-20", year: "2019" },
  },
  {
    id: "low-running", title: "Low running cost", blurb: "CNG and EV picks",
    filters: { fuels: ["CNG", "Electric"] },
  },
  {
    id: "almost-new", title: "Almost new", blurb: "Recent, lightly driven",
    filters: { year: "2023", km: "20000" },
  },
];

export function presetFilters(p: Preset): SearchFilters {
  return { ...EMPTY_FILTERS, ...p.filters };
}
