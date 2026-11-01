import fs from "fs";
import path from "path";

const baseDir = path.join(process.cwd(), "public", "parts");
const catDir = path.join(baseDir, "categories");
const prodDir = path.join(baseDir, "products");

fs.mkdirSync(catDir, { recursive: true });
fs.mkdirSync(prodDir, { recursive: true });

function createSvg(title: string, subtitle: string, icon: string, accentColor: string, details: string[] = []): string {
  const detailPills = details
    .map(
      (d, i) =>
        `<g transform="translate(${50 + (i % 2) * 155}, ${220 + Math.floor(i / 2) * 28})">
          <rect width="145" height="22" rx="11" fill="#0f172a" stroke="#334155" stroke-width="1"/>
          <text x="72" y="15" font-family="system-ui, sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">${d}</text>
        </g>`
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accentColor}"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#bgGrad)"/>
  <rect x="15" y="15" width="370" height="270" rx="16" fill="none" stroke="#334155" stroke-width="1.5"/>
  
  <!-- Glow Circle Behind Icon -->
  <circle cx="200" cy="95" r="50" fill="${accentColor}" opacity="0.12"/>
  <circle cx="200" cy="95" r="38" fill="#1e293b" stroke="${accentColor}" stroke-width="2"/>
  <text x="200" y="108" font-family="system-ui, sans-serif" font-size="34" text-anchor="middle">${icon}</text>
  
  <!-- Badge -->
  <rect x="130" y="148" width="140" height="20" rx="10" fill="#0f172a" stroke="${accentColor}" stroke-width="1"/>
  <text x="200" y="162" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="${accentColor}" text-anchor="middle" letter-spacing="1">GENUINE OEM / OES</text>

  <!-- Titles -->
  <text x="200" y="186" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#f8fafc" text-anchor="middle">${title}</text>
  <text x="200" y="204" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">${subtitle}</text>

  <!-- Spec Pills -->
  ${detailPills}
</svg>`;
}

// Categories
const categories: Record<string, { title: string; subtitle: string; icon: string; color: string }> = {
  "engine.svg": { title: "Engine & Maintenance", subtitle: "Filters, Plugs, Belts & Fluids", icon: "⚙️", color: "#f59e0b" },
  "brakes.svg": { title: "Brakes & Suspension", subtitle: "Pads, Discs & Shocks", icon: "🛑", color: "#ef4444" },
  "electrical.svg": { title: "Electrical & Lighting", subtitle: "Batteries, Lamps & Alternators", icon: "⚡", color: "#eab308" },
  "body.svg": { title: "Body & Exterior", subtitle: "Bumpers, Mirrors & Wipers", icon: "🚗", color: "#3b82f6" },
  "transmission.svg": { title: "Transmission & Drivetrain", subtitle: "Clutches, Bearings & Driveshafts", icon: "🔄", color: "#8b5cf6" },
  "tools.svg": { title: "Tools & Workshop", subtitle: "Diagnostic Scanners & Sockets", icon: "🔧", color: "#10b981" },
  "care.svg": { title: "Accessories & Car Care", subtitle: "Detailing Polish, Mats & Mounts", icon: "✨", color: "#ec4899" },
};

for (const [filename, c] of Object.entries(categories)) {
  fs.writeFileSync(path.join(catDir, filename), createSvg(c.title, c.subtitle, c.icon, c.color, ["Verified Fitment", "Nationwide Dispatch"]));
}

// Products
const products: Record<string, { title: string; subtitle: string; icon: string; color: string; details: string[] }> = {
  "bosch-oil-filter.svg": {
    title: "Bosch Spin-On Oil Filter",
    subtitle: "Part #F002888019 · Maruti K12",
    icon: "🛢️",
    color: "#38bdf8",
    details: ["99% @ 20 Microns", "Anti-Drainback Valve", "Swift / Baleno", "OEM Equivalent"],
  },
  "ngk-spark-plugs.svg": {
    title: "NGK Laser Iridium Spark Plugs",
    subtitle: "Set of 4 · Part #SILZKR6B10E",
    icon: "⚡",
    color: "#eab308",
    details: ["Laser Iridium Tip", "100,000 km Life", "Creta / Seltos", "Genuine Factory OEM"],
  },
  "motul-engine-oil.svg": {
    title: "Motul 8100 X-cess 5W-40 (5L)",
    subtitle: "100% Synthetic · API SP / ACEA A3",
    icon: "🧴",
    color: "#ef4444",
    details: ["SAE 5W-40 Synthetic", "5 Litres Canister", "High Thermal Guard", "VW / MB / Porsche"],
  },
  "brembo-brake-pads.svg": {
    title: "Brembo Ceramic Brake Pads",
    subtitle: "Front Axle Set · Part #P30067",
    icon: "🛑",
    color: "#dc2626",
    details: ["Ceramic Low-Dust", "Anti-Squeal Shims", "Creta / Seltos / Verna", "ECE R90 Certified"],
  },
  "monroe-shock-absorbers.svg": {
    title: "Monroe OESpectrum Struts",
    subtitle: "Front Axle Pair · Gas Charged",
    icon: "🔩",
    color: "#f97316",
    details: ["Twin-Tech Nitrogen", "MacPherson Struts", "Swift Gen 2", "2-Year Warranty"],
  },
  "amaron-battery.svg": {
    title: "Amaron Flo 45Ah Car Battery",
    subtitle: "Model #BH45D20L · Silven-X",
    icon: "🔋",
    color: "#22c55e",
    details: ["45 Ah Capacity", "360 CCA Cranking", "Maintenance Free", "55-Mo Warranty"],
  },
  "valeo-wiper-blades.svg": {
    title: "Valeo Silencio Aerodynamic Wipers",
    subtitle: "Set of 2: 26\" + 16\" Flat Beam",
    icon: "🌧️",
    color: "#06b6d4",
    details: ["Frameless Beam", "500k Wipe Tested", "Creta / City / Seltos", "Graphite Rubber"],
  },
  "luk-clutch-kit.svg": {
    title: "LuK RepSet 3-Piece Clutch Kit",
    subtitle: "Plate, Disc & Bearing · Honda City",
    icon: "⚙️",
    color: "#8b5cf6",
    details: ["212 mm / 24 Splines", "Torsion Damped", "City 1.5L i-VTEC", "German Engineering"],
  },
  "stanley-tool-set.svg": {
    title: "Stanley 110-Pc Mechanics Tool Set",
    subtitle: "1/4\" & 1/2\" Cr-V Sockets & Spanners",
    icon: "🧰",
    color: "#f59e0b",
    details: ["Cr-V Steel Forged", "Maxi-Drive Sockets", "72-Tooth Ratchets", "Heavy-Duty Case"],
  },
  "launch-obd-scanner.svg": {
    title: "Launch CReader 3001 OBD-II",
    subtitle: "Full Engine Code Diagnostic Reader",
    icon: "📟",
    color: "#0ea5e9",
    details: ["Read / Clear Codes", "Color LCD Display", "Live Sensor Data", "All OBD-II Cars"],
  },
  "3m-car-shampoo.svg": {
    title: "3M Wash & Wax Shampoo (2L)",
    subtitle: "pH-Neutral Carnauba Formula",
    icon: "🧼",
    color: "#14b8a6",
    details: ["pH 7.0 Clear Coat Safe", "2.0 Litres Bottle", "Wax Boosted Shine", "High-Foaming"],
  },
  "meguiars-liquid-wax.svg": {
    title: "Meguiar's Ultimate Liquid Wax",
    subtitle: "Pure Hydrophobic Polymer (473ml)",
    icon: "✨",
    color: "#ec4899",
    details: ["Hydrophobic Polymer", "Mirror Reflection", "Includes Applicator", "Clear Coat Safe"],
  },
};

for (const [filename, p] of Object.entries(products)) {
  fs.writeFileSync(path.join(prodDir, filename), createSvg(p.title, p.subtitle, p.icon, p.color, p.details));
}

console.log(`Generated ${Object.keys(categories).length} category assets and ${Object.keys(products).length} product assets.`);
