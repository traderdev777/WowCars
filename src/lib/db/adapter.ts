/**
 * WowCars — Universal Database Persistence Adapter Interface
 * Common contract shared by FileStore (local/testing) and MySqlStore (production cPanel).
 */

import {
  Car, Dealer, Seller, Enquiry, AdminUser, ModerationEvent,
  CarStatus, EnquiryStatus, ModerationAction, FuelType, Transmission, BodyType,
  State, District, City, ExpansionStatus,
  PartCategory, PartBrand, PartProduct, PartSeller, PartPriceHistory,
  PartCart, PartOrder, PartEnquiry, PartCondition, PartType, PartStatus, PartOrderStatus,
  Outlet, OutletType, Supplier, SupplierVerificationStatus, SupplierCategory,
  SupplierQuotation, PurchaseOrder, POStatus, GoodsReceiptNote, OutletInventoryItem,
  StockMovement, StockMovementType, InterOutletTransfer, GarageJobCard, GarageJobStatus,
  GarageServiceItem, UsedCarEconomics, OperatingExpense, MonthlyBudget, OperationsAuditLog,
  OperationsOverviewStats,
  InventoryOwnerType, InventoryLedgerTransactionType, InventoryLedgerEntry,
  Customer, CustomerOTP, CustomerVehicle, CustomerSupportTicket, CustomerSavedItem,
  OrderReturnRequest, PaymentTransaction
} from "./types";

export interface CarFilters {
  status?: CarStatus | "ALL";
  city?: string;
  make?: string;
  bodyType?: BodyType | "all";
  fuelType?: FuelType | "all";
  transmission?: Transmission | "all";
  budget?: "under-8" | "8-15" | "above-15" | "all";
  search?: string;
  sortBy?: "price-asc" | "price-desc" | "km-asc" | "year-desc" | "featured";
  dealerId?: string;
  sellerId?: string;
  page?: number;
  limit?: number;
}

export interface EnquiryFilters {
  dealerId?: string;
  carId?: string;
  status?: EnquiryStatus;
}

export interface PlatformStats {
  totalCars: number;
  activeCars: number;
  pendingCars: number;
  changesRequestedCars: number;
  suspendedCars: number;
  soldCars: number;
  totalInventoryValueINR: number;
  totalEnquiries: number;
  newEnquiries: number;
  testDrivesScheduled: number;
  leadsConverted: number;
  totalDealers: number;
  verifiedDealers: number;
  pendingDealers: number;
  totalSellers: number;
}

export interface StateCoverageMetric {
  stateId: string;
  stateName: string;
  stateCode: string;
  type: "STATE" | "UT";
  totalDistricts: number;
  activeDistricts: number;
  coveredDistricts: number;
  coveragePercentage: number;
  totalDealers: number;
  activeApprovedDealers: number;
  pendingApplications: number;
  activeVehicleListings: number;
  buyerEnquiriesReceived: number;
}

export interface DistrictCoverageMetric {
  districtId: string;
  districtName: string;
  stateId: string;
  stateName: string;
  totalDealers: number;
  activeApprovedDealers: number;
  pendingApplications: number;
  activeVehicleListings: number;
  buyerEnquiries: number;
  networkStatus: "Covered" | "Partially Covered" | "Uncovered";
  expansionStatus: ExpansionStatus;
  expansionOwner?: string;
  expansionNotes?: string;
  followUpDate?: string;
  latestRegistrationDate?: string;
}

export interface NetworkOverviewStats {
  totalRegisteredDealers: number;
  approvedActiveDealers: number;
  pendingDealerApplications: number;
  rejectedSuspendedInactiveDealers: number;
  statesWithActiveDealers: number;
  districtsWithActiveDealers: number;
  districtsWithoutActiveDealers: number;
  dealersAddedLast30Days: number;
  nationalCoveragePercentage: number;
}

export interface DatabaseAdapter {
  readonly adapterName: "file" | "mysql";
  healthCheck(): Promise<{ ok: boolean; adapter: string; details?: string }>;

  // Cars
  getCars(filters?: CarFilters): Promise<{ cars: Car[]; total: number }>;
  getCarById(id: string): Promise<Car | null>;
  getCarByListingCode(code: string): Promise<Car | null>;
  createCar(carData: Omit<Car, "id" | "listingCode" | "status" | "isSeedData" | "createdAt" | "updatedAt">): Promise<Car>;
  updateCar(carId: string, updates: Partial<Car>): Promise<Car | null>;
  updateCarStatus(
    carId: string,
    action: ModerationAction,
    adminId: string,
    adminName: string,
    reason?: string
  ): Promise<Car | null>;

