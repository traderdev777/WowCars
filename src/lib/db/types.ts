/**
 * WowCars — Database Models & Type Definitions
 * Normalized types supporting both local persistence and MySQL/MariaDB
 */

export type UserRole = "BUYER" | "SELLER" | "DEALER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type AdminRole =
  | "SUPER_ADMIN"
  | "OPERATIONS"
  | "DEALER_MANAGER"
  | "SUPPORT"
  | "ADMIN"
  | "VERIFICATION_OFFICER"
  | "MODERATOR"
  | "CRM_AGENT"
  | "MARKETING_MANAGER"
  | "PROCUREMENT_MANAGER"
  | "OUTLET_MANAGER"
  | "TECHNICIAN"
  | "FRANCHISE_USER";
export type CarStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PENDING_APPROVAL" // Backward-compat alias for PENDING_REVIEW
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "ACTIVE" // Backward-compat alias for APPROVED
  | "SUSPENDED"
  | "SOLD"
  | "UNAVAILABLE"
  | "REJECTED";
export type FuelType = "Petrol" | "Diesel" | "CNG" | "Electric" | "Hybrid" | "LPG";
export type VehicleCategory = "CAR" | "TWO_WHEELER" | "THREE_WHEELER" | "COMMERCIAL" | "BUS" | "SPECIALISED";
export type Transmission = "Manual" | "Automatic";
export type BodyType = "Hatchback" | "Sedan" | "SUV" | "MUV" | "Luxury";
export type EnquiryType = "WHATSAPP_CLICK" | "TEST_DRIVE_REQUEST" | "CALLBACK_REQUEST" | "LOAN_INQUIRY";
export type EnquiryStatus =
  | "NEW"
  | "CONTACT_ATTEMPTED"
  | "CONTACTED" // Backward-compat alias
  | "QUALIFIED"
  | "DEALER_COORDINATION"
  | "TEST_DRIVE_SCHEDULED"
  | "NEGOTIATION"
  | "BOOKING_IN_PROGRESS"
  | "SOLD"
  | "CONVERTED" // Backward-compat alias
  | "LOST"
  | "CANCELLED";
export type ModerationAction = "APPROVED" | "REJECTED" | "REQUEST_CHANGES" | "SUSPEND" | "MARKED_SOLD" | "RESTORED";
export type DealerVerificationStatus = "NOT_SUBMITTED" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED" | "SUSPENDED";
export type DealerApprovalStatus =
  | "APPLICATION_PENDING"
  | "APPLICATION_RECEIVED"
  | "UNDER_VERIFICATION"
  | "APPROVED"
  | "APPROVED_LISTING_ENABLED"
  | "REJECTED"
  | "SUSPENDED"
  | "INACTIVE"
  | "PENDING"; // Backward-compat alias
export type ExpansionStatus = "NOT_STARTED" | "OUTREACH" | "APPLICATIONS_RECEIVED" | "ONBOARDING" | "COVERED";

export interface ContactAttempt {
  id: string;
  timestamp: string;
  agentUsername: string;
  channel: "PHONE" | "WHATSAPP" | "EMAIL" | "IN_PERSON";
  outcome: "REACHED" | "NO_ANSWER" | "BUSY" | "CALLBACK_REQUESTED" | "WRONG_NUMBER";
  notes?: string;
}

