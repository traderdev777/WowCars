"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Wrench,
  Package,
  PlusCircle,
  Truck,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle,
  Edit,
  Save,
  X,
  FileText,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/common/PageHero";
import TrustIndicators from "@/components/common/TrustIndicators";
import DashboardStatCard from "@/components/common/DashboardStatCard";
import CTASection from "@/components/common/CTASection";
import { PartProduct, PartSeller, PartCategory } from "@/lib/db/types";
import styles from "./Seller.module.css";

interface SellerDashboardClientProps {
  initialSeller?: PartSeller | null;
  categories: PartCategory[];
}

export default function SellerDashboardClient({
  initialSeller,
  categories,
}: SellerDashboardClientProps) {
  // Authentication / Demo simulation state
  const [currentSeller, setCurrentSeller] = useState<PartSeller | null>(initialSeller || null);
  const [activeTab, setActiveTab] = useState<"PRODUCTS" | "ADD_PRODUCT" | "ORDERS" | "PROFILE">("PRODUCTS");

  // Onboarding Apply Form State
  const [businessName, setBusinessName] = useState("");
  const [sellerType, setSellerType] = useState<"MANUFACTURER" | "DISTRIBUTOR" | "DEALER">("DISTRIBUTOR");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [state, setState] = useState("Karnataka");
  const [pinCode, setPinCode] = useState("560064");
  const [brandsCarried, setBrandsCarried] = useState("Bosch, Valeo, Brembo");

  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);
  const [onboardingSuccess, setOnboardingSuccess] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  // Products State
  const [products, setProducts] = useState<PartProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [dispatchModalOrder, setDispatchModalOrder] = useState<any | null>(null);
  const [shippingCourier, setShippingCourier] = useState("BlueDart Surface");
  const [trackingNumber, setTrackingNumber] = useState("");

  // New Product Form State
  const [prodTitle, setProdTitle] = useState("");
  const [prodCategory, setProdCategory] = useState(categories[0]?.slug || "engine-and-maintenance");
  const [prodBrand, setProdBrand] = useState("Bosch");
  const [prodPartNo, setProdPartNo] = useState("");
  const [prodOemNo, setProdOemNo] = useState("");
  const [prodPrice, setProdPrice] = useState(1200);
  const [prodMrp, setProdMrp] = useState(1500);
  const [prodStock, setProdStock] = useState(25);
  const [prodCondition, setProdCondition] = useState("NEW");
  const [prodPartType, setProdPartType] = useState("OES");
  const [prodDesc, setProdDesc] = useState("");
  const [prodMake, setProdMake] = useState("Maruti Suzuki");
  const [prodModel, setProdModel] = useState("Swift");
  const [prodCreating, setProdCreating] = useState(false);
  const [prodSuccess, setProdSuccess] = useState<string | null>(null);
  const [prodError, setProdError] = useState<string | null>(null);

  // Switch demo seller session for verification & evaluation
  const demoSellers = [
    { id: "seller-1", name: "Apex Automotive (Approved - Tier 1)" },
    { id: "seller-2", name: "Brembo Bremtech (Approved - Brakes)" },
    { id: "seller-3", name: "Karnataka Auto Spares (Under Verification)" },
    { id: "seller-4", name: "Precision Garage Tools (Approved - Tools)" },
  ];

  const handleSelectDemoSeller = async (sellerId: string) => {
    try {
      // In a real setup or dev simulation, we set session or fetch profile
      const res = await fetch(`/api/seller/profile?demoSellerId=${sellerId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentSeller(data.seller);
      }
    } catch (e) {
      console.warn("Could not switch demo seller", e);
    }
  };

  // Load products when seller is active
  useEffect(() => {
    if (!currentSeller) return;

    async function loadSellerData() {
      setLoadingProducts(true);
      try {
        const res = await fetch(`/api/seller/products?sellerId=${currentSeller?.id}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to load seller products", err);
      } finally {
        setLoadingProducts(false);
      }

      setLoadingOrders(true);
      try {
        const res = await fetch(`/api/seller/orders?sellerId=${currentSeller?.id}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error("Failed to load seller orders", err);
      } finally {
        setLoadingOrders(false);
      }
    }

    loadSellerData();
  }, [currentSeller]);

  // Handle Apply Submission
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingSubmitting(true);
    setOnboardingError(null);
    setOnboardingSuccess(null);

    try {
      const res = await fetch("/api/seller/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          sellerType,
          gstin,
          pan,
          contactName,
          contactEmail,
          contactPhone,
          address: {
            line1: "Wholesale Auto Hub, Industrial Area",
            city,
            state,
            pinCode,
          },
          brandsCarried: brandsCarried.split(",").map((s) => s.trim()),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit seller application");
      }

      setCurrentSeller(data.seller);
      setOnboardingSuccess(
        "Application submitted! Status: APPLICATION_PENDING. Our vendor verification officer will inspect GSTIN & business credentials."
      );
    } catch (err: any) {
      setOnboardingError(err.message || "Failed to submit application.");
    } finally {
      setOnboardingSubmitting(false);
    }
  };

  // Quick Price / Stock Save
  const handleSavePriceStock = async (prodId: string) => {
    try {
      const res = await fetch(`/api/seller/products/${prodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: editPrice,
          stockQuantity: editStock,
        }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === prodId ? { ...p, price: editPrice, stockQuantity: editStock } : p
          )
        );
        setEditingPriceId(null);
      }
    } catch (e) {
      console.warn("Failed to update price/stock", e);
    }
  };

  // Create Product Submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSeller) return;
    setProdCreating(true);
    setProdError(null);
    setProdSuccess(null);

    try {
      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: prodTitle,
          categorySlug: prodCategory,
          brand: prodBrand,
          partNumber: prodPartNo,
          oemPartNumber: prodOemNo,
          price: prodPrice,
          mrp: prodMrp,
          stockQuantity: prodStock,
          condition: prodCondition,
          partType: prodPartType,
          description: prodDesc,
          compatibleVehicles: [
            {
              make: prodMake,
              model: prodModel,
              startYear: 2018,
              endYear: 2025,
            },
          ],
          images: [`/parts/categories/${prodCategory}.svg`],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create product");
      }

      setProducts((prev) => [data.product, ...prev]);
      setProdSuccess(`Product "${data.product.title}" created successfully and submitted for moderation!`);
      setProdTitle("");
      setProdDesc("");
    } catch (err: any) {
      setProdError(err.message || "Failed to create product.");
    } finally {
      setProdCreating(false);
    }
  };

  // Dispatch Order Submit
  const handleDispatchOrder = async () => {
    if (!dispatchModalOrder) return;
    try {
      const res = await fetch(`/api/seller/orders/${dispatchModalOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DISPATCHED",
          shippingCourier,
          trackingNumber,
          notes: `Courier: ${shippingCourier}, Waybill: ${trackingNumber}`,
        }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === dispatchModalOrder.id
              ? { ...o, orderStatus: "DISPATCHED", shippingCourier, trackingNumber }
              : o
          )
        );
        setDispatchModalOrder(null);
      }
    } catch (e) {
      console.warn("Failed to dispatch order", e);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <Navbar />

      <PageHero
        badge="B2B & Supplier Network"
        title={currentSeller ? currentSeller.businessName : "Automotive Supplier Onboarding"}
        subtitle="List verified automotive components, maintain real-time warehouse inventory, dispatch customer orders, and scale your business with PAN-India buyers."
        stats={[
          { label: "Active SKUs", value: `${products.length || 24}` },
          { label: "Fulfillment SLA", value: "99.4%" },
          { label: "Payout Cycle", value: "T+2 Days" },
          { label: "Verification Tier", value: currentSeller ? currentSeller.status : "Open" },
        ]}
        staffImage="/images/staff-franchise-b2b.jpg"
        staffName="Arjun Sharma"
        staffRole="Head of B2B & Supplier Network"
        staffContext="Vendor Verification & Automotive Supply Specialist"
      />

      <TrustIndicators />

      <main className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.sellerBadge}>
              <Wrench size={14} />
              <span>Seller & Supplier Portal</span>
            </div>
            <h1 className={styles.title}>
              {currentSeller ? currentSeller.businessName : "Automotive Supplier Onboarding"}
            </h1>
            <p className={styles.subtitle}>
              List verified automotive components, maintain live inventory, dispatch customer orders, and track fulfillment across India.
            </p>
          </div>

          {/* Quick Demo Switcher */}
          <div className={styles.demoSwitcher}>
            <span className={styles.demoLabel}>Demo Accounts:</span>
            <select
              className={styles.demoSelect}
              value={currentSeller?.id || ""}
              onChange={(e) => handleSelectDemoSeller(e.target.value)}
            >
              <option value="">Apply as New Seller</option>
              {demoSellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* If Not Logged In as Seller: Show Onboarding Application Form */}
        {!currentSeller ? (
          <div className={styles.onboardingSection}>
            <div className={styles.onboardingIntro}>
              <h2>Apply to Become a Verified Spare Parts Seller</h2>
              <p>
                WowCars operates a managed automotive parts marketplace. All suppliers undergo business verification (GSTIN, trade license, manufacturer authorized distributor agreements) to guarantee genuine parts for buyers.
              </p>
            </div>

            {onboardingSuccess && (
              <div className={styles.successBox}>
                <CheckCircle size={18} />
                <span>{onboardingSuccess}</span>
              </div>
            )}
            {onboardingError && (
              <div className={styles.errorBox}>
                <AlertCircle size={18} />
                <span>{onboardingError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className={styles.applyForm}>
              <div className={styles.formGrid}>
                <div className={styles.fieldFull}>
                  <label className={styles.label}>Business / Legal Registered Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Automotive Components India Pvt Ltd"
                    className={styles.input}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Business Entity Type *</label>
                  <select
                    className={styles.select}
                    value={sellerType}
                    onChange={(e: any) => setSellerType(e.target.value)}
                  >
                    <option value="DISTRIBUTOR">Authorized Distributor / Stockist</option>
                    <option value="MANUFACTURER">Component Manufacturer / OEM</option>
                    <option value="DEALER">Franchised Dealership Spares</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>GSTIN (15 Digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    className={styles.input}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Business PAN *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. AAAAA0000A"
                    className={styles.input}
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Gowda"
                    className={styles.input}
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Contact Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    className={styles.input}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="parts@apexauto.in"
                    className={styles.input}
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Warehouse City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengaluru"
                    className={styles.input}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Warehouse State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karnataka"
                    className={styles.input}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>

                <div className={styles.fieldFull}>
                  <label className={styles.label}>Authorized Brands Carried (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Bosch, Brembo, Valeo, Sachs, Mann-Filter"
                    className={styles.input}
                    value={brandsCarried}
                    onChange={(e) => setBrandsCarried(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" disabled={onboardingSubmitting} className={styles.submitAppBtn}>
                {onboardingSubmitting ? "Submitting Application..." : "Submit Seller Onboarding Application"}
              </button>
            </form>
          </div>
        ) : (
          /* Active Seller Dashboard */
          <div className={styles.dashboard}>
            {/* Status Notification Banner */}
            <div className={styles.statusBanner}>
              <div className={styles.bannerInfo}>
                <span className={styles.bannerLabel}>Account Status:</span>
                <span className={`${styles.statusPill} ${styles[`status_${currentSeller.status}`]}`}>
                  {currentSeller.status.replace(/_/g, " ")}
                </span>
                <span className={styles.permissionBadge}>
                  {currentSeller.listingEnabled ? (
                    <span className={styles.permActive}>
                      <CheckCircle size={12} /> Catalog Listing Enabled
                    </span>
                  ) : (
                    <span className={styles.permPending}>
                      <Clock size={12} /> Catalog Listing Awaiting Operations Verification
                    </span>
                  )}
                </span>
              </div>
              <span className={styles.gstInfo}>GSTIN: {currentSeller.gstin}</span>
            </div>

            {/* Live Operations Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <DashboardStatCard
                title="Active Catalog Items"
                value={products.length}
                subtitle="Live in WowCars Spares"
                variant="highlight"
                icon={<Package size={18} />}
              />
              <DashboardStatCard
                title="Pending Orders"
                value={orders.filter((o) => o.status === "PAID").length}
                subtitle="Ready for dispatch"
                variant={orders.filter((o) => o.status === "PAID").length > 0 ? "danger" : "default"}
                icon={<Truck size={18} />}
              />
              <DashboardStatCard
                title="Dispatched / Delivered"
                value={orders.filter((o) => o.status === "SHIPPED" || o.status === "DELIVERED").length}
                subtitle="Within SLA target"
                variant="success"
                icon={<CheckCircle size={18} />}
              />
              <DashboardStatCard
                title="Vendor Compliance"
                value={currentSeller.status}
                subtitle={currentSeller.listingEnabled ? "Direct Cart Checkout Active" : "Pending Operations Review"}
                variant="default"
                icon={<ShieldCheck size={18} />}
              />
            </div>

            {/* Navigation Tabs */}
            <div className={styles.navTabs}>
              <button
                onClick={() => setActiveTab("PRODUCTS")}
                className={`${styles.navTab} ${activeTab === "PRODUCTS" ? styles.activeNavTab : ""}`}
              >
                <Package size={16} /> My Products & Inventory ({products.length})
              </button>
              <button
                onClick={() => setActiveTab("ADD_PRODUCT")}
                className={`${styles.navTab} ${activeTab === "ADD_PRODUCT" ? styles.activeNavTab : ""}`}
                disabled={!currentSeller.listingEnabled}
              >
                <PlusCircle size={16} /> Add Product
              </button>
              <button
                onClick={() => setActiveTab("ORDERS")}
                className={`${styles.navTab} ${activeTab === "ORDERS" ? styles.activeNavTab : ""}`}
              >
                <Truck size={16} /> Assigned Orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab("PROFILE")}
                className={`${styles.navTab} ${activeTab === "PROFILE" ? styles.activeNavTab : ""}`}
              >
                <FileText size={16} /> Compliance & Profile
              </button>
            </div>

            {/* TAB 1: Products and Live Inventory */}
            {activeTab === "PRODUCTS" && (
              <div className={styles.tabContent}>
                <div className={styles.tabHeader}>
                  <h3>Assigned Catalogue & Stock Management</h3>
                  <button onClick={() => setActiveTab("ADD_PRODUCT")} className={styles.actionBtn}>
                    <PlusCircle size={14} /> Add New Part
                  </button>
                </div>

                {loadingProducts ? (
                  <div className={styles.loadingBox}>Loading catalog...</div>
                ) : products.length > 0 ? (
                  <div className={styles.productsTableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Brand & Part No</th>
                          <th>Status</th>
                          <th>Price (INR)</th>
                          <th>Stock Qty</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => {
                          const isEditing = editingPriceId === p.id;
                          return (
                            <tr key={p.id}>
                              <td>
                                <div className={styles.prodRowItem}>
                                  <Image
                                    src={p.images?.[0] || "/parts/image-unavailable.svg"}
                                    alt={p.title}
                                    width={48}
                                    height={36}
                                    className={styles.prodThumb}
                                  />
                                  <div>
                                    <strong className={styles.tableTitle}>{p.title}</strong>
                                    <span className={styles.tableCat}>{p.categorySlug}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className={styles.brandMeta}>
                                  <span>{p.brand}</span>
                                  <span className={styles.tablePn}>{p.partNumber || "N/A"}</span>
                                </div>
                              </td>
                              <td>
                                <span className={`${styles.prodStatus} ${styles[`prod_${p.status}`]}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    className={styles.miniInput}
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(Number(e.target.value))}
                                  />
                                ) : (
                                  <strong>₹{(p.price ?? p.priceINR ?? 0).toLocaleString("en-IN")}</strong>
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    className={styles.miniInput}
                                    value={editStock}
                                    onChange={(e) => setEditStock(Number(e.target.value))}
                                  />
                                ) : (
                                  <span className={p.stockQuantity === 0 ? styles.zeroStock : ""}>
                                    {p.stockQuantity} units
                                  </span>
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <div className={styles.rowActions}>
                                    <button
                                      onClick={() => handleSavePriceStock(p.id)}
                                      className={styles.saveBtn}
                                      title="Save Changes"
                                    >
                                      <Save size={14} /> Save
                                    </button>
                                    <button
                                      onClick={() => setEditingPriceId(null)}
                                      className={styles.cancelBtn}
                                      title="Cancel"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingPriceId(p.id);
                                      setEditPrice(p.price ?? p.priceINR ?? 0);
                                      setEditStock(p.stockQuantity);
                                    }}
                                    className={styles.editBtn}
                                  >
                                    <Edit size={12} /> Edit Price/Stock
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles.emptyCard}>
                    <p>No products currently listed under your seller profile.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Add New Product */}
            {activeTab === "ADD_PRODUCT" && (
              <div className={styles.tabContent}>
                <div className={styles.tabHeader}>
                  <h3>Create & Submit New Spare Part for Moderation</h3>
                </div>

                {prodSuccess && (
                  <div className={styles.successBox}>
                    <CheckCircle size={16} />
                    <span>{prodSuccess}</span>
                  </div>
                )}
                {prodError && (
                  <div className={styles.errorBox}>
                    <AlertCircle size={16} />
                    <span>{prodError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateProduct} className={styles.productForm}>
                  <div className={styles.formGrid}>
                    <div className={styles.fieldFull}>
                      <label className={styles.label}>Product Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bosch Front Brake Pads Set for Swift (2018-2024)"
                        className={styles.input}
                        value={prodTitle}
                        onChange={(e) => setProdTitle(e.target.value)}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Category *</label>
                      <select
                        className={styles.select}
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value)}
                      >
                        {categories.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Brand *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bosch, Denso, Brembo"
                        className={styles.input}
                        value={prodBrand}
                        onChange={(e) => setProdBrand(e.target.value)}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Part Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 0986AB1234"
                        className={styles.input}
                        value={prodPartNo}
                        onChange={(e) => setProdPartNo(e.target.value)}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>OEM Reference Part Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 55810-M68P00"
                        className={styles.input}
                        value={prodOemNo}
                        onChange={(e) => setProdOemNo(e.target.value)}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Selling Price (INR) *</label>
                      <input
                        type="number"
                        required
                        className={styles.input}
                        value={prodPrice}
                        onChange={(e) => setProdPrice(Number(e.target.value))}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>MRP (INR)</label>
                      <input
                        type="number"
                        className={styles.input}
                        value={prodMrp}
                        onChange={(e) => setProdMrp(Number(e.target.value))}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Stock Quantity *</label>
                      <input
                        type="number"
                        required
                        className={styles.input}
                        value={prodStock}
                        onChange={(e) => setProdStock(Number(e.target.value))}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Part Type *</label>
                      <select
                        className={styles.select}
                        value={prodPartType}
                        onChange={(e) => setProdPartType(e.target.value)}
                      >
                        <option value="GENUINE_OEM">Genuine OEM</option>
                        <option value="OES">OES Quality</option>
                        <option value="AFTERMARKET">Aftermarket</option>
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Condition *</label>
                      <select
                        className={styles.select}
                        value={prodCondition}
                        onChange={(e) => setProdCondition(e.target.value)}
                      >
                        <option value="NEW">Brand New</option>
                        <option value="REFURBISHED">Refurbished</option>
                        <option value="USED">Tested Pre-Owned</option>
                      </select>
                    </div>

                    <div className={styles.fieldFull}>
                      <label className={styles.label}>Product Description & Fitment Notes</label>
                      <textarea
                        rows={3}
                        className={styles.textarea}
                        placeholder="Detailed technical specifications, material, friction code..."
                        value={prodDesc}
                        onChange={(e) => setProdDesc(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={prodCreating} className={styles.submitProductBtn}>
                    {prodCreating ? "Submitting..." : "Submit Product for Operations Moderation"}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: Seller Orders & Dispatch */}
            {activeTab === "ORDERS" && (
              <div className={styles.tabContent}>
                <div className={styles.tabHeader}>
                  <h3>Orders Awaiting Fulfillment</h3>
                </div>

                {loadingOrders ? (
                  <div className={styles.loadingBox}>Loading orders...</div>
                ) : orders.length > 0 ? (
                  <div className={styles.ordersList}>
                    {orders.map((o) => (
                      <div key={o.id} className={styles.sellerOrderCard}>
                        <div className={styles.sellerOrderHeader}>
                          <div>
                            <strong>Order #{o.orderNumber}</strong>
                            <span className={styles.orderDate}>
                              Placed: {new Date(o.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                          <div className={styles.orderStatusBlock}>
                            <span className={`${styles.statusPill} ${styles[`status_${o.orderStatus}`]}`}>
                              {o.orderStatus}
                            </span>
                            <span className={styles.sellerOrderTotal}>
                              Your items: ₹{o.sellerTotal?.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        <div className={styles.sellerOrderItems}>
                          {o.items?.map((item: any, idx: number) => (
                            <div key={idx} className={styles.sellerItemRow}>
                              <span>{item.title}</span>
                              <span className={styles.sellerItemMeta}>
                                PN: {item.partNumber || "N/A"} | Qty: {item.quantity} | ₹{item.subtotal}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className={styles.sellerOrderFooter}>
                          <span>Destination: {o.shippingAddress?.city}, {o.shippingAddress?.state} ({o.shippingAddress?.pinCode})</span>
                          {o.orderStatus !== "DISPATCHED" && o.orderStatus !== "DELIVERED" && (
                            <button
                              onClick={() => setDispatchModalOrder(o)}
                              className={styles.dispatchBtn}
                            >
                              <Truck size={14} /> Update Dispatch Info
                            </button>
                          )}
                          {o.orderStatus === "DISPATCHED" && (
                            <span className={styles.dispatchedNotice}>
                              <CheckCircle size={14} /> Dispatched via {o.shippingCourier} ({o.trackingNumber})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyCard}>
                    <p>No customer orders currently assigned to your seller profile.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Profile and Compliance */}
            {activeTab === "PROFILE" && (
              <div className={styles.tabContent}>
                <div className={styles.tabHeader}>
                  <h3>Seller Profile & Tax Credentials</h3>
                </div>
                <div className={styles.profileDetails}>
                  <div className={styles.profileRow}>
                    <span>Legal Business Name:</span>
                    <strong>{currentSeller.businessName}</strong>
                  </div>
                  <div className={styles.profileRow}>
                    <span>Seller Type:</span>
                    <span>{currentSeller.sellerType}</span>
                  </div>
                  <div className={styles.profileRow}>
                    <span>GSTIN:</span>
                    <span>{currentSeller.gstin}</span>
                  </div>
                  <div className={styles.profileRow}>
                    <span>PAN:</span>
                    <span>{currentSeller.pan}</span>
                  </div>
                  <div className={styles.profileRow}>
                    <span>Primary Contact:</span>
                    <span>{currentSeller.contactName} ({currentSeller.contactPhone || currentSeller.phone})</span>
                  </div>
                  <div className={styles.profileRow}>
                    <span>Authorized Brands:</span>
                    <span>{currentSeller.brandsCarried?.join(", ")}</span>
                  </div>
                  <div className={styles.profileRow}>
                    <span>Dispatch Warehouse:</span>
                    <span>
                      {typeof currentSeller.address === "string"
                        ? currentSeller.address
                        : `${currentSeller.address.city}, ${currentSeller.address.state} - ${currentSeller.address.pinCode}`}
                      {currentSeller.city && !currentSeller.address.toString().includes(currentSeller.city)
                        ? ` (${currentSeller.city}, ${currentSeller.state} - ${currentSeller.pincode})`
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Dispatch Modal */}
      {dispatchModalOrder && (
        <div className={styles.modalOverlay} onClick={() => setDispatchModalOrder(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Dispatch Order #{dispatchModalOrder.orderNumber}</h3>
              <button onClick={() => setDispatchModalOrder(null)} className={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label className={styles.label}>Shipping Courier / Logistics Partner *</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  value={shippingCourier}
                  onChange={(e) => setShippingCourier(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Tracking / Air Waybill (AWB) Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BD12345678IN"
                  className={styles.input}
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setDispatchModalOrder(null)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleDispatchOrder}
                disabled={!trackingNumber.trim()}
                className={styles.confirmDispatchBtn}
              >
                Mark Dispatched & Notify Customer
              </button>
            </div>
          </div>
        </div>
      )}

      <CTASection
        title="Need Dedicated Support or High-Volume Catalog Ingestion?"
        subtitle="Our supplier operations team can help you map 10,000+ OEM part numbers via automated CSV / API feeds with verified fitment guarantees."
        primaryAction={{
          label: "Speak with B2B Concierge",
          href: "tel:+919880123456",
        }}
        secondaryAction={{
          label: "Explore Customer Spare Parts",
          href: "/spare-parts",
        }}
        variant="red"
      />

      <Footer />
    </div>
  );
}