  // Sellers
  getSellers(): Promise<Seller[]>;
  createSeller(sellerData: Omit<Seller, "id" | "createdAt">): Promise<Seller>;
  getSellerById(id: string): Promise<Seller | null>;

  // Dealers
  getDealers(filters?: { isVerified?: boolean; stateId?: string; districtId?: string }): Promise<Dealer[]>;
  getDealerById(id: string): Promise<Dealer | null>;
  getDealerBySlug(slug: string): Promise<Dealer | null>;
  createDealer(dealerData: Omit<Dealer, "id" | "createdAt">): Promise<Dealer>;
  updateDealerVerification(dealerId: string, isVerified: boolean): Promise<Dealer | null>;
  updateDealer(dealerId: string, updates: Partial<Dealer>): Promise<Dealer | null>;

  // Enquiries
  createEnquiry(enquiryData: Omit<Enquiry, "id" | "status" | "createdAt">): Promise<Enquiry>;
  getEnquiries(filters?: EnquiryFilters): Promise<Enquiry[]>;
  updateEnquiryStatus(enquiryId: string, status: EnquiryStatus): Promise<Enquiry | null>;
  updateEnquiry(enquiryId: string, updates: Partial<Enquiry>): Promise<Enquiry | null>;

  // Administrators
  getAdmins(): Promise<AdminUser[]>;
  createAdmin(adminData: Omit<AdminUser, "id" | "createdAt" | "tokenVersion">): Promise<AdminUser>;
  getAdminByUsername(username: string): Promise<AdminUser | null>;
  getAdminById(id: string): Promise<AdminUser | null>;
  updateAdminLastLogin(adminId: string): Promise<void>;
  rotateAdminPassword(adminId: string, newPasswordHash: string): Promise<AdminUser | null>;
  invalidateAdminSessions(adminId: string): Promise<boolean>;

  // Locations & PAN-India Hierarchy
  getStates(filters?: { isActive?: boolean }): Promise<State[]>;
  getStateById(id: string): Promise<State | null>;
  getDistricts(filters?: { stateId?: string; isActive?: boolean; expansionStatus?: ExpansionStatus }): Promise<District[]>;
  getDistrictById(id: string): Promise<District | null>;
  createDistrict(districtData: Omit<District, "id" | "createdAt" | "updatedAt">): Promise<District>;
  updateDistrict(id: string, updates: Partial<District>): Promise<District | null>;
  getCities(filters?: { districtId?: string; stateId?: string }): Promise<City[]>;

  // Network Analytics & Coverage
  getNetworkOverviewStats(): Promise<NetworkOverviewStats>;
  getStateCoverageMetrics(): Promise<StateCoverageMetric[]>;
  getDistrictCoverageMetrics(stateId?: string): Promise<DistrictCoverageMetric[]>;

  // Moderation & Platform Stats
  getModerationEvents(carId?: string): Promise<ModerationEvent[]>;
  createModerationEvent(event: Omit<ModerationEvent, "id" | "createdAt">): Promise<ModerationEvent>;
  getPlatformStats(): Promise<PlatformStats>;

  // Spare Parts E-commerce Module
  getPartCategories(): Promise<PartCategory[]>;
  getPartCategoryById(id: string): Promise<PartCategory | null>;
  getPartCategoryBySlug(slug: string): Promise<PartCategory | null>;
  createPartCategory(category: Omit<PartCategory, "id" | "createdAt" | "updatedAt">): Promise<PartCategory>;
  updatePartCategory(id: string, updates: Partial<PartCategory>): Promise<PartCategory | null>;
  deletePartCategory(id: string): Promise<boolean>;

  getPartBrands(): Promise<PartBrand[]>;
  getPartBrandById(id: string): Promise<PartBrand | null>;
  getPartBrandBySlug(slug: string): Promise<PartBrand | null>;

  getPartProducts(filters?: PartProductFilters): Promise<{ products: PartProduct[]; total: number; page?: number; totalPages?: number }>;
  getPartProductById(id: string): Promise<PartProduct | null>;
  getPartProductBySlug(slug: string): Promise<PartProduct | null>;
  createPartProduct(product: Omit<PartProduct, "id" | "createdAt" | "updatedAt" | "priceVerifiedAt">): Promise<PartProduct>;
  updatePartProduct(
    id: string,
    updates: Partial<PartProduct>,
    actorId?: string,
    actorName?: string,
    priceSource?: string
  ): Promise<PartProduct | null>;
  deletePartProduct(id: string): Promise<boolean>;

  getPartSellers(): Promise<PartSeller[]>;
  getPartSellerById(id: string): Promise<PartSeller | null>;
  getPartSellerByUserId(userId: string): Promise<PartSeller | null>;
  createPartSeller(seller: Omit<PartSeller, "id" | "createdAt" | "updatedAt">): Promise<PartSeller>;
  updatePartSeller(id: string, updates: Partial<PartSeller>): Promise<PartSeller | null>;

