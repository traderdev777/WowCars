/**
 * WowCars — Mock Car Data (Demo Only)
 * MOCK / DEMO ONLY — Replace with real database queries via Prisma ORM
 */

export interface Car {
  id: string;
  listingCode: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  priceINR: number;
  kmDriven: number;
  fuelType: "Petrol" | "Diesel" | "CNG" | "Electric" | "Hybrid" | "LPG";
  transmission: "Manual" | "Automatic";
  bodyType: "Hatchback" | "Sedan" | "SUV" | "MUV" | "Luxury";
  color: string;
  numOwners: number;
  rtoCode: string;
  rtoArea: string;
  insuranceType: string;
  insuranceValidity?: string;
  city: string;
  locality: string;
  sellerType: "Individual" | "Verified Dealer";
  dealerName?: string;
  isVerified: boolean;
  isFeatured: boolean;
  isSeedData?: boolean;
  status?: string;
  images: string[];
  createdAt: string;
  // Extended Automotive Specifications
  engineDisplacement?: string;
  mileageARAI?: string;
  seatingCapacity?: number;
  bootSpace?: string;
  groundClearance?: string;
  hypothecationStatus?: string;
  features?: string[];
  inspectionScore?: number;
  inspectionHighlights?: string[];
  overview?: string;
}

