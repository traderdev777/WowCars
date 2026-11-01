import { NextResponse } from "next/server";

export interface VehicleOption {
  make: string;
  models: {
    name: string;
    startYear: number;
    endYear: number;
    variants: string[];
    fuelTypes: string[];
  }[];
}

const VEHICLE_CATALOG: VehicleOption[] = [
  {
    make: "Maruti Suzuki",
    models: [
      { name: "Swift", startYear: 2005, endYear: 2026, variants: ["LXI", "VXI", "ZXI", "ZXI+"], fuelTypes: ["Petrol", "CNG"] },
      { name: "Dzire", startYear: 2008, endYear: 2026, variants: ["LXI", "VXI", "ZXI", "ZXI+"], fuelTypes: ["Petrol", "CNG"] },
      { name: "Baleno", startYear: 2015, endYear: 2026, variants: ["Sigma", "Delta", "Zeta", "Alpha"], fuelTypes: ["Petrol", "CNG"] },
      { name: "WagonR", startYear: 2000, endYear: 2026, variants: ["LXI", "VXI", "ZXI"], fuelTypes: ["Petrol", "CNG"] },
      { name: "Brezza", startYear: 2016, endYear: 2026, variants: ["LXI", "VXI", "ZXI", "ZXI+"], fuelTypes: ["Petrol", "CNG"] },
      { name: "Ertiga", startYear: 2012, endYear: 2026, variants: ["LXI", "VXI", "ZXI", "ZXI+"], fuelTypes: ["Petrol", "CNG"] },
    ],
  },
  {
    make: "Hyundai",
    models: [
      { name: "Creta", startYear: 2015, endYear: 2026, variants: ["E", "EX", "S", "SX", "SX(O)"], fuelTypes: ["Petrol", "Diesel"] },
      { name: "Venue", startYear: 2019, endYear: 2026, variants: ["E", "S", "SX", "SX(O)"], fuelTypes: ["Petrol", "Diesel"] },
      { name: "i20", startYear: 2008, endYear: 2026, variants: ["Magna", "Sportz", "Asta", "Asta(O)"], fuelTypes: ["Petrol"] },
      { name: "Verna", startYear: 2006, endYear: 2026, variants: ["EX", "S", "SX", "SX(O)"], fuelTypes: ["Petrol", "Diesel"] },
      { name: "Grand i10", startYear: 2013, endYear: 2026, variants: ["Era", "Magna", "Sportz", "Asta"], fuelTypes: ["Petrol", "CNG"] },
    ],
  },
  {
    make: "Tata",
    models: [
      { name: "Nexon", startYear: 2017, endYear: 2026, variants: ["Smart", "Pure", "Creative", "Fearless"], fuelTypes: ["Petrol", "Diesel", "EV"] },
      { name: "Punch", startYear: 2021, endYear: 2026, variants: ["Pure", "Adventure", "Accomplished", "Creative"], fuelTypes: ["Petrol", "CNG", "EV"] },
      { name: "Altroz", startYear: 2020, endYear: 2026, variants: ["XE", "XM", "XT", "XZ", "XZ+"], fuelTypes: ["Petrol", "Diesel", "CNG"] },
      { name: "Harrier", startYear: 2019, endYear: 2026, variants: ["Smart", "Pure", "Adventure", "Fearless"], fuelTypes: ["Diesel"] },
      { name: "Safari", startYear: 2021, endYear: 2026, variants: ["Smart", "Pure", "Adventure", "Accomplished"], fuelTypes: ["Diesel"] },
    ],
  },
  {
    make: "Mahindra",
    models: [
      { name: "Thar", startYear: 2010, endYear: 2026, variants: ["AX", "AX Opt", "LX", "Roxx"], fuelTypes: ["Petrol", "Diesel"] },
      { name: "Scorpio-N", startYear: 2022, endYear: 2026, variants: ["Z2", "Z4", "Z6", "Z8", "Z8L"], fuelTypes: ["Petrol", "Diesel"] },
      { name: "XUV700", startYear: 2021, endYear: 2026, variants: ["MX", "AX3", "AX5", "AX7", "AX7L"], fuelTypes: ["Petrol", "Diesel"] },
      { name: "Bolero", startYear: 2000, endYear: 2026, variants: ["B4", "B6", "B6 Opt"], fuelTypes: ["Diesel"] },
    ],
  },
  {
    make: "Honda",
    models: [
      { name: "City", startYear: 1998, endYear: 2026, variants: ["V", "VX", "ZX"], fuelTypes: ["Petrol", "Hybrid", "Diesel"] },
      { name: "Amaze", startYear: 2013, endYear: 2026, variants: ["E", "S", "VX"], fuelTypes: ["Petrol", "Diesel"] },
      { name: "Elevate", startYear: 2023, endYear: 2026, variants: ["SV", "V", "VX", "ZX"], fuelTypes: ["Petrol"] },
    ],
  },
  {
    make: "Toyota",
    models: [
      { name: "Innova Crysta", startYear: 2016, endYear: 2026, variants: ["GX", "VX", "ZX"], fuelTypes: ["Diesel", "Petrol"] },
      { name: "Fortuner", startYear: 2009, endYear: 2026, variants: ["4x2", "4x4", "Legender", "GR-S"], fuelTypes: ["Diesel", "Petrol"] },
      { name: "Urban Cruiser Hyryder", startYear: 2022, endYear: 2026, variants: ["E", "S", "G", "V"], fuelTypes: ["Hybrid", "Petrol", "CNG"] },
    ],
  },
  {
    make: "Kia",
    models: [
      { name: "Seltos", startYear: 2019, endYear: 2026, variants: ["HTE", "HTK", "HTX", "GTX", "X-Line"], fuelTypes: ["Petrol", "Diesel"] },
      { name: "Sonet", startYear: 2020, endYear: 2026, variants: ["HTE", "HTK", "HTX", "GTX+", "X-Line"], fuelTypes: ["Petrol", "Diesel"] },
    ],
  },
  {
    make: "Volkswagen",
    models: [
      { name: "Polo", startYear: 2010, endYear: 2022, variants: ["Trendline", "Comfortline", "Highline", "GT TSI"], fuelTypes: ["Petrol", "Diesel"] },
      { name: "Taigun", startYear: 2021, endYear: 2026, variants: ["Comfortline", "Highline", "Topline", "GT Plus"], fuelTypes: ["Petrol"] },
      { name: "Virtus", startYear: 2022, endYear: 2026, variants: ["Comfortline", "Highline", "Topline", "GT Plus"], fuelTypes: ["Petrol"] },
    ],
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    vehicles: VEHICLE_CATALOG,
    makes: VEHICLE_CATALOG.map((v) => v.make),
  });
}
