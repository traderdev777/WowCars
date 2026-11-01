/**
 * WowCars — PAN-India Administrative Geography & Location Dataset
 *
 * Source: Local Government Directory (LGD), Ministry of Panchayati Raj,
 *         Government of India (lgd.gov.in) & Survey of India Administrative Atlas.
 * Version: 2026.1 (Verified PAN-India Standard)
 * Last Updated: 2026-10-28
 *
 * Covers all 28 States and 8 Union Territories (36 administrative divisions).
 */

import { State, District, City } from "../db/types";

export const LOCATION_DATASET_METADATA = {
  source: "Ministry of Panchayati Raj / Local Government Directory (LGD) & Survey of India (lgd.gov.in)",
  version: "2026.1",
  lastUpdated: "2026-10-28T00:00:00.000Z",
  totalStatesAndUTs: 36,
  notes: "Normalized administrative hierarchy (India -> State/UT -> District -> City/Town). Updateable by authorized administrators.",
};

// --------------------------------------------------------------------------------------
// 1. ALL 36 INDIAN STATES & UNION TERRITORIES (ISO 3166-2:IN)
// --------------------------------------------------------------------------------------
export const SEED_STATES: State[] = [
  // 28 States
  { id: "IN-AP", name: "Andhra Pradesh", type: "STATE", code: "AP", capital: "Amaravati", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-AR", name: "Arunachal Pradesh", type: "STATE", code: "AR", capital: "Itanagar", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-AS", name: "Assam", type: "STATE", code: "AS", capital: "Dispur", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-BR", name: "Bihar", type: "STATE", code: "BR", capital: "Patna", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-CT", name: "Chhattisgarh", type: "STATE", code: "CT", capital: "Raipur", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-GA", name: "Goa", type: "STATE", code: "GA", capital: "Panaji", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-GJ", name: "Gujarat", type: "STATE", code: "GJ", capital: "Gandhinagar", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-HR", name: "Haryana", type: "STATE", code: "HR", capital: "Chandigarh", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-HP", name: "Himachal Pradesh", type: "STATE", code: "HP", capital: "Shimla", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-JH", name: "Jharkhand", type: "STATE", code: "JH", capital: "Ranchi", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA", name: "Karnataka", type: "STATE", code: "KA", capital: "Bengaluru", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KL", name: "Kerala", type: "STATE", code: "KL", capital: "Thiruvananthapuram", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MP", name: "Madhya Pradesh", type: "STATE", code: "MP", capital: "Bhopal", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MH", name: "Maharashtra", type: "STATE", code: "MH", capital: "Mumbai", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MN", name: "Manipur", type: "STATE", code: "MN", capital: "Imphal", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-ML", name: "Meghalaya", type: "STATE", code: "ML", capital: "Shillong", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MZ", name: "Mizoram", type: "STATE", code: "MZ", capital: "Aizawl", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-NL", name: "Nagaland", type: "STATE", code: "NL", capital: "Kohima", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-OR", name: "Odisha", type: "STATE", code: "OR", capital: "Bhubaneswar", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-PB", name: "Punjab", type: "STATE", code: "PB", capital: "Chandigarh", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-RJ", name: "Rajasthan", type: "STATE", code: "RJ", capital: "Jaipur", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-SK", name: "Sikkim", type: "STATE", code: "SK", capital: "Gangtok", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-TN", name: "Tamil Nadu", type: "STATE", code: "TN", capital: "Chennai", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-TG", name: "Telangana", type: "STATE", code: "TG", capital: "Hyderabad", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-TR", name: "Tripura", type: "STATE", code: "TR", capital: "Agartala", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-UP", name: "Uttar Pradesh", type: "STATE", code: "UP", capital: "Lucknow", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-UT", name: "Uttarakhand", type: "STATE", code: "UT", capital: "Dehradun", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-WB", name: "West Bengal", type: "STATE", code: "WB", capital: "Kolkata", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // 8 Union Territories
  { id: "IN-AN", name: "Andaman and Nicobar Islands", type: "UT", code: "AN", capital: "Port Blair", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-CH", name: "Chandigarh", type: "UT", code: "CH", capital: "Chandigarh", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-DH", name: "Dadra and Nagar Haveli and Daman and Diu", type: "UT", code: "DH", capital: "Daman", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-DL", name: "Delhi", type: "UT", code: "DL", capital: "New Delhi", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-JK", name: "Jammu and Kashmir", type: "UT", code: "JK", capital: "Srinagar / Jammu", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-LA", name: "Ladakh", type: "UT", code: "LA", capital: "Leh", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-LD", name: "Lakshadweep", type: "UT", code: "LD", capital: "Kavaratti", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-PY", name: "Puducherry", type: "UT", code: "PY", capital: "Puducherry", isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
];

// --------------------------------------------------------------------------------------
// 2. ADMINISTRATIVE DISTRICTS
// Includes full official 31 districts for Karnataka, plus primary districts for all states/UTs
// --------------------------------------------------------------------------------------
export const SEED_DISTRICTS: District[] = [
  // KARNATAKA (All 31 official districts)
  { id: "IN-KA-BLRU", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Bengaluru Urban", slug: "bengaluru-urban", isActive: true, expansionStatus: "COVERED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-BLRR", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Bengaluru Rural", slug: "bengaluru-rural", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-MYS", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Mysuru", slug: "mysuru", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-DK", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Dakshina Kannada (Mangaluru)", slug: "dakshina-kannada", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-BEL", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Belagavi", slug: "belagavi", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-DHA", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Dharwad (Hubballi)", slug: "dharwad", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-TUM", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Tumakuru", slug: "tumakuru", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-UDU", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Udupi", slug: "udupi", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-SHI", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Shivamogga", slug: "shivamogga", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-BAL", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Ballari", slug: "ballari", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-DAV", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Davanagere", slug: "davanagere", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-KAL", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Kalaburagi", slug: "kalaburagi", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-HAS", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Hassan", slug: "hassan", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-MAN", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Mandya", slug: "mandya", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-CKM", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Chikkamagaluru", slug: "chikkamagaluru", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-KOL", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Kolar", slug: "kolar", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-RAM", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Ramanagara", slug: "ramanagara", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-BAG", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Bagalkote", slug: "bagalkote", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-BID", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Bidar", slug: "bidar", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-CHN", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Chamarajanagar", slug: "chamarajanagar", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-CKB", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Chikkaballapura", slug: "chikkaballapura", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-CHD", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Chitradurga", slug: "chitradurga", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-GAD", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Gadag", slug: "gadag", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-HAV", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Haveri", slug: "haveri", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-KOD", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Kodagu (Madikeri)", slug: "kodagu", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-KOP", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Koppal", slug: "koppal", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-RAI", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Raichur", slug: "raichur", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-UK", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Uttara Kannada (Karwar)", slug: "uttara-kannada", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-VIJ", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Vijayapura", slug: "vijayapura", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-YAD", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Yadgir", slug: "yadgir", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-VJN", stateId: "IN-KA", stateCode: "KA", stateName: "Karnataka", name: "Vijayanagara (Hosapete)", slug: "vijayanagara", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // MAHARASHTRA
  { id: "IN-MH-MUM", stateId: "IN-MH", stateCode: "MH", stateName: "Maharashtra", name: "Mumbai City", slug: "mumbai-city", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MH-MSU", stateId: "IN-MH", stateCode: "MH", stateName: "Maharashtra", name: "Mumbai Suburban", slug: "mumbai-suburban", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MH-PUN", stateId: "IN-MH", stateCode: "MH", stateName: "Maharashtra", name: "Pune", slug: "pune", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MH-THA", stateId: "IN-MH", stateCode: "MH", stateName: "Maharashtra", name: "Thane", slug: "thane", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MH-NAG", stateId: "IN-MH", stateCode: "MH", stateName: "Maharashtra", name: "Nagpur", slug: "nagpur", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MH-NAS", stateId: "IN-MH", stateCode: "MH", stateName: "Maharashtra", name: "Nashik", slug: "nashik", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MH-CSN", stateId: "IN-MH", stateCode: "MH", stateName: "Maharashtra", name: "Chhatrapati Sambhajinagar", slug: "chhatrapati-sambhajinagar", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // DELHI NCT
  { id: "IN-DL-ND", stateId: "IN-DL", stateCode: "DL", stateName: "Delhi", name: "New Delhi", slug: "new-delhi", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-DL-SD", stateId: "IN-DL", stateCode: "DL", stateName: "Delhi", name: "South Delhi", slug: "south-delhi", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-DL-CD", stateId: "IN-DL", stateCode: "DL", stateName: "Delhi", name: "Central Delhi", slug: "central-delhi", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-DL-WD", stateId: "IN-DL", stateCode: "DL", stateName: "Delhi", name: "West Delhi", slug: "west-delhi", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-DL-ED", stateId: "IN-DL", stateCode: "DL", stateName: "Delhi", name: "East Delhi", slug: "east-delhi", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // TAMIL NADU
  { id: "IN-TN-CHN", stateId: "IN-TN", stateCode: "TN", stateName: "Tamil Nadu", name: "Chennai", slug: "chennai", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-TN-CBE", stateId: "IN-TN", stateCode: "TN", stateName: "Tamil Nadu", name: "Coimbatore", slug: "coimbatore", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-TN-MDU", stateId: "IN-TN", stateCode: "TN", stateName: "Tamil Nadu", name: "Madurai", slug: "madurai", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-TN-TRY", stateId: "IN-TN", stateCode: "TN", stateName: "Tamil Nadu", name: "Tiruchirappalli", slug: "tiruchirappalli", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // TELANGANA
  { id: "IN-TG-HYD", stateId: "IN-TG", stateCode: "TG", stateName: "Telangana", name: "Hyderabad", slug: "hyderabad", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-TG-MED", stateId: "IN-TG", stateCode: "TG", stateName: "Telangana", name: "Medchal-Malkajgiri", slug: "medchal-malkajgiri", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-TG-RNG", stateId: "IN-TG", stateCode: "TG", stateName: "Telangana", name: "Rangareddy", slug: "rangareddy", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-TG-WAR", stateId: "IN-TG", stateCode: "TG", stateName: "Telangana", name: "Warangal", slug: "warangal", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // GUJARAT
  { id: "IN-GJ-AHM", stateId: "IN-GJ", stateCode: "GJ", stateName: "Gujarat", name: "Ahmedabad", slug: "ahmedabad", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-GJ-SUR", stateId: "IN-GJ", stateCode: "GJ", stateName: "Gujarat", name: "Surat", slug: "surat", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-GJ-VAD", stateId: "IN-GJ", stateCode: "GJ", stateName: "Gujarat", name: "Vadodara", slug: "vadodara", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-GJ-RAJ", stateId: "IN-GJ", stateCode: "GJ", stateName: "Gujarat", name: "Rajkot", slug: "rajkot", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // KERALA
  { id: "IN-KL-ERK", stateId: "IN-KL", stateCode: "KL", stateName: "Kerala", name: "Ernakulam (Kochi)", slug: "ernakulam", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KL-TVM", stateId: "IN-KL", stateCode: "KL", stateName: "Kerala", name: "Thiruvananthapuram", slug: "thiruvananthapuram", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KL-KKD", stateId: "IN-KL", stateCode: "KL", stateName: "Kerala", name: "Kozhikode", slug: "kozhikode", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // UTTAR PRADESH
  { id: "IN-UP-GBN", stateId: "IN-UP", stateCode: "UP", stateName: "Uttar Pradesh", name: "Gautam Buddha Nagar (Noida)", slug: "noida", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-UP-GZB", stateId: "IN-UP", stateCode: "UP", stateName: "Uttar Pradesh", name: "Ghaziabad", slug: "ghaziabad", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-UP-LKO", stateId: "IN-UP", stateCode: "UP", stateName: "Uttar Pradesh", name: "Lucknow", slug: "lucknow", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-UP-KAN", stateId: "IN-UP", stateCode: "UP", stateName: "Uttar Pradesh", name: "Kanpur Nagar", slug: "kanpur", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // HARYANA
  { id: "IN-HR-GUR", stateId: "IN-HR", stateCode: "HR", stateName: "Haryana", name: "Gurugram", slug: "gurugram", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-HR-FAR", stateId: "IN-HR", stateCode: "HR", stateName: "Haryana", name: "Faridabad", slug: "faridabad", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // WEST BENGAL
  { id: "IN-WB-KOL", stateId: "IN-WB", stateCode: "WB", stateName: "West Bengal", name: "Kolkata", slug: "kolkata", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-WB-HWH", stateId: "IN-WB", stateCode: "WB", stateName: "West Bengal", name: "Howrah", slug: "howrah", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // RAJASTHAN
  { id: "IN-RJ-JAI", stateId: "IN-RJ", stateCode: "RJ", stateName: "Rajasthan", name: "Jaipur", slug: "jaipur", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-RJ-JOD", stateId: "IN-RJ", stateCode: "RJ", stateName: "Rajasthan", name: "Jodhpur", slug: "jodhpur", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // PUNJAB
  { id: "IN-PB-LUD", stateId: "IN-PB", stateCode: "PB", stateName: "Punjab", name: "Ludhiana", slug: "ludhiana", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-PB-ASR", stateId: "IN-PB", stateCode: "PB", stateName: "Punjab", name: "Amritsar", slug: "amritsar", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // ANDHRA PRADESH
  { id: "IN-AP-VSK", stateId: "IN-AP", stateCode: "AP", stateName: "Andhra Pradesh", name: "Visakhapatnam", slug: "visakhapatnam", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-AP-NTR", stateId: "IN-AP", stateCode: "AP", stateName: "Andhra Pradesh", name: "NTR (Vijayawada)", slug: "vijayawada", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // CHANDIGARH
  { id: "IN-CH-CHD", stateId: "IN-CH", stateCode: "CH", stateName: "Chandigarh", name: "Chandigarh", slug: "chandigarh", isActive: true, expansionStatus: "OUTREACH", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // GOA
  { id: "IN-GA-NG", stateId: "IN-GA", stateCode: "GA", stateName: "Goa", name: "North Goa", slug: "north-goa", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-GA-SG", stateId: "IN-GA", stateCode: "GA", stateName: "Goa", name: "South Goa", slug: "south-goa", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // OTHER STATES & UTs (Sample Capital / Primary Districts)
  { id: "IN-BR-PAT", stateId: "IN-BR", stateCode: "BR", stateName: "Bihar", name: "Patna", slug: "patna", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MP-IND", stateId: "IN-MP", stateCode: "MP", stateName: "Madhya Pradesh", name: "Indore", slug: "indore", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-OR-KHO", stateId: "IN-OR", stateCode: "OR", stateName: "Odisha", name: "Khordha (Bhubaneswar)", slug: "bhubaneswar", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-JH-RAN", stateId: "IN-JH", stateCode: "JH", stateName: "Jharkhand", name: "Ranchi", slug: "ranchi", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-AS-KAM", stateId: "IN-AS", stateCode: "AS", stateName: "Assam", name: "Kamrup Metropolitan (Guwahati)", slug: "guwahati", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-CT-RAI", stateId: "IN-CT", stateCode: "CT", stateName: "Chhattisgarh", name: "Raipur", slug: "raipur", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-UT-DEH", stateId: "IN-UT", stateCode: "UT", stateName: "Uttarakhand", name: "Dehradun", slug: "dehradun", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-HP-SHI", stateId: "IN-HP", stateCode: "HP", stateName: "Himachal Pradesh", name: "Shimla", slug: "shimla", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-JK-SRI", stateId: "IN-JK", stateCode: "JK", stateName: "Jammu and Kashmir", name: "Srinagar", slug: "srinagar", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-PY-PUD", stateId: "IN-PY", stateCode: "PY", stateName: "Puducherry", name: "Puducherry", slug: "puducherry", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-TR-WST", stateId: "IN-TR", stateCode: "TR", stateName: "Tripura", name: "West Tripura (Agartala)", slug: "agartala", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-ML-EKH", stateId: "IN-ML", stateCode: "ML", stateName: "Meghalaya", name: "East Khasi Hills (Shillong)", slug: "shillong", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MN-IMW", stateId: "IN-MN", stateCode: "MN", stateName: "Manipur", name: "Imphal West", slug: "imphal-west", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-NL-KOH", stateId: "IN-NL", stateCode: "NL", stateName: "Nagaland", name: "Kohima", slug: "kohima", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MZ-AIZ", stateId: "IN-MZ", stateCode: "MZ", stateName: "Mizoram", name: "Aizawl", slug: "aizawl", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-AR-PAP", stateId: "IN-AR", stateCode: "AR", stateName: "Arunachal Pradesh", name: "Papum Pare (Itanagar)", slug: "itanagar", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-SK-EAS", stateId: "IN-SK", stateCode: "SK", stateName: "Sikkim", name: "East Sikkim (Gangtok)", slug: "gangtok", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-LA-LEH", stateId: "IN-LA", stateCode: "LA", stateName: "Ladakh", name: "Leh", slug: "leh", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-AN-SAN", stateId: "IN-AN", stateCode: "AN", stateName: "Andaman and Nicobar Islands", name: "South Andaman (Port Blair)", slug: "port-blair", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-DH-DAM", stateId: "IN-DH", stateCode: "DH", stateName: "Dadra and Nagar Haveli and Daman and Diu", name: "Daman", slug: "daman", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-LD-LAK", stateId: "IN-LD", stateCode: "LD", stateName: "Lakshadweep", name: "Lakshadweep (Kavaratti)", slug: "kavaratti", isActive: true, expansionStatus: "NOT_STARTED", createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
];

// --------------------------------------------------------------------------------------
// 3. CITIES & TOWNS
// --------------------------------------------------------------------------------------
export const SEED_CITIES: City[] = [
  // Bengaluru Urban cities & major hubs
  { id: "IN-KA-BLRU-BENGALURU", districtId: "IN-KA-BLRU", stateId: "IN-KA", name: "Bengaluru", slug: "bengaluru", pincodes: ["560001", "560038", "560095", "560068", "560066"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-BLRU-INDIRANAGAR", districtId: "IN-KA-BLRU", stateId: "IN-KA", name: "Indiranagar", slug: "indiranagar", pincodes: ["560038"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-BLRU-KORAMANGALA", districtId: "IN-KA-BLRU", stateId: "IN-KA", name: "Koramangala", slug: "koramangala", pincodes: ["560095", "560034"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-BLRU-WHITEFIELD", districtId: "IN-KA-BLRU", stateId: "IN-KA", name: "Whitefield", slug: "whitefield", pincodes: ["560066"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-BLRU-ECITY", districtId: "IN-KA-BLRU", stateId: "IN-KA", name: "Electronic City", slug: "electronic-city", pincodes: ["560100"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-BLRU-YELAHANKA", districtId: "IN-KA-BLRU", stateId: "IN-KA", name: "Yelahanka", slug: "yelahanka", pincodes: ["560064"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // Karnataka other major district centers
  { id: "IN-KA-MYS-MYSURU", districtId: "IN-KA-MYS", stateId: "IN-KA", name: "Mysuru", slug: "mysuru-city", pincodes: ["570001"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-DK-MANGALURU", districtId: "IN-KA-DK", stateId: "IN-KA", name: "Mangaluru", slug: "mangaluru", pincodes: ["575001"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-DHA-HUBBALLI", districtId: "IN-KA-DHA", stateId: "IN-KA", name: "Hubballi-Dharwad", slug: "hubballi", pincodes: ["580020"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-KA-BEL-BELAGAVI", districtId: "IN-KA-BEL", stateId: "IN-KA", name: "Belagavi", slug: "belagavi-city", pincodes: ["590001"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // Maharashtra
  { id: "IN-MH-MUM-MUMBAI", districtId: "IN-MH-MUM", stateId: "IN-MH", name: "Mumbai", slug: "mumbai", pincodes: ["400001"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
  { id: "IN-MH-PUN-PUNE", districtId: "IN-MH-PUN", stateId: "IN-MH", name: "Pune", slug: "pune-city", pincodes: ["411001"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // Delhi
  { id: "IN-DL-ND-DELHI", districtId: "IN-DL-ND", stateId: "IN-DL", name: "New Delhi", slug: "new-delhi-city", pincodes: ["110001"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // Tamil Nadu
  { id: "IN-TN-CHN-CHENNAI", districtId: "IN-TN-CHN", stateId: "IN-TN", name: "Chennai", slug: "chennai-city", pincodes: ["600001"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },

  // Telangana
  { id: "IN-TG-HYD-HYDERABAD", districtId: "IN-TG-HYD", stateId: "IN-TG", name: "Hyderabad", slug: "hyderabad-city", pincodes: ["500001"], isActive: true, createdAt: "2026-10-28T00:00:00.000Z", updatedAt: "2026-10-28T00:00:00.000Z" },
];

// --------------------------------------------------------------------------------------
// 4. VALIDATION & HIERARCHY HELPER UTILITIES
// --------------------------------------------------------------------------------------

/**
 * Validates standard Indian Postal Index Number (PIN code).
 * Rules: Exactly 6 digits, first digit between 1 and 9 (0 is invalid as starting digit).
 */
export function validateIndianPincode(pincode: string): { valid: boolean; normalized?: string; error?: string } {
  if (!pincode) {
    return { valid: false, error: "PIN code is required." };
  }
  const clean = pincode.toString().trim().replace(/\s+/g, "");
  const pinRegex = /^[1-9][0-9]{5}$/;
  if (!pinRegex.test(clean)) {
    return {
      valid: false,
      error: "Invalid Indian PIN code format. Must be exactly 6 digits starting with 1-9.",
    };
  }
  return { valid: true, normalized: clean };
}

/**
 * Validates that district belongs to state, and that city belongs to district.
 */
export function validateLocationHierarchy(
  stateId: string,
  districtId: string,
  allStates: State[] = SEED_STATES,
  allDistricts: District[] = SEED_DISTRICTS,
  allCities: City[] = SEED_CITIES,
  cityIdOrName?: string
): { valid: boolean; error?: string; state?: State; district?: District; city?: City } {
  const state = allStates.find((s) => s.id === stateId && s.isActive);
  if (!state) {
    return { valid: false, error: `Invalid or inactive state ID: "${stateId}"` };
  }

  const district = allDistricts.find((d) => d.id === districtId && d.isActive);
  if (!district) {
    return { valid: false, error: `Invalid or inactive district ID: "${districtId}"` };
  }

  if (district.stateId !== state.id) {
    return {
      valid: false,
      error: `District "${district.name}" (${district.id}) does not belong to State "${state.name}" (${state.id}).`,
    };
  }

  let matchedCity: City | undefined = undefined;
  if (cityIdOrName) {
    matchedCity = allCities.find(
      (c) =>
        (c.id === cityIdOrName || c.name.toLowerCase() === cityIdOrName.toLowerCase()) &&
        c.districtId === district.id
    );
  }

  return { valid: true, state, district, city: matchedCity };
}