export const MOCK_CARS: Car[] = [
  {
    id: "1",
    listingCode: "WC-1049",
    make: "Hyundai",
    model: "Creta",
    variant: "SX (O) 1.5 Diesel AT",
    year: 2021,
    priceINR: 1450000,
    kmDriven: 38200,
    fuelType: "Diesel",
    transmission: "Automatic",
    bodyType: "SUV",
    color: "Polar White",
    numOwners: 1,
    rtoCode: "KA-50",
    rtoArea: "Yelahanka",
    insuranceType: "Comprehensive",
    city: "Bengaluru",
    locality: "Yelahanka New Town",
    sellerType: "Verified Dealer",
    dealerName: "Sri Balaji Motors",
    isVerified: true,
    isFeatured: true,
    images: ["/demo/creta.jpg"],
    createdAt: "2024-10-15",
    insuranceValidity: "Nov 2025",
    engineDisplacement: "1493 cc",
    mileageARAI: "18.5 kmpl",
    seatingCapacity: 5,
    bootSpace: "433 Litres",
    groundClearance: "190 mm",
    hypothecationStatus: "Cleared (Bank NOC Available)",
    features: [
      "Panoramic Sunroof",
      "Ventilated Front Seats",
      "Bose 8-Speaker Audio",
      "10.25-inch Touchscreen",
      "Wireless Smartphone Charger",
      "Rear Camera with Guidelines",
      "6 Airbags",
      "Cruise Control"
    ],
    inspectionScore: 9.4,
    inspectionHighlights: [
      "Engine & Transmission in peak health; non-accidental chassis",
      "All 4 Bridgestone tyres with >70% tread depth remaining",
      "Zero flood or electrical water ingress damage",
      "Full service history at Authorized Hyundai Service Center"
    ],
    overview: "Immaculately maintained single-owner Hyundai Creta SX (O) Diesel AT in pristine Polar White. Purchased and registered in Bengaluru (KA-50 Yelahanka). Driven primarily on airport expressway and highway routes. Complete authorized service book available."
  },
  {
    id: "2",
    listingCode: "WC-1048",
    make: "Maruti Suzuki",
    model: "Swift",
    variant: "ZXi Plus",
    year: 2022,
    priceINR: 785000,
    kmDriven: 18500,
    fuelType: "Petrol",
    transmission: "Manual",
    bodyType: "Hatchback",
    color: "Midnight Blue",
    numOwners: 1,
    rtoCode: "KA-04",
    rtoArea: "Yeshwanthpur",
    insuranceType: "Zero Dep",
    insuranceValidity: "March 2026",
    city: "Bengaluru",
    locality: "Rajajinagar",
    sellerType: "Individual",
    isVerified: true,
    isFeatured: false,
    images: ["/demo/swift.jpg"],
    createdAt: "2024-10-14",
    engineDisplacement: "1197 cc DualJet",
    mileageARAI: "23.2 kmpl",
    seatingCapacity: 5,
    bootSpace: "268 Litres",
    groundClearance: "163 mm",
    hypothecationStatus: "None (Cash Purchased)",
    features: [
      "SmartPlay Pro+ Touchscreen",
      "LED Projector Headlamps",
      "Keyless Entry & Push Button Start",
      "Automatic Climate Control",
      "Precision Cut Alloy Wheels",
      "Android Auto & Apple CarPlay"
    ],
    inspectionScore: 9.6,
    inspectionHighlights: [
      "Ultra-low 18,500 km genuine reading with service stamp",
      "Zero scratch exterior, showroom paint condition",
      "Zero insurance claims taken till date"
    ],
    overview: "Pristine 2022 Maruti Swift ZXi Plus directly from individual IT professional in Rajajinagar. Barely driven 18,500 km. Comprehensive zero-depreciation insurance active."
  },
  {
    id: "3",
    listingCode: "WC-1047",
    make: "Tata",
    model: "Nexon",
    variant: "XZ+ Dark Edition",
    year: 2023,
    priceINR: 1240000,
    kmDriven: 12000,
    fuelType: "Petrol",
    transmission: "Manual",
    bodyType: "SUV",
    color: "Daytona Grey",
    numOwners: 1,
    rtoCode: "KA-04",
    rtoArea: "Yeshwanthpur",
    insuranceType: "Comprehensive",
    insuranceValidity: "Jan 2026",
    city: "Bengaluru",
    locality: "Whitefield",
    sellerType: "Individual",
    isVerified: false,
    isFeatured: false,
    images: ["/demo/nexon.jpg"],
    createdAt: "2024-10-13",
    engineDisplacement: "1199 cc Turbocharged",
    mileageARAI: "17.4 kmpl",
    seatingCapacity: 5,
    bootSpace: "382 Litres",
    groundClearance: "208 mm",
    hypothecationStatus: "Cleared (NOC Available)",
    features: [
      "5-Star Global NCAP Safety",
      "Electric Sunroof",
      "Harman 8-Speaker Sound System",
      "Ventilated Leatherette Seats",
      "Air Purifier with AQI Display",
      "Rain Sensing Wipers"
    ],
    inspectionScore: 9.3,
    inspectionHighlights: [
      "Barely 1 year old, mint condition",
      "Under Tata Factory Warranty till 2026",
      "High ground clearance (208mm) perfect for Bengaluru roads"
    ],
    overview: "Special Dark Edition Tata Nexon in Daytona Grey with blacked-out alloy wheels and badges. Single techie owner relocating abroad. Factory warranty active."
  },
  {
    id: "4",
    listingCode: "WC-1046",
    make: "Honda",
    model: "City",
    variant: "V 4th Gen",
    year: 2019,
    priceINR: 920000,
    kmDriven: 52300,
    fuelType: "Petrol",
    transmission: "Manual",
    bodyType: "Sedan",
    color: "Lunar Silver",
    numOwners: 1,
    rtoCode: "KA-05",
    rtoArea: "Jayanagar",
    insuranceType: "Comprehensive",
    insuranceValidity: "August 2025",
    city: "Bengaluru",
    locality: "Jayanagar",
    sellerType: "Individual",
    isVerified: true,
    isFeatured: false,
    images: ["/demo/city.jpg"],
    createdAt: "2024-10-12",
    engineDisplacement: "1498 cc i-VTEC",
    mileageARAI: "17.8 kmpl",
    seatingCapacity: 5,
    bootSpace: "510 Litres",
    groundClearance: "165 mm",
    hypothecationStatus: "None (Cash Purchased)",
    features: [
      "Iconic 1.5L i-VTEC High Revving Engine",
      "Class-Leading 510L Trunk Space",
      "Automatic Climate Control with Rear AC Vents",
      "Alloy Wheels",
      "Cruise Control",
      "Dual Airbags & ABS with EBD"
    ],
    inspectionScore: 9.1,
    inspectionHighlights: [
      "Engine compression test passed with 100% score",
      "All suspension bushes inspected & healthy",
      "Original paint, zero structural accidents"
    ],
    overview: "Legendary Honda City 1.5 i-VTEC known for bulletproof Japanese reliability. Single doctor owner driven in South Bengaluru. Spacious plush rear bench with armrest."
  },
  {
    id: "5",
    listingCode: "WC-1045",
    make: "Kia",
    model: "Seltos",
    variant: "HTX+ 1.5 Petrol DCT",
    year: 2020,
    priceINR: 1180000,
    kmDriven: 44100,
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "SUV",
    color: "Glacier White Pearl",
    numOwners: 1,
    rtoCode: "KA-41",
    rtoArea: "Devanahalli",
    insuranceType: "Comprehensive",
    insuranceValidity: "October 2025",
    city: "Bengaluru",
    locality: "Hebbal",
    sellerType: "Verified Dealer",
    dealerName: "AutoTrust Cars",
    isVerified: true,
    isFeatured: true,
    images: ["/demo/seltos.jpg"],
    createdAt: "2024-10-11",
    engineDisplacement: "1497 cc Smartstream",
    mileageARAI: "16.8 kmpl",
    seatingCapacity: 5,
    bootSpace: "433 Litres",
    groundClearance: "190 mm",
    hypothecationStatus: "Cleared (Bank NOC Available)",
    features: [
      "Dual Clutch Automatic (DCT)",
      "Bose Premium 8-Speaker System",
      "Ambient Mood Lighting with Sound Sync",
      "Ventilated Front Seats",
      "10.25-inch Touchscreen Navigation",
      "UV Cut Solar Glass"
    ],
    inspectionScore: 9.2,
    inspectionHighlights: [
      "Transmission fluid and clutch wear inspected — smooth shifts",
      "Brake pads at 80% remaining life",
      "Verified dealer warranty with 6-month engine cover"
    ],
    overview: "Feature-packed Kia Seltos HTX+ Petrol Automatic in Glacier White Pearl. Thoroughly inspected by WowCars certified mechanics with 6-month dealer engine & gearbox assurance."
  },
  {
    id: "6",
    listingCode: "WC-1044",
    make: "Volkswagen",
    model: "Polo",
    variant: "GT TSI Automatic",
    year: 2018,
    priceINR: 680000,
    kmDriven: 61800,
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "Hatchback",
    color: "Flash Red",
    numOwners: 2,
    rtoCode: "KA-04",
    rtoArea: "Yeshwanthpur",
    insuranceType: "Third Party",
    insuranceValidity: "June 2025",
    city: "Bengaluru",
    locality: "Koramangala",
    sellerType: "Individual",
    isVerified: false,
    isFeatured: false,
    images: ["/demo/polo.jpg"],
    createdAt: "2024-10-10",
    engineDisplacement: "1197 cc TSI Turbo",
    mileageARAI: "17.2 kmpl",
    seatingCapacity: 5,
    bootSpace: "280 Litres",
    groundClearance: "168 mm",
    hypothecationStatus: "Cleared (NOC Available)",
    features: [
      "Legendary 7-Speed DSG Automatic Gearbox",
      "Solid German Build Quality & Thick Gauge Steel",
      "Electronic Stability Programme (ESP)",
      "Hill Hold Control",
      "Leather-wrapped Flat-bottom Steering Wheel",
      "Cruise Control"
    ],
    inspectionScore: 8.8,
    inspectionHighlights: [
      "DSG mechatronics inspected and healthy",
      "New battery installed in July 2024 with 3-year warranty",
      "Enthusiast owned with timely synthetic oil changes"
    ],
    overview: "The quintessential hot hatch in stunning Flash Red. 1.2 Turbo TSI mated to rapid 7-speed DSG transmission. Clean title, fun daily driver for city and twisty ghats."
  },
  {
    id: "7",
    listingCode: "WC-1043",
    make: "Toyota",
    model: "Innova Crysta",
    variant: "2.4 VX MT 8-Str",
    year: 2020,
    priceINR: 2250000,
    kmDriven: 48000,
    fuelType: "Diesel",
    transmission: "Manual",
    bodyType: "MUV",
    color: "Super White",
    numOwners: 1,
    rtoCode: "KA-50",
    rtoArea: "Yelahanka",
    insuranceType: "Comprehensive",
    insuranceValidity: "December 2025",
    city: "Bengaluru",
    locality: "Yelahanka",
    sellerType: "Verified Dealer",
    dealerName: "Sri Balaji Motors",
    isVerified: true,
    isFeatured: true,
    images: ["/demo/innova.jpg"],
    createdAt: "2024-10-09",
    engineDisplacement: "2393 cc D-4D Diesel",
    mileageARAI: "15.1 kmpl",
    seatingCapacity: 8,
    bootSpace: "300 Litres (Expandable)",
    groundClearance: "178 mm",
    hypothecationStatus: "Cleared (Bank NOC Available)",
    features: [
      "Unrivalled Toyota GD-series 2.4L Diesel Engine",
      "8 Comfortable Captain/Bench Seats",
      "Rear Automatic AC Controls",
      "Touchscreen Audio System",
      "Eco & Power Driving Modes",
      "7 Airbags & ABS with Brake Assist"
    ],
    inspectionScore: 9.7,
    inspectionHighlights: [
      "Toyota D-4D engine in pristine condition — good for 3,00,000+ km",
      "Single owner family used, never commercial/taxi",
      "Full Toyota dealership service history available"
    ],
    overview: "The undisputed king of Indian highways. 2020 Toyota Innova Crysta 2.4 VX 8-Seater in Super White. Single private family owner, zero commercial usage, serviced exclusively at Nandi Toyota."
  },
  {
    id: "8",
    listingCode: "WC-1042",
    make: "Maruti Suzuki",
    model: "Baleno",
    variant: "Alpha CVT",
    year: 2022,
    priceINR: 890000,
    kmDriven: 21000,
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "Hatchback",
    color: "Nexa Blue",
    numOwners: 1,
    rtoCode: "KA-04",
    rtoArea: "Yeshwanthpur",
    insuranceType: "Zero Dep",
    insuranceValidity: "April 2026",
    city: "Bengaluru",
    locality: "Malleshwaram",
    sellerType: "Verified Dealer",
    dealerName: "AutoTrust Cars",
    isVerified: true,
    isFeatured: false,
    images: ["/demo/baleno.jpg"],
    createdAt: "2024-10-08",
    engineDisplacement: "1197 cc K12N DualJet",
    mileageARAI: "22.9 kmpl",
    seatingCapacity: 5,
    bootSpace: "318 Litres",
    groundClearance: "170 mm",
    hypothecationStatus: "Cleared (NOC Available)",
    features: [
      "Head-Up Display (HUD)",
      "360-Degree View HD Camera",
      "9-inch SmartPlay Pro+ Audio by ARKAMYS",
      "LED Projector Headlights & Taillights",
      "Rear Fast-Charging USB Ports",
      "Auto-Dimming IRVM"
    ],
    inspectionScore: 9.5,
    inspectionHighlights: [
      "Top-end Alpha model with 360-degree camera & Head-Up display",
      "Zero scratch body panels, garaged indoor since purchase",
      "Under Maruti Suzuki extended warranty till 2027"
    ],
    overview: "Top-of-the-line Baleno Alpha Automatic in signature Nexa Blue. Equipped with segment-first HUD and 360-degree camera. Extremely smooth for city traffic and fuel-efficient."
  }
];

export const WHATSAPP_CONCIERGE_PHONE = "919019088160";

/**
 * Fetch a car by its listing code (case-insensitive) or internal ID
 */
export function getCarByCode(code: string): Car | undefined {
  const normalized = code.toLowerCase().trim();
  return MOCK_CARS.find(
    (c) => c.listingCode.toLowerCase() === normalized || c.id === normalized
  );
}

/**
 * Fetch all available cars
 */
export function getAllCars(): Car[] {
  return MOCK_CARS;
}

/**
 * Fetch similar/related cars based on body type, price bracket, or make
 */
export function getRelatedCars(currentCar: Car, limit = 3): Car[] {
  return MOCK_CARS.filter((c) => c.id !== currentCar.id)
    .sort((a, b) => {
      // Prioritize same body type
      if (a.bodyType === currentCar.bodyType && b.bodyType !== currentCar.bodyType) return -1;
      if (b.bodyType === currentCar.bodyType && a.bodyType !== currentCar.bodyType) return 1;
      // Then prioritize closer price
      const diffA = Math.abs(a.priceINR - currentCar.priceINR);
      const diffB = Math.abs(b.priceINR - currentCar.priceINR);
      return diffA - diffB;
    })
    .slice(0, limit);
}