  getPartOrders(filters?: { sellerId?: string; customerPhone?: string; status?: PartOrderStatus }): Promise<PartOrder[]>;
  getPartOrderById(id: string): Promise<PartOrder | null>;
  getPartOrderByNumber(orderNumber: string): Promise<PartOrder | null>;
  createPartOrder(order: Omit<PartOrder, "id" | "orderNumber" | "createdAt" | "updatedAt" | "history">): Promise<PartOrder>;
  updatePartOrderStatus(orderId: string, status: PartOrderStatus, actor: string, notes?: string): Promise<PartOrder | null>;

  getPartPriceHistory(productId?: string): Promise<PartPriceHistory[]>;
  addPartPriceHistory(entry: Omit<PartPriceHistory, "id" | "changedAt">): Promise<PartPriceHistory>;

  getPartCart(sessionId: string): Promise<PartCart | null>;
  savePartCart(cart: PartCart): Promise<PartCart>;

  getPartEnquiries(filters?: { productId?: string; status?: string }): Promise<PartEnquiry[]>;
  createPartEnquiry(enquiry: Omit<PartEnquiry, "id" | "createdAt" | "updatedAt">): Promise<PartEnquiry>;
  updatePartEnquiry(id: string, updates: Partial<PartEnquiry>): Promise<PartEnquiry | null>;

  // Automotive Operations, Garage & Procurement
  getOutlets(filters?: { isActive?: boolean; type?: OutletType }): Promise<Outlet[]>;
  getOutletById(id: string): Promise<Outlet | null>;
  createOutlet(data: Omit<Outlet, "id" | "createdAt" | "updatedAt">): Promise<Outlet>;
  updateOutlet(id: string, updates: Partial<Outlet>): Promise<Outlet | null>;

