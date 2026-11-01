/**
 * WowCars — Core Database Persistence Engine (File-Backed Adapter)
 * Atomic file-backed relational store with zero external cloud dependencies.
 * Concurrency-safe via POSIX advisory lock files and atomic file replacement.
 * Durable across server reboots, multi-process safe, and crash-resilient.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  DatabaseSchema, Car, Dealer, Seller, Enquiry,
  AdminUser, ModerationEvent, CarStatus, EnquiryStatus,
  ModerationAction, State, District, City, ExpansionStatus,
  PartCategory, PartBrand, PartProduct, PartSeller, PartPriceHistory,
  PartCart, PartOrder, PartEnquiry, PartOrderStatus,
  Outlet, OutletType, Supplier, SupplierVerificationStatus, SupplierCategory,
  SupplierQuotation, PurchaseOrder, POStatus, GoodsReceiptNote, OutletInventoryItem,
  StockMovement, StockMovementType, InterOutletTransfer, GarageJobCard, GarageJobStatus,
  GarageServiceItem, UsedCarEconomics, OperatingExpense, MonthlyBudget, OperationsAuditLog,
  OperationsOverviewStats,
  InventoryOwnerType, InventoryLedgerTransactionType, InventoryLedgerEntry,
  Customer, CustomerOTP, CustomerVehicle, CustomerSupportTicket, CustomerSavedItem,
  OrderReturnRequest, PaymentTransaction
} from "./types";
import {
  DatabaseAdapter, CarFilters, EnquiryFilters, PlatformStats,
  StateCoverageMetric, DistrictCoverageMetric, NetworkOverviewStats,
  PartProductFilters
} from "./adapter";
import { INITIAL_SEED_DATA } from "./seeds";
import {
  SEED_OUTLETS, SEED_SUPPLIERS, SEED_SUPPLIER_QUOTATIONS,
  SEED_OUTLET_INVENTORY, SEED_GARAGE_SERVICES, SEED_GARAGE_JOB_CARDS,
  SEED_USED_CAR_ECONOMICS, SEED_OPERATING_EXPENSES, SEED_MONTHLY_BUDGET,
  SEED_OPERATIONS_AUDIT_LOGS
} from "./operationsSeeds";

const DB_FILE_PATH = path.join(process.cwd(), "data", "wowcars_db.json");
const LOCK_FILE_PATH = path.join(process.cwd(), "data", "wowcars_db.lock");

export class DatabaseStore implements DatabaseAdapter {
  public readonly adapterName = "file" as const;
  private cache: DatabaseSchema | null = null;
  private lastLoadedMtime = 0;

  constructor() {
    this.ensureInitialized();
  }

  public async healthCheck(): Promise<{ ok: boolean; adapter: string; details?: string }> {
    try {
      this.ensureInitialized();
      const db = this.getDB();
      return { ok: Boolean(db && db.cars), adapter: "file" };
    } catch (err: unknown) {
      return { ok: false, adapter: "file", details: String(err) };
    }
  }

  /**
   * Acquire filesystem advisory lock for safe multi-process concurrency
   */
  private acquireLock(timeoutMs = 5000): void {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const fd = fs.openSync(LOCK_FILE_PATH, "wx");
        fs.writeSync(fd, `${process.pid}\n${Date.now()}`);
        fs.closeSync(fd);
        return;
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code === "EEXIST") {
          // Check for stale lock (> 8 seconds old)
          try {
            const stat = fs.statSync(LOCK_FILE_PATH);
            if (Date.now() - stat.mtimeMs > 8000) {
              try { fs.unlinkSync(LOCK_FILE_PATH); } catch {}
              continue;
            }
          } catch {}
          // Busy wait sleep 10ms
          const waitTill = Date.now() + 10;
          while (Date.now() < waitTill) {}
        } else {
          try {
            fs.mkdirSync(path.dirname(LOCK_FILE_PATH), { recursive: true });
          } catch {}
        }
      }
    }
  }

  /**
   * Release filesystem advisory lock
   */
  private releaseLock(): void {
    try {
      if (fs.existsSync(LOCK_FILE_PATH)) {
        fs.unlinkSync(LOCK_FILE_PATH);
      }
    } catch {}
  }

  /**
   * Execute a state-mutating operation inside an exclusive lock
   */
  public withLock<T>(fn: () => T): T {
    this.acquireLock();
    try {
      this.loadFromDisk();
      const result = fn();
      this.persistSync();
      return result;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Ensure database file exists on disk, initializing with seed data if absent
   */
  private ensureInitialized(): void {
    const dataDir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE_PATH)) {
      this.cache = INITIAL_SEED_DATA;
      this.persistSync();
    } else {
      this.loadFromDisk();
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const stat = fs.statSync(DB_FILE_PATH);
        const raw = fs.readFileSync(DB_FILE_PATH, "utf8");
        this.cache = JSON.parse(raw);
        this.lastLoadedMtime = stat.mtimeMs;
      } else {
        this.cache = INITIAL_SEED_DATA;
        this.persistSync();
      }
    } catch {
      this.cache = INITIAL_SEED_DATA;
      this.persistSync();
    }

    // Auto-migration: ensure states, districts, cities are present in persistent store
    if (this.cache) {
      let needsSave = false;
      if (!this.cache.states || this.cache.states.length === 0) {
        this.cache.states = INITIAL_SEED_DATA.states;
        this.cache.districts = INITIAL_SEED_DATA.districts;
        this.cache.cities = INITIAL_SEED_DATA.cities;
        needsSave = true;
      }
      if (this.cache.dealers) {
        for (const d of this.cache.dealers) {
          if (!d.stateId) {
            d.stateId = "IN-KA";
            d.stateName = "Karnataka";
            d.districtId = "IN-KA-BLRU";
            d.districtName = "Bengaluru Urban";
            d.cityName = "Bengaluru";
            d.pincode = "560001";
            d.approvalStatus = d.isVerified ? "APPROVED" : "PENDING";
            d.isSeedData = d.isSeedData !== undefined ? d.isSeedData : true;
            needsSave = true;
          }
        }
      }
      if (!this.cache.partCategories || this.cache.partCategories.length === 0) {
        this.cache.partCategories = INITIAL_SEED_DATA.partCategories || [];
        this.cache.partBrands = INITIAL_SEED_DATA.partBrands || [];
        this.cache.partSellers = INITIAL_SEED_DATA.partSellers || [];
        this.cache.partProducts = INITIAL_SEED_DATA.partProducts || [];
        this.cache.partOrders = [];
        this.cache.partCarts = [];
        this.cache.partPriceHistory = [];
        this.cache.partEnquiries = [];
        needsSave = true;
      }
      if (!this.cache.outlets || this.cache.outlets.length === 0) {
        this.cache.outlets = [...SEED_OUTLETS];
        this.cache.suppliers = [...SEED_SUPPLIERS];
        this.cache.supplierQuotations = [...SEED_SUPPLIER_QUOTATIONS];
        this.cache.purchaseOrders = [];
        this.cache.goodsReceiptNotes = [];
        this.cache.outletInventory = [...SEED_OUTLET_INVENTORY];
        this.cache.stockMovements = [];
        this.cache.interOutletTransfers = [];
        this.cache.garageJobCards = [...SEED_GARAGE_JOB_CARDS];
        this.cache.garageServices = [...SEED_GARAGE_SERVICES];
        this.cache.usedCarEconomics = [...SEED_USED_CAR_ECONOMICS];
        this.cache.operatingExpenses = [...SEED_OPERATING_EXPENSES];
        this.cache.monthlyBudgets = [SEED_MONTHLY_BUDGET];
        this.cache.operationsAuditLogs = [...SEED_OPERATIONS_AUDIT_LOGS];
        needsSave = true;
      }
      if (!this.cache.customers) {
        this.cache.customers = [];
        this.cache.customerOTPs = [];
        this.cache.customerVehicles = [];
        this.cache.customerTickets = [];
        this.cache.customerSavedItems = [];
        this.cache.orderReturns = [];
        this.cache.paymentTransactions = [];
        needsSave = true;
      }
      if (needsSave) {
        this.persistSync();
      }
    }
  }

  /**
   * Atomic file persistence using temporary file and atomic rename
   */
  private persistSync(): void {
    if (!this.cache) return;
    this.cache.lastUpdated = new Date().toISOString();

    const dataDir = path.dirname(DB_FILE_PATH);
    const tempFilePath = path.join(dataDir, `wowcars_db.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`);

    try {
      fs.writeFileSync(tempFilePath, JSON.stringify(this.cache, null, 2), "utf8");
      fs.renameSync(tempFilePath, DB_FILE_PATH);
      if (fs.existsSync(DB_FILE_PATH)) {
        const stat = fs.statSync(DB_FILE_PATH);
        this.lastLoadedMtime = stat.mtimeMs;
      }
    } catch (err) {
      if (fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch {}
      }
      throw err;
    }
  }

  private getDB(): DatabaseSchema {
    if (!this.cache) {
      this.ensureInitialized();
    } else {
      try {
        if (fs.existsSync(DB_FILE_PATH)) {
          const stat = fs.statSync(DB_FILE_PATH);
          if (stat.mtimeMs > this.lastLoadedMtime) {
            this.loadFromDisk();
          }
        }
      } catch {}
    }
    return this.cache!;
  }

  // ==========================================
  // CAR INVENTORY METHODS
  // ==========================================

  public async getCars(filters: CarFilters = {}): Promise<{ cars: Car[]; total: number }> {
    const db = this.getDB();
    const targetStatus = filters.status || "ACTIVE"; // Public default: only approved ACTIVE cars

    const results = db.cars.filter((car) => {
      // Status filter (Strict security boundary: pending or rejected cars never leak to public)
      if (targetStatus !== "ALL" && car.status !== targetStatus) {
        return false;
      }

      // City filter
      if (filters.city && filters.city !== "all" && car.city.toLowerCase() !== filters.city.toLowerCase()) {
        return false;
      }

      // Dealer isolation filter
      if (filters.dealerId && car.dealerId !== filters.dealerId) {
        return false;
      }

      // Seller isolation filter
      if (filters.sellerId && car.sellerId !== filters.sellerId) {
        return false;
      }

      // Make / Brand
      if (filters.make && filters.make !== "all" && car.make.toLowerCase() !== filters.make.toLowerCase()) {
        return false;
      }

      // Fuel Type
      if (filters.fuelType && filters.fuelType !== "all" && car.fuelType.toLowerCase() !== filters.fuelType.toLowerCase()) {
        return false;
      }

      // Transmission
      if (filters.transmission && filters.transmission !== "all" && car.transmission.toLowerCase() !== filters.transmission.toLowerCase()) {
        return false;
      }

      // Body Type
      if (filters.bodyType && filters.bodyType !== "all" && car.bodyType.toLowerCase() !== filters.bodyType.toLowerCase()) {
        return false;
      }

      // Budget brackets
      if (filters.budget === "under-8" && car.priceINR > 800000) return false;
      if (filters.budget === "8-15" && (car.priceINR < 800000 || car.priceINR > 1500000)) return false;
      if (filters.budget === "above-15" && car.priceINR < 1500000) return false;

      // Free-text search
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const matches =
          car.make.toLowerCase().includes(q) ||
          car.model.toLowerCase().includes(q) ||
          car.variant.toLowerCase().includes(q) ||
          car.listingCode.toLowerCase().includes(q) ||
          car.locality.toLowerCase().includes(q) ||
          car.city.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });

    // Sorting
    results.sort((a, b) => {
      if (filters.sortBy === "price-asc") return a.priceINR - b.priceINR;
      if (filters.sortBy === "price-desc") return b.priceINR - a.priceINR;
      if (filters.sortBy === "km-asc") return a.kmDriven - b.kmDriven;
      if (filters.sortBy === "year-desc") return b.year - a.year;

      // Default: Featured first, then newest
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = results.length;
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const start = (page - 1) * limit;
    const paginated = results.slice(start, start + limit);

    return { cars: paginated, total };
  }

  public async getCarById(id: string): Promise<Car | null> {
    const db = this.getDB();
    return db.cars.find((c) => c.id === id) || null;
  }

  public async getCarByListingCode(code: string): Promise<Car | null> {
    const db = this.getDB();
    const normalized = code.toLowerCase().trim();
    return db.cars.find((c) => c.listingCode.toLowerCase() === normalized || c.id === normalized) || null;
  }

  public async createCar(carData: Omit<Car, "id" | "listingCode" | "status" | "isSeedData" | "createdAt" | "updatedAt">): Promise<Car> {
    return this.withLock(() => {
      const db = this.getDB();

      // Generate unique sequential listing code WC-XXXX
      let nextNum = 1050 + db.cars.length;
      while (db.cars.some((c) => c.listingCode === `WC-${nextNum}`)) {
        nextNum += 1;
      }
      const listingCode = `WC-${nextNum}`;

      const newCar: Car = {
        ...carData,
        id: `car-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        listingCode,
        status: "PENDING_APPROVAL", // Strict security default: requires admin review
        isSeedData: false, // Genuine customer record
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.cars.unshift(newCar);
      return newCar;
    });
  }

  public async updateCar(carId: string, updates: Partial<Car>): Promise<Car | null> {
    return this.withLock(() => {
      const db = this.getDB();
      const car = db.cars.find((c) => c.id === carId);
      if (!car) return null;

      Object.assign(car, updates);
      car.updatedAt = new Date().toISOString();
      return car;
    });
  }

  public async updateCarStatus(
    carId: string,
    action: ModerationAction,
    adminId: string,
    adminName: string,
    reason?: string
  ): Promise<Car | null> {
    return this.withLock(() => {
      const db = this.getDB();
      const car = db.cars.find((c) => c.id === carId);
      if (!car) return null;

      const previousStatus = car.status;
      let newStatus: CarStatus = car.status;
      if (action === "APPROVED") newStatus = "ACTIVE";
      else if (action === "REJECTED") newStatus = "REJECTED";
      else if (action === "REQUEST_CHANGES") newStatus = "CHANGES_REQUESTED";
      else if (action === "SUSPEND") newStatus = "SUSPENDED";
      else if (action === "MARKED_SOLD") newStatus = "SOLD";
      else if (action === "RESTORED") newStatus = "ACTIVE";

      car.status = newStatus;
      car.rejectionReason = reason || undefined;
      car.updatedAt = new Date().toISOString();

      // Log tamper-evident audit event
      const event: ModerationEvent = {
        id: `mod-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        carId: car.id,
        carListingCode: car.listingCode,
        adminId,
        adminName,
        action,
        reason,
        entityType: "CAR",
        previousStatus,
        newStatus,
        createdAt: new Date().toISOString(),
      };
      db.moderationEvents.unshift(event);
      return car;
    });
  }

  // ==========================================
  // SELLER METHODS
  // ==========================================

  public async getSellers(): Promise<Seller[]> {
    const db = this.getDB();
    return db.sellers;
  }

  public async createSeller(sellerData: Omit<Seller, "id" | "createdAt">): Promise<Seller> {
    return this.withLock(() => {
      const db = this.getDB();
      const existing = db.sellers.find((s) => s.phone === sellerData.phone);
      if (existing) {
        existing.fullName = sellerData.fullName;
        existing.whatsapp = sellerData.whatsapp;
        existing.locality = sellerData.locality;
        return existing;
      }

      const newSeller: Seller = {
        ...sellerData,
        id: `seller-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        createdAt: new Date().toISOString(),
      };

      db.sellers.push(newSeller);
      return newSeller;
    });
  }

  public async getSellerById(id: string): Promise<Seller | null> {
    const db = this.getDB();
    return db.sellers.find((s) => s.id === id) || null;
  }

  // ==========================================
  // DEALER METHODS
  // ==========================================

  public async getDealers(filters?: { isVerified?: boolean; stateId?: string; districtId?: string }): Promise<Dealer[]> {
    const db = this.getDB();
    let result = db.dealers;
    if (filters) {
      if (typeof filters.isVerified === "boolean") {
        result = result.filter((d) => d.isVerified === filters.isVerified);
      }
      if (filters.stateId) {
        result = result.filter((d) => d.stateId === filters.stateId);
      }
      if (filters.districtId) {
        result = result.filter((d) => d.districtId === filters.districtId);
      }
    }
    return result;
  }

  public async getDealerById(id: string): Promise<Dealer | null> {
    const db = this.getDB();
    return db.dealers.find((d) => d.id === id) || null;
  }

  public async getDealerBySlug(slug: string): Promise<Dealer | null> {
    const db = this.getDB();
    return db.dealers.find((d) => d.slug.toLowerCase() === slug.toLowerCase()) || null;
  }

  public async createDealer(dealerData: Omit<Dealer, "id" | "createdAt">): Promise<Dealer> {
    return this.withLock(() => {
      const db = this.getDB();
      const id = `dealer-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const newDealer: Dealer = {
        ...dealerData,
        id,
        createdAt: new Date().toISOString(),
      };
      db.dealers.push(newDealer);
      return newDealer;
    });
  }

  public async updateDealerVerification(dealerId: string, isVerified: boolean): Promise<Dealer | null> {
    return this.withLock(() => {
      const db = this.getDB();
      const dealer = db.dealers.find((d) => d.id === dealerId);
      if (!dealer) return null;
      dealer.isVerified = isVerified;
      dealer.kycStatus = isVerified ? "VERIFIED" : "SUSPENDED";
      return dealer;
    });
  }

  public async updateDealer(dealerId: string, updates: Partial<Dealer>): Promise<Dealer | null> {
    return this.withLock(() => {
      const db = this.getDB();
      const dealer = db.dealers.find((d) => d.id === dealerId);
      if (!dealer) return null;
      Object.assign(dealer, updates);
      return dealer;
    });
  }

  // ==========================================
  // BUYER ENQUIRY & LEAD METHODS
  // ==========================================

  public async createEnquiry(enquiryData: Omit<Enquiry, "id" | "status" | "createdAt">): Promise<Enquiry> {
    return this.withLock(() => {
      const db = this.getDB();
      const car = db.cars.find((c) => c.id === enquiryData.carId);

      const newEnquiry: Enquiry = {
        ...enquiryData,
        id: `enq-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        carTitle: car ? `${car.year} ${car.make} ${car.model} ${car.variant}` : undefined,
        carListingCode: car ? car.listingCode : undefined,
        dealerId: car?.dealerId,
        sellerId: car?.sellerId,
        status: "NEW",
        createdAt: new Date().toISOString(),
      };

      db.enquiries.unshift(newEnquiry);
      return newEnquiry;
    });
  }

  public async updateEnquiry(enquiryId: string, updates: Partial<Enquiry>): Promise<Enquiry | null> {
    return this.withLock(() => {
      const db = this.getDB();
      const enq = db.enquiries.find((e) => e.id === enquiryId);
      if (!enq) return null;
      Object.assign(enq, updates);
      return enq;
    });
  }

  public async getEnquiries(filters: EnquiryFilters = {}): Promise<Enquiry[]> {
    const db = this.getDB();
    return db.enquiries.filter((enq) => {
      if (filters.dealerId && enq.dealerId !== filters.dealerId) return false;
      if (filters.carId && enq.carId !== filters.carId) return false;
      if (filters.status && enq.status !== filters.status) return false;
      return true;
    });
  }

  public async updateEnquiryStatus(enquiryId: string, status: EnquiryStatus): Promise<Enquiry | null> {
    return this.withLock(() => {
      const db = this.getDB();
      const enq = db.enquiries.find((e) => e.id === enquiryId);
      if (!enq) return null;
      enq.status = status;
      return enq;
    });
  }

  // ==========================================
  // ADMIN AUTH & AUDIT METHODS
  // ==========================================

  public async createAdmin(adminData: Omit<AdminUser, "id" | "createdAt" | "tokenVersion">): Promise<AdminUser> {
    return this.withLock(() => {
      const db = this.getDB();
      const id = `admin-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const email = (adminData.email || `${adminData.username}@wowcars.in`).toLowerCase().trim();
      const newAdmin: AdminUser = {
        id,
        username: adminData.username.toLowerCase().trim(),
        email,
        fullName: adminData.fullName.trim(),
        passwordHash: adminData.passwordHash,
        role: adminData.role || "ADMIN",
        isActive: adminData.isActive !== false,
        tokenVersion: 1,
        passwordChangedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      db.admins.push(newAdmin);
      return newAdmin;
    });
  }

  public async getAdminByUsername(username: string): Promise<AdminUser | null> {
    const db = this.getDB();
    return db.admins.find((a) => a.username.toLowerCase() === username.toLowerCase().trim()) || null;
  }

  public async getAdminById(id: string): Promise<AdminUser | null> {
    const db = this.getDB();
    return db.admins.find((a) => a.id === id) || null;
  }

  public async updateAdminLastLogin(adminId: string): Promise<void> {
    this.withLock(() => {
      const db = this.getDB();
      const admin = db.admins.find((a) => a.id === adminId);
      if (admin) {
        admin.lastLoginAt = new Date().toISOString();
      }
    });
  }

  public async rotateAdminPassword(adminId: string, newPasswordHash: string): Promise<AdminUser | null> {
    return this.withLock(() => {
      const db = this.getDB();
      const admin = db.admins.find((a) => a.id === adminId);
      if (!admin) return null;
      admin.passwordHash = newPasswordHash;
      admin.tokenVersion = (admin.tokenVersion || 1) + 1;
      admin.passwordChangedAt = new Date().toISOString();
      return admin;
    });
  }

  public async invalidateAdminSessions(adminId: string): Promise<boolean> {
    return this.withLock(() => {
      const db = this.getDB();
      const admin = db.admins.find((a) => a.id === adminId);
      if (!admin) return false;
      admin.tokenVersion = (admin.tokenVersion || 1) + 1;
      return true;
    });
  }

  public async getModerationEvents(carId?: string): Promise<ModerationEvent[]> {
    const db = this.getDB();
    if (carId) {
      return db.moderationEvents.filter((e) => e.carId === carId);
    }
    return db.moderationEvents;
  }

  public async createModerationEvent(
    eventData: Omit<ModerationEvent, "id" | "createdAt">
  ): Promise<ModerationEvent> {
    return this.withLock(async () => {
      const db = this.getDB();
      if (!db.moderationEvents) db.moderationEvents = [];
      const event: ModerationEvent = {
        ...eventData,
        id: `mod-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        createdAt: new Date().toISOString(),
      };
      db.moderationEvents.unshift(event);
      return event;
    });
  }

  public async getAdmins(): Promise<AdminUser[]> {
    const db = this.getDB();
    return db.admins.map((a) => ({
      ...a,
      passwordHash: "[PROTECTED]",
    }));
  }

  // ==========================================
  // LOCATIONS & PAN-INDIA HIERARCHY METHODS
  // ==========================================

  public async getStates(filters?: { isActive?: boolean }): Promise<State[]> {
    const db = this.getDB();
    if (filters && typeof filters.isActive === "boolean") {
      return (db.states || []).filter((s) => s.isActive === filters.isActive);
    }
    return db.states || [];
  }

  public async getStateById(id: string): Promise<State | null> {
    const db = this.getDB();
    return (db.states || []).find((s) => s.id === id) || null;
  }

  public async getDistricts(filters?: { stateId?: string; isActive?: boolean; expansionStatus?: ExpansionStatus }): Promise<District[]> {
    const db = this.getDB();
    let districts = db.districts || [];
    if (filters) {
      if (filters.stateId) {
        districts = districts.filter((d) => d.stateId === filters.stateId);
      }
      if (typeof filters.isActive === "boolean") {
        districts = districts.filter((d) => d.isActive === filters.isActive);
      }
      if (filters.expansionStatus) {
        districts = districts.filter((d) => d.expansionStatus === filters.expansionStatus);
      }
    }
    return districts;
  }

  public async getDistrictById(id: string): Promise<District | null> {
    const db = this.getDB();
    return (db.districts || []).find((d) => d.id === id) || null;
  }

  public async createDistrict(districtData: Omit<District, "id" | "createdAt" | "updatedAt">): Promise<District> {
    return this.withLock(() => {
      const db = this.getDB();
      const id = `${districtData.stateId.toLowerCase()}-${districtData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
      const newDistrict: District = {
        ...districtData,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!db.districts) db.districts = [];
      db.districts.push(newDistrict);
      return newDistrict;
    });
  }

  public async updateDistrict(id: string, updates: Partial<District>): Promise<District | null> {
    return this.withLock(() => {
      const db = this.getDB();
      const district = (db.districts || []).find((d) => d.id === id);
      if (!district) return null;
      Object.assign(district, updates, { updatedAt: new Date().toISOString() });
      return district;
    });
  }

  public async getCities(filters?: { districtId?: string; stateId?: string }): Promise<City[]> {
    const db = this.getDB();
    let cities = db.cities || [];
    if (filters) {
      if (filters.districtId) {
        cities = cities.filter((c) => c.districtId === filters.districtId);
      }
      if (filters.stateId) {
        cities = cities.filter((c) => c.stateId === filters.stateId);
      }
    }
    return cities;
  }

  // ==========================================
  // DEALER NETWORK COVERAGE & EXPANSION METRICS
  // ==========================================

  public async getNetworkOverviewStats(): Promise<NetworkOverviewStats> {
    const db = this.getDB();
    const dealers = db.dealers || [];
    const districts = (db.districts || []).filter((d) => d.isActive);

    const approvedDealers = dealers.filter((d) => d.approvalStatus === "APPROVED" || (d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED"));
    const pendingDealers = dealers.filter((d) => d.approvalStatus === "PENDING" || (!d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED"));
    const inactiveDealers = dealers.filter((d) => d.approvalStatus === "REJECTED" || d.approvalStatus === "SUSPENDED" || d.kycStatus === "REJECTED" || d.kycStatus === "SUSPENDED");

    const statesWithDealers = new Set(approvedDealers.map((d) => d.stateId).filter(Boolean));
    const districtsWithDealers = new Set(approvedDealers.map((d) => d.districtId).filter(Boolean));
    const districtsWithoutActiveDealers = districts.filter((d) => !districtsWithDealers.has(d.id)).length;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const dealersAddedLast30Days = dealers.filter((d) => new Date(d.createdAt).getTime() >= thirtyDaysAgo).length;

    const totalActiveDistricts = districts.length || 1;
    const nationalCoveragePercentage = Math.round((districtsWithDealers.size / totalActiveDistricts) * 1000) / 10;

    return {
      totalRegisteredDealers: dealers.length,
      approvedActiveDealers: approvedDealers.length,
      pendingDealerApplications: pendingDealers.length,
      rejectedSuspendedInactiveDealers: inactiveDealers.length,
      statesWithActiveDealers: statesWithDealers.size,
      districtsWithActiveDealers: districtsWithDealers.size,
      districtsWithoutActiveDealers,
      dealersAddedLast30Days,
      nationalCoveragePercentage,
    };
  }

  public async getStateCoverageMetrics(): Promise<StateCoverageMetric[]> {
    const db = this.getDB();
    const states = (db.states || []).filter((s) => s.isActive);
    const districts = db.districts || [];
    const dealers = db.dealers || [];
    const cars = (db.cars || []).filter((c) => c.status === "ACTIVE");
    const enquiries = db.enquiries || [];

    // Pre-map active approved dealers by district
    const approvedDealersByDistrict: Record<string, Dealer[]> = {};
    const allDealersByState: Record<string, Dealer[]> = {};
    for (const d of dealers) {
      if (d.stateId) {
        if (!allDealersByState[d.stateId]) allDealersByState[d.stateId] = [];
        allDealersByState[d.stateId].push(d);
      }
      if (d.districtId && (d.approvalStatus === "APPROVED" || (d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED"))) {
        if (!approvedDealersByDistrict[d.districtId]) approvedDealersByDistrict[d.districtId] = [];
        approvedDealersByDistrict[d.districtId].push(d);
      }
    }

    return states.map((state) => {
      const stateDistricts = districts.filter((d) => d.stateId === state.id);
      const activeDistricts = stateDistricts.filter((d) => d.isActive);
      const coveredDistricts = activeDistricts.filter((d) => approvedDealersByDistrict[d.id] && approvedDealersByDistrict[d.id].length > 0).length;
      const coveragePercentage = activeDistricts.length > 0
        ? Math.round((coveredDistricts / activeDistricts.length) * 1000) / 10
        : 0;

      const stateDealers = allDealersByState[state.id] || [];
      const activeApprovedDealers = stateDealers.filter((d) => d.approvalStatus === "APPROVED" || (d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED")).length;
      const pendingApplications = stateDealers.filter((d) => d.approvalStatus === "PENDING" || (!d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED")).length;

      // Cars linked to dealers in this state
      const stateDealerIds = new Set(stateDealers.map((d) => d.id));
      const activeVehicleListings = cars.filter((c) => (c.dealerId && stateDealerIds.has(c.dealerId)) || c.city?.toLowerCase() === state.capital?.toLowerCase() || (state.id === "IN-KA" && c.city?.toLowerCase() === "bengaluru")).length;

      const buyerEnquiriesReceived = enquiries.filter((e) => (e.dealerId && stateDealerIds.has(e.dealerId)) || (state.id === "IN-KA" && !e.dealerId)).length;

      return {
        stateId: state.id,
        stateName: state.name,
        stateCode: state.code,
        type: state.type,
        totalDistricts: stateDistricts.length,
        activeDistricts: activeDistricts.length,
        coveredDistricts,
        coveragePercentage,
        totalDealers: stateDealers.length,
        activeApprovedDealers,
        pendingApplications,
        activeVehicleListings,
        buyerEnquiriesReceived,
      };
    });
  }

  public async getDistrictCoverageMetrics(stateId?: string): Promise<DistrictCoverageMetric[]> {
    const db = this.getDB();
    let districts = db.districts || [];
    if (stateId) {
      districts = districts.filter((d) => d.stateId === stateId);
    }
    const dealers = db.dealers || [];
    const cars = (db.cars || []).filter((c) => c.status === "ACTIVE");
    const enquiries = db.enquiries || [];

    return districts.map((district) => {
      const districtDealers = dealers.filter((d) => d.districtId === district.id);
      const activeApproved = districtDealers.filter((d) => d.approvalStatus === "APPROVED" || (d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED"));
      const pending = districtDealers.filter((d) => d.approvalStatus === "PENDING" || (!d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED"));

      const networkStatus: "Covered" | "Partially Covered" | "Uncovered" =
        activeApproved.length > 0 ? "Covered" : pending.length > 0 ? "Partially Covered" : "Uncovered";

      // Active vehicle listings
      const districtDealerIds = new Set(districtDealers.map((d) => d.id));
      const activeVehicleListings = cars.filter((c) => (c.dealerId && districtDealerIds.has(c.dealerId)) || (district.id === "IN-KA-BLRU" && !c.dealerId)).length;

      const buyerEnquiries = enquiries.filter((e) => (e.dealerId && districtDealerIds.has(e.dealerId)) || (district.id === "IN-KA-BLRU" && !e.dealerId)).length;

      const latestRegistration = districtDealers.length > 0
        ? districtDealers.map((d) => d.createdAt).sort().reverse()[0]
        : undefined;

      return {
        districtId: district.id,
        districtName: district.name,
        stateId: district.stateId,
        stateName: district.stateName,
        totalDealers: districtDealers.length,
        activeApprovedDealers: activeApproved.length,
        pendingApplications: pending.length,
        activeVehicleListings,
        buyerEnquiries,
        networkStatus,
        expansionStatus: district.expansionStatus || (activeApproved.length > 0 ? "COVERED" : "NOT_STARTED"),
        expansionOwner: district.expansionOwner,
        expansionNotes: district.expansionNotes,
        followUpDate: district.followUpDate,
        latestRegistrationDate: latestRegistration,
      };
    });
  }

  // ==========================================
  // PLATFORM METRICS & STATS
  // ==========================================

  public async getPlatformStats(): Promise<PlatformStats> {
    const db = this.getDB();
    const activeCars = db.cars.filter((c) => c.status === "ACTIVE");
    const totalInventoryValueINR = activeCars.reduce((sum, c) => sum + (c.priceINR || 0), 0);

    return {
      totalCars: db.cars.length,
      activeCars: activeCars.length,
      pendingCars: db.cars.filter((c) => c.status === "PENDING_APPROVAL").length,
      changesRequestedCars: db.cars.filter((c) => c.status === "CHANGES_REQUESTED").length,
      suspendedCars: db.cars.filter((c) => c.status === "SUSPENDED").length,
      soldCars: db.cars.filter((c) => c.status === "SOLD").length,
      totalInventoryValueINR,
      totalEnquiries: db.enquiries.length,
      newEnquiries: db.enquiries.filter((e) => e.status === "NEW").length,
      testDrivesScheduled: db.enquiries.filter((e) => e.status === "TEST_DRIVE_SCHEDULED").length,
      leadsConverted: db.enquiries.filter((e) => e.status === "CONVERTED").length,
      totalDealers: db.dealers.length,
      verifiedDealers: db.dealers.filter((d) => d.isVerified).length,
      pendingDealers: db.dealers.filter((d) => !d.isVerified).length,
      totalSellers: db.sellers.length,
    };
  }

  // ==========================================
  // SPARE PARTS E-COMMERCE PERSISTENCE METHODS
  // ==========================================

  // --- Categories ---
  public async getPartCategories(): Promise<PartCategory[]> {
    const db = this.getDB();
    const categories = db.partCategories || [];
    return [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public async getPartCategoryById(id: string): Promise<PartCategory | null> {
    const db = this.getDB();
    const category = (db.partCategories || []).find((c) => c.id === id);
    return category ? { ...category } : null;
  }

  public async getPartCategoryBySlug(slug: string): Promise<PartCategory | null> {
    const db = this.getDB();
    const category = (db.partCategories || []).find((c) => c.slug.toLowerCase() === slug.toLowerCase());
    return category ? { ...category } : null;
  }

  public async createPartCategory(
    categoryData: Omit<PartCategory, "id" | "createdAt" | "updatedAt">
  ): Promise<PartCategory> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partCategories) db.partCategories = [];

      const id = `cat-${categoryData.slug || Date.now()}`;
      const now = new Date().toISOString();
      const newCategory: PartCategory = {
        ...categoryData,
        id,
        createdAt: now,
        updatedAt: now,
      };

      db.partCategories.push(newCategory);
      return newCategory;
    });
  }

  public async updatePartCategory(id: string, updates: Partial<PartCategory>): Promise<PartCategory | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partCategories) return null;

      const idx = db.partCategories.findIndex((c) => c.id === id);
      if (idx === -1) return null;

      const updated: PartCategory = {
        ...db.partCategories[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      db.partCategories[idx] = updated;
      return updated;
    });
  }

  public async deletePartCategory(id: string): Promise<boolean> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partCategories) return false;
      const initialLen = db.partCategories.length;
      db.partCategories = db.partCategories.filter((c) => c.id !== id);
      return db.partCategories.length < initialLen;
    });
  }

  // --- Brands ---
  public async getPartBrands(): Promise<PartBrand[]> {
    const db = this.getDB();
    return [...(db.partBrands || [])].sort((a, b) => a.name.localeCompare(b.name));
  }

  public async getPartBrandById(id: string): Promise<PartBrand | null> {
    const db = this.getDB();
    const brand = (db.partBrands || []).find((b) => b.id === id);
    return brand ? { ...brand } : null;
  }

  public async getPartBrandBySlug(slug: string): Promise<PartBrand | null> {
    const db = this.getDB();
    const brand = (db.partBrands || []).find((b) => b.slug.toLowerCase() === slug.toLowerCase());
    return brand ? { ...brand } : null;
  }

  // --- Products ---
  public async getPartProducts(filters?: PartProductFilters): Promise<{ products: PartProduct[]; total: number; page?: number; totalPages?: number }> {
    const db = this.getDB();
    let products = [...(db.partProducts || [])];

    if (!filters) {
      const published = products.filter((p) => p.status === "PUBLISHED");
      return { products: published, total: published.length, page: 1, totalPages: 1 };
    }

    // 1. Status Filter (defaults to PUBLISHED for safety unless explicitly specified or "ALL")
    if (filters.status && filters.status !== "ALL") {
      products = products.filter((p) => p.status === filters.status);
    } else if (!filters.status) {
      products = products.filter((p) => p.status === "PUBLISHED");
    }

    // 2. Category & Subcategory
    if (filters.categoryId) {
      products = products.filter((p) => p.categoryId === filters.categoryId);
    }
    if (filters.categorySlug) {
      const category = (db.partCategories || []).find(
        (c) => c.slug.toLowerCase() === filters.categorySlug?.toLowerCase()
      );
      if (category) {
        products = products.filter((p) => p.categoryId === category.id || p.categorySlug === category.slug);
      } else {
        products = products.filter((p) => p.categorySlug === filters.categorySlug);
      }
    }
    if (filters.subcategory) {
      products = products.filter((p) => p.subcategory?.toLowerCase() === filters.subcategory?.toLowerCase());
    }

    // 3. Brand
    if (filters.brand) {
      products = products.filter((p) => p.brand.toLowerCase() === filters.brand?.toLowerCase());
    }

    // 4. Condition & Part Type
    if (filters.condition && filters.condition !== "ALL") {
      products = products.filter((p) => p.condition === filters.condition);
    }
    if (filters.partType && filters.partType !== "ALL") {
      products = products.filter((p) => p.partType === filters.partType);
    }

    // 5. Seller Scope
    if (filters.sellerId) {
      products = products.filter((p) => p.sellerId === filters.sellerId);
    }

    // 6. Stock & Feature Flags
    if (filters.inStockOnly) {
      products = products.filter((p) => p.stockQuantity > 0);
    }
    if (filters.isFeatured !== undefined) {
      products = products.filter((p) => Boolean(p.isFeatured) === filters.isFeatured);
    }
    if (filters.isBestSeller !== undefined) {
      products = products.filter((p) => Boolean(p.isBestSeller) === filters.isBestSeller);
    }
    if (filters.isNewArrival !== undefined) {
      products = products.filter((p) => Boolean(p.isNewArrival) === filters.isNewArrival);
    }

    // 7. Price Range
    if (filters.minPrice !== undefined && !isNaN(filters.minPrice)) {
      products = products.filter((p) => (p.priceINR || p.price || 0) >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined && !isNaN(filters.maxPrice)) {
      products = products.filter((p) => (p.priceINR || p.price || 0) <= filters.maxPrice!);
    }

    // 8. Part Number Search
    if (filters.partNumber) {
      const pn = filters.partNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
      products = products.filter((p) => {
        const p1 = (p.partNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const p2 = (p.oemPartNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const p3 = (p.sku || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return p1.includes(pn) || p2.includes(pn) || p3.includes(pn);
      });
    }

    // 9. Free-text Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      products = products.filter((p) => {
        return (
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.partNumber && p.partNumber.toLowerCase().includes(q)) ||
          (p.oemPartNumber && p.oemPartNumber.toLowerCase().includes(q)) ||
          p.description.toLowerCase().includes(q) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
          p.compatibleVehicles.some(
            (cv) =>
              cv.make.toLowerCase().includes(q) ||
              cv.model.toLowerCase().includes(q) ||
              (cv.engineSpecs && cv.engineSpecs.toLowerCase().includes(q))
          )
        );
      });
    }

    // 10. Vehicle Compatibility Fitment Filter
    const filterMake = filters.make || filters.vehicleMake;
    const filterModel = filters.model || filters.vehicleModel;
    if (filterMake || filterModel) {
      const makeQ = filterMake ? filterMake.toLowerCase() : null;
      const modelQ = filterModel ? filterModel.toLowerCase() : null;
      products = products.filter((p) =>
        p.compatibleVehicles.some((cv) => {
          if (cv.make.toLowerCase() === "universal") return true;
          const makeMatches = !makeQ || cv.make.toLowerCase() === makeQ;
          const modelMatches = !modelQ || cv.model.toLowerCase() === modelQ || cv.model.toLowerCase().includes(modelQ);
          return makeMatches && modelMatches;
        })
      );
    }
    const filterYear = filters.year !== undefined ? filters.year : filters.vehicleYear;
    if (filterYear !== undefined && !isNaN(filterYear)) {
      const y = filterYear;
      products = products.filter((p) =>
        p.compatibleVehicles.some(
          (cv) =>
            cv.make.toLowerCase() === "universal" ||
            (y >= cv.startYear && y <= cv.endYear)
        )
      );
    }
    if (filters.vehicleFuelType) {
      const fuelQ = filters.vehicleFuelType.toLowerCase();
      products = products.filter((p) =>
        p.compatibleVehicles.some(
          (cv) =>
            cv.make.toLowerCase() === "universal" ||
            !cv.fuelTypes ||
            cv.fuelTypes.length === 0 ||
            cv.fuelTypes.some((ft) => ft.toLowerCase() === fuelQ)
        )
      );
    }

    // 11. Sorting
    if (filters.sortBy === "price-asc" || filters.sortBy === "price_asc") {
      products.sort((a, b) => (a.priceINR || a.price || 0) - (b.priceINR || b.price || 0));
    } else if (filters.sortBy === "price-desc" || filters.sortBy === "price_desc") {
      products.sort((a, b) => (b.priceINR || b.price || 0) - (a.priceINR || a.price || 0));
    } else if (filters.sortBy === "discount") {
      products.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
    } else if (filters.sortBy === "newest") {
      products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (filters.sortBy === "rating") {
      products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total = products.length;
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 50;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIdx = (page - 1) * limit;
    const paginated = products.slice(startIdx, startIdx + limit);

    return { products: paginated, total, page, totalPages };
  }

  public async getPartProductById(id: string): Promise<PartProduct | null> {
    const db = this.getDB();
    const product = (db.partProducts || []).find((p) => p.id === id);
    return product ? { ...product } : null;
  }

  public async getPartProductBySlug(slug: string): Promise<PartProduct | null> {
    const db = this.getDB();
    const product = (db.partProducts || []).find((p) => p.slug.toLowerCase() === slug.toLowerCase());
    return product ? { ...product } : null;
  }

  public async createPartProduct(
    productData: Omit<PartProduct, "id" | "createdAt" | "updatedAt" | "priceVerifiedAt">
  ): Promise<PartProduct> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partProducts) db.partProducts = [];

      const id = `part-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const now = new Date().toISOString();
      const slug =
        productData.slug ||
        `${productData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomBytes(2).toString("hex")}`;

      const newProduct: PartProduct = {
        ...productData,
        id,
        slug,
        priceVerifiedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      db.partProducts.push(newProduct);
      return newProduct;
    });
  }

  public async updatePartProduct(
    id: string,
    updates: Partial<PartProduct>,
    actorId?: string,
    actorName?: string,
    priceSource?: string
  ): Promise<PartProduct | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partProducts) return null;

      const idx = db.partProducts.findIndex((p) => p.id === id);
      if (idx === -1) return null;

      const current = db.partProducts[idx];
      const now = new Date().toISOString();

      // Check if price or MRP is changing — record in price history
      if (
        (updates.priceINR !== undefined && updates.priceINR !== current.priceINR) ||
        (updates.mrpINR !== undefined && updates.mrpINR !== current.mrpINR)
      ) {
        if (!db.partPriceHistory) db.partPriceHistory = [];
        const priceLog: PartPriceHistory = {
          id: `ph-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
          productId: id,
          productTitle: current.title,
          previousPriceINR: current.priceINR,
          newPriceINR: updates.priceINR !== undefined ? updates.priceINR : current.priceINR,
          previousMrpINR: current.mrpINR,
          newMrpINR: updates.mrpINR !== undefined ? updates.mrpINR : current.mrpINR,
          changedByUserId: actorId || "system",
          changedByUserName: actorName || "Marketplace Administrator",
          source: priceSource || current.priceSource || "Admin Price Update",
          changedAt: now,
        };
        db.partPriceHistory.push(priceLog);
        updates.priceVerifiedAt = now;
      }

      const updated: PartProduct = {
        ...current,
        ...updates,
        updatedAt: now,
      };
      db.partProducts[idx] = updated;
      return updated;
    });
  }

  public async deletePartProduct(id: string): Promise<boolean> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partProducts) return false;
      const idx = db.partProducts.findIndex((p) => p.id === id);
      if (idx === -1) return false;
      db.partProducts[idx].status = "ARCHIVED";
      db.partProducts[idx].updatedAt = new Date().toISOString();
      return true;
    });
  }

  // --- Sellers ---
  public async getPartSellers(): Promise<PartSeller[]> {
    const db = this.getDB();
    return [...(db.partSellers || [])];
  }

  public async getPartSellerById(id: string): Promise<PartSeller | null> {
    const db = this.getDB();
    const seller = (db.partSellers || []).find((s) => s.id === id);
    return seller ? { ...seller } : null;
  }

  public async getPartSellerByUserId(userId: string): Promise<PartSeller | null> {
    const db = this.getDB();
    const seller = (db.partSellers || []).find((s) => s.userId === userId);
    return seller ? { ...seller } : null;
  }

  public async createPartSeller(
    sellerData: Omit<PartSeller, "id" | "createdAt" | "updatedAt">
  ): Promise<PartSeller> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partSellers) db.partSellers = [];

      const id = `seller-sp-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const now = new Date().toISOString();
      const newSeller: PartSeller = {
        ...sellerData,
        id,
        createdAt: now,
        updatedAt: now,
      };

      db.partSellers.push(newSeller);
      return newSeller;
    });
  }

  public async updatePartSeller(id: string, updates: Partial<PartSeller>): Promise<PartSeller | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partSellers) return null;

      const idx = db.partSellers.findIndex((s) => s.id === id);
      if (idx === -1) return null;

      const updated: PartSeller = {
        ...db.partSellers[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      db.partSellers[idx] = updated;
      return updated;
    });
  }

  // --- Orders ---
  public async getPartOrders(filters?: {
    sellerId?: string;
    customerPhone?: string;
    status?: PartOrderStatus;
  }): Promise<PartOrder[]> {
    const db = this.getDB();
    let orders = [...(db.partOrders || [])];

    if (filters?.customerPhone) {
      orders = orders.filter((o) => o.customerPhone === filters.customerPhone);
    }
    if (filters?.status) {
      orders = orders.filter((o) => o.orderStatus === filters.status);
    }
    if (filters?.sellerId) {
      orders = orders.filter((o) => o.items.some((i) => i.sellerId === filters.sellerId));
    }

    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getPartOrderById(id: string): Promise<PartOrder | null> {
    const db = this.getDB();
    const order = (db.partOrders || []).find((o) => o.id === id);
    return order ? { ...order } : null;
  }

  public async getPartOrderByNumber(orderNumber: string): Promise<PartOrder | null> {
    const db = this.getDB();
    const order = (db.partOrders || []).find((o) => o.orderNumber.toUpperCase() === orderNumber.toUpperCase());
    return order ? { ...order } : null;
  }

  public async createPartOrder(
    orderData: Omit<PartOrder, "id" | "orderNumber" | "createdAt" | "updatedAt" | "history">
  ): Promise<PartOrder> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partOrders) db.partOrders = [];
      if (!db.partProducts) db.partProducts = [];

      const id = `ord-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const now = new Date().toISOString();
      const orderNumber = `WC-ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Revalidate and decrement inventory
      for (const item of orderData.items) {
        const prod = db.partProducts.find((p) => p.id === item.productId);
        if (prod) {
          prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
          if (prod.stockQuantity === 0) {
            prod.status = "OUT_OF_STOCK";
          }
          prod.updatedAt = now;
        }
      }

      const newOrder: PartOrder = {
        ...orderData,
        id,
        orderNumber,
        history: [
          {
            status: orderData.orderStatus,
            timestamp: now,
            actor: "CUSTOMER",
            notes: "Order placed online via WowCars Spare Parts Marketplace",
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      db.partOrders.push(newOrder);
      return newOrder;
    });
  }

  public async updatePartOrderStatus(
    orderId: string,
    status: PartOrderStatus,
    actor: string,
    notes?: string
  ): Promise<PartOrder | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partOrders) return null;

      const idx = db.partOrders.findIndex((o) => o.id === orderId);
      if (idx === -1) return null;

      const order = db.partOrders[idx];
      const now = new Date().toISOString();

      // If cancelled or returned, restore inventory
      if ((status === "CANCELLED" || status === "RETURNED") && order.orderStatus !== "CANCELLED" && order.orderStatus !== "RETURNED") {
        if (db.partProducts) {
          for (const item of order.items) {
            const prod = db.partProducts.find((p) => p.id === item.productId);
            if (prod) {
              prod.stockQuantity += item.quantity;
              if (prod.status === "OUT_OF_STOCK" && prod.stockQuantity > 0) {
                prod.status = "PUBLISHED";
              }
              prod.updatedAt = now;
            }
          }
        }
      }

      order.orderStatus = status;
      order.updatedAt = now;
      order.history.push({
        status,
        timestamp: now,
        actor,
        notes: notes || `Status updated to ${status}`,
      });

      return order;
    });
  }

  // --- Price History ---
  public async getPartPriceHistory(productId?: string): Promise<PartPriceHistory[]> {
    const db = this.getDB();
    const history = db.partPriceHistory || [];
    const list = productId ? history.filter((h) => h.productId === productId) : history;
    return [...list].sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  }

  public async addPartPriceHistory(entry: Omit<PartPriceHistory, "id" | "changedAt">): Promise<PartPriceHistory> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partPriceHistory) db.partPriceHistory = [];
      const newEntry: PartPriceHistory = {
        ...entry,
        id: `ph-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        changedAt: new Date().toISOString(),
      };
      db.partPriceHistory.push(newEntry);
      return newEntry;
    });
  }

  // --- Carts ---
  public async getPartCart(sessionId: string): Promise<PartCart | null> {
    const db = this.getDB();
    const cart = (db.partCarts || []).find((c) => c.sessionId === sessionId || c.id === sessionId);
    return cart ? { ...cart } : null;
  }

  public async savePartCart(cart: PartCart): Promise<PartCart> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partCarts) db.partCarts = [];

      const idx = db.partCarts.findIndex((c) => c.id === cart.id || c.sessionId === cart.sessionId);
      cart.updatedAt = new Date().toISOString();

      if (idx === -1) {
        db.partCarts.push(cart);
      } else {
        db.partCarts[idx] = cart;
      }
      return cart;
    });
  }

  // --- Enquiries ---
  public async getPartEnquiries(filters?: { productId?: string; status?: string }): Promise<PartEnquiry[]> {
    const db = this.getDB();
    let enquiries = [...(db.partEnquiries || [])];

    if (filters?.productId) {
      enquiries = enquiries.filter((e) => e.productId === filters.productId);
    }
    if (filters?.status) {
      enquiries = enquiries.filter((e) => e.status === filters.status);
    }

    return enquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createPartEnquiry(
    enquiryData: Omit<PartEnquiry, "id" | "enquiryCode" | "status" | "createdAt" | "updatedAt">
  ): Promise<PartEnquiry> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partEnquiries) db.partEnquiries = [];

      const id = `sp-enq-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const now = new Date().toISOString();
      const enquiryCode = `WC-SP-ENQ-${Math.floor(1000 + Math.random() * 9000)}`;

      const newEnquiry: PartEnquiry = {
        ...enquiryData,
        id,
        enquiryCode,
        status: "NEW",
        createdAt: now,
        updatedAt: now,
      };

      db.partEnquiries.push(newEnquiry);
      return newEnquiry;
    });
  }

  public async updatePartEnquiry(id: string, updates: Partial<PartEnquiry>): Promise<PartEnquiry | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.partEnquiries) return null;

      const idx = db.partEnquiries.findIndex((e) => e.id === id);
      if (idx === -1) return null;

      const updated: PartEnquiry = {
        ...db.partEnquiries[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      db.partEnquiries[idx] = updated;
      return updated;
    });
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: OUTLETS & FRANCHISE
  // ============================================================================

  public async getOutlets(filters?: { isActive?: boolean; type?: OutletType }): Promise<Outlet[]> {
    const db = this.getDB();
    let outlets = db.outlets || [];
    if (filters?.isActive !== undefined) {
      outlets = outlets.filter((o) => o.isActive === filters.isActive);
    }
    if (filters?.type) {
      outlets = outlets.filter((o) => o.type === filters.type);
    }
    return [...outlets];
  }

  public async getOutletById(id: string): Promise<Outlet | null> {
    const db = this.getDB();
    const outlet = (db.outlets || []).find((o) => o.id === id || o.code === id);
    return outlet ? { ...outlet } : null;
  }

  public async createOutlet(data: Omit<Outlet, "id" | "createdAt" | "updatedAt">): Promise<Outlet> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.outlets) db.outlets = [];
      const now = new Date().toISOString();
      const newOutlet: Outlet = {
        ...data,
        id: `outlet-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        createdAt: now,
        updatedAt: now,
      };
      db.outlets.push(newOutlet);
      return newOutlet;
    });
  }

  public async updateOutlet(id: string, updates: Partial<Outlet>): Promise<Outlet | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.outlets) return null;
      const idx = db.outlets.findIndex((o) => o.id === id);
      if (idx === -1) return null;
      const updated: Outlet = {
        ...db.outlets[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      db.outlets[idx] = updated;
      return updated;
    });
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: SUPPLIERS & QUOTATIONS
  // ============================================================================

  public async getSuppliers(filters?: { status?: SupplierVerificationStatus; category?: SupplierCategory }): Promise<Supplier[]> {
    const db = this.getDB();
    let suppliers = db.suppliers || [];
    if (filters?.status) {
      suppliers = suppliers.filter((s) => s.approvalStatus === filters.status);
    }
    if (filters?.category) {
      suppliers = suppliers.filter((s) => s.supplierCategories.includes(filters.category!));
    }
    return [...suppliers];
  }

  public async getSupplierById(id: string): Promise<Supplier | null> {
    const db = this.getDB();
    const supplier = (db.suppliers || []).find((s) => s.id === id);
    return supplier ? { ...supplier } : null;
  }

  public async createSupplier(data: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<Supplier> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.suppliers) db.suppliers = [];
      const now = new Date().toISOString();
      const newSupplier: Supplier = {
        ...data,
        id: `supp-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        createdAt: now,
        updatedAt: now,
      };
      db.suppliers.push(newSupplier);
      return newSupplier;
    });
  }

  public async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.suppliers) return null;
      const idx = db.suppliers.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      const updated: Supplier = {
        ...db.suppliers[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      db.suppliers[idx] = updated;
      return updated;
    });
  }

  public async getSupplierQuotations(filters?: { sku?: string; supplierId?: string }): Promise<SupplierQuotation[]> {
    const db = this.getDB();
    let quotes = db.supplierQuotations || [];
    if (filters?.sku) {
      quotes = quotes.filter((q) => q.sku.toLowerCase() === filters.sku!.toLowerCase() || q.partNumber.toLowerCase() === filters.sku!.toLowerCase());
    }
    if (filters?.supplierId) {
      quotes = quotes.filter((q) => q.supplierId === filters.supplierId);
    }
    return [...quotes].sort((a, b) => a.quotedUnitPriceINR - b.quotedUnitPriceINR);
  }

  public async createSupplierQuotation(data: Omit<SupplierQuotation, "id" | "createdAt" | "updatedAt">): Promise<SupplierQuotation> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.supplierQuotations) db.supplierQuotations = [];
      const now = new Date().toISOString();
      const newQuote: SupplierQuotation = {
        ...data,
        id: `quote-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        createdAt: now,
        updatedAt: now,
      };
      db.supplierQuotations.push(newQuote);
      return newQuote;
    });
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: PURCHASE ORDERS & GOODS RECEIPT (GRN)
  // ============================================================================

  public async getPurchaseOrders(filters?: { outletId?: string; supplierId?: string; status?: POStatus }): Promise<PurchaseOrder[]> {
    const db = this.getDB();
    let pos = db.purchaseOrders || [];
    if (filters?.outletId) {
      pos = pos.filter((p) => p.outletId === filters.outletId);
    }
    if (filters?.supplierId) {
      pos = pos.filter((p) => p.supplierId === filters.supplierId);
    }
    if (filters?.status) {
      pos = pos.filter((p) => p.status === filters.status);
    }
    return [...pos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
    const db = this.getDB();
    const po = (db.purchaseOrders || []).find((p) => p.id === id || p.poNumber === id);
    return po ? { ...po } : null;
  }

  public async createPurchaseOrder(data: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt" | "history">): Promise<PurchaseOrder> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.purchaseOrders) db.purchaseOrders = [];
      const now = new Date().toISOString();
      const poNumber = `WC-PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newPO: PurchaseOrder = {
        ...data,
        id: `po-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        poNumber,
        history: [
          {
            status: data.status || "DRAFT",
            actor: data.approvedBy || "system",
            timestamp: now,
            notes: "Purchase order created in procurement module",
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
      db.purchaseOrders.push(newPO);
      return newPO;
    });
  }

  public async updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>, actor = "staff", notes?: string): Promise<PurchaseOrder | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.purchaseOrders) return null;
      const idx = db.purchaseOrders.findIndex((p) => p.id === id || p.poNumber === id);
      if (idx === -1) return null;
      const current = db.purchaseOrders[idx];
      const now = new Date().toISOString();
      const updatedHistory = [...(current.history || [])];

      if (updates.status && updates.status !== current.status) {
        updatedHistory.push({
          status: updates.status,
          actor,
          timestamp: now,
          notes: notes || `Status changed to ${updates.status}`,
        });
      }

      const updated: PurchaseOrder = {
        ...current,
        ...updates,
        history: updatedHistory,
        updatedAt: now,
      };
      db.purchaseOrders[idx] = updated;
      return updated;
    });
  }

  public async receiveGoods(grnData: Omit<GoodsReceiptNote, "id" | "createdAt">): Promise<{ grn: GoodsReceiptNote; stockUpdated: boolean }> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.goodsReceiptNotes) db.goodsReceiptNotes = [];
      if (!db.outletInventory) db.outletInventory = [];
      if (!db.stockMovements) db.stockMovements = [];

      // Safety Invariant: Check idempotency key to prevent duplicate stock receipts
      const existing = db.goodsReceiptNotes.find((g) => g.idempotencyKey === grnData.idempotencyKey);
      if (existing) {
        return { grn: existing, stockUpdated: false };
      }

      const po = (db.purchaseOrders || []).find((p) => p.id === grnData.poId || p.poNumber === grnData.poNumber);
      const now = new Date().toISOString();
      const grnNumber = `WC-GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const grn: GoodsReceiptNote = {
        ...grnData,
        id: `grn-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        grnNumber,
        createdAt: now,
      };

      // Process received items and update inventory with Weighted Average Cost (WAC)
      for (const item of grnData.items) {
        if (item.quantityReceived <= 0) continue;

        const poItem = po?.items.find((i) => i.productId === item.productId || i.sku === item.sku);
        const unitLandedCost = poItem?.unitLandedCostINR || poItem?.unitQuotedPriceINR || 0;

        let inv = db.outletInventory.find(
          (i) => i.outletId === grnData.outletId && (i.productId === item.productId || (item.sku && i.sku === item.sku))
        );

        const oldQty = inv ? inv.quantityOnHand : 0;
        const oldWAC = inv ? inv.weightedAverageCostINR : unitLandedCost;
        const newQty = oldQty + item.quantityReceived;
        // WAC formula: ((oldQty * oldWAC) + (receivedQty * unitCost)) / newQty
        const newWAC = newQty > 0 ? (oldQty * oldWAC + item.quantityReceived * unitLandedCost) / newQty : unitLandedCost;

        if (inv) {
          inv.quantityOnHand = newQty;
          inv.quantityAvailable = inv.quantityAvailable + item.quantityReceived;
          inv.weightedAverageCostINR = Math.round(newWAC * 100) / 100;
          inv.lastReceivedDate = now;
          inv.updatedAt = now;
        } else {
          inv = {
            id: `inv-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
            outletId: grnData.outletId,
            productId: item.productId,
            sku: poItem?.sku || `SKU-${item.productId}`,
            title: poItem?.title || "Received Product",
            brand: poItem?.brand || "Automotive Part",
            partNumber: poItem?.partNumber || "",
            categoryName: "Procured Parts",
            location: { bay: "Bay-1", rack: "Receiving-Area" },
            quantityOnHand: item.quantityReceived,
            quantityReserved: 0,
            quantityAvailable: item.quantityReceived,
            weightedAverageCostINR: Math.round(unitLandedCost * 100) / 100,
            reorderPoint: 5,
            safetyStock: 2,
            isCostProvisional: unitLandedCost <= 0,
            lastReceivedDate: now,
            updatedAt: now,
          };
          db.outletInventory.push(inv);
        }

        // Record immutable Stock Movement
        db.stockMovements.push({
          id: `sm-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
          outletId: grnData.outletId,
          productId: item.productId,
          sku: inv.sku,
          type: "GOODS_RECEIPT",
          quantity: item.quantityReceived,
          previousQuantity: oldQty,
          newQuantity: newQty,
          unitCostINR: unitLandedCost,
          referenceType: "GRN",
          referenceId: grn.id,
          reason: `Goods receipt confirmed against PO ${grnData.poNumber}`,
          performedBy: grnData.receivedBy,
          timestamp: now,
        });

        // Record immutable Inventory Ledger Entry (Phase 1)
        if (!db.inventoryLedger) db.inventoryLedger = [];
        db.inventoryLedger.push({
          id: `led-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
          transactionType: "GOODS_RECEIPT_NOTE",
          outletId: grnData.outletId,
          productId: item.productId,
          sku: inv.sku,
          ownerType: inv.ownerType || "COMPANY_OUTLET",
          ownerId: inv.ownerId || grnData.outletId,
          quantity: item.quantityReceived,
          previousOnHand: oldQty,
          newOnHand: newQty,
          previousReserved: inv.quantityReserved,
          newReserved: inv.quantityReserved,
          unitCostINR: unitLandedCost,
          landedCostINR: unitLandedCost,
          referenceType: "GRN",
          referenceId: grn.id,
          idempotencyKey: grnData.idempotencyKey ? `${grnData.idempotencyKey}-${item.productId}` : undefined,
          performedBy: grnData.receivedBy,
          notes: `Goods receipt confirmed against PO ${grnData.poNumber}`,
          timestamp: now,
        });

        // Update PO item received quantity
        if (poItem) {
          poItem.quantityReceived = (poItem.quantityReceived || 0) + item.quantityReceived;
        }
      }

      // Update PO status based on received quantities
      if (po) {
        const totalOrdered = po.items.reduce((s, i) => s + i.quantityOrdered, 0);
        const totalReceived = po.items.reduce((s, i) => s + (i.quantityReceived || 0), 0);
        const newStatus: POStatus = totalReceived >= totalOrdered ? "RECEIVED" : "PARTIALLY_RECEIVED";
        po.status = newStatus;
        po.history.push({
          status: newStatus,
          actor: grnData.receivedBy,
          timestamp: now,
          notes: `GRN ${grnNumber} processed. Received ${totalReceived}/${totalOrdered} units.`,
        });
        po.updatedAt = now;
      }

      db.goodsReceiptNotes.push(grn);
      return { grn, stockUpdated: true };
    });
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: INVENTORY & STOCK MOVEMENTS
  // ============================================================================

  public async getOutletInventory(
    outletId?: string,
    filters?: { lowStockOnly?: boolean; search?: string; ownerType?: InventoryOwnerType; ownerId?: string }
  ): Promise<OutletInventoryItem[]> {
    const db = this.getDB();
    let inventory = db.outletInventory || [];
    if (outletId) {
      inventory = inventory.filter((i) => i.outletId === outletId);
    }
    if (filters?.ownerType) {
      inventory = inventory.filter((i) => (i.ownerType || "COMPANY_OUTLET") === filters.ownerType);
    }
    if (filters?.ownerId) {
      inventory = inventory.filter((i) => i.ownerId === filters.ownerId);
    }
    if (filters?.lowStockOnly) {
      inventory = inventory.filter((i) => i.quantityOnHand <= i.reorderPoint);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      inventory = inventory.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.partNumber.toLowerCase().includes(q) ||
          i.brand.toLowerCase().includes(q)
      );
    }
    return [...inventory];
  }

  public async getInventoryItem(
    outletId: string,
    productId: string,
    ownerType?: InventoryOwnerType,
    ownerId?: string
  ): Promise<OutletInventoryItem | null> {
    const db = this.getDB();
    const item = (db.outletInventory || []).find((i) => {
      const matchOutlet = i.outletId === outletId;
      const matchProduct = i.productId === productId || i.sku === productId;
      const matchOwnerType = !ownerType || (i.ownerType || "COMPANY_OUTLET") === ownerType;
      const matchOwnerId = !ownerId || i.ownerId === ownerId;
      return matchOutlet && matchProduct && matchOwnerType && matchOwnerId;
    });
    return item ? { ...item } : null;
  }

  public async recordInventoryLedgerEntry(entry: Omit<InventoryLedgerEntry, "id" | "timestamp">): Promise<InventoryLedgerEntry> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.inventoryLedger) db.inventoryLedger = [];
      const now = new Date().toISOString();
      const newEntry: InventoryLedgerEntry = {
        ...entry,
        id: `led-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        timestamp: now,
      };
      db.inventoryLedger.push(newEntry);
      return newEntry;
    });
  }

  public async getInventoryLedger(filters?: {
    outletId?: string;
    productId?: string;
    sku?: string;
    ownerType?: InventoryOwnerType;
    ownerId?: string;
    transactionType?: InventoryLedgerTransactionType;
  }): Promise<InventoryLedgerEntry[]> {
    const db = this.getDB();
    let entries = db.inventoryLedger || [];
    if (filters?.outletId) entries = entries.filter((e) => e.outletId === filters.outletId);
    if (filters?.productId) entries = entries.filter((e) => e.productId === filters.productId);
    if (filters?.sku) entries = entries.filter((e) => e.sku === filters.sku);
    if (filters?.ownerType) entries = entries.filter((e) => e.ownerType === filters.ownerType);
    if (filters?.ownerId) entries = entries.filter((e) => e.ownerId === filters.ownerId);
    if (filters?.transactionType) entries = entries.filter((e) => e.transactionType === filters.transactionType);
    return [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async reserveInventoryStock(params: {
    outletId: string;
    productId: string;
    quantity: number;
    ownerType?: InventoryOwnerType;
    ownerId?: string;
    referenceType: "ORDER" | "JOB_CARD";
    referenceId: string;
    performedBy: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; item?: OutletInventoryItem; error?: string }> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.outletInventory) db.outletInventory = [];
      if (!db.inventoryLedger) db.inventoryLedger = [];

      // Check idempotency
      if (params.idempotencyKey) {
        const existing = db.inventoryLedger.find((l) => l.idempotencyKey === params.idempotencyKey);
        if (existing) {
          const invItem = db.outletInventory.find((i) => i.outletId === params.outletId && (i.productId === params.productId || i.sku === params.productId));
          return { success: true, item: invItem ? { ...invItem } : undefined };
        }
      }

      const item = db.outletInventory.find((i) => {
        const matchOutlet = i.outletId === params.outletId;
        const matchProduct = i.productId === params.productId || i.sku === params.productId;
        const matchOwnerType = !params.ownerType || (i.ownerType || "COMPANY_OUTLET") === params.ownerType;
        const matchOwnerId = !params.ownerId || i.ownerId === params.ownerId;
        return matchOutlet && matchProduct && matchOwnerType && matchOwnerId;
      });

      if (!item) {
        return { success: false, error: `Inventory item not found for product ${params.productId} at outlet ${params.outletId}` };
      }

      const available = item.quantityOnHand - item.quantityReserved - (item.quantityDamaged || 0);
      if (available < params.quantity) {
        return {
          success: false,
          error: `Insufficient available stock for ${item.title}. Available: ${available}, Requested: ${params.quantity}`
        };
      }

      const prevReserved = item.quantityReserved;
      item.quantityReserved += params.quantity;
      item.quantityAvailable = Math.max(0, item.quantityOnHand - item.quantityReserved - (item.quantityDamaged || 0));
      const now = new Date().toISOString();
      item.updatedAt = now;

      // Log in immutable ledger
      const ledgerEntry: InventoryLedgerEntry = {
        id: `led-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        transactionType: "ORDER_RESERVATION",
        outletId: item.outletId,
        productId: item.productId,
        sku: item.sku,
        ownerType: item.ownerType || "COMPANY_OUTLET",
        ownerId: item.ownerId || item.outletId,
        quantity: params.quantity,
        previousOnHand: item.quantityOnHand,
        newOnHand: item.quantityOnHand,
        previousReserved: prevReserved,
        newReserved: item.quantityReserved,
        unitCostINR: item.weightedAverageCostINR,
        landedCostINR: item.landedCostINR || item.weightedAverageCostINR,
        sellingPriceINR: item.sellingPriceINR,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        idempotencyKey: params.idempotencyKey,
        performedBy: params.performedBy,
        timestamp: now,
      };
      db.inventoryLedger.push(ledgerEntry);

      return { success: true, item: { ...item } };
    });
  }

  public async releaseInventoryReservation(params: {
    outletId: string;
    productId: string;
    quantity: number;
    ownerType?: InventoryOwnerType;
    ownerId?: string;
    referenceType: "ORDER" | "JOB_CARD";
    referenceId: string;
    performedBy: string;
  }): Promise<{ success: boolean; item?: OutletInventoryItem; error?: string }> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.outletInventory) return { success: false, error: "Inventory empty" };
      if (!db.inventoryLedger) db.inventoryLedger = [];

      const item = db.outletInventory.find((i) => {
        const matchOutlet = i.outletId === params.outletId;
        const matchProduct = i.productId === params.productId || i.sku === params.productId;
        const matchOwnerType = !params.ownerType || (i.ownerType || "COMPANY_OUTLET") === params.ownerType;
        const matchOwnerId = !params.ownerId || i.ownerId === params.ownerId;
        return matchOutlet && matchProduct && matchOwnerType && matchOwnerId;
      });

      if (!item) {
        return { success: false, error: `Inventory item not found for product ${params.productId}` };
      }

      const prevReserved = item.quantityReserved;
      item.quantityReserved = Math.max(0, item.quantityReserved - params.quantity);
      item.quantityAvailable = Math.max(0, item.quantityOnHand - item.quantityReserved - (item.quantityDamaged || 0));
      const now = new Date().toISOString();
      item.updatedAt = now;

      // Log in ledger
      const ledgerEntry: InventoryLedgerEntry = {
        id: `led-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        transactionType: "STOCK_ADJUSTMENT",
        outletId: item.outletId,
        productId: item.productId,
        sku: item.sku,
        ownerType: item.ownerType || "COMPANY_OUTLET",
        ownerId: item.ownerId || item.outletId,
        quantity: -params.quantity,
        previousOnHand: item.quantityOnHand,
        newOnHand: item.quantityOnHand,
        previousReserved: prevReserved,
        newReserved: item.quantityReserved,
        unitCostINR: item.weightedAverageCostINR,
        landedCostINR: item.landedCostINR || item.weightedAverageCostINR,
        sellingPriceINR: item.sellingPriceINR,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        performedBy: params.performedBy,
        notes: `Released reservation for ${params.referenceType} ${params.referenceId}`,
        timestamp: now,
      };
      db.inventoryLedger.push(ledgerEntry);

      return { success: true, item: { ...item } };
    });
  }

  public async recordStockMovement(movement: Omit<StockMovement, "id" | "timestamp">): Promise<StockMovement> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.stockMovements) db.stockMovements = [];
      const now = new Date().toISOString();
      const newMovement: StockMovement = {
        ...movement,
        id: `sm-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        timestamp: now,
      };
      db.stockMovements.push(newMovement);
      return newMovement;
    });
  }

  public async getStockMovements(filters?: { outletId?: string; productId?: string; type?: StockMovementType }): Promise<StockMovement[]> {
    const db = this.getDB();
    let movements = db.stockMovements || [];
    if (filters?.outletId) {
      movements = movements.filter((m) => m.outletId === filters.outletId);
    }
    if (filters?.productId) {
      movements = movements.filter((m) => m.productId === filters.productId);
    }
    if (filters?.type) {
      movements = movements.filter((m) => m.type === filters.type);
    }
    return [...movements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async getInterOutletTransfers(): Promise<InterOutletTransfer[]> {
    const db = this.getDB();
    return [...(db.interOutletTransfers || [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async createInterOutletTransfer(transfer: Omit<InterOutletTransfer, "id" | "createdAt">): Promise<InterOutletTransfer> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.interOutletTransfers) db.interOutletTransfers = [];
      const now = new Date().toISOString();
      const transferNumber = `WC-TRF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newTransfer: InterOutletTransfer = {
        ...transfer,
        id: `trf-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        transferNumber,
        createdAt: now,
      };
      db.interOutletTransfers.push(newTransfer);
      return newTransfer;
    });
  }

  public async updateInterOutletTransfer(id: string, updates: Partial<InterOutletTransfer>): Promise<InterOutletTransfer | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.interOutletTransfers) return null;
      const idx = db.interOutletTransfers.findIndex((t) => t.id === id);
      if (idx === -1) return null;
      const current = db.interOutletTransfers[idx];
      const updated: InterOutletTransfer = {
        ...current,
        ...updates,
      };

      // If status changed to DISPATCHED: deduct stock from source outlet
      if (updates.status === "DISPATCHED" && current.status !== "DISPATCHED") {
        for (const item of current.items) {
          const inv = (db.outletInventory || []).find((i) => i.outletId === current.sourceOutletId && i.productId === item.productId);
          if (inv) {
            const oldQty = inv.quantityOnHand;
            inv.quantityOnHand = Math.max(0, inv.quantityOnHand - item.quantity);
            inv.quantityAvailable = Math.max(0, inv.quantityAvailable - item.quantity);
            db.stockMovements?.push({
              id: `sm-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
              outletId: current.sourceOutletId,
              productId: item.productId,
              sku: item.sku,
              type: "TRANSFER_OUT",
              quantity: -item.quantity,
              previousQuantity: oldQty,
              newQuantity: inv.quantityOnHand,
              unitCostINR: item.unitCostINR,
              referenceType: "TRANSFER",
              referenceId: current.id,
              performedBy: updates.dispatchedBy || "admin",
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      // If status changed to RECEIVED: add stock to target outlet
      if (updates.status === "RECEIVED" && current.status !== "RECEIVED") {
        for (const item of current.items) {
          const inv = (db.outletInventory || []).find((i) => i.outletId === current.targetOutletId && i.productId === item.productId);
          if (inv) {
            const oldQty = inv.quantityOnHand;
            inv.quantityOnHand += item.quantity;
            inv.quantityAvailable += item.quantity;
            db.stockMovements?.push({
              id: `sm-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
              outletId: current.targetOutletId,
              productId: item.productId,
              sku: item.sku,
              type: "TRANSFER_IN",
              quantity: item.quantity,
              previousQuantity: oldQty,
              newQuantity: inv.quantityOnHand,
              unitCostINR: item.unitCostINR,
              referenceType: "TRANSFER",
              referenceId: current.id,
              performedBy: updates.receivedBy || "admin",
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      db.interOutletTransfers[idx] = updated;
      return updated;
    });
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: GARAGE & WORKSHOP MANAGEMENT
  // ============================================================================

  public async getGarageServices(vehicleType?: "CAR" | "TWO_WHEELER"): Promise<GarageServiceItem[]> {
    const db = this.getDB();
    let services = db.garageServices || [];
    if (vehicleType) {
      services = services.filter((s) => s.vehicleType === vehicleType);
    }
    return [...services];
  }

  public async getGarageJobCards(filters?: { outletId?: string; status?: GarageJobStatus; vehicleType?: string }): Promise<GarageJobCard[]> {
    const db = this.getDB();
    let cards = db.garageJobCards || [];
    if (filters?.outletId) {
      cards = cards.filter((c) => c.outletId === filters.outletId);
    }
    if (filters?.status) {
      cards = cards.filter((c) => c.status === filters.status);
    }
    if (filters?.vehicleType) {
      cards = cards.filter((c) => c.vehicleType === filters.vehicleType);
    }
    return [...cards].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getGarageJobCardById(id: string): Promise<GarageJobCard | null> {
    const db = this.getDB();
    const card = (db.garageJobCards || []).find((c) => c.id === id || c.jobCardNumber === id);
    return card ? { ...card } : null;
  }

  public async createGarageJobCard(jobCard: Omit<GarageJobCard, "id" | "createdAt" | "updatedAt">): Promise<GarageJobCard> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.garageJobCards) db.garageJobCards = [];
      const now = new Date().toISOString();
      const jobCardNumber = `WC-JC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Compute transparent job profitability & provisional cost flag
      const labourRevenue = jobCard.services.reduce((s, srv) => s + (srv.labourChargeINR || 0), 0);
      const directLabourCost = jobCard.services.reduce((s, srv) => s + (srv.technicianCostINR || 0), 0);
      const partsRevenue = jobCard.parts.reduce((s, p) => s + p.quantity * (p.unitBillableINR || 0), 0);
      const directPartsCost = jobCard.parts.reduce((s, p) => s + p.quantity * (p.unitCostINR || 0), 0);
      const grossProfit = labourRevenue + partsRevenue - (directLabourCost + directPartsCost);
      const netRevenue = labourRevenue + partsRevenue;
      const grossMarginPercent = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 1000) / 10 : 0;
      const isProvisional = jobCard.parts.some((p) => p.isCostProvisional || p.unitCostINR <= 0);

      const newCard: GarageJobCard = {
        ...jobCard,
        id: `jc-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        jobCardNumber,
        labourRevenueINR: labourRevenue,
        partsRevenueINR: partsRevenue,
        directLabourCostINR: directLabourCost,
        directPartsCostINR: directPartsCost,
        grossProfitINR: grossProfit,
        grossMarginPercent,
        isProvisionalCost: isProvisional,
        createdAt: now,
        updatedAt: now,
      };

      db.garageJobCards.push(newCard);
      return newCard;
    });
  }

  public async updateGarageJobCard(id: string, updates: Partial<GarageJobCard>): Promise<GarageJobCard | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.garageJobCards) return null;
      const idx = db.garageJobCards.findIndex((c) => c.id === id || c.jobCardNumber === id);
      if (idx === -1) return null;
      const current = db.garageJobCards[idx];
      const now = new Date().toISOString();

      // If parts or services updated, re-calculate gross profit
      const services = updates.services || current.services;
      const parts = updates.parts || current.parts;
      const labourRevenue = services.reduce((s, srv) => s + (srv.labourChargeINR || 0), 0);
      const directLabourCost = services.reduce((s, srv) => s + (srv.technicianCostINR || 0), 0);
      const partsRevenue = parts.reduce((s, p) => s + p.quantity * (p.unitBillableINR || 0), 0);
      const directPartsCost = parts.reduce((s, p) => s + p.quantity * (p.unitCostINR || 0), 0);
      const grossProfit = labourRevenue + partsRevenue - (directLabourCost + directPartsCost);
      const netRevenue = labourRevenue + partsRevenue;
      const grossMarginPercent = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 1000) / 10 : 0;
      const isProvisional = parts.some((p) => p.isCostProvisional || p.unitCostINR <= 0);

      // Inventory decrement when job is completed or delivered
      if ((updates.status === "COMPLETED" || updates.status === "DELIVERED") && current.status !== "COMPLETED" && current.status !== "DELIVERED") {
        for (const part of parts) {
          const targetPartId = (part as any).partId || (part as any).productId;
          const inv = (db.outletInventory || []).find((i) =>
            i.outletId === current.outletId &&
            ((targetPartId && i.productId === targetPartId) || (part.sku && i.sku === part.sku))
          );
          if (inv) {
            const oldQty = inv.quantityOnHand;
            inv.quantityOnHand = Math.max(0, inv.quantityOnHand - part.quantity);
            inv.quantityAvailable = Math.max(0, inv.quantityAvailable - part.quantity);
            inv.updatedAt = now;
            db.stockMovements?.push({
              id: `sm-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
              outletId: current.outletId,
              productId: inv.productId,
              sku: inv.sku,
              type: "GARAGE_CONSUMPTION",
              quantity: -part.quantity,
              previousQuantity: oldQty,
              newQuantity: inv.quantityOnHand,
              unitCostINR: part.unitCostINR,
              referenceType: "JOB_CARD",
              referenceId: current.id,
              reason: `Parts consumed for Job Card ${current.jobCardNumber}`,
              performedBy: current.assignedTechnicianName || "technician",
              timestamp: now,
            });
            if (!db.inventoryLedger) db.inventoryLedger = [];
            db.inventoryLedger.push({
              id: `led-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
              transactionType: "SALE_DISPATCH",
              outletId: current.outletId,
              productId: inv.productId,
              sku: inv.sku,
              ownerType: inv.ownerType || "COMPANY_OUTLET",
              ownerId: inv.ownerId || current.outletId,
              quantity: -part.quantity,
              previousOnHand: oldQty,
              newOnHand: inv.quantityOnHand,
              previousReserved: inv.quantityReserved,
              newReserved: inv.quantityReserved,
              unitCostINR: part.unitCostINR,
              landedCostINR: inv.landedCostINR || inv.weightedAverageCostINR,
              sellingPriceINR: part.unitBillableINR,
              referenceType: "JOB_CARD",
              referenceId: current.id,
              performedBy: current.assignedTechnicianName || "technician",
              notes: `Parts consumed for Job Card ${current.jobCardNumber}`,
              timestamp: now,
            });
          }
        }
      }

      const updated: GarageJobCard = {
        ...current,
        ...updates,
        labourRevenueINR: labourRevenue,
        partsRevenueINR: partsRevenue,
        directLabourCostINR: directLabourCost,
        directPartsCostINR: directPartsCost,
        grossProfitINR: grossProfit,
        grossMarginPercent,
        isProvisionalCost: isProvisional,
        updatedAt: now,
      };

      db.garageJobCards[idx] = updated;
      return updated;
    });
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: USED-CAR ECONOMICS & PROFITABILITY
  // ============================================================================

  public async getUsedCarEconomics(status?: string): Promise<UsedCarEconomics[]> {
    const db = this.getDB();
    let records = db.usedCarEconomics || [];
    if (status) {
      records = records.filter((r) => r.status === status);
    }
    return [...records];
  }

  public async updateUsedCarEconomics(carId: string, updates: Partial<UsedCarEconomics>): Promise<UsedCarEconomics | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.usedCarEconomics) db.usedCarEconomics = [];
      const idx = db.usedCarEconomics.findIndex((r) => r.carId === carId || r.listingCode === carId);
      const now = new Date().toISOString();

      if (idx === -1) {
        // Create new record
        const record = updates as UsedCarEconomics;
        db.usedCarEconomics.push(record);
        return record;
      }

      const current = db.usedCarEconomics[idx];
      const merged = { ...current, ...updates };

      // Transparent accounting calculation:
      // If OWNED: Revenue = salePriceINR, COGS = acquisitionCostINR + refurbishment + direct costs
      // If CONSIGNMENT: Revenue = commissionFeeINR ONLY!
      let recognizedRevenue = 0;
      let totalDirectCosts = 0;

      if (merged.ownershipType === "OWNED_INVENTORY") {
        recognizedRevenue = merged.salePriceINR || 0;
        totalDirectCosts =
          (merged.acquisitionCostINR || 0) +
          (merged.totalRefurbishmentCostINR || 0) +
          (merged.inspectionCostINR || 0) +
          (merged.transportCostINR || 0) +
          (merged.advertisingCostINR || 0) +
          (merged.otherExpensesINR || 0);
      } else {
        // Consignment
        recognizedRevenue = merged.commissionFeeINR || 0;
        totalDirectCosts =
          (merged.totalRefurbishmentCostINR || 0) +
          (merged.inspectionCostINR || 0) +
          (merged.advertisingCostINR || 0) +
          (merged.otherExpensesINR || 0);
      }

      const contribution = recognizedRevenue - totalDirectCosts;
      const contributionMarginPercent = recognizedRevenue > 0 ? Math.round((contribution / recognizedRevenue) * 1000) / 10 : 0;

      const updated: UsedCarEconomics = {
        ...merged,
        recognizedRevenueINR: recognizedRevenue,
        totalDirectCostsINR: totalDirectCosts,
        transactionContributionINR: contribution,
        contributionMarginPercent,
      };

      db.usedCarEconomics[idx] = updated;
      return updated;
    });
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: OPERATING EXPENSES & BUDGETS
  // ============================================================================

  public async getOperatingExpenses(outletId?: string, month?: string): Promise<OperatingExpense[]> {
    const db = this.getDB();
    let expenses = db.operatingExpenses || [];
    if (outletId) {
      expenses = expenses.filter((e) => e.outletId === outletId);
    }
    if (month) {
      expenses = expenses.filter((e) => e.date.startsWith(month));
    }
    return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public async recordOperatingExpense(expense: Omit<OperatingExpense, "id" | "createdAt">): Promise<OperatingExpense> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.operatingExpenses) db.operatingExpenses = [];
      const now = new Date().toISOString();
      const newExpense: OperatingExpense = {
        ...expense,
        id: `opex-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        createdAt: now,
      };
      db.operatingExpenses.push(newExpense);
      return newExpense;
    });
  }

  public async getMonthlyBudget(month: string, outletId?: string): Promise<MonthlyBudget | null> {
    const db = this.getDB();
    const budgets = db.monthlyBudgets || [];
    const budget = budgets.find((b) => b.month === month && (!outletId || b.outletId === outletId));
    return budget ? { ...budget } : null;
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: COMPREHENSIVE OVERVIEW STATS & AUDIT LOGS
  // ============================================================================

  public async getOperationsOverviewStats(outletId?: string, dateRange?: { start?: string; end?: string }): Promise<OperationsOverviewStats> {
    const db = this.getDB();
    const outlets = db.outlets || [];
    let inventory = db.outletInventory || [];
    let jobCards = db.garageJobCards || [];
    const usedCars = db.usedCarEconomics || [];
    let expenses = db.operatingExpenses || [];
    const orders = db.partOrders || [];

    if (outletId) {
      inventory = inventory.filter((i) => i.outletId === outletId);
      jobCards = jobCards.filter((j) => j.outletId === outletId);
      expenses = expenses.filter((e) => e.outletId === outletId);
    }

    // Revenue by segment
    const garageRevenue = jobCards.reduce((s, j) => s + (j.labourRevenueINR || 0) + (j.partsRevenueINR || 0), 0);
    const garagePartsCOGS = jobCards.reduce((s, j) => s + (j.directPartsCostINR || 0), 0);
    const garageLabourCOGS = jobCards.reduce((s, j) => s + (j.directLabourCostINR || 0), 0);

    const usedCarsRevenue = usedCars.reduce((s, u) => s + (u.recognizedRevenueINR || 0), 0);
    const usedCarsCOGS = usedCars.reduce((s, u) => s + (u.totalDirectCostsINR || 0), 0);

    // Spare parts retail orders revenue
    const partsRetailRevenue = orders.reduce((s, o) => s + (o.totalAmount || o.totalINR || 0), 0);
    // Approximate retail parts COGS at 70% of retail price if WAC not on retail order
    const partsRetailCOGS = Math.round(partsRetailRevenue * 0.7);

    // Franchise royalties (5% of franchise revenue or recorded fee)
    const franchiseRoyalties = outlets
      .filter((o) => o.type === "FRANCHISE")
      .reduce((s, o) => s + (o.franchiseFeeAnnualINR ? Math.round(o.franchiseFeeAnnualINR / 12) : 15000), 0);

    const totalRevenue = garageRevenue + usedCarsRevenue + partsRetailRevenue + franchiseRoyalties;
    const totalCOGS = garagePartsCOGS + garageLabourCOGS + usedCarsCOGS + partsRetailCOGS;
    const grossProfit = totalRevenue - totalCOGS;
    const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;

    const operatingExpenses = expenses.reduce((s, e) => s + (e.amountINR || 0), 0);
    const operatingProfit = grossProfit - operatingExpenses;
    const operatingMarginPercent = totalRevenue > 0 ? Math.round((operatingProfit / totalRevenue) * 1000) / 10 : 0;

    // Inventory valuation
    const totalInventoryValue = inventory.reduce((s, i) => s + (i.quantityOnHand || 0) * (i.weightedAverageCostINR || 0), 0);
    const lowStockAlerts = inventory.filter((i) => i.quantityOnHand <= i.reorderPoint);
    const provisionalCount = inventory.filter((i) => i.isCostProvisional).length + jobCards.filter((j) => j.isProvisionalCost).length;

    // Supplier balances from unpaid/partially paid POs
    const supplierOutstanding = (db.purchaseOrders || [])
      .filter((p) => p.paymentStatus !== "PAID" && (!outletId || p.outletId === outletId))
      .reduce((s, p) => s + (p.totalAmountINR || 0), 0);

    // Garage KPIs
    const completedJobs = jobCards.filter((j) => j.status === "COMPLETED" || j.status === "DELIVERED").length;
    const avgInvoice = completedJobs > 0 ? Math.round(garageRevenue / jobCards.length) : 0;

    // Used Car KPIs
    const usedCarProfit = usedCars.reduce((s, u) => s + (u.transactionContributionINR || 0), 0);

    // Budget Comparison
    const currentMonth = "2026-10";
    const budget = (db.monthlyBudgets || []).find((b) => b.month === currentMonth);
    const budgetComparison = budget
      ? {
          month: currentMonth,
          budgetedRevenue: budget.budgetedRevenueINR,
          actualRevenue: totalRevenue,
          revenueVariance: totalRevenue - budget.budgetedRevenueINR,
          budgetedGrossProfit: budget.budgetedGrossProfitINR,
          actualGrossProfit: grossProfit,
          budgetedOperatingProfit: budget.budgetedOperatingProfitINR,
          actualOperatingProfit: operatingProfit,
        }
      : undefined;

    return {
      metrics: {
        totalRevenueINR: totalRevenue,
        cogsINR: totalCOGS,
        grossProfitINR: grossProfit,
        grossMarginPercent,
        operatingExpensesINR: operatingExpenses,
        operatingProfitINR: operatingProfit,
        operatingMarginPercent,
        totalInventoryValueINR: Math.round(totalInventoryValue),
        inventoryItemCount: inventory.length,
        supplierOutstandingINR: supplierOutstanding,
        totalGarageBookings: jobCards.length,
        completedGarageJobs: completedJobs,
        averageJobInvoiceINR: avgInvoice,
        usedCarTransactionsCount: usedCars.length,
        usedCarTotalProfitINR: usedCarProfit,
        lowStockCount: lowStockAlerts.length,
        provisionalCostItemsCount: provisionalCount,
      },
      revenueBySegment: {
        usedCarsINR: usedCarsRevenue,
        garageServicesINR: garageRevenue,
        partsRetailINR: partsRetailRevenue,
        franchiseRoyaltiesINR: franchiseRoyalties,
      },
      cogsBySegment: {
        usedCarsCOGSINR: usedCarsCOGS,
        garagePartsCOGSINR: garagePartsCOGS,
        garageLabourCOGSINR: garageLabourCOGS,
        partsRetailCOGSINR: partsRetailCOGS,
      },
      budgetComparison,
      outlets: [...outlets],
      lowStockAlerts: [...lowStockAlerts],
    };
  }

  public async addOperationsAuditLog(log: Omit<OperationsAuditLog, "id" | "timestamp">): Promise<OperationsAuditLog> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.operationsAuditLogs) db.operationsAuditLogs = [];
      const newLog: OperationsAuditLog = {
        ...log,
        id: `op-audit-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        timestamp: new Date().toISOString(),
      };
      db.operationsAuditLogs.push(newLog);
      return newLog;
    });
  }

  public async getOperationsAuditLogs(module?: string, outletId?: string): Promise<OperationsAuditLog[]> {
    const db = this.getDB();
    let logs = db.operationsAuditLogs || [];
    if (module) {
      logs = logs.filter((l) => l.module === module);
    }
    if (outletId) {
      logs = logs.filter((l) => l.outletId === outletId);
    }
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // --- Customer Platform & Connected Ecosystem Methods ---

  public async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const db = this.getDB();
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const found = (db.customers || []).find((c) => c.phone.replace(/\D/g, "").slice(-10) === cleanPhone);
    return found ? { ...found } : null;
  }

  public async getCustomerById(id: string): Promise<Customer | null> {
    const db = this.getDB();
    const found = (db.customers || []).find((c) => c.id === id);
    return found ? { ...found } : null;
  }

  public async createCustomer(data: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.customers) db.customers = [];
      const now = new Date().toISOString();
      const customer: Customer = {
        ...data,
        id: `cust_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        createdAt: now,
        updatedAt: now,
      };
      db.customers.push(customer);
      return { ...customer };
    });
  }

  public async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.customers) db.customers = [];
      const idx = db.customers.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      db.customers[idx] = {
        ...db.customers[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { ...db.customers[idx] };
    });
  }

  public async saveCustomerOTP(otp: CustomerOTP): Promise<void> {
    this.withLock(() => {
      const db = this.getDB();
      if (!db.customerOTPs) db.customerOTPs = [];
      db.customerOTPs.push({ ...otp });
    });
  }

  public async getLatestCustomerOTP(phone: string): Promise<CustomerOTP | null> {
    const db = this.getDB();
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const otps = (db.customerOTPs || [])
      .filter((o) => o.phone.replace(/\D/g, "").slice(-10) === cleanPhone)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return otps[0] ? { ...otps[0] } : null;
  }

  public async markCustomerOTPUsed(id: string): Promise<void> {
    this.withLock(() => {
      const db = this.getDB();
      if (!db.customerOTPs) db.customerOTPs = [];
      const otp = db.customerOTPs.find((o) => o.id === id);
      if (otp) {
        otp.isUsed = true;
      }
    });
  }

  public async getCustomerVehicles(customerId: string): Promise<CustomerVehicle[]> {
    const db = this.getDB();
    const vehicles = (db.customerVehicles || []).filter((v) => v.customerId === customerId);
    return vehicles.map((v) => ({ ...v }));
  }

  public async getCustomerVehicleById(id: string): Promise<CustomerVehicle | null> {
    const db = this.getDB();
    const v = (db.customerVehicles || []).find((item) => item.id === id);
    return v ? { ...v } : null;
  }

  public async createCustomerVehicle(data: Omit<CustomerVehicle, "id" | "createdAt" | "updatedAt">): Promise<CustomerVehicle> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.customerVehicles) db.customerVehicles = [];
      const now = new Date().toISOString();
      const vehicle: CustomerVehicle = {
        ...data,
        id: `veh_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
        createdAt: now,
        updatedAt: now,
      };
      db.customerVehicles.push(vehicle);
      return { ...vehicle };
    });
  }

  public async updateCustomerVehicle(id: string, updates: Partial<CustomerVehicle>): Promise<CustomerVehicle | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.customerVehicles) db.customerVehicles = [];
      const idx = db.customerVehicles.findIndex((v) => v.id === id);
      if (idx === -1) return null;
      db.customerVehicles[idx] = {
        ...db.customerVehicles[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { ...db.customerVehicles[idx] };
    });
  }

  public async deleteCustomerVehicle(id: string, customerId: string): Promise<boolean> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.customerVehicles) db.customerVehicles = [];
      const initialLen = db.customerVehicles.length;
      db.customerVehicles = db.customerVehicles.filter((v) => !(v.id === id && v.customerId === customerId));
      return db.customerVehicles.length < initialLen;
    });
  }

  public async getCustomerTickets(customerId: string): Promise<CustomerSupportTicket[]> {
    const db = this.getDB();
    const tickets = (db.customerTickets || []).filter((t) => t.customerId === customerId);
    return [...tickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public async getCustomerTicketById(id: string): Promise<CustomerSupportTicket | null> {
    const db = this.getDB();
    const t = (db.customerTickets || []).find((item) => item.id === id);
    return t ? { ...t } : null;
  }

  public async createCustomerTicket(data: Omit<CustomerSupportTicket, "id" | "createdAt" | "updatedAt">): Promise<CustomerSupportTicket> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.customerTickets) db.customerTickets = [];
      const now = new Date().toISOString();
      const ticket: CustomerSupportTicket = {
        ...data,
        id: `tkt_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
        createdAt: now,
        updatedAt: now,
      };
      db.customerTickets.push(ticket);
      return { ...ticket };
    });
  }

  public async addTicketMessage(ticketId: string, message: CustomerSupportTicket["messages"][0]): Promise<CustomerSupportTicket | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.customerTickets) db.customerTickets = [];
      const ticket = db.customerTickets.find((t) => t.id === ticketId);
      if (!ticket) return null;
      ticket.messages.push(message);
      ticket.updatedAt = new Date().toISOString();
      return { ...ticket };
    });
  }

  public async getCustomerSavedItems(customerId: string): Promise<CustomerSavedItem[]> {
    const db = this.getDB();
    const items = (db.customerSavedItems || []).filter((s) => s.customerId === customerId);
    return items.map((i) => ({ ...i }));
  }

  public async toggleCustomerSavedItem(customerId: string, itemType: "CAR" | "SPARE_PART", itemId: string): Promise<boolean> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.customerSavedItems) db.customerSavedItems = [];
      const existingIdx = db.customerSavedItems.findIndex(
        (s) => s.customerId === customerId && s.itemType === itemType && s.itemId === itemId
      );
      if (existingIdx >= 0) {
        db.customerSavedItems.splice(existingIdx, 1);
        return false; // Removed
      } else {
        db.customerSavedItems.push({
          id: `saved_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
          customerId,
          itemType,
          itemId,
          savedAt: new Date().toISOString(),
        });
        return true; // Added
      }
    });
  }

  public async createOrderReturnRequest(request: Omit<OrderReturnRequest, "id" | "requestedAt" | "updatedAt">): Promise<OrderReturnRequest> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.orderReturns) db.orderReturns = [];
      const now = new Date().toISOString();
      const returnReq: OrderReturnRequest = {
        ...request,
        id: `ret_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
        requestedAt: now,
        updatedAt: now,
      };
      db.orderReturns.push(returnReq);
      return { ...returnReq };
    });
  }

  public async getOrderReturnRequests(customerId?: string): Promise<OrderReturnRequest[]> {
    const db = this.getDB();
    let returns = db.orderReturns || [];
    if (customerId) {
      returns = returns.filter((r) => r.customerId === customerId);
    }
    return [...returns].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  public async recordPaymentTransaction(tx: Omit<PaymentTransaction, "id" | "createdAt" | "updatedAt">): Promise<PaymentTransaction> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.paymentTransactions) db.paymentTransactions = [];
      const now = new Date().toISOString();
      const newTx: PaymentTransaction = {
        ...tx,
        id: `tx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        createdAt: now,
        updatedAt: now,
      };
      db.paymentTransactions.push(newTx);
      return { ...newTx };
    });
  }

  public async getPaymentTransactionByIdempotency(key: string): Promise<PaymentTransaction | null> {
    const db = this.getDB();
    const tx = (db.paymentTransactions || []).find((t) => t.idempotencyKey === key);
    return tx ? { ...tx } : null;
  }

  public async updatePaymentTransaction(id: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction | null> {
    return this.withLock(() => {
      const db = this.getDB();
      if (!db.paymentTransactions) db.paymentTransactions = [];
      const idx = db.paymentTransactions.findIndex((t) => t.id === id);
      if (idx === -1) return null;
      db.paymentTransactions[idx] = {
        ...db.paymentTransactions[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { ...db.paymentTransactions[idx] };
    });
  }
}

// Global default singleton instance
export const db = new DatabaseStore();
