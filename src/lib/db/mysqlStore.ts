/**
 * WowCars — Production MySQL / MariaDB Relational Persistence Engine
 * Uses connection pooling, parameterized SQL queries, and explicit transactions.
 * Zero-cloud-cost: Designed for included shared cPanel hosting MySQL instances.
 */

import mysql from "mysql2/promise";
import crypto from "crypto";
import {
  Car, Dealer, Seller, Enquiry, AdminUser, ModerationEvent,
  CarStatus, EnquiryStatus, ModerationAction, FuelType, Transmission, BodyType,
  State, District, City, ExpansionStatus,
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
import { SEED_STATES, SEED_DISTRICTS, SEED_CITIES } from "../locations/indiaLocations";
import { SEED_PART_CATEGORIES, SEED_PART_BRANDS, SEED_PART_SELLERS, SEED_PART_PRODUCTS } from "./partsSeeds";
import {
  SEED_OUTLETS, SEED_SUPPLIERS, SEED_SUPPLIER_QUOTATIONS,
  SEED_OUTLET_INVENTORY, SEED_GARAGE_SERVICES, SEED_GARAGE_JOB_CARDS,
  SEED_USED_CAR_ECONOMICS, SEED_OPERATING_EXPENSES, SEED_MONTHLY_BUDGET,
  SEED_OPERATIONS_AUDIT_LOGS
} from "./operationsSeeds";

export class MySqlStore implements DatabaseAdapter {
  public readonly adapterName = "mysql" as const;
  private pool: mysql.Pool;

  constructor() {
    const host = process.env.MYSQL_HOST || "localhost";
    const port = parseInt(process.env.MYSQL_PORT || "3306", 10);
    const database = process.env.MYSQL_DATABASE;
    const user = process.env.MYSQL_USER;
    const password = process.env.MYSQL_PASSWORD;

    if (!database || !user) {
      throw new Error(
        "FATAL: MySQL persistence adapter selected (DB_ADAPTER=mysql), but required environment variables " +
        "(MYSQL_DATABASE, MYSQL_USER) are missing. Check your cPanel database configuration. " +
        "Silent fallback to JSON storage is disabled in production."
      );
    }

    this.pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }

  public async healthCheck(): Promise<{ ok: boolean; adapter: string; details?: string }> {
    try {
      const [rows] = await this.pool.query("SELECT 1 AS health");
      return { ok: Array.isArray(rows) && rows.length > 0, adapter: "mysql" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, adapter: "mysql", details: msg };
    }
  }

  // ==========================================
  // CAR INVENTORY METHODS
  // ==========================================

  public async getCars(filters: CarFilters = {}): Promise<{ cars: Car[]; total: number }> {
    const targetStatus = filters.status || "ACTIVE";
    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    if (targetStatus !== "ALL") {
      whereClauses.push("c.status = ?");
      params.push(targetStatus);
    }

    if (filters.city && filters.city !== "all") {
      whereClauses.push("LOWER(c.city) = LOWER(?)");
      params.push(filters.city);
    }

    if (filters.dealerId) {
      whereClauses.push("c.dealer_id = ?");
      params.push(filters.dealerId);
    }

    if (filters.sellerId) {
      whereClauses.push("c.seller_id = ?");
      params.push(filters.sellerId);
    }

    if (filters.make && filters.make !== "all") {
      whereClauses.push("LOWER(c.make) = LOWER(?)");
      params.push(filters.make);
    }

    if (filters.fuelType && filters.fuelType !== "all") {
      whereClauses.push("c.fuel_type = ?");
      params.push(filters.fuelType);
    }

    if (filters.transmission && filters.transmission !== "all") {
      whereClauses.push("c.transmission = ?");
      params.push(filters.transmission);
    }

    if (filters.bodyType && filters.bodyType !== "all") {
      whereClauses.push("c.body_type = ?");
      params.push(filters.bodyType);
    }

    if (filters.budget === "under-8") {
      whereClauses.push("c.price_inr <= 800000");
    } else if (filters.budget === "8-15") {
      whereClauses.push("c.price_inr >= 800000 AND c.price_inr <= 1500000");
    } else if (filters.budget === "above-15") {
      whereClauses.push("c.price_inr > 1500000");
    }

    if (filters.search && filters.search.trim()) {
      const q = `%${filters.search.toLowerCase().trim()}%`;
      whereClauses.push(
        "(LOWER(c.make) LIKE ? OR LOWER(c.model) LIKE ? OR LOWER(c.variant) LIKE ? OR LOWER(c.listing_code) LIKE ? OR LOWER(c.locality) LIKE ?)"
      );
      params.push(q, q, q, q, q);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Total Count query
    const countSql = `SELECT COUNT(*) AS total FROM cars c ${whereSql}`;
    const [countRows] = await this.pool.query<mysql.RowDataPacket[]>(countSql, params);
    const total = Number(countRows[0]?.total || 0);

    // Sorting
    let orderSql = "c.is_featured DESC, c.created_at DESC";
    if (filters.sortBy === "price-asc") orderSql = "c.price_inr ASC";
    else if (filters.sortBy === "price-desc") orderSql = "c.price_inr DESC";
    else if (filters.sortBy === "km-asc") orderSql = "c.km_driven ASC";
    else if (filters.sortBy === "year-desc") orderSql = "c.year DESC";

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const querySql = `
      SELECT c.*, GROUP_CONCAT(ci.image_url ORDER BY ci.display_order ASC) AS image_urls
      FROM cars c
      LEFT JOIN car_images ci ON ci.car_id = c.id
      ${whereSql}
      GROUP BY c.id
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(querySql, queryParams);

    const cars: Car[] = rows.map((r) => this.mapCarRow(r));
    return { cars, total };
  }

  public async getCarById(id: string): Promise<Car | null> {
    const querySql = `
      SELECT c.*, GROUP_CONCAT(ci.image_url ORDER BY ci.display_order ASC) AS image_urls
      FROM cars c
      LEFT JOIN car_images ci ON ci.car_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
      LIMIT 1
    `;
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(querySql, [id]);
    if (!rows || rows.length === 0) return null;
    return this.mapCarRow(rows[0]);
  }

  public async getCarByListingCode(code: string): Promise<Car | null> {
    const normalized = code.toLowerCase().trim();
    const querySql = `
      SELECT c.*, GROUP_CONCAT(ci.image_url ORDER BY ci.display_order ASC) AS image_urls
      FROM cars c
      LEFT JOIN car_images ci ON ci.car_id = c.id
      WHERE LOWER(c.listing_code) = ? OR LOWER(c.id) = ?
      GROUP BY c.id
      LIMIT 1
    `;
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(querySql, [normalized, normalized]);
    if (!rows || rows.length === 0) return null;
    return this.mapCarRow(rows[0]);
  }

  public async createCar(carData: Omit<Car, "id" | "listingCode" | "status" | "isSeedData" | "createdAt" | "updatedAt">): Promise<Car> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      // Sequential unique listing code under transaction lock
      const [countRows] = await conn.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS total FROM cars FOR UPDATE");
      const nextNum = 1050 + Number(countRows[0]?.total || 0);
      const listingCode = `WC-${nextNum}`;
      const id = `car-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");

      const insertSql = `
        INSERT INTO cars (
          id, listing_code, seller_id, dealer_id, seller_type, dealer_name,
          make, model, variant, year, price_inr, km_driven,
          fuel_type, transmission, body_type, color, num_owners,
          rto_code, rto_area, insurance_type, insurance_validity, hypothecation_status,
          city, locality, status, is_verified, is_featured, is_seed_data,
          overview, features_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', 0, 0, 0, ?, ?, ?, ?)
      `;

      await conn.query(insertSql, [
        id, listingCode, carData.sellerId || null, carData.dealerId || null,
        carData.sellerType || "Individual", carData.dealerName || null,
        carData.make, carData.model, carData.variant, carData.year, carData.priceINR, carData.kmDriven,
        carData.fuelType, carData.transmission, carData.bodyType, carData.color, carData.numOwners || 1,
        carData.rtoCode, carData.rtoArea, carData.insuranceType || "Comprehensive",
        carData.insuranceValidity || null, carData.hypothecationStatus || null,
        carData.city || "Bengaluru", carData.locality,
        carData.overview || null, JSON.stringify(carData.features || []),
        now, now,
      ]);

      // Insert Gallery Images
      if (carData.images && carData.images.length > 0) {
        for (let i = 0; i < carData.images.length; i++) {
          const imgId = `img-${id}-${i}`;
          await conn.query(
            "INSERT INTO car_images (id, car_id, image_url, display_order, is_cover, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [imgId, id, carData.images[i], i, i === 0 ? 1 : 0, now]
          );
        }
      }

      await conn.commit();

      const created: Car = {
        ...carData,
        id,
        listingCode,
        status: "PENDING_APPROVAL",
        isSeedData: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return created;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  public async updateCar(carId: string, updates: Partial<Car>): Promise<Car | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.priceINR !== undefined) {
      fields.push("price_inr = ?");
      values.push(updates.priceINR);
    }
    if (updates.kmDriven !== undefined) {
      fields.push("km_driven = ?");
      values.push(updates.kmDriven);
    }
    if (updates.status !== undefined) {
      fields.push("status = ?");
      values.push(updates.status);
    }
    if (updates.overview !== undefined) {
      fields.push("overview = ?");
      values.push(updates.overview);
    }
    if (updates.rejectionReason !== undefined) {
      fields.push("rejection_reason = ?");
      values.push(updates.rejectionReason);
    }
    fields.push("updated_at = NOW()");

    if (fields.length > 1) {
      values.push(carId);
      await this.pool.query(
        `UPDATE cars SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
    }
    return this.getCarById(carId);
  }

  public async updateCarStatus(
    carId: string,
    action: ModerationAction,
    adminId: string,
    adminName: string,
    reason?: string
  ): Promise<Car | null> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const [carRows] = await conn.query<mysql.RowDataPacket[]>("SELECT * FROM cars WHERE id = ? FOR UPDATE", [carId]);
      if (!carRows || carRows.length === 0) {
        await conn.rollback();
        return null;
      }

      let newStatus: CarStatus = carRows[0].status;
      if (action === "APPROVED") newStatus = "ACTIVE";
      else if (action === "REJECTED") newStatus = "REJECTED";
      else if (action === "MARKED_SOLD") newStatus = "SOLD";
      else if (action === "RESTORED") newStatus = "ACTIVE";
      else if (action === "REQUEST_CHANGES") newStatus = "CHANGES_REQUESTED";
      else if (action === "SUSPEND") newStatus = "SUSPENDED";

      const now = new Date().toISOString().slice(0, 19).replace("T", " ");

      // Update Car
      await conn.query(
        "UPDATE cars SET status = ?, rejection_reason = ?, updated_at = ? WHERE id = ?",
        [newStatus, reason || null, now, carId]
      );

      // Audit Moderation Event
      const eventId = `mod-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      await conn.query(
        "INSERT INTO moderation_events (id, car_id, car_listing_code, admin_id, admin_name, action, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [eventId, carId, carRows[0].listing_code, adminId, adminName, action, reason || null, now]
      );

      await conn.commit();
      return this.getCarById(carId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ==========================================
  // SELLER METHODS
  // ==========================================

  public async getSellers(): Promise<Seller[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>("SELECT * FROM sellers ORDER BY created_at DESC");
    return rows.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      phone: r.phone,
      whatsapp: r.whatsapp || undefined,
      city: r.city,
      locality: r.locality,
      createdAt: r.created_at,
    }));
  }

  public async createSeller(sellerData: Omit<Seller, "id" | "createdAt">): Promise<Seller> {
    const [existing] = await this.pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM sellers WHERE phone = ? LIMIT 1",
      [sellerData.phone]
    );

    if (existing && existing.length > 0) {
      await this.pool.query(
        "UPDATE sellers SET full_name = ?, whatsapp = ?, locality = ? WHERE id = ?",
        [sellerData.fullName, sellerData.whatsapp || null, sellerData.locality, existing[0].id]
      );
      return {
        id: existing[0].id,
        fullName: sellerData.fullName,
        phone: sellerData.phone,
        whatsapp: sellerData.whatsapp,
        email: existing[0].email,
        locality: sellerData.locality,
        city: existing[0].city || "Bengaluru",
        createdAt: existing[0].created_at,
      };
    }

    const id = `seller-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    await this.pool.query(
      "INSERT INTO sellers (id, full_name, phone, whatsapp, email, locality, city, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, sellerData.fullName, sellerData.phone, sellerData.whatsapp || null, sellerData.email || null, sellerData.locality, "Bengaluru", now]
    );

    return {
      id,
      fullName: sellerData.fullName,
      phone: sellerData.phone,
      whatsapp: sellerData.whatsapp,
      email: sellerData.email,
      locality: sellerData.locality,
      city: "Bengaluru",
      createdAt: new Date().toISOString(),
    };
  }

  public async getSellerById(id: string): Promise<Seller | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>("SELECT * FROM sellers WHERE id = ? LIMIT 1", [id]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      fullName: r.full_name,
      phone: r.phone,
      whatsapp: r.whatsapp,
      email: r.email,
      locality: r.locality,
      city: r.city,
      createdAt: r.created_at,
    };
  }

  // ==========================================
  // DEALER METHODS
  // ==========================================

  public async getDealers(filters?: { isVerified?: boolean; stateId?: string; districtId?: string }): Promise<Dealer[]> {
    let sql = "SELECT * FROM dealers";
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters) {
      if (typeof filters.isVerified === "boolean") {
        where.push("is_verified = ?");
        params.push(filters.isVerified ? 1 : 0);
      }
      if (filters.stateId) {
        where.push("state_id = ?");
        params.push(filters.stateId);
      }
      if (filters.districtId) {
        where.push("district_id = ?");
        params.push(filters.districtId);
      }
    }
    if (where.length > 0) {
      sql += ` WHERE ${where.join(" AND ")}`;
    }
    sql += " ORDER BY rating DESC";
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(sql, params);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      stateId: r.state_id || undefined,
      stateName: r.state_name || undefined,
      districtId: r.district_id || undefined,
      districtName: r.district_name || undefined,
      cityId: r.city_id || undefined,
      cityName: r.city_name || undefined,
      pincode: r.pincode || undefined,
      locality: r.locality,
      address: r.address,
      rating: Number(r.rating),
      reviewsCount: Number(r.reviews_count),
      whatsappNumber: r.whatsapp_number,
      establishedYear: Number(r.established_year),
      isVerified: Boolean(r.is_verified),
      approvalStatus: r.approval_status || (Boolean(r.is_verified) ? "APPROVED" : "PENDING"),
      avatarEmoji: r.avatar_emoji,
      speciality: r.speciality,
      isSeedData: Boolean(r.is_seed_data),
      createdAt: r.created_at,
    }));
  }

  private mapDealerRow(r: mysql.RowDataPacket): Dealer {
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      stateId: r.state_id || undefined,
      stateName: r.state_name || undefined,
      districtId: r.district_id || undefined,
      districtName: r.district_name || undefined,
      cityId: r.city_id || undefined,
      cityName: r.city_name || undefined,
      pincode: r.pincode || undefined,
      locality: r.locality,
      address: r.address,
      rating: Number(r.rating),
      reviewsCount: Number(r.reviews_count),
      whatsappNumber: r.whatsapp_number,
      establishedYear: Number(r.established_year),
      isVerified: Boolean(r.is_verified),
      approvalStatus: r.approval_status || (Boolean(r.is_verified) ? "APPROVED" : "PENDING"),
      kycStatus: r.kyc_status || undefined,
      avatarEmoji: r.avatar_emoji,
      speciality: r.speciality,
      isSeedData: Boolean(r.is_seed_data),
      createdAt: r.created_at,
      updatedAt: r.updated_at || undefined,
    };
  }

  public async getDealerById(id: string): Promise<Dealer | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>("SELECT * FROM dealers WHERE id = ? LIMIT 1", [id]);
    if (!rows || rows.length === 0) return null;
    return this.mapDealerRow(rows[0]);
  }

  public async getDealerBySlug(slug: string): Promise<Dealer | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>("SELECT * FROM dealers WHERE LOWER(slug) = LOWER(?) LIMIT 1", [slug]);
    if (!rows || rows.length === 0) return null;
    return this.mapDealerRow(rows[0]);
  }

  public async createDealer(dealerData: Omit<Dealer, "id" | "createdAt">): Promise<Dealer> {
    const id = `dealer-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const slug = dealerData.slug || dealerData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    await this.pool.query(
      `INSERT INTO dealers (
        id, name, slug, state_id, state_name, district_id, district_name, city_id, city_name, pincode,
        locality, address, rating, reviews_count, whatsapp_number, established_year, is_verified, approval_status,
        avatar_emoji, speciality, is_seed_data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dealerData.name,
        slug,
        dealerData.stateId || null,
        dealerData.stateName || null,
        dealerData.districtId || null,
        dealerData.districtName || null,
        dealerData.cityId || null,
        dealerData.cityName || null,
        dealerData.pincode || null,
        dealerData.locality,
        dealerData.address,
        dealerData.rating || 4.5,
        dealerData.reviewsCount || 0,
        dealerData.whatsappNumber,
        dealerData.establishedYear || 2022,
        dealerData.isVerified ? 1 : 0,
        dealerData.approvalStatus || (dealerData.isVerified ? "APPROVED" : "PENDING"),
        dealerData.avatarEmoji || "🏢",
        dealerData.speciality || "Multi-brand Pre-owned Cars",
        dealerData.isSeedData ? 1 : 0,
        now,
        now,
      ]
    );

    return {
      ...dealerData,
      id,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public async updateDealerVerification(dealerId: string, isVerified: boolean): Promise<Dealer | null> {
    await this.pool.query(
      "UPDATE dealers SET is_verified = ?, approval_status = ? WHERE id = ?",
      [isVerified ? 1 : 0, isVerified ? "APPROVED" : "PENDING", dealerId]
    );
    return this.getDealerById(dealerId);
  }

  public async updateDealer(dealerId: string, updates: Partial<Dealer>): Promise<Dealer | null> {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];
    if (updates.name !== undefined) { fields.push("name = ?"); params.push(updates.name); }
    if (updates.address !== undefined) { fields.push("address = ?"); params.push(updates.address); }
    if (updates.locality !== undefined) { fields.push("locality = ?"); params.push(updates.locality); }
    if (updates.whatsappNumber !== undefined) { fields.push("whatsapp_number = ?"); params.push(updates.whatsappNumber); }
    if (updates.isVerified !== undefined) { fields.push("is_verified = ?"); params.push(updates.isVerified ? 1 : 0); }
    if (updates.approvalStatus !== undefined) { fields.push("approval_status = ?"); params.push(updates.approvalStatus); }
    if (updates.kycStatus !== undefined) { fields.push("kyc_status = ?"); params.push(updates.kycStatus); }
    if (updates.stateId !== undefined) { fields.push("state_id = ?"); params.push(updates.stateId || null); }
    if (updates.stateName !== undefined) { fields.push("state_name = ?"); params.push(updates.stateName || null); }
    if (updates.districtId !== undefined) { fields.push("district_id = ?"); params.push(updates.districtId || null); }
    if (updates.districtName !== undefined) { fields.push("district_name = ?"); params.push(updates.districtName || null); }
    if (updates.cityId !== undefined) { fields.push("city_id = ?"); params.push(updates.cityId || null); }
    if (updates.cityName !== undefined) { fields.push("city_name = ?"); params.push(updates.cityName || null); }
    if (updates.pincode !== undefined) { fields.push("pincode = ?"); params.push(updates.pincode || null); }
    if (fields.length > 0) {
      fields.push("updated_at = ?");
      params.push(new Date().toISOString().slice(0, 19).replace("T", " "));
      params.push(dealerId);
      await this.pool.query(`UPDATE dealers SET ${fields.join(", ")} WHERE id = ?`, params);
    }
    return this.getDealerById(dealerId);
  }

  // ==========================================
  // BUYER ENQUIRY & LEAD METHODS
  // ==========================================

  public async createEnquiry(enquiryData: Omit<Enquiry, "id" | "status" | "createdAt">): Promise<Enquiry> {
    const id = `enq-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    const insertSql = `
      INSERT INTO enquiries (
        id, car_id, car_title, car_listing_code, dealer_id, seller_id,
        buyer_name, buyer_phone, buyer_email, enquiry_type,
        preferred_date, preferred_slot, preferred_time, notes, message,
        status, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?)
    `;

    await this.pool.query(insertSql, [
      id, enquiryData.carId, enquiryData.carTitle || null, enquiryData.carListingCode || null,
      enquiryData.dealerId || null, enquiryData.sellerId || null,
      enquiryData.buyerName, enquiryData.buyerPhone, enquiryData.buyerEmail || null,
      enquiryData.enquiryType || "TEST_DRIVE", enquiryData.preferredDate || null,
      enquiryData.preferredSlot || null, enquiryData.preferredTime || null,
      enquiryData.notes || null, enquiryData.message || null,
      enquiryData.ipAddress || null, now,
    ]);

    return {
      ...enquiryData,
      id,
      status: "NEW",
      createdAt: new Date().toISOString(),
    };
  }

  public async getEnquiries(filters: EnquiryFilters = {}): Promise<Enquiry[]> {
    const whereClauses: string[] = [];
    const params: string[] = [];

    if (filters.dealerId) {
      whereClauses.push("dealer_id = ?");
      params.push(filters.dealerId);
    }
    if (filters.carId) {
      whereClauses.push("car_id = ?");
      params.push(filters.carId);
    }
    if (filters.status) {
      whereClauses.push("status = ?");
      params.push(filters.status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const querySql = `SELECT * FROM enquiries ${whereSql} ORDER BY created_at DESC`;

    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(querySql, params);
    return rows.map((r) => ({
      id: r.id,
      carId: r.car_id,
      carTitle: r.car_title,
      carListingCode: r.car_listing_code,
      dealerId: r.dealer_id,
      sellerId: r.seller_id,
      buyerName: r.buyer_name,
      buyerPhone: r.buyer_phone,
      buyerEmail: r.buyer_email,
      enquiryType: r.enquiry_type,
      preferredDate: r.preferred_date,
      preferredSlot: r.preferred_slot,
      preferredTime: r.preferred_time,
      notes: r.notes,
      message: r.message,
      status: r.status,
      ipAddress: r.ip_address,
      createdAt: r.created_at,
    }));
  }

  public async updateEnquiryStatus(enquiryId: string, status: EnquiryStatus): Promise<Enquiry | null> {
    await this.pool.query("UPDATE enquiries SET status = ? WHERE id = ?", [status, enquiryId]);
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>("SELECT * FROM enquiries WHERE id = ? LIMIT 1", [enquiryId]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      carId: r.car_id,
      carTitle: r.car_title,
      carListingCode: r.car_listing_code,
      dealerId: r.dealer_id,
      sellerId: r.seller_id,
      buyerName: r.buyer_name,
      buyerPhone: r.buyer_phone,
      buyerEmail: r.buyer_email,
      enquiryType: r.enquiry_type,
      preferredDate: r.preferred_date,
      preferredSlot: r.preferred_slot,
      preferredTime: r.preferred_time,
      notes: r.notes,
      message: r.message,
      status: r.status,
      ipAddress: r.ip_address,
      createdAt: r.created_at,
    };
  }

  public async updateEnquiry(enquiryId: string, updates: Partial<Enquiry>): Promise<Enquiry | null> {
    const fields: string[] = [];
    const params: (string | number)[] = [];
    if (updates.status !== undefined) { fields.push("status = ?"); params.push(updates.status); }
    if (updates.notes !== undefined) { fields.push("notes = ?"); params.push(updates.notes); }
    if (fields.length > 0) {
      params.push(enquiryId);
      await this.pool.query(`UPDATE enquiries SET ${fields.join(", ")} WHERE id = ?`, params);
    }
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>("SELECT * FROM enquiries WHERE id = ? LIMIT 1", [enquiryId]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      carId: r.car_id,
      carTitle: r.car_title,
      carListingCode: r.car_listing_code,
      dealerId: r.dealer_id,
      sellerId: r.seller_id,
      buyerName: r.buyer_name,
      buyerPhone: r.buyer_phone,
      buyerEmail: r.buyer_email,
      enquiryType: r.enquiry_type,
      preferredDate: r.preferred_date,
      preferredSlot: r.preferred_slot,
      preferredTime: r.preferred_time,
      notes: r.notes,
      message: r.message,
      status: r.status,
      ipAddress: r.ip_address,
      createdAt: r.created_at,
    };
  }

  // ==========================================
  // ADMIN AUTH & AUDIT METHODS
  // ==========================================

  public async getAdmins(): Promise<AdminUser[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>("SELECT * FROM admins ORDER BY created_at ASC");
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      fullName: r.full_name,
      passwordHash: r.password_hash,
      role: r.role || "ADMIN",
      isActive: Boolean(r.is_active),
      tokenVersion: Number(r.token_version || 1),
      passwordChangedAt: r.password_changed_at,
      lastLoginAt: r.last_login_at,
      createdAt: r.created_at,
    }));
  }

  public async createAdmin(adminData: Omit<AdminUser, "id" | "createdAt" | "tokenVersion">): Promise<AdminUser> {
    const id = `admin-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const email = (adminData.email || `${adminData.username}@wowcars.in`).toLowerCase().trim();
    await this.pool.query(
      "INSERT INTO admins (id, username, email, full_name, password_hash, role, is_active, token_version, password_changed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
      [
        id,
        adminData.username.toLowerCase().trim(),
        email,
        adminData.fullName.trim(),
        adminData.passwordHash,
        adminData.role || "ADMIN",
        adminData.isActive !== false ? 1 : 0,
        now,
        now,
      ]
    );
    return {
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
  }

  public async getAdminByUsername(username: string): Promise<AdminUser | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM admins WHERE LOWER(username) = LOWER(?) LIMIT 1",
      [username.trim()]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      username: r.username,
      email: r.email,
      fullName: r.full_name,
      passwordHash: r.password_hash,
      role: r.role,
      isActive: Boolean(r.is_active),
      tokenVersion: Number(r.token_version || 1),
      passwordChangedAt: r.password_changed_at,
      lastLoginAt: r.last_login_at,
      createdAt: r.created_at,
    };
  }

  public async getAdminById(id: string): Promise<AdminUser | null> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM admins WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      username: r.username,
      email: r.email,
      fullName: r.full_name,
      passwordHash: r.password_hash,
      role: r.role,
      isActive: Boolean(r.is_active),
      tokenVersion: Number(r.token_version || 1),
      passwordChangedAt: r.password_changed_at,
      lastLoginAt: r.last_login_at,
      createdAt: r.created_at,
    };
  }

  public async updateAdminLastLogin(adminId: string): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    await this.pool.query("UPDATE admins SET last_login_at = ? WHERE id = ?", [now, adminId]);
  }

  public async rotateAdminPassword(adminId: string, newPasswordHash: string): Promise<AdminUser | null> {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    await this.pool.query(
      "UPDATE admins SET password_hash = ?, token_version = token_version + 1, password_changed_at = ? WHERE id = ?",
      [newPasswordHash, now, adminId]
    );
    return this.getAdminById(adminId);
  }

  public async invalidateAdminSessions(adminId: string): Promise<boolean> {
    const [result] = await this.pool.query<mysql.ResultSetHeader>(
      "UPDATE admins SET token_version = token_version + 1 WHERE id = ?",
      [adminId]
    );
    return result.affectedRows > 0;
  }

  public async getModerationEvents(carId?: string): Promise<ModerationEvent[]> {
    let sql = "SELECT * FROM moderation_events ORDER BY created_at DESC LIMIT 50";
    const params: string[] = [];
    if (carId) {
      sql = "SELECT * FROM moderation_events WHERE car_id = ? ORDER BY created_at DESC LIMIT 50";
      params.push(carId);
    }
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(sql, params);
    return rows.map((r) => ({
      id: r.id,
      carId: r.car_id,
      carListingCode: r.car_listing_code,
      adminId: r.admin_id,
      adminName: r.admin_name,
      action: r.action,
      reason: r.reason,
      createdAt: r.created_at,
    }));
  }

  public async createModerationEvent(
    eventData: Omit<ModerationEvent, "id" | "createdAt">
  ): Promise<ModerationEvent> {
    const id = `mod-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const createdAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO moderation_events (id, car_id, car_listing_code, admin_id, admin_name, action, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        eventData.carId || "",
        eventData.carListingCode || "",
        eventData.adminId,
        eventData.adminName,
        eventData.action,
        eventData.reason || null,
        createdAt,
      ]
    );
    return { ...eventData, id, createdAt };
  }

  // ==========================================
  // PLATFORM METRICS & STATS
  // ==========================================

  public async getPlatformStats(): Promise<PlatformStats> {
    const [carStats] = await this.pool.query<mysql.RowDataPacket[]>(`
      SELECT
        COUNT(*) AS totalCars,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeCars,
        SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS pendingCars,
        SUM(CASE WHEN status = 'CHANGES_REQUESTED' THEN 1 ELSE 0 END) AS changesRequestedCars,
        SUM(CASE WHEN status = 'SUSPENDED' THEN 1 ELSE 0 END) AS suspendedCars,
        SUM(CASE WHEN status = 'SOLD' THEN 1 ELSE 0 END) AS soldCars,
        COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN price_inr ELSE 0 END), 0) AS totalInventoryValueINR
      FROM cars
    `);

    const [enqStats] = await this.pool.query<mysql.RowDataPacket[]>(`
      SELECT
        COUNT(*) AS totalEnquiries,
        SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) AS newEnquiries,
        SUM(CASE WHEN status = 'TEST_DRIVE_SCHEDULED' THEN 1 ELSE 0 END) AS testDrivesScheduled,
        SUM(CASE WHEN status = 'CONVERTED' THEN 1 ELSE 0 END) AS leadsConverted
      FROM enquiries
    `);

    const [dealerStats] = await this.pool.query<mysql.RowDataPacket[]>(`
      SELECT
        COUNT(*) AS totalDealers,
        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verifiedDealers,
        SUM(CASE WHEN is_verified = 0 THEN 1 ELSE 0 END) AS pendingDealers
      FROM dealers
    `);
    const [sellerCount] = await this.pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS totalSellers FROM sellers");

    return {
      totalCars: Number(carStats[0]?.totalCars || 0),
      activeCars: Number(carStats[0]?.activeCars || 0),
      pendingCars: Number(carStats[0]?.pendingCars || 0),
      changesRequestedCars: Number(carStats[0]?.changesRequestedCars || 0),
      suspendedCars: Number(carStats[0]?.suspendedCars || 0),
      soldCars: Number(carStats[0]?.soldCars || 0),
      totalInventoryValueINR: Number(carStats[0]?.totalInventoryValueINR || 0),
      totalEnquiries: Number(enqStats[0]?.totalEnquiries || 0),
      newEnquiries: Number(enqStats[0]?.newEnquiries || 0),
      testDrivesScheduled: Number(enqStats[0]?.testDrivesScheduled || 0),
      leadsConverted: Number(enqStats[0]?.leadsConverted || 0),
      totalDealers: Number(dealerStats[0]?.totalDealers || 0),
      verifiedDealers: Number(dealerStats[0]?.verifiedDealers || 0),
      pendingDealers: Number(dealerStats[0]?.pendingDealers || 0),
      totalSellers: Number(sellerCount[0]?.totalSellers || 0),
    };
  }

  // ==========================================
  // PAN-INDIA LOCATION HIERARCHY METHODS
  // ==========================================

  public async getStates(filters?: { isActive?: boolean }): Promise<State[]> {
    let states: State[] = SEED_STATES;
    try {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        "SELECT id, name, code, type, capital, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt FROM states_or_uts ORDER BY name ASC"
      );
      if (rows && rows.length > 0) {
        states = rows.map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          type: r.type,
          capital: r.capital || undefined,
          isActive: Boolean(r.isActive),
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
        }));
      }
    } catch {
      // Fallback to seed dataset if table not initialized
    }
    if (filters && filters.isActive !== undefined) {
      states = states.filter((s) => s.isActive === filters.isActive);
    }
    return states;
  }

  public async getStateById(id: string): Promise<State | null> {
    const states = await this.getStates();
    return states.find((s) => s.id === id || s.code === id) || null;
  }

  public async getDistricts(filters?: { stateId?: string; isActive?: boolean; expansionStatus?: ExpansionStatus }): Promise<District[]> {
    let districts: District[] = SEED_DISTRICTS;
    try {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        "SELECT id, state_id AS stateId, state_code AS stateCode, state_name AS stateName, name, slug, is_active AS isActive, expansion_status AS expansionStatus, expansion_owner AS expansionOwner, expansion_notes AS expansionNotes, follow_up_date AS followUpDate, created_at AS createdAt, updated_at AS updatedAt FROM districts ORDER BY name ASC"
      );
      if (rows && rows.length > 0) {
        districts = rows.map((r) => ({
          id: r.id,
          stateId: r.stateId,
          stateCode: r.stateCode || "",
          stateName: r.stateName || "",
          name: r.name,
          slug: r.slug || r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          isActive: Boolean(r.isActive),
          expansionStatus: (r.expansionStatus as ExpansionStatus) || "NOT_STARTED",
          expansionOwner: r.expansionOwner || undefined,
          expansionNotes: r.expansionNotes || undefined,
          followUpDate: r.followUpDate || undefined,
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
        }));
      }
    } catch {
      // Fallback
    }
    if (filters) {
      if (filters.stateId) {
        districts = districts.filter((d) => d.stateId === filters.stateId);
      }
      if (filters.isActive !== undefined) {
        districts = districts.filter((d) => d.isActive === filters.isActive);
      }
      if (filters.expansionStatus) {
        districts = districts.filter((d) => d.expansionStatus === filters.expansionStatus);
      }
    }
    return districts;
  }

  public async getDistrictById(id: string): Promise<District | null> {
    const districts = await this.getDistricts();
    return districts.find((d) => d.id === id) || null;
  }

  public async createDistrict(districtData: Omit<District, "id" | "createdAt" | "updatedAt">): Promise<District> {
    const id = `${districtData.stateId.toLowerCase()}-${districtData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
    const now = new Date().toISOString();
    const slug = districtData.slug || districtData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newDistrict: District = {
      ...districtData,
      id,
      slug,
      isActive: districtData.isActive !== false,
      expansionStatus: districtData.expansionStatus || "NOT_STARTED",
      createdAt: now,
      updatedAt: now,
    };
    try {
      await this.pool.query(
        `INSERT INTO districts (id, state_id, state_code, state_name, name, slug, is_active, expansion_status, expansion_owner, expansion_notes, follow_up_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          newDistrict.stateId,
          newDistrict.stateCode,
          newDistrict.stateName,
          newDistrict.name,
          newDistrict.slug,
          newDistrict.isActive ? 1 : 0,
          newDistrict.expansionStatus,
          newDistrict.expansionOwner || null,
          newDistrict.expansionNotes || null,
          newDistrict.followUpDate || null,
          now.slice(0, 19).replace("T", " "),
          now.slice(0, 19).replace("T", " "),
        ]
      );
    } catch (err) {
      console.error("Failed to insert district into MySQL:", err);
    }
    return newDistrict;
  }

  public async updateDistrict(id: string, updates: Partial<District>): Promise<District | null> {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];
    if (updates.name !== undefined) { fields.push("name = ?"); params.push(updates.name); }
    if (updates.slug !== undefined) { fields.push("slug = ?"); params.push(updates.slug); }
    if (updates.isActive !== undefined) { fields.push("is_active = ?"); params.push(updates.isActive ? 1 : 0); }
    if (updates.expansionStatus !== undefined) { fields.push("expansion_status = ?"); params.push(updates.expansionStatus); }
    if (updates.expansionOwner !== undefined) { fields.push("expansion_owner = ?"); params.push(updates.expansionOwner || null); }
    if (updates.expansionNotes !== undefined) { fields.push("expansion_notes = ?"); params.push(updates.expansionNotes || null); }
    if (updates.followUpDate !== undefined) { fields.push("follow_up_date = ?"); params.push(updates.followUpDate || null); }

    if (fields.length > 0) {
      fields.push("updated_at = ?");
      params.push(new Date().toISOString().slice(0, 19).replace("T", " "));
      params.push(id);
      await this.pool.query(`UPDATE districts SET ${fields.join(", ")} WHERE id = ?`, params);
    }
    return this.getDistrictById(id);
  }

  public async getCities(filters?: { districtId?: string; stateId?: string }): Promise<City[]> {
    let cities: City[] = SEED_CITIES;
    try {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        "SELECT id, district_id AS districtId, state_id AS stateId, name, slug, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt FROM cities_or_towns ORDER BY name ASC"
      );
      if (rows && rows.length > 0) {
        cities = rows.map((r) => ({
          id: r.id,
          districtId: r.districtId,
          stateId: r.stateId,
          name: r.name,
          slug: r.slug || r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          isActive: Boolean(r.isActive),
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
        }));
      }
    } catch {
      // Fallback
    }
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
    const [dealers, districts] = await Promise.all([
      this.getDealers(),
      this.getDistricts(),
    ]);

    const approvedDealers = dealers.filter((d) => d.approvalStatus === "APPROVED" || (d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED"));
    const pendingDealers = dealers.filter((d) => d.approvalStatus === "PENDING" || (!d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED"));
    const inactiveDealers = dealers.filter((d) => d.approvalStatus === "REJECTED" || d.approvalStatus === "SUSPENDED" || d.kycStatus === "REJECTED" || d.kycStatus === "SUSPENDED");

    const statesWithDealers = new Set(approvedDealers.map((d) => d.stateId).filter(Boolean));
    const districtsWithDealers = new Set(approvedDealers.map((d) => d.districtId).filter(Boolean));
    const activeDistricts = districts.filter((d) => d.isActive);
    const districtsWithoutActiveDealers = activeDistricts.filter((d) => !districtsWithDealers.has(d.id)).length;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const dealersAddedLast30Days = dealers.filter((d) => new Date(d.createdAt).getTime() >= thirtyDaysAgo).length;

    const totalActiveDistricts = activeDistricts.length || 1;
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
    const [allStates, districts, dealers, carRes, enquiries] = await Promise.all([
      this.getStates(),
      this.getDistricts(),
      this.getDealers(),
      this.getCars({ status: "ACTIVE" }),
      this.getEnquiries(),
    ]);

    const cars = carRes.cars;
    const states = allStates.filter((s) => s.isActive);
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
    const [districts, dealers, carRes, enquiries] = await Promise.all([
      this.getDistricts(stateId ? { stateId } : undefined),
      this.getDealers(),
      this.getCars({ status: "ACTIVE" }),
      this.getEnquiries(),
    ]);

    const cars = carRes.cars;

    return districts.map((district) => {
      const districtDealers = dealers.filter((d) => d.districtId === district.id);
      const activeApproved = districtDealers.filter((d) => d.approvalStatus === "APPROVED" || (d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED"));
      const pending = districtDealers.filter((d) => d.approvalStatus === "PENDING" || (!d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED"));

      const networkStatus: "Covered" | "Partially Covered" | "Uncovered" =
        activeApproved.length > 0 ? "Covered" : pending.length > 0 ? "Partially Covered" : "Uncovered";

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

  // Helper row mapper
  private mapCarRow(r: mysql.RowDataPacket): Car {
    let images: string[] = [];
    if (r.image_urls) {
      images = typeof r.image_urls === "string" ? r.image_urls.split(",") : [];
    }

    let features: string[] = [];
    if (r.features_json) {
      try {
        features = typeof r.features_json === "string" ? JSON.parse(r.features_json) : r.features_json;
      } catch {}
    }

    return {
      id: r.id,
      listingCode: r.listing_code,
      sellerId: r.seller_id,
      dealerId: r.dealer_id,
      sellerType: r.seller_type,
      dealerName: r.dealer_name,
      make: r.make,
      model: r.model,
      variant: r.variant,
      year: Number(r.year),
      priceINR: Number(r.price_inr),
      kmDriven: Number(r.km_driven),
      fuelType: r.fuel_type as FuelType,
      transmission: r.transmission as Transmission,
      bodyType: r.body_type as BodyType,
      color: r.color,
      numOwners: Number(r.num_owners || 1),
      rtoCode: r.rto_code,
      rtoArea: r.rto_area,
      insuranceType: r.insurance_type,
      insuranceValidity: r.insurance_validity,
      hypothecationStatus: r.hypothecation_status,
      city: r.city,
      locality: r.locality,
      status: r.status as CarStatus,
      rejectionReason: r.rejection_reason,
      isVerified: Boolean(r.is_verified),
      isFeatured: Boolean(r.is_featured),
      isSeedData: Boolean(r.is_seed_data),
      images,
      overview: r.overview,
      features,
      inspectionScore: r.inspection_score ? Number(r.inspection_score) : undefined,
      engineDisplacement: r.engine_displacement,
      mileageARAI: r.mileage_arai,
      seatingCapacity: r.seating_capacity ? Number(r.seating_capacity) : 5,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  // ==========================================
  // SPARE PARTS E-COMMERCE (MYSQL ADAPTER)
  // ==========================================
  private memCategories: PartCategory[] = [...SEED_PART_CATEGORIES];
  private memBrands: PartBrand[] = [...SEED_PART_BRANDS];
  private memSellers: PartSeller[] = [...SEED_PART_SELLERS];
  private memProducts: PartProduct[] = [...SEED_PART_PRODUCTS];
  private memOrders: PartOrder[] = [];
  private memCarts: PartCart[] = [];
  private memPriceHistory: PartPriceHistory[] = [];
  private memEnquiries: PartEnquiry[] = [];
  private memOutlets: Outlet[] = [...SEED_OUTLETS];
  private memSuppliers: Supplier[] = [...SEED_SUPPLIERS];
  private memQuotations: SupplierQuotation[] = [...SEED_SUPPLIER_QUOTATIONS];
  private memPurchaseOrders: PurchaseOrder[] = [];
  private memGoodsReceipts: GoodsReceiptNote[] = [];
  private memOutletInventory: OutletInventoryItem[] = [...SEED_OUTLET_INVENTORY];
  private memStockMovements: StockMovement[] = [];
  private memInventoryLedger: InventoryLedgerEntry[] = [];
  private memTransfers: InterOutletTransfer[] = [];
  private memGarageJobCards: GarageJobCard[] = [...SEED_GARAGE_JOB_CARDS];
  private memGarageServices: GarageServiceItem[] = [...SEED_GARAGE_SERVICES];
  private memUsedCarEconomics: UsedCarEconomics[] = [...SEED_USED_CAR_ECONOMICS];
  private memOperatingExpenses: OperatingExpense[] = [...SEED_OPERATING_EXPENSES];
  private memMonthlyBudgets: MonthlyBudget[] = [SEED_MONTHLY_BUDGET];
  private memAuditLogs: OperationsAuditLog[] = [...SEED_OPERATIONS_AUDIT_LOGS];
  private memCustomers: Customer[] = [];
  private memCustomerOTPs: CustomerOTP[] = [];
  private memCustomerVehicles: CustomerVehicle[] = [];
  private memCustomerTickets: CustomerSupportTicket[] = [];
  private memCustomerSavedItems: CustomerSavedItem[] = [];
  private memOrderReturns: OrderReturnRequest[] = [];
  private memPaymentTransactions: PaymentTransaction[] = [];

  public async getPartCategories(): Promise<PartCategory[]> {
    return [...this.memCategories].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public async getPartCategoryById(id: string): Promise<PartCategory | null> {
    const cat = this.memCategories.find((c) => c.id === id);
    return cat ? { ...cat } : null;
  }

  public async getPartCategoryBySlug(slug: string): Promise<PartCategory | null> {
    const cat = this.memCategories.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
    return cat ? { ...cat } : null;
  }

  public async createPartCategory(
    categoryData: Omit<PartCategory, "id" | "createdAt" | "updatedAt">
  ): Promise<PartCategory> {
    const id = `cat-${categoryData.slug || Date.now()}`;
    const now = new Date().toISOString();
    const newCat: PartCategory = { ...categoryData, id, createdAt: now, updatedAt: now };
    this.memCategories.push(newCat);
    return newCat;
  }

  public async updatePartCategory(id: string, updates: Partial<PartCategory>): Promise<PartCategory | null> {
    const idx = this.memCategories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const updated = { ...this.memCategories[idx], ...updates, updatedAt: new Date().toISOString() };
    this.memCategories[idx] = updated;
    return updated;
  }

  public async deletePartCategory(id: string): Promise<boolean> {
    const initialLen = this.memCategories.length;
    this.memCategories = this.memCategories.filter((c) => c.id !== id);
    return this.memCategories.length < initialLen;
  }

  public async getPartBrands(): Promise<PartBrand[]> {
    return [...this.memBrands].sort((a, b) => a.name.localeCompare(b.name));
  }

  public async getPartBrandById(id: string): Promise<PartBrand | null> {
    const b = this.memBrands.find((br) => br.id === id);
    return b ? { ...b } : null;
  }

  public async getPartBrandBySlug(slug: string): Promise<PartBrand | null> {
    const b = this.memBrands.find((br) => br.slug.toLowerCase() === slug.toLowerCase());
    return b ? { ...b } : null;
  }

  public async getPartProducts(filters?: PartProductFilters): Promise<{ products: PartProduct[]; total: number; page?: number; totalPages?: number }> {
    let products = [...this.memProducts];

    if (!filters) {
      const published = products.filter((p) => p.status === "PUBLISHED");
      return { products: published, total: published.length, page: 1, totalPages: 1 };
    }

    if (filters.status && filters.status !== "ALL") {
      products = products.filter((p) => p.status === filters.status);
    } else if (!filters.status) {
      products = products.filter((p) => p.status === "PUBLISHED");
    }

    if (filters.categoryId) {
      products = products.filter((p) => p.categoryId === filters.categoryId);
    }
    if (filters.categorySlug) {
      const cat = this.memCategories.find((c) => c.slug.toLowerCase() === filters.categorySlug?.toLowerCase());
      if (cat) {
        products = products.filter((p) => p.categoryId === cat.id);
      }
    }
    if (filters.subcategory) {
      products = products.filter((p) => p.subcategory && p.subcategory.toLowerCase() === filters.subcategory?.toLowerCase());
    }
    if (filters.brand) {
      products = products.filter((p) => p.brand.toLowerCase() === filters.brand?.toLowerCase());
    }
    if (filters.condition && filters.condition !== "ALL") {
      products = products.filter((p) => p.condition === filters.condition);
    }
    if (filters.partType && filters.partType !== "ALL") {
      products = products.filter((p) => p.partType === filters.partType);
    }
    if (filters.sellerId) {
      products = products.filter((p) => p.sellerId === filters.sellerId);
    }
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
    if (filters.minPrice !== undefined && !isNaN(filters.minPrice)) {
      products = products.filter((p) => (p.priceINR || p.price || 0) >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined && !isNaN(filters.maxPrice)) {
      products = products.filter((p) => (p.priceINR || p.price || 0) <= filters.maxPrice!);
    }
    if (filters.partNumber) {
      const pn = filters.partNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
      products = products.filter((p) => {
        const p1 = (p.partNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const p2 = (p.oemPartNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return p1.includes(pn) || p2.includes(pn);
      });
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.partNumber && p.partNumber.toLowerCase().includes(q)) ||
          (p.oemPartNumber && p.oemPartNumber.toLowerCase().includes(q)) ||
          p.description.toLowerCase().includes(q)
      );
    }
    if (filters.vehicleMake || filters.vehicleModel) {
      const makeQ = filters.vehicleMake ? filters.vehicleMake.toLowerCase() : null;
      const modelQ = filters.vehicleModel ? filters.vehicleModel.toLowerCase() : null;
      products = products.filter((p) =>
        p.compatibleVehicles.some((cv) => {
          if (cv.make.toLowerCase() === "universal") return true;
          const makeMatches = !makeQ || cv.make.toLowerCase() === makeQ;
          const modelMatches = !modelQ || cv.model.toLowerCase() === modelQ || cv.model.toLowerCase().includes(modelQ);
          return makeMatches && modelMatches;
        })
      );
    }

    if (filters.sortBy === "price-asc") {
      products.sort((a, b) => (a.priceINR || a.price || 0) - (b.priceINR || b.price || 0));
    } else if (filters.sortBy === "price-desc") {
      products.sort((a, b) => (b.priceINR || b.price || 0) - (a.priceINR || a.price || 0));
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
    const prod = this.memProducts.find((p) => p.id === id);
    return prod ? { ...prod } : null;
  }

  public async getPartProductBySlug(slug: string): Promise<PartProduct | null> {
    const prod = this.memProducts.find((p) => p.slug.toLowerCase() === slug.toLowerCase());
    return prod ? { ...prod } : null;
  }

  public async createPartProduct(
    productData: Omit<PartProduct, "id" | "createdAt" | "updatedAt" | "priceVerifiedAt">
  ): Promise<PartProduct> {
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
    this.memProducts.push(newProduct);
    return newProduct;
  }

  public async updatePartProduct(
    id: string,
    updates: Partial<PartProduct>,
    actorId?: string,
    actorName?: string,
    priceSource?: string
  ): Promise<PartProduct | null> {
    const idx = this.memProducts.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const current = this.memProducts[idx];
    const now = new Date().toISOString();

    if (
      (updates.priceINR !== undefined && updates.priceINR !== current.priceINR) ||
      (updates.mrpINR !== undefined && updates.mrpINR !== current.mrpINR)
    ) {
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
      this.memPriceHistory.push(priceLog);
      updates.priceVerifiedAt = now;
    }

    const updated = { ...current, ...updates, updatedAt: now };
    this.memProducts[idx] = updated;
    return updated;
  }

  public async deletePartProduct(id: string): Promise<boolean> {
    const idx = this.memProducts.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.memProducts[idx].status = "ARCHIVED";
    this.memProducts[idx].updatedAt = new Date().toISOString();
    return true;
  }

  public async getPartSellers(): Promise<PartSeller[]> {
    return [...this.memSellers];
  }

  public async getPartSellerById(id: string): Promise<PartSeller | null> {
    const s = this.memSellers.find((sel) => sel.id === id);
    return s ? { ...s } : null;
  }

  public async getPartSellerByUserId(userId: string): Promise<PartSeller | null> {
    const s = this.memSellers.find((sel) => sel.userId === userId);
    return s ? { ...s } : null;
  }

  public async createPartSeller(
    sellerData: Omit<PartSeller, "id" | "createdAt" | "updatedAt">
  ): Promise<PartSeller> {
    const id = `seller-sp-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString();
    const newSeller: PartSeller = { ...sellerData, id, createdAt: now, updatedAt: now };
    this.memSellers.push(newSeller);
    return newSeller;
  }

  public async updatePartSeller(id: string, updates: Partial<PartSeller>): Promise<PartSeller | null> {
    const idx = this.memSellers.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const updated = { ...this.memSellers[idx], ...updates, updatedAt: new Date().toISOString() };
    this.memSellers[idx] = updated;
    return updated;
  }

  public async getPartOrders(filters?: {
    sellerId?: string;
    customerPhone?: string;
    status?: PartOrderStatus;
  }): Promise<PartOrder[]> {
    let orders = [...this.memOrders];
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
    const ord = this.memOrders.find((o) => o.id === id);
    return ord ? { ...ord } : null;
  }

  public async getPartOrderByNumber(orderNumber: string): Promise<PartOrder | null> {
    const ord = this.memOrders.find((o) => o.orderNumber.toUpperCase() === orderNumber.toUpperCase());
    return ord ? { ...ord } : null;
  }

  public async createPartOrder(
    orderData: Omit<PartOrder, "id" | "orderNumber" | "createdAt" | "updatedAt" | "history">
  ): Promise<PartOrder> {
    const id = `ord-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString();
    const orderNumber = `WC-ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    for (const item of orderData.items) {
      const prod = this.memProducts.find((p) => p.id === item.productId);
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
      history: [{ status: orderData.orderStatus, timestamp: now, actor: "CUSTOMER", notes: "Order placed online" }],
      createdAt: now,
      updatedAt: now,
    };
    this.memOrders.push(newOrder);
    return newOrder;
  }

  public async updatePartOrderStatus(
    orderId: string,
    status: PartOrderStatus,
    actor: string,
    notes?: string
  ): Promise<PartOrder | null> {
    const idx = this.memOrders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;
    const order = this.memOrders[idx];
    const now = new Date().toISOString();

    if ((status === "CANCELLED" || status === "RETURNED") && order.orderStatus !== "CANCELLED" && order.orderStatus !== "RETURNED") {
      for (const item of order.items) {
        const prod = this.memProducts.find((p) => p.id === item.productId);
        if (prod) {
          prod.stockQuantity += item.quantity;
          if (prod.status === "OUT_OF_STOCK" && prod.stockQuantity > 0) {
            prod.status = "PUBLISHED";
          }
          prod.updatedAt = now;
        }
      }
    }

    order.orderStatus = status;
    order.updatedAt = now;
    order.history.push({ status, timestamp: now, actor, notes: notes || `Status updated to ${status}` });
    return order;
  }

  public async getPartPriceHistory(productId?: string): Promise<PartPriceHistory[]> {
    const list = productId ? this.memPriceHistory.filter((h) => h.productId === productId) : this.memPriceHistory;
    return [...list].sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  }

  public async addPartPriceHistory(entry: Omit<PartPriceHistory, "id" | "changedAt">): Promise<PartPriceHistory> {
    const newEntry: PartPriceHistory = {
      ...entry,
      id: `ph-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      changedAt: new Date().toISOString(),
    };
    this.memPriceHistory.push(newEntry);
    return newEntry;
  }


  public async getPartCart(sessionId: string): Promise<PartCart | null> {
    const cart = this.memCarts.find((c) => c.sessionId === sessionId || c.id === sessionId);
    return cart ? { ...cart } : null;
  }

  public async savePartCart(cart: PartCart): Promise<PartCart> {
    const idx = this.memCarts.findIndex((c) => c.id === cart.id || c.sessionId === cart.sessionId);
    cart.updatedAt = new Date().toISOString();
    if (idx === -1) {
      this.memCarts.push(cart);
    } else {
      this.memCarts[idx] = cart;
    }
    return cart;
  }

  public async getPartEnquiries(filters?: { productId?: string; status?: string }): Promise<PartEnquiry[]> {
    let enquiries = [...this.memEnquiries];
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
    this.memEnquiries.push(newEnquiry);
    return newEnquiry;
  }

  public async updatePartEnquiry(id: string, updates: Partial<PartEnquiry>): Promise<PartEnquiry | null> {
    const idx = this.memEnquiries.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const updated = { ...this.memEnquiries[idx], ...updates, updatedAt: new Date().toISOString() };
    this.memEnquiries[idx] = updated;
    return updated;
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: OUTLETS & FRANCHISE (MYSQL ADAPTER)
  // ============================================================================

  public async getOutlets(filters?: { isActive?: boolean; type?: OutletType }): Promise<Outlet[]> {
    let outlets = this.memOutlets;
    if (filters?.isActive !== undefined) {
      outlets = outlets.filter((o) => o.isActive === filters.isActive);
    }
    if (filters?.type) {
      outlets = outlets.filter((o) => o.type === filters.type);
    }
    return [...outlets];
  }

  public async getOutletById(id: string): Promise<Outlet | null> {
    const outlet = this.memOutlets.find((o) => o.id === id || o.code === id);
    return outlet ? { ...outlet } : null;
  }

  public async createOutlet(data: Omit<Outlet, "id" | "createdAt" | "updatedAt">): Promise<Outlet> {
    const now = new Date().toISOString();
    const newOutlet: Outlet = {
      ...data,
      id: `outlet-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      createdAt: now,
      updatedAt: now,
    };
    this.memOutlets.push(newOutlet);
    return newOutlet;
  }

  public async updateOutlet(id: string, updates: Partial<Outlet>): Promise<Outlet | null> {
    const idx = this.memOutlets.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    const updated: Outlet = {
      ...this.memOutlets[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memOutlets[idx] = updated;
    return updated;
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: SUPPLIERS & QUOTATIONS
  // ============================================================================

  public async getSuppliers(filters?: { status?: SupplierVerificationStatus; category?: SupplierCategory }): Promise<Supplier[]> {
    let suppliers = this.memSuppliers;
    if (filters?.status) {
      suppliers = suppliers.filter((s) => s.approvalStatus === filters.status);
    }
    if (filters?.category) {
      suppliers = suppliers.filter((s) => s.supplierCategories.includes(filters.category!));
    }
    return [...suppliers];
  }

  public async getSupplierById(id: string): Promise<Supplier | null> {
    const supplier = this.memSuppliers.find((s) => s.id === id);
    return supplier ? { ...supplier } : null;
  }

  public async createSupplier(data: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<Supplier> {
    const now = new Date().toISOString();
    const newSupplier: Supplier = {
      ...data,
      id: `supp-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      createdAt: now,
      updatedAt: now,
    };
    this.memSuppliers.push(newSupplier);
    return newSupplier;
  }

  public async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | null> {
    const idx = this.memSuppliers.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const updated: Supplier = {
      ...this.memSuppliers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memSuppliers[idx] = updated;
    return updated;
  }

  public async getSupplierQuotations(filters?: { sku?: string; supplierId?: string }): Promise<SupplierQuotation[]> {
    let quotes = this.memQuotations;
    if (filters?.sku) {
      quotes = quotes.filter((q) => q.sku.toLowerCase() === filters.sku!.toLowerCase() || q.partNumber.toLowerCase() === filters.sku!.toLowerCase());
    }
    if (filters?.supplierId) {
      quotes = quotes.filter((q) => q.supplierId === filters.supplierId);
    }
    return [...quotes].sort((a, b) => a.quotedUnitPriceINR - b.quotedUnitPriceINR);
  }

  public async createSupplierQuotation(data: Omit<SupplierQuotation, "id" | "createdAt" | "updatedAt">): Promise<SupplierQuotation> {
    const now = new Date().toISOString();
    const newQuote: SupplierQuotation = {
      ...data,
      id: `quote-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      createdAt: now,
      updatedAt: now,
    };
    this.memQuotations.push(newQuote);
    return newQuote;
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: PURCHASE ORDERS & GOODS RECEIPT (GRN)
  // ============================================================================

  public async getPurchaseOrders(filters?: { outletId?: string; supplierId?: string; status?: POStatus }): Promise<PurchaseOrder[]> {
    let pos = this.memPurchaseOrders;
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
    const po = this.memPurchaseOrders.find((p) => p.id === id || p.poNumber === id);
    return po ? { ...po } : null;
  }

  public async createPurchaseOrder(data: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt" | "history">): Promise<PurchaseOrder> {
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
    this.memPurchaseOrders.push(newPO);
    return newPO;
  }

  public async updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>, actor = "staff", notes?: string): Promise<PurchaseOrder | null> {
    const idx = this.memPurchaseOrders.findIndex((p) => p.id === id || p.poNumber === id);
    if (idx === -1) return null;
    const current = this.memPurchaseOrders[idx];
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
    this.memPurchaseOrders[idx] = updated;
    return updated;
  }

  public async receiveGoods(grnData: Omit<GoodsReceiptNote, "id" | "createdAt">): Promise<{ grn: GoodsReceiptNote; stockUpdated: boolean }> {
    const existing = this.memGoodsReceipts.find((g) => g.idempotencyKey === grnData.idempotencyKey);
    if (existing) {
      return { grn: existing, stockUpdated: false };
    }

    const po = this.memPurchaseOrders.find((p) => p.id === grnData.poId || p.poNumber === grnData.poNumber);
    const now = new Date().toISOString();
    const grnNumber = `WC-GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const grn: GoodsReceiptNote = {
      ...grnData,
      id: `grn-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      grnNumber,
      createdAt: now,
    };

    for (const item of grnData.items) {
      if (item.quantityReceived <= 0) continue;

      const poItem = po?.items.find((i) => i.productId === item.productId || i.sku === item.sku);
      const unitLandedCost = poItem?.unitLandedCostINR || poItem?.unitQuotedPriceINR || 0;

      let inv = this.memOutletInventory.find(
        (i) => i.outletId === grnData.outletId && (i.productId === item.productId || (item.sku && i.sku === item.sku))
      );

      const oldQty = inv ? inv.quantityOnHand : 0;
      const oldWAC = inv ? inv.weightedAverageCostINR : unitLandedCost;
      const newQty = oldQty + item.quantityReceived;
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
        this.memOutletInventory.push(inv);
      }

      this.memStockMovements.push({
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

      if (poItem) {
        poItem.quantityReceived = (poItem.quantityReceived || 0) + item.quantityReceived;
      }
    }

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

    this.memGoodsReceipts.push(grn);
    return { grn, stockUpdated: true };
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: INVENTORY & STOCK MOVEMENTS
  // ============================================================================

  public async getOutletInventory(
    outletId?: string,
    filters?: { lowStockOnly?: boolean; search?: string; ownerType?: InventoryOwnerType; ownerId?: string }
  ): Promise<OutletInventoryItem[]> {
    let inventory = this.memOutletInventory;
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
    const item = this.memOutletInventory.find((i) => {
      const matchOutlet = i.outletId === outletId;
      const matchProduct = i.productId === productId || i.sku === productId;
      const matchOwnerType = !ownerType || (i.ownerType || "COMPANY_OUTLET") === ownerType;
      const matchOwnerId = !ownerId || i.ownerId === ownerId;
      return matchOutlet && matchProduct && matchOwnerType && matchOwnerId;
    });
    return item ? { ...item } : null;
  }

  public async recordInventoryLedgerEntry(entry: Omit<InventoryLedgerEntry, "id" | "timestamp">): Promise<InventoryLedgerEntry> {
    const now = new Date().toISOString();
    const newEntry: InventoryLedgerEntry = {
      ...entry,
      id: `led-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      timestamp: now,
    };
    this.memInventoryLedger.push(newEntry);
    return newEntry;
  }

  public async getInventoryLedger(filters?: {
    outletId?: string;
    productId?: string;
    sku?: string;
    ownerType?: InventoryOwnerType;
    ownerId?: string;
    transactionType?: InventoryLedgerTransactionType;
  }): Promise<InventoryLedgerEntry[]> {
    let entries = this.memInventoryLedger;
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
    // Check idempotency
    if (params.idempotencyKey) {
      const existing = this.memInventoryLedger.find((l) => l.idempotencyKey === params.idempotencyKey);
      if (existing) {
        const invItem = this.memOutletInventory.find((i) => i.outletId === params.outletId && (i.productId === params.productId || i.sku === params.productId));
        return { success: true, item: invItem ? { ...invItem } : undefined };
      }
    }

    const item = this.memOutletInventory.find((i) => {
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
    this.memInventoryLedger.push(ledgerEntry);

    return { success: true, item: { ...item } };
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
    const item = this.memOutletInventory.find((i) => {
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
    this.memInventoryLedger.push(ledgerEntry);

    return { success: true, item: { ...item } };
  }

  public async recordStockMovement(movement: Omit<StockMovement, "id" | "timestamp">): Promise<StockMovement> {
    const now = new Date().toISOString();
    const newMovement: StockMovement = {
      ...movement,
      id: `sm-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      timestamp: now,
    };
    this.memStockMovements.push(newMovement);
    return newMovement;
  }

  public async getStockMovements(filters?: { outletId?: string; productId?: string; type?: StockMovementType }): Promise<StockMovement[]> {
    let movements = this.memStockMovements;
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
    return [...this.memTransfers].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async createInterOutletTransfer(transfer: Omit<InterOutletTransfer, "id" | "createdAt">): Promise<InterOutletTransfer> {
    const now = new Date().toISOString();
    const transferNumber = `WC-TRF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTransfer: InterOutletTransfer = {
      ...transfer,
      id: `trf-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      transferNumber,
      createdAt: now,
    };
    this.memTransfers.push(newTransfer);
    return newTransfer;
  }

  public async updateInterOutletTransfer(id: string, updates: Partial<InterOutletTransfer>): Promise<InterOutletTransfer | null> {
    const idx = this.memTransfers.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const current = this.memTransfers[idx];
    const updated: InterOutletTransfer = {
      ...current,
      ...updates,
    };

    if (updates.status === "DISPATCHED" && current.status !== "DISPATCHED") {
      for (const item of current.items) {
        const inv = this.memOutletInventory.find((i) => i.outletId === current.sourceOutletId && i.productId === item.productId);
        if (inv) {
          const oldQty = inv.quantityOnHand;
          inv.quantityOnHand = Math.max(0, inv.quantityOnHand - item.quantity);
          inv.quantityAvailable = Math.max(0, inv.quantityAvailable - item.quantity);
          this.memStockMovements.push({
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

    if (updates.status === "RECEIVED" && current.status !== "RECEIVED") {
      for (const item of current.items) {
        const inv = this.memOutletInventory.find((i) => i.outletId === current.targetOutletId && i.productId === item.productId);
        if (inv) {
          const oldQty = inv.quantityOnHand;
          inv.quantityOnHand += item.quantity;
          inv.quantityAvailable += item.quantity;
          this.memStockMovements.push({
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

    this.memTransfers[idx] = updated;
    return updated;
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: GARAGE & WORKSHOP MANAGEMENT
  // ============================================================================

  public async getGarageServices(vehicleType?: "CAR" | "TWO_WHEELER"): Promise<GarageServiceItem[]> {
    let services = this.memGarageServices;
    if (vehicleType) {
      services = services.filter((s) => s.vehicleType === vehicleType);
    }
    return [...services];
  }

  public async getGarageJobCards(filters?: { outletId?: string; status?: GarageJobStatus; vehicleType?: string }): Promise<GarageJobCard[]> {
    let cards = this.memGarageJobCards;
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
    const card = this.memGarageJobCards.find((c) => c.id === id || c.jobCardNumber === id);
    return card ? { ...card } : null;
  }

  public async createGarageJobCard(jobCard: Omit<GarageJobCard, "id" | "createdAt" | "updatedAt">): Promise<GarageJobCard> {
    const now = new Date().toISOString();
    const jobCardNumber = `WC-JC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

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

    this.memGarageJobCards.push(newCard);
    return newCard;
  }

  public async updateGarageJobCard(id: string, updates: Partial<GarageJobCard>): Promise<GarageJobCard | null> {
    const idx = this.memGarageJobCards.findIndex((c) => c.id === id || c.jobCardNumber === id);
    if (idx === -1) return null;
    const current = this.memGarageJobCards[idx];
    const now = new Date().toISOString();

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

    if ((updates.status === "COMPLETED" || updates.status === "DELIVERED") && current.status !== "COMPLETED" && current.status !== "DELIVERED") {
      for (const part of parts) {
        const targetPartId = (part as any).partId || (part as any).productId;
        const inv = this.memOutletInventory.find((i) =>
          i.outletId === current.outletId &&
          ((targetPartId && i.productId === targetPartId) || (part.sku && i.sku === part.sku))
        );
        if (inv) {
          const oldQty = inv.quantityOnHand;
          inv.quantityOnHand = Math.max(0, inv.quantityOnHand - part.quantity);
          inv.quantityAvailable = Math.max(0, inv.quantityAvailable - part.quantity);
          inv.updatedAt = now;
          this.memStockMovements.push({
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

    this.memGarageJobCards[idx] = updated;
    return updated;
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: USED-CAR ECONOMICS & PROFITABILITY
  // ============================================================================

  public async getUsedCarEconomics(status?: string): Promise<UsedCarEconomics[]> {
    let records = this.memUsedCarEconomics;
    if (status) {
      records = records.filter((r) => r.status === status);
    }
    return [...records];
  }

  public async updateUsedCarEconomics(carId: string, updates: Partial<UsedCarEconomics>): Promise<UsedCarEconomics | null> {
    const idx = this.memUsedCarEconomics.findIndex((r) => r.carId === carId || r.listingCode === carId);
    if (idx === -1) {
      const record = updates as UsedCarEconomics;
      this.memUsedCarEconomics.push(record);
      return record;
    }

    const current = this.memUsedCarEconomics[idx];
    const merged = { ...current, ...updates };

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

    this.memUsedCarEconomics[idx] = updated;
    return updated;
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: OPERATING EXPENSES & BUDGETS
  // ============================================================================

  public async getOperatingExpenses(outletId?: string, month?: string): Promise<OperatingExpense[]> {
    let expenses = this.memOperatingExpenses;
    if (outletId) {
      expenses = expenses.filter((e) => e.outletId === outletId);
    }
    if (month) {
      expenses = expenses.filter((e) => e.date.startsWith(month));
    }
    return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public async recordOperatingExpense(expense: Omit<OperatingExpense, "id" | "createdAt">): Promise<OperatingExpense> {
    const now = new Date().toISOString();
    const newExpense: OperatingExpense = {
      ...expense,
      id: `opex-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      createdAt: now,
    };
    this.memOperatingExpenses.push(newExpense);
    return newExpense;
  }

  public async getMonthlyBudget(month: string, outletId?: string): Promise<MonthlyBudget | null> {
    const budget = this.memMonthlyBudgets.find((b) => b.month === month && (!outletId || b.outletId === outletId));
    return budget ? { ...budget } : null;
  }

  // ============================================================================
  // AUTOMOTIVE OPERATIONS: COMPREHENSIVE OVERVIEW STATS & AUDIT LOGS
  // ============================================================================

  public async getOperationsOverviewStats(outletId?: string, dateRange?: { start?: string; end?: string }): Promise<OperationsOverviewStats> {
    const outlets = this.memOutlets;
    let inventory = this.memOutletInventory;
    let jobCards = this.memGarageJobCards;
    const usedCars = this.memUsedCarEconomics;
    let expenses = this.memOperatingExpenses;
    const orders = this.memOrders;

    if (outletId) {
      inventory = inventory.filter((i) => i.outletId === outletId);
      jobCards = jobCards.filter((j) => j.outletId === outletId);
      expenses = expenses.filter((e) => e.outletId === outletId);
    }

    const garageRevenue = jobCards.reduce((s, j) => s + (j.labourRevenueINR || 0) + (j.partsRevenueINR || 0), 0);
    const garagePartsCOGS = jobCards.reduce((s, j) => s + (j.directPartsCostINR || 0), 0);
    const garageLabourCOGS = jobCards.reduce((s, j) => s + (j.directLabourCostINR || 0), 0);

    const usedCarsRevenue = usedCars.reduce((s, u) => s + (u.recognizedRevenueINR || 0), 0);
    const usedCarsCOGS = usedCars.reduce((s, u) => s + (u.totalDirectCostsINR || 0), 0);

    const partsRetailRevenue = orders.reduce((s, o) => s + (o.totalAmount || o.totalINR || 0), 0);
    const partsRetailCOGS = Math.round(partsRetailRevenue * 0.7);

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

    const totalInventoryValue = inventory.reduce((s, i) => s + (i.quantityOnHand || 0) * (i.weightedAverageCostINR || 0), 0);
    const lowStockAlerts = inventory.filter((i) => i.quantityOnHand <= i.reorderPoint);
    const provisionalCount = inventory.filter((i) => i.isCostProvisional).length + jobCards.filter((j) => j.isProvisionalCost).length;

    const supplierOutstanding = this.memPurchaseOrders
      .filter((p) => p.paymentStatus !== "PAID" && (!outletId || p.outletId === outletId))
      .reduce((s, p) => s + (p.totalAmountINR || 0), 0);

    const completedJobs = jobCards.filter((j) => j.status === "COMPLETED" || j.status === "DELIVERED").length;
    const avgInvoice = completedJobs > 0 ? Math.round(garageRevenue / jobCards.length) : 0;

    const usedCarProfit = usedCars.reduce((s, u) => s + (u.transactionContributionINR || 0), 0);

    const currentMonth = "2026-10";
    const budget = this.memMonthlyBudgets.find((b) => b.month === currentMonth);
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
    const newLog: OperationsAuditLog = {
      ...log,
      id: `op-audit-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      timestamp: new Date().toISOString(),
    };
    this.memAuditLogs.push(newLog);
    return newLog;
  }

  public async getOperationsAuditLogs(module?: string, outletId?: string): Promise<OperationsAuditLog[]> {
    let logs = this.memAuditLogs;
    if (module) {
      logs = logs.filter((l) => l.module === module);
    }
    if (outletId) {
      logs = logs.filter((l) => l.outletId === outletId);
    }
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // --- Customer Platform & Connected Ecosystem Methods (MySQL) ---

  public async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const found = this.memCustomers.find((c) => c.phone.replace(/\D/g, "").slice(-10) === cleanPhone);
    return found ? { ...found } : null;
  }

  public async getCustomerById(id: string): Promise<Customer | null> {
    const found = this.memCustomers.find((c) => c.id === id);
    return found ? { ...found } : null;
  }

  public async createCustomer(data: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer> {
    const now = new Date().toISOString();
    const customer: Customer = {
      ...data,
      id: `cust_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      createdAt: now,
      updatedAt: now,
    };
    this.memCustomers.push(customer);
    return { ...customer };
  }

  public async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const idx = this.memCustomers.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.memCustomers[idx] = {
      ...this.memCustomers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.memCustomers[idx] };
  }

  public async saveCustomerOTP(otp: CustomerOTP): Promise<void> {
    this.memCustomerOTPs.push({ ...otp });
  }

  public async getLatestCustomerOTP(phone: string): Promise<CustomerOTP | null> {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const otps = this.memCustomerOTPs
      .filter((o) => o.phone.replace(/\D/g, "").slice(-10) === cleanPhone)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return otps[0] ? { ...otps[0] } : null;
  }

  public async markCustomerOTPUsed(id: string): Promise<void> {
    const otp = this.memCustomerOTPs.find((o) => o.id === id);
    if (otp) {
      otp.isUsed = true;
    }
  }

  public async getCustomerVehicles(customerId: string): Promise<CustomerVehicle[]> {
    const vehicles = this.memCustomerVehicles.filter((v) => v.customerId === customerId);
    return vehicles.map((v) => ({ ...v }));
  }

  public async getCustomerVehicleById(id: string): Promise<CustomerVehicle | null> {
    const v = this.memCustomerVehicles.find((item) => item.id === id);
    return v ? { ...v } : null;
  }

  public async createCustomerVehicle(data: Omit<CustomerVehicle, "id" | "createdAt" | "updatedAt">): Promise<CustomerVehicle> {
    const now = new Date().toISOString();
    const vehicle: CustomerVehicle = {
      ...data,
      id: `veh_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      createdAt: now,
      updatedAt: now,
    };
    this.memCustomerVehicles.push(vehicle);
    return { ...vehicle };
  }

  public async updateCustomerVehicle(id: string, updates: Partial<CustomerVehicle>): Promise<CustomerVehicle | null> {
    const idx = this.memCustomerVehicles.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    this.memCustomerVehicles[idx] = {
      ...this.memCustomerVehicles[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.memCustomerVehicles[idx] };
  }

  public async deleteCustomerVehicle(id: string, customerId: string): Promise<boolean> {
    const initialLen = this.memCustomerVehicles.length;
    this.memCustomerVehicles = this.memCustomerVehicles.filter((v) => !(v.id === id && v.customerId === customerId));
    return this.memCustomerVehicles.length < initialLen;
  }

  public async getCustomerTickets(customerId: string): Promise<CustomerSupportTicket[]> {
    const tickets = this.memCustomerTickets.filter((t) => t.customerId === customerId);
    return [...tickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public async getCustomerTicketById(id: string): Promise<CustomerSupportTicket | null> {
    const t = this.memCustomerTickets.find((item) => item.id === id);
    return t ? { ...t } : null;
  }

  public async createCustomerTicket(data: Omit<CustomerSupportTicket, "id" | "createdAt" | "updatedAt">): Promise<CustomerSupportTicket> {
    const now = new Date().toISOString();
    const ticket: CustomerSupportTicket = {
      ...data,
      id: `tkt_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      createdAt: now,
      updatedAt: now,
    };
    this.memCustomerTickets.push(ticket);
    return { ...ticket };
  }

  public async addTicketMessage(ticketId: string, message: CustomerSupportTicket["messages"][0]): Promise<CustomerSupportTicket | null> {
    const ticket = this.memCustomerTickets.find((t) => t.id === ticketId);
    if (!ticket) return null;
    ticket.messages.push(message);
    ticket.updatedAt = new Date().toISOString();
    return { ...ticket };
  }

  public async getCustomerSavedItems(customerId: string): Promise<CustomerSavedItem[]> {
    const items = this.memCustomerSavedItems.filter((s) => s.customerId === customerId);
    return items.map((i) => ({ ...i }));
  }

  public async toggleCustomerSavedItem(customerId: string, itemType: "CAR" | "SPARE_PART", itemId: string): Promise<boolean> {
    const existingIdx = this.memCustomerSavedItems.findIndex(
      (s) => s.customerId === customerId && s.itemType === itemType && s.itemId === itemId
    );
    if (existingIdx >= 0) {
      this.memCustomerSavedItems.splice(existingIdx, 1);
      return false;
    } else {
      this.memCustomerSavedItems.push({
        id: `saved_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
        customerId,
        itemType,
        itemId,
        savedAt: new Date().toISOString(),
      });
      return true;
    }
  }

  public async createOrderReturnRequest(request: Omit<OrderReturnRequest, "id" | "requestedAt" | "updatedAt">): Promise<OrderReturnRequest> {
    const now = new Date().toISOString();
    const returnReq: OrderReturnRequest = {
      ...request,
      id: `ret_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      requestedAt: now,
      updatedAt: now,
    };
    this.memOrderReturns.push(returnReq);
    return { ...returnReq };
  }

  public async getOrderReturnRequests(customerId?: string): Promise<OrderReturnRequest[]> {
    let returns = this.memOrderReturns;
    if (customerId) {
      returns = returns.filter((r) => r.customerId === customerId);
    }
    return [...returns].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  public async recordPaymentTransaction(tx: Omit<PaymentTransaction, "id" | "createdAt" | "updatedAt">): Promise<PaymentTransaction> {
    const now = new Date().toISOString();
    const newTx: PaymentTransaction = {
      ...tx,
      id: `tx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      createdAt: now,
      updatedAt: now,
    };
    this.memPaymentTransactions.push(newTx);
    return { ...newTx };
  }

  public async getPaymentTransactionByIdempotency(key: string): Promise<PaymentTransaction | null> {
    const tx = this.memPaymentTransactions.find((t) => t.idempotencyKey === key);
    return tx ? { ...tx } : null;
  }

  public async updatePaymentTransaction(id: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction | null> {
    const idx = this.memPaymentTransactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.memPaymentTransactions[idx] = {
      ...this.memPaymentTransactions[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.memPaymentTransactions[idx] };
  }
}