  getSuppliers(filters?: { status?: SupplierVerificationStatus; category?: SupplierCategory }): Promise<Supplier[]>;
  getSupplierById(id: string): Promise<Supplier | null>;
  createSupplier(data: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<Supplier>;
  updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | null>;

  getSupplierQuotations(filters?: { sku?: string; supplierId?: string }): Promise<SupplierQuotation[]>;
  createSupplierQuotation(data: Omit<SupplierQuotation, "id" | "createdAt" | "updatedAt">): Promise<SupplierQuotation>;

  getPurchaseOrders(filters?: { outletId?: string; supplierId?: string; status?: POStatus }): Promise<PurchaseOrder[]>;
  getPurchaseOrderById(id: string): Promise<PurchaseOrder | null>;
  createPurchaseOrder(data: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt" | "history">): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>, actor?: string, notes?: string): Promise<PurchaseOrder | null>;
  receiveGoods(grnData: Omit<GoodsReceiptNote, "id" | "createdAt">): Promise<{ grn: GoodsReceiptNote; stockUpdated: boolean }>;

  getOutletInventory(outletId?: string, filters?: { lowStockOnly?: boolean; search?: string; ownerType?: InventoryOwnerType; ownerId?: string }): Promise<OutletInventoryItem[]>;
  getInventoryItem(outletId: string, productId: string, ownerType?: InventoryOwnerType, ownerId?: string): Promise<OutletInventoryItem | null>;
  recordStockMovement(movement: Omit<StockMovement, "id" | "timestamp">): Promise<StockMovement>;
  getStockMovements(filters?: { outletId?: string; productId?: string; type?: StockMovementType }): Promise<StockMovement[]>;
  // Phase 1 Multi-Owner Inventory Ledger & Reservations
  recordInventoryLedgerEntry(entry: Omit<InventoryLedgerEntry, "id" | "timestamp">): Promise<InventoryLedgerEntry>;
  getInventoryLedger(filters?: {
    outletId?: string;
    productId?: string;
    sku?: string;
    ownerType?: InventoryOwnerType;
    ownerId?: string;
    transactionType?: InventoryLedgerTransactionType;
  }): Promise<InventoryLedgerEntry[]>;
  reserveInventoryStock(params: {
    outletId: string;
    productId: string;
    quantity: number;
    ownerType?: InventoryOwnerType;
    ownerId?: string;
    referenceType: "ORDER" | "JOB_CARD";
    referenceId: string;
    performedBy: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; item?: OutletInventoryItem; error?: string }>;
  releaseInventoryReservation(params: {
    outletId: string;
    productId: string;
    quantity: number;
    ownerType?: InventoryOwnerType;
    ownerId?: string;
    referenceType: "ORDER" | "JOB_CARD";
    referenceId: string;
    performedBy: string;
  }): Promise<{ success: boolean; item?: OutletInventoryItem; error?: string }>;
  getInterOutletTransfers(): Promise<InterOutletTransfer[]>;
  createInterOutletTransfer(transfer: Omit<InterOutletTransfer, "id" | "createdAt">): Promise<InterOutletTransfer>;
  updateInterOutletTransfer(id: string, updates: Partial<InterOutletTransfer>): Promise<InterOutletTransfer | null>;

  getGarageServices(vehicleType?: "CAR" | "TWO_WHEELER"): Promise<GarageServiceItem[]>;
  getGarageJobCards(filters?: { outletId?: string; status?: GarageJobStatus; vehicleType?: string }): Promise<GarageJobCard[]>;
  getGarageJobCardById(id: string): Promise<GarageJobCard | null>;
  createGarageJobCard(jobCard: Omit<GarageJobCard, "id" | "createdAt" | "updatedAt">): Promise<GarageJobCard>;
  updateGarageJobCard(id: string, updates: Partial<GarageJobCard>): Promise<GarageJobCard | null>;

  getUsedCarEconomics(status?: string): Promise<UsedCarEconomics[]>;
  updateUsedCarEconomics(carId: string, updates: Partial<UsedCarEconomics>): Promise<UsedCarEconomics | null>;

  getOperatingExpenses(outletId?: string, month?: string): Promise<OperatingExpense[]>;
  recordOperatingExpense(expense: Omit<OperatingExpense, "id" | "createdAt">): Promise<OperatingExpense>;
  getMonthlyBudget(month: string, outletId?: string): Promise<MonthlyBudget | null>;

  getOperationsOverviewStats(outletId?: string, dateRange?: { start?: string; end?: string }): Promise<OperationsOverviewStats>;
  addOperationsAuditLog(log: Omit<OperationsAuditLog, "id" | "timestamp">): Promise<OperationsAuditLog>;
  getOperationsAuditLogs(module?: string, outletId?: string): Promise<OperationsAuditLog[]>;

  // Customer Application, My Garage & Support Module
  getCustomerByPhone(phone: string): Promise<Customer | null>;
  getCustomerById(id: string): Promise<Customer | null>;
  createCustomer(data: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null>;
  saveCustomerOTP(otp: CustomerOTP): Promise<void>;
  getLatestCustomerOTP(phone: string): Promise<CustomerOTP | null>;
  markCustomerOTPUsed(id: string): Promise<void>;

  getCustomerVehicles(customerId: string): Promise<CustomerVehicle[]>;
  getCustomerVehicleById(id: string): Promise<CustomerVehicle | null>;
  createCustomerVehicle(data: Omit<CustomerVehicle, "id" | "createdAt" | "updatedAt">): Promise<CustomerVehicle>;
  updateCustomerVehicle(id: string, updates: Partial<CustomerVehicle>): Promise<CustomerVehicle | null>;
  deleteCustomerVehicle(id: string, customerId: string): Promise<boolean>;

  getCustomerTickets(customerId: string): Promise<CustomerSupportTicket[]>;
  getCustomerTicketById(id: string): Promise<CustomerSupportTicket | null>;
  createCustomerTicket(data: Omit<CustomerSupportTicket, "id" | "createdAt" | "updatedAt">): Promise<CustomerSupportTicket>;
  addTicketMessage(ticketId: string, message: CustomerSupportTicket["messages"][0]): Promise<CustomerSupportTicket | null>;

  getCustomerSavedItems(customerId: string): Promise<CustomerSavedItem[]>;
  toggleCustomerSavedItem(customerId: string, itemType: "CAR" | "SPARE_PART", itemId: string): Promise<boolean>;

  createOrderReturnRequest(request: Omit<OrderReturnRequest, "id" | "requestedAt" | "updatedAt">): Promise<OrderReturnRequest>;
  getOrderReturnRequests(customerId?: string): Promise<OrderReturnRequest[]>;

  recordPaymentTransaction(tx: Omit<PaymentTransaction, "id" | "createdAt" | "updatedAt">): Promise<PaymentTransaction>;
  getPaymentTransactionByIdempotency(key: string): Promise<PaymentTransaction | null>;
  updatePaymentTransaction(id: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction | null>;
}

export interface PartProductFilters {
  categoryId?: string;
  categorySlug?: string;
  subcategory?: string;
  brand?: string;
  condition?: PartCondition | "ALL";
  partType?: PartType | "ALL";
  status?: PartStatus | "ALL";
  sellerId?: string;
  search?: string;
  partNumber?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleVariant?: string;
  vehicleFuelType?: string;
  make?: string;
  model?: string;
  year?: number;
  sortBy?: "relevance" | "price-asc" | "price-desc" | "newest" | "rating" | "price_asc" | "price_desc" | "discount";
  page?: number;
  limit?: number;
}

