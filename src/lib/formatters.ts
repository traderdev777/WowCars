/**
 * WowCars — Indian Automotive Formatters
 * All price and distance formatting follows Indian conventions
 */

/**
 * Format price in Indian number system
 * e.g., 645000 → "₹ 6,45,000"
 */
export function formatINR(amount: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
  return formatted;
}

/**
 * Format price in Lakhs shorthand for car cards
 * e.g., 645000 → "₹ 6.45 Lakhs"
 *       1200000 → "₹ 12.00 Lakhs"
 */
export function formatLakhs(amount: number): string {
  const lakhs = amount / 100000;
  if (lakhs >= 100) {
    const crores = amount / 10000000;
    return `₹ ${crores.toFixed(2)} Cr`;
  }
  return `₹ ${lakhs.toFixed(2)} Lakhs`;
}

/**
 * Format kilometers driven (Indian comma grouping)
 * e.g., 42500 → "42,500 km"
 */
export function formatKM(km: number): string {
  return `${new Intl.NumberFormat("en-IN").format(km)} km`;
}

/**
 * Calculate monthly EMI using reducing balance formula
 * @param principal - Loan amount in INR
 * @param annualRate - Annual interest rate (e.g., 9.5 for 9.5%)
 * @param tenureMonths - Loan tenure in months
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  if (tenureMonths === 0) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) /
    (Math.pow(1 + r, tenureMonths) - 1);
  return Math.round(emi);
}

/**
 * Generate WhatsApp deep link with pre-filled vehicle message
 */
export function generateWhatsAppLink(
  phone: string,
  car: { listingCode: string; title: string; priceLakhs: string; url?: string }
): string {
  const text = `Hi WowCars! 🙏 I'm interested in the *${car.title}* (ID: ${car.listingCode}) listed for *${car.priceLakhs}*. Is it still available? Please share more details.${car.url ? `\n\n🔗 ${car.url}` : ""}`;
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${phone}?text=${encoded}`;
}

/**
 * Format RTO code in display format
 * e.g., "KA04" → "KA-04"
 */
export function formatRTO(code: string): string {
  const clean = code.toUpperCase().replace(/[-\s]/g, "");
  const match = clean.match(/^([A-Z]{2})(\d{2})(.*)$/);
  if (match) return `${match[1]}-${match[2]}${match[3] ? ` ${match[3]}` : ""}`;
  return code;
}