export interface State {
  id: string; // e.g. "IN-KA"
  name: string; // e.g. "Karnataka"
  type: "STATE" | "UT";
  code: string; // e.g. "KA"
  capital?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface District {
  id: string; // e.g. "IN-KA-BLRU"
  stateId: string; // e.g. "IN-KA"
  stateCode: string; // e.g. "KA"
  stateName: string; // e.g. "Karnataka"
  name: string; // e.g. "Bengaluru Urban"
  slug: string; // e.g. "bengaluru-urban"
  isActive: boolean;
  expansionStatus: ExpansionStatus;
  expansionOwner?: string;
  expansionNotes?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  id: string; // e.g. "IN-KA-BLRU-BENGALURU"
  districtId: string; // e.g. "IN-KA-BLRU"
  stateId: string; // e.g. "IN-KA"
  name: string; // e.g. "Bengaluru"
  slug: string; // e.g. "bengaluru"
  pincodes?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationCorrectionRequest {
  stateId: string;
  districtId: string;
  city: string;
  pincode: string;
  reason: string;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export interface User {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  fullName: string;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Dealer {
  id: string;
  userId?: string;
  name: string;
  slug: string;
  legalBusinessName?: string;
  gstin?: string;
  pan?: string;
  authorizedSignatory?: string;
  contactEmail?: string;
  stateId?: string;
  stateName?: string;
  districtId?: string;
  districtName?: string;
  cityId?: string;
  cityName?: string;
  pincode?: string;
  locality: string;
  address: string;
  rating: number;
  reviewsCount: number;
  whatsappNumber: string;
  establishedYear: number;
  isVerified: boolean;
  approvalStatus?: DealerApprovalStatus;
  listingEnabled?: boolean;
  accountStatus?: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  avatarEmoji?: string;
  speciality?: string;
  kycStatus?: DealerVerificationStatus;
  kycNotes?: string;
  kycDocuments?: Array<{
    type: "GST_CERTIFICATE" | "PAN_CARD" | "TRADE_LICENSE" | "IDENTITY_PROOF" | "BANK_STATEMENT";
    documentNumber?: string;
    url: string;
    uploadedAt: string;
    verified: boolean;
  }>;
  totalSalesCompleted?: number;
  totalEnquiriesReceived?: number;
  reviewedBy?: string;
  reviewedAt?: string;
  isSeedData?: boolean;
  locationCorrectionRequest?: LocationCorrectionRequest;
  createdAt: string;
  updatedAt?: string;
}

export interface Seller {
  id: string;
  userId?: string;
  fullName: string;
  phone: string;
  whatsapp: string;
  email?: string;
  city: string;
  locality: string;
  createdAt: string;
}

export interface Car {
  id: string;
  listingCode: string; // e.g. "WC-1049"
  sellerId?: string;
  dealerId?: string;
  sellerType: "Individual" | "Verified Dealer";
  dealerName?: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  priceINR: number;
  kmDriven: number;
  fuelType: FuelType;
  transmission: Transmission;
  bodyType: BodyType;
  color: string;
  numOwners: number;
  rtoCode: string;
  rtoArea: string;
  insuranceType: string;
  insuranceValidity?: string;
  hypothecationStatus?: string;
  city: string;
  locality: string;
  status: CarStatus;
  rejectionReason?: string;
  isVerified: boolean;
  isFeatured: boolean;
  isSeedData: boolean; // TRUE for demonstration records, FALSE for real customer cars
  images: string[];
  overview?: string;
  features?: string[];
  inspectionScore?: number;
  engineDisplacement?: string;
  mileageARAI?: string;
  seatingCapacity?: number;
  vehicleCategory?: VehicleCategory;
  // Electric & Hybrid Vehicle Specifications
  batteryChemistry?: "LFP" | "NMC" | "SOLID_STATE";
  batteryCapacityKwh?: number;
  voltageClass?: "LOW_VOLTAGE" | "HIGH_VOLTAGE_400V" | "HIGH_VOLTAGE_800V";
  chargingConnector?: "CCS2" | "TYPE2_AC" | "BHARAT_DC001" | "CHADEMO";
  batteryWarrantyExpiry?: string;
  stateOfHealthPercent?: number;
  compatibleChargers?: string[];
  evServiceHistory?: { date: string; description: string; provider: string; technicianCertLevel?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CarImage {
  id: string;
  carId: string;
  imageUrl: string;
  displayOrder: number;
  isCover: boolean;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  enquiryCode?: string; // e.g. "WC-ENQ-819201"
  carId: string;
  carTitle?: string;
  carListingCode?: string;
  dealerId?: string;
  sellerId?: string;
  buyerName: string;
  buyerPhone: string;
  phoneVerified?: boolean;
  buyerEmail?: string;
  enquiryType: EnquiryType;
  type?: EnquiryType; // Convenience alias
  preferredDate?: string;
  preferredSlot?: string;
  preferredTime?: string;
  preferredContactMethod?: "PHONE" | "WHATSAPP" | "EMAIL";
  notes?: string;
  internalNotes?: string[];
  message?: string;
  status: EnquiryStatus;
  assignedTo?: string; // WowCars staff username
  assignedDealerId?: string;
  followUpDate?: string;
  lossReason?: string;
  cancelledReason?: string;
  contactNotes?: string[];
  contactAttempts?: ContactAttempt[];
  saleOutcome?: {
    amountINR?: number;
    commissionINR?: number;
    soldDate?: string;
    attributionNotes?: string;
  };
  consentNoticeVersion?: string;
  campaignSource?: string;
  campaignMedium?: string;
  ipAddress?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Public response schema for vehicle discovery (zero private dealer contact info)
 */
export interface PublicCar {
  id: string;
  listingCode: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  priceINR: number;
  kmDriven: number;
  fuelType: FuelType;
  transmission: Transmission;
  bodyType: BodyType;
  color: string;
  numOwners: number;
  rtoCode: string;
  rtoArea: string;
  insuranceType: string;
  city: string;
  locality: string;
  status: CarStatus;
  isVerified: boolean;
  isFeatured: boolean;
  isSeedData: boolean;
  images: string[];
  overview?: string;
  features?: string[];
  inspectionScore?: number;
  engineDisplacement?: string;
  mileageARAI?: string;
  seatingCapacity?: number;
  createdAt: string;
}

/**
 * Public sanitized dealer details (excludes phone, email, full address, KYC)
 */
export interface PublicDealer {
  name: string;
  locality: string;
  cityName?: string;
  stateName?: string;
  rating: number;
  reviewsCount: number;
  isVerified: boolean;
  avatarEmoji?: string;
  speciality?: string;
  isSeedData?: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
  tokenVersion: number; // Incremented on credential rotation/logout to invalidate active sessions
  passwordChangedAt?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface ModerationEvent {
  id: string;
  carId: string;
  carListingCode: string;
  adminId: string;
  adminName: string;
  action: ModerationAction;
  reason?: string;
  entityType?: "CAR" | "DEALER" | "SELLER" | "ENQUIRY" | "ADMIN" | "PART_PRODUCT" | "PART_SELLER" | "PART_ORDER";
  previousStatus?: string;
  newStatus?: string;
  createdAt: string;
  timestamp?: string; // Convenience alias
}

// =====================================================================
// SPARE PARTS & AUTOMOTIVE TOOLS MARKETPLACE TYPES
// =====================================================================

export type PartCondition = "NEW" | "USED" | "REFURBISHED";
export type PartType = "GENUINE_OEM" | "OES" | "AFTERMARKET";
export type PartStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "OUT_OF_STOCK" | "ARCHIVED";

export interface VehicleCompatibility {
  make: string;
  model: string;
  startYear: number;
  endYear: number;
  variants?: string[];
  fuelTypes?: string[];
  engineSpecs?: string;
  engines?: string[];
  notes?: string;
}

export interface PartCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  imageUrl?: string;
  image?: string;
  displayOrder: number;
  isActive: boolean;
  subcategories: Array<string | { name: string; slug: string }>;
  createdAt: string;
  updatedAt?: string;
}

export interface PartBrand {
  id: string;
  name: string;
  slug: string;
  countryOfOrigin?: string;
  logoUrl?: string;
  isOem: boolean;
  isActive: boolean;
}

export type PriceSource = "DISTRIBUTOR_VERIFIED" | "SELLER_VERIFIED" | "MANUFACTURER_MRP" | "ADMIN_REFERENCE";

export interface PartProduct {
  id: string;
  slug: string;
  title: string;
  categoryId?: string;
  categoryName?: string;
  categorySlug?: string;
  subcategory?: string;
  subcategorySlug?: string | null;
  brand: string;
  brandId?: string;
  partNumber: string | null;
  oemPartNumber?: string | null;
  sku?: string | null;
  barcode?: string;
  description: string;
  technicalSpecs?: Record<string, string>;
  specifications?: Record<string, string>;
  images: string[];
  condition: PartCondition;
  partType: PartType;
  compatibleVehicles: VehicleCompatibility[];
  compatibilityNotes?: string | null;
  sellerId: string;
  sellerName?: string;
  stockQuantity: number;
  dispatchLocation: string | { city: string; state: string; pinCode: string };
  priceINR: number;
  price?: number;
  mrpINR?: number;
  mrp?: number;
  discountPercent?: number;
  taxPercent?: number;
  shippingChargeINR?: number;
  weightKg?: number;
  dimensionsCm?: string;
  warrantyMonths: number;
  returnDays?: number;
  returnPolicyDays?: number;
  status: PartStatus;
  rejectionReason?: string;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  rating?: number;
  reviewsCount?: number;
  priceVerifiedAt: string;
  isPriceVerified?: boolean;
  priceSource?: string;
  imageAttribution?: string;
  isSeedData?: boolean;
  // Automotive Operations & Inventory Fields
  vehicleCategory?: "CAR" | "TWO_WHEELER" | "COMMERCIAL" | "UNIVERSAL";
  purchaseCostINR?: number;
  landedCostINR?: number;
  isCostProvisional?: boolean;
  costNotes?: string;
  batchTracking?: boolean;
  expiryDate?: string;
  reorderPoint?: number;
  safetyStock?: number;
  classification?: "GENUINE_OEM" | "OES" | "AUTHORISED_AFTERMARKET" | "STANDARD_REPLACEMENT";
  authenticityEvidence?: string;
  createdAt: string;
  updatedAt: string;
}

export type PartSellerStatus = "APPLICATION_PENDING" | "UNDER_VERIFICATION" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface PartSeller {
  id: string;
  userId?: string;
  businessName: string;
  slug: string;
  sellerType?: "MANUFACTURER" | "DISTRIBUTOR" | "DEALER";
  contactName: string;
  email: string;
  contactEmail?: string;
  phone: string;
  contactPhone?: string;
  gstin?: string;
  pan?: string;
  address: string | { line1?: string; line2?: string; city: string; state: string; pinCode: string };
  city: string;
  state: string;
  pincode: string;
  status: PartSellerStatus;
  listingEnabled: boolean;
  rating?: number;
  totalOrders?: number;
  isVerified?: boolean;
  kycDocuments?: Array<{ type: string; url: string; verified: boolean }>;
  brandsCarried?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface PartPriceHistory {
  id: string;
  productId: string;
  productTitle?: string;
  previousPriceINR?: number;
  oldPrice?: number;
  newPriceINR?: number;
  newPrice?: number;
  previousMrpINR?: number;
  newMrpINR?: number;
  changedByUserId?: string;
  changedByUserName?: string;
  changedBy?: string;
  source: PriceSource | string;
  notes?: string;
  changedAt: string;
}

export interface PartCartItem {
  productId: string;
  title: string;
  slug: string;
  brand: string;
  partNumber: string;
  priceINR: number;
  price?: number;
  mrpINR: number;
  mrp?: number;
  image: string;
  quantity: number;
  sellerId: string;
  maxStock: number;
}

export interface PartCart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: PartCartItem[];
  totalItems: number;
  subtotalINR: number;
  shippingTotalINR: number;
  totalINR: number;
  updatedAt: string;
}

export interface PartOrderItem {
  productId: string;
  title: string;
  slug?: string;
  brand: string;
  partNumber?: string | null;
  priceINR?: number;
  price: number;
  mrpINR?: number;
  mrp?: number;
  quantity: number;
  subtotal: number;
  image?: string;
  sellerId: string;
}

export type PartOrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_CONFIRMED"
  | "PROCESSING"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLATION_REQUESTED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "REFUNDED";

export interface PartOrderHistoryEvent {
  status: PartOrderStatus;
  timestamp: string;
  notes?: string;
  actor: string;
}

export interface PartOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: {
    line1?: string;
    line2?: string;
    addressLine?: string;
    city: string;
    district?: string;
    state: string;
    pinCode?: string;
    pincode?: string;
  };
  items: PartOrderItem[];
  subtotalINR?: number;
  subtotal?: number;
  shippingINR?: number;
  discountINR?: number;
  totalINR?: number;
  totalAmount: number;
  sellerTotal?: number;
  paymentMethod: "MOCK_PAYMENT" | "UPI" | "NET_BANKING" | "CARD" | "COD";
  paymentStatus: "PENDING" | "CONFIRMED" | "PAID" | "FAILED" | "REFUNDED";
  paymentTransactionId?: string;
  orderStatus: PartOrderStatus;
  trackingNumber?: string;
  shippingCourier?: string;
  courierPartner?: string;
  estimatedDelivery?: string;
  returnReason?: string;
  cancellationReason?: string;
  notes?: string;
  history: PartOrderHistoryEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface PartEnquiry {
  id: string;
  enquiryCode?: string;
  type?: "FITMENT_VERIFICATION" | "PRICE_QUOTE" | "PART_REQUEST" | "GENERAL_QUERY";
  productId?: string;
  productTitle?: string;
  partNumber?: string;
  vehicleDetails?: {
    make: string;
    model: string;
    year?: number;
    variant?: string;
    fuelType?: string;
    engine?: string;
  };
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleVariant?: string;
  vinOrChassis?: string;
  partRequirement: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  message?: string;
  status: "PENDING" | "IN_REVIEW" | "RESOLVED" | "CLOSED" | "ANSWERED" | "NEW" | "IN_PROGRESS";
  staffNotes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// AUTOMOTIVE OPERATIONS, GARAGE, PROCUREMENT & PROFITABILITY MODULE
// ============================================================================

export type OutletType = "COMPANY_OWNED" | "FRANCHISE";

export interface Outlet {
  id: string;
  code: string; // e.g. "OUT-KA-BLR-01"
  name: string;
  type: OutletType;
  address: string;
  city: string;
  districtId: string;
  stateId: string;
  pinCode: string;
  gstin?: string;
  phone: string;
  managerName: string;
  managerId?: string;
  isActive: boolean;
  franchiseOwnerName?: string;
  franchiseFeeAnnualINR?: number;
  royaltyPercent?: number; // e.g. 5.0 for 5%
  procurementLimitINR: number;
  isFranchiseOnboardingEnabled: boolean; // Gating flag for self-onboarding
  onboardedAt?: string;
  // EV & High-Voltage Service Authorization (Level 2/3 EV Certification required for high-voltage powertrain)
  evCertificationLevel?: "NONE" | "EV_CERTIFIED_LEVEL_2" | "EV_CERTIFIED_LEVEL_3";
  isEvServiceAuthorized?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SupplierVerificationStatus = "PENDING_VERIFICATION" | "APPROVED" | "SUSPENDED" | "REJECTED";

export type SupplierCategory =
  | "OEM_PARTS"
  | "AFTERMARKET_PARTS"
  | "LUBRICANTS_FLUIDS"
  | "TYRES_BATTERIES"
  | "TOOLS_EQUIPMENT"
  | "ACCESSORIES"
  | "ELECTRICALS";

export interface SupplierAuthDoc {
  docType: string;
  docNumber: string;
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  businessName: string;
  legalName: string;
  gstin: string;
  pan?: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  supplierCategories: SupplierCategory[];
  paymentTerms: string; // e.g. "Net 15 Days", "Net 30 Days", "Advance"
  approvalStatus: SupplierVerificationStatus;
  authDocs: SupplierAuthDoc[];
  brandsCarried: string[];
  performanceRating: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierQuotation {
  id: string;
  supplierId: string;
  supplierName: string;
  sku: string;
  partNumber: string;
  productTitle: string;
  brand: string;
  quotedUnitPriceINR: number;
  moq: number;
  freightTerms: string;
  freightChargeINR: number;
  leadTimeDays: number;
  warrantyMonths: number;
  returnPolicy: string;
  verifiedDate: string;
  verifiedBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type POStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "SENT_TO_SUPPLIER"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "DISPUTED"
  | "CANCELLED";

export interface POItem {
  productId: string;
  sku: string;
  title: string;
  partNumber: string;
  brand: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitQuotedPriceINR: number;
  taxPercent: number;
  allocatedFreightINR: number;
  unitLandedCostINR: number;
  totalAmountINR: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // e.g. "WC-PO-2026-001"
  supplierId: string;
  supplierName: string;
  outletId: string;
  outletName: string;
  status: POStatus;
  items: POItem[];
  subtotalINR: number;
  freightINR: number;
  taxINR: number;
  totalAmountINR: number;
  expectedDeliveryDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  supplierInvoiceRef?: string;
  invoiceDueDate?: string;
  paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  notes?: string;
  history: {
    status: POStatus;
    actor: string;
    timestamp: string;
    notes?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceiptItem {
  productId: string;
  sku?: string;
  quantityReceived: number;
  quantityRejected: number;
  rejectionReason?: string;
  batchNumber?: string;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string; // e.g. "WC-GRN-2026-001"
  poId: string;
  poNumber: string;
  supplierId: string;
  outletId: string;
  receivedBy: string;
  receivedDate: string;
  supplierChallanNo?: string;
  items: GoodsReceiptItem[];
  idempotencyKey: string;
  notes?: string;
  createdAt: string;
}

export interface OutletInventoryItem {
  id: string;
  outletId: string;
  productId: string;
  sku: string;
  title: string;
  brand: string;
  partNumber: string;
  categoryName: string;
  location: {
    bay?: string;
    rack?: string;
    bin?: string;
    shelf?: string;
  };
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  weightedAverageCostINR: number;
  reorderPoint: number;
  safetyStock: number;
  isCostProvisional: boolean;
  lastStockCountDate?: string;
  lastReceivedDate?: string;
  // Multi-Owner Inventory Attribution (Phase 1)
  ownerType?: InventoryOwnerType;
  ownerId?: string;
  quantityDamaged?: number;
  quantityInTransit?: number;
  purchaseCostINR?: number;
  landedCostINR?: number;
  sellingPriceINR?: number;
  stockStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "QUARANTINED";
  lastReconciliationAt?: string;
  updatedAt: string;
}

export type InventoryOwnerType =
  | "WOWCARS_CENTRAL"
  | "COMPANY_OUTLET"
  | "FRANCHISE"
  | "SUPPLIER_CONSIGNMENT"
  | "GARAGE_PARTNER";

export type InventoryLedgerTransactionType =
  | "PURCHASE_RECEIPT"
  | "GOODS_RECEIPT_NOTE"
  | "ORDER_RESERVATION"
  | "SALE_DISPATCH"
  | "CUSTOMER_RETURN"
  | "INTER_OUTLET_TRANSFER"
  | "STOCK_ADJUSTMENT"
  | "DAMAGE_WRITE_OFF"
  | "AUDIT_RECONCILIATION";

export interface InventoryLedgerEntry {
  id: string; // "led-..."
  transactionType: InventoryLedgerTransactionType;
  outletId: string;
  productId: string;
  sku: string;
  ownerType: InventoryOwnerType;
  ownerId: string;
  quantity: number; // Signed: positive for addition, negative for deduction
  previousOnHand: number;
  newOnHand: number;
  previousReserved: number;
  newReserved: number;
  unitCostINR: number;
  landedCostINR: number;
  sellingPriceINR?: number;
  referenceType: "PO" | "GRN" | "JOB_CARD" | "ORDER" | "TRANSFER" | "ADJUSTMENT" | "RETURN" | "AUDIT";
  referenceId: string;
  idempotencyKey?: string;
  performedBy: string;
  notes?: string;
  timestamp: string;
}

export type StockMovementType =
  | "GOODS_RECEIPT"
  | "GARAGE_CONSUMPTION"
  | "RETAIL_SALE"
  | "STOCK_ADJUSTMENT"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "RETURN_TO_VENDOR"
  | "SCRAP_DAMAGED";

export interface StockMovement {
  id: string;
  outletId: string;
  productId: string;
  sku: string;
  type: StockMovementType;
  quantity: number; // Positive for increase, negative for decrease
  previousQuantity: number;
  newQuantity: number;
  unitCostINR: number;
  referenceType: "PO" | "GRN" | "JOB_CARD" | "RETAIL_ORDER" | "TRANSFER" | "ADJUSTMENT" | "RTV";
  referenceId: string;
  reason?: string;
  performedBy: string;
  timestamp: string;
}

export interface InterOutletTransfer {
  id: string;
  transferNumber: string;
  sourceOutletId: string;
  targetOutletId: string;
  status: "DRAFT" | "DISPATCHED" | "RECEIVED" | "CANCELLED";
  items: {
    productId: string;
    sku: string;
    title: string;
    quantity: number;
    unitCostINR: number;
  }[];
  dispatchedBy?: string;
  dispatchedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  notes?: string;
  createdAt: string;
}

export type GarageJobStatus =
  | "BOOKED"
  | "CHECKED_IN"
  | "INSPECTION"
  | "AWAITING_CUSTOMER_APPROVAL"
  | "IN_PROGRESS"
  | "QUALITY_CHECK"
  | "COMPLETED"
  | "DELIVERED"
  | "CANCELLED";

export interface GarageServiceItem {
  serviceCode: string;
  serviceName: string;
  category: string;
  vehicleType: "CAR" | "TWO_WHEELER";
  standardLabourHours: number;
  labourChargeINR: number;
  technicianCostINR: number;
  description?: string;
  // High-Voltage EV Service Attributes
  isHighVoltage?: boolean;
  voltageClassRequired?: "LOW_VOLTAGE" | "HIGH_VOLTAGE_400V" | "HIGH_VOLTAGE_800V";
}

export interface JobCardPartItem {
  productId: string;
  sku: string;
  title: string;
  quantity: number;
  unitCostINR: number;
  unitBillableINR: number;
  isCostProvisional: boolean;
  consumedFromOutletId: string;
  isCustomerApproved: boolean;
}

export interface GarageJobCard {
  id: string;
  jobCardNumber: string;
  outletId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehicleNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleFuel: string;
  vehicleType: "CAR" | "TWO_WHEELER";
  odometerKm: number;
  status: GarageJobStatus;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  // High-Voltage EV Safety & Diagnosis Attributes
  isHighVoltageWork?: boolean;
  technicianCertificationRequired?: "STANDARD" | "HV_LEVEL_1_AWARENESS" | "HV_LEVEL_2_CERTIFIED" | "HV_LEVEL_3_SPECIALIST";
  evBatterySoHReading?: number;
  services: GarageServiceItem[];
  parts: JobCardPartItem[];
  labourRevenueINR: number;
  partsRevenueINR: number;
  directLabourCostINR: number;
  directPartsCostINR: number;
  grossProfitINR: number;
  grossMarginPercent: number;
  isProvisionalCost: boolean;
  taxAmountINR: number;
  discountINR: number;
  totalInvoiceINR: number;
  inspectionNotes?: string;
  customerApprovalStatus: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
  customerApprovedAt?: string;
  customerApprovalChannel?: string;
  reworkReason?: string;
  customerRating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UsedCarEconomics {
  carId: string;
  listingCode: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  ownershipType: "OWNED_INVENTORY" | "CONSIGNMENT_BROKERAGE";
  acquisitionCostINR: number;
  refurbishmentJobs: { description: string; costINR: number; jobCardId?: string }[];
  totalRefurbishmentCostINR: number;
  inspectionCostINR: number;
  transportCostINR: number;
  advertisingCostINR: number;
  otherExpensesINR: number;
  salePriceINR: number;
  commissionFeeINR: number;
  recognizedRevenueINR: number;
  totalDirectCostsINR: number;
  transactionContributionINR: number;
  contributionMarginPercent: number;
  isProvisionalCost: boolean;
  status: "IN_STOCK" | "REFURBISHING" | "LISTED" | "SOLD" | "DELIVERED";
  saleDate?: string;
  notes?: string;
}

export type OperatingExpenseCategory =
  | "RENT"
  | "SALARIES"
  | "UTILITIES"
  | "MARKETING"
  | "EQUIPMENT_MAINTENANCE"
  | "CONSUMABLES_TOOLS"
  | "SOFTWARE"
  | "MISC";

export interface OperatingExpense {
  id: string;
  outletId: string;
  date: string;
  category: OperatingExpenseCategory;
  amountINR: number;
  description: string;
  recordedBy: string;
  createdAt: string;
}

export interface MonthlyBudget {
  month: string; // "YYYY-MM"
  outletId: string;
  budgetedRevenueINR: number;
  budgetedCOGSINR: number;
  budgetedGrossProfitINR: number;
  budgetedOpexINR: number;
  budgetedOperatingProfitINR: number;
}

export interface OperationsAuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  outletId?: string;
  module:
    | "SUPPLIER"
    | "PROCUREMENT"
    | "INVENTORY"
    | "GARAGE"
    | "RETAIL"
    | "USED_CARS"
    | "FINANCIALS"
    | "FRANCHISE";
  action: string;
  entityId: string;
  details: Record<string, unknown>;
}

export interface OperationsOverviewStats {
  metrics: {
    totalRevenueINR: number;
    cogsINR: number;
    grossProfitINR: number;
    grossMarginPercent: number;
    operatingExpensesINR: number;
    operatingProfitINR: number;
    operatingMarginPercent: number;
    totalInventoryValueINR: number;
    inventoryItemCount: number;
    supplierOutstandingINR: number;
    totalGarageBookings: number;
    completedGarageJobs: number;
    averageJobInvoiceINR: number;
    usedCarTransactionsCount: number;
    usedCarTotalProfitINR: number;
    lowStockCount: number;
    provisionalCostItemsCount: number;
  };
  revenueBySegment: {
    usedCarsINR: number;
    garageServicesINR: number;
    partsRetailINR: number;
    franchiseRoyaltiesINR: number;
  };
  cogsBySegment: {
    usedCarsCOGSINR: number;
    garagePartsCOGSINR: number;
    garageLabourCOGSINR: number;
    partsRetailCOGSINR: number;
  };
  budgetComparison?: {
    month: string;
    budgetedRevenue: number;
    actualRevenue: number;
    revenueVariance: number;
    budgetedGrossProfit: number;
    actualGrossProfit: number;
    budgetedOperatingProfit: number;
    actualOperatingProfit: number;
  };
  outlets: Outlet[];
  lowStockAlerts: OutletInventoryItem[];
}

export interface DatabaseSchema {
  version: number;
  lastUpdated: string;
  states: State[];
  districts: District[];
  cities: City[];
  dealers: Dealer[];
  sellers: Seller[];
  cars: Car[];
  enquiries: Enquiry[];
  admins: AdminUser[];
  moderationEvents: ModerationEvent[];
  // Spare Parts E-commerce Module
  partCategories?: PartCategory[];
  partBrands?: PartBrand[];
  partProducts?: PartProduct[];
  partSellers?: PartSeller[];
  partOrders?: PartOrder[];
  partCarts?: PartCart[];
  partPriceHistory?: PartPriceHistory[];
  partEnquiries?: PartEnquiry[];
  // Automotive Operations, Garage & Procurement Module
  outlets?: Outlet[];
  suppliers?: Supplier[];
  supplierQuotations?: SupplierQuotation[];
  purchaseOrders?: PurchaseOrder[];
  goodsReceiptNotes?: GoodsReceiptNote[];
  outletInventory?: OutletInventoryItem[];
  stockMovements?: StockMovement[];
  inventoryLedger?: InventoryLedgerEntry[];
  interOutletTransfers?: InterOutletTransfer[];
  garageJobCards?: GarageJobCard[];
  garageServices?: GarageServiceItem[];
  usedCarEconomics?: UsedCarEconomics[];
  operatingExpenses?: OperatingExpense[];
  monthlyBudgets?: MonthlyBudget[];
  operationsAuditLogs?: OperationsAuditLog[];
  // Customer Platform & Connected Ecosystem
  customers?: Customer[];
  customerOTPs?: CustomerOTP[];
  customerVehicles?: CustomerVehicle[];
  customerTickets?: CustomerSupportTicket[];
  customerSavedItems?: CustomerSavedItem[];
  orderReturns?: OrderReturnRequest[];
  paymentTransactions?: PaymentTransaction[];
}

/**
 * Checks whether an authenticated dealer possesses explicit vehicle-listing permission.
 * Non-negotiable rules:
 * - Dealer registration does NOT automatically grant listing permission.
 * - Suspended, rejected, inactive, and pending dealers are blocked.
 * - Dealer must be explicitly approved and listingEnabled must be true.
 */
export function canDealerList(dealer?: Dealer | null): boolean {
  if (!dealer) return false;
  if (dealer.approvalStatus === "SUSPENDED" || dealer.accountStatus === "SUSPENDED") return false;
  if (dealer.approvalStatus === "REJECTED" || dealer.approvalStatus === "INACTIVE") return false;
  if (
    dealer.approvalStatus === "APPLICATION_PENDING" ||
    dealer.approvalStatus === "APPLICATION_RECEIVED" ||
    dealer.approvalStatus === "PENDING" ||
    dealer.approvalStatus === "UNDER_VERIFICATION"
  ) {
    return false;
  }
  if (dealer.approvalStatus === "APPROVED_LISTING_ENABLED") return true;
  if (dealer.approvalStatus === "APPROVED") {
    // If explicitly set, respect boolean; default to true for existing verified seed dealers
    return dealer.listingEnabled !== false;
  }
  return Boolean(dealer.listingEnabled);
}

/**
 * Checks whether an authenticated spare-parts seller possesses explicit listing permission.
 */
export function canPartSellerList(seller?: PartSeller | null): boolean {
  if (!seller) return false;
  if (seller.status === "SUSPENDED" || seller.status === "REJECTED") return false;
  if (seller.status === "APPLICATION_PENDING" || seller.status === "UNDER_VERIFICATION") return false;
  return seller.status === "APPROVED" && seller.listingEnabled === true;
}

// ============================================================================
// CUSTOMER APPLICATION, MY GARAGE & SUPPORT MODULE
// ============================================================================

export interface Customer {
  id: string;
  phone: string;
  email?: string;
  fullName: string;
  city?: string;
  state?: string;
  pinCode?: string;
  pincode?: string;
  address?: string;
  avatarUrl?: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  status: "ACTIVE" | "SUSPENDED";
  lastLoginAt?: string;
  marketingConsent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOTP {
  id: string;
  phone: string;
  otp?: string;
  otpHash: string;
  expiresAt: string;
  attempts: number;
  isUsed: boolean;
  createdAt: string;
}

export interface CustomerVehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  generation?: string;
  year: number;
  variant?: string;
  fuelType?: FuelType;
  fuel?: string;
  transmission: Transmission;
  vehicleType: "CAR" | "TWO_WHEELER";
  regNumber: string;
  odometerKm?: number;
  mileageKm?: number;
  color?: string;
  vinOrChassis?: string;
  insuranceExpiryDate?: string;
  pollutionExpiryDate?: string;
  lastServiceDate?: string;
  nextServiceDueKm?: number;
  nextServiceDueDate?: string;
  notes?: string;
  serviceHistoryCount?: number;
  vehicleCategory?: VehicleCategory;
  batteryChemistry?: "LFP" | "NMC" | "SOLID_STATE";
  batteryCapacityKwh?: number;
  voltageClass?: "LOW_VOLTAGE" | "HIGH_VOLTAGE_400V" | "HIGH_VOLTAGE_800V";
  chargingConnector?: "CCS2" | "TYPE2_AC" | "BHARAT_DC001" | "CHADEMO";
  batteryWarrantyExpiry?: string;
  stateOfHealthPercent?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderId?: string;
  vehicleId?: string;
  category: "USED_CAR" | "SPARE_PARTS" | "GARAGE_SERVICE" | "FRANCHISE" | "PAYMENT_BILLING" | "GENERAL" | "SERVICE_QUERY" | "PARTS_ORDER" | "BILLING" | "WARRANTY";
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" | "MEDIUM";
  assignedAgentId?: string;
  assignedAgentName?: string;
  messages: {
    id: string;
    senderType: "CUSTOMER" | "SUPPORT_AGENT" | "SYSTEM";
    senderName: string;
    message: string;
    attachments?: string[];
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSavedItem {
  id: string;
  customerId: string;
  itemType: "CAR" | "SPARE_PART";
  itemId: string;
  savedAt: string;
}

export interface OrderReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber?: string;
  customerId: string;
  customerPhone: string;
  productId?: string;
  productTitle?: string;
  quantity?: number;
  items?: {
    productId: string;
    title: string;
    quantity: number;
    refundAmountINR: number;
  }[];
  reason: "DEFECTIVE_PART" | "WRONG_PART_SENT" | "FITMENT_MISMATCH" | "CHANGED_MIND" | "DAMAGED_IN_TRANSIT" | "DEFECTIVE_OR_DAMAGED" | "WRONG_ITEM_DELIVERED" | "FITMENT_ISSUE" | "NO_LONGER_NEEDED" | "OTHER";
  reasonDescription?: string;
  description?: string;
  proofImages?: string[];
  refundAmountINR: number;
  status: "REQUESTED" | "APPROVED" | "ITEM_PICKED_UP" | "INSPECTED" | "REFUNDED" | "REJECTED";
  rejectionReason?: string;
  requestedAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  orderId?: string;
  jobCardId?: string;
  referenceType: "SPARE_PARTS_ORDER" | "GARAGE_JOB_CARD" | "CAR_RESERVATION" | "FRANCHISE_FEE";
  referenceId: string;
  gatewayOrderId?: string;
  paymentId?: string;
  gatewayName: "RAZORPAY" | "CASHFREE" | "UPI_DIRECT" | "COD";
  amountINR: number;
  currency: "INR";
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  signatureVerified: boolean;
  customerPhone: string;
  customerEmail?: string;
  idempotencyKey: string;
  webhookEvents?: {
    event: string;
    receivedAt: string;
    payloadSummary: string;
  }[];
  createdAt: string;
  updatedAt: string;
}



