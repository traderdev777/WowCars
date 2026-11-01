"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Wrench,
  Package,
  Layers,
  Users,
  ShoppingBag,
  DollarSign,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X,
  Plus,
  RefreshCw,
  Clock,
  ChevronRight,
  ShieldCheck,
  Search,
  Filter,
} from "lucide-react";
import styles from "./AdminSpareParts.module.css";
import {
  PartProduct,
  PartCategory,
  PartSeller,
  PartOrder,
  PartPriceHistory,
  PartEnquiry,
} from "@/lib/db/types";

export default function AdminSparePartsClient() {
  const [activeTab, setActiveTab] = useState<
    "STATS" | "PRODUCTS" | "CATEGORIES" | "SELLERS" | "ORDERS" | "PRICE_HISTORY" | "ENQUIRIES"
  >("STATS");

  // Admin session authentication
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [username, setUsername] = useState("founder");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<any | null>(null);
  const [products, setProducts] = useState<PartProduct[]>([]);
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [sellers, setSellers] = useState<PartSeller[]>([]);
  const [orders, setOrders] = useState<PartOrder[]>([]);
  const [priceHistory, setPriceHistory] = useState<PartPriceHistory[]>([]);
  const [enquiries, setEnquiries] = useState<PartEnquiry[]>([]);

  // Filtering states
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("ALL");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");

  // Editing modals & states
  const [editingPriceProd, setEditingPriceProd] = useState<PartProduct | null>(null);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newMrp, setNewMrp] = useState<number>(0);
  const [newStock, setNewStock] = useState<number>(0);
  const [priceNote, setPriceNote] = useState<string>("");

  const [newCategoryModal, setNewCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Auth check
  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        setAdminUser({ fullName: "Marketplace Operations Admin", role: "SUPER_ADMIN" });
      }
    } catch (e) {
      console.warn("Auth check failed", e);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      setAdminUser(data.admin || { fullName: username, role: "SUPER_ADMIN" });
      loadAllData();
    } catch (err: any) {
      setLoginError(err.message || "Invalid administrative credentials");
    }
  };

  // Load Data
  const loadAllData = async () => {
    try {
      const [statsRes, prodsRes, catsRes, sellersRes, ordersRes, histRes, enqRes] = await Promise.all([
        fetch("/api/admin/spare-parts/stats"),
        fetch("/api/admin/spare-parts/products?limit=100"),
        fetch("/api/admin/spare-parts/categories"),
        fetch("/api/admin/spare-parts/sellers"),
        fetch("/api/admin/spare-parts/orders"),
        fetch("/api/admin/spare-parts/price-history"),
        fetch("/api/admin/spare-parts/enquiries"),
      ]);

      if (statsRes.ok) setStats((await statsRes.json()).metrics);
      if (prodsRes.ok) setProducts((await prodsRes.json()).products || []);
      if (catsRes.ok) setCategories((await catsRes.json()).categories || []);
      if (sellersRes.ok) setSellers((await sellersRes.json()).sellers || []);
      if (ordersRes.ok) setOrders((await ordersRes.json()).orders || []);
      if (histRes.ok) setPriceHistory((await histRes.json()).history || []);
      if (enqRes.ok) setEnquiries((await enqRes.json()).enquiries || []);
    } catch (err) {
      console.error("Failed to load admin data", err);
    }
  };

  useEffect(() => {
    if (adminUser) {
      loadAllData();
    }
  }, [adminUser]);

  // Moderation: Moderate Product
  const handleModerateProduct = async (prodId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/spare-parts/products/${prodId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setProducts((prev) => prev.map((p) => (p.id === prodId ? { ...p, status: status as any } : p)));
        showNotification(`Product status updated to ${status}`);
        loadAllData();
      }
    } catch (e) {
      console.warn("Product moderation failed", e);
    }
  };

  // Price Adjustment
  const handleSavePrice = async () => {
    if (!editingPriceProd) return;
    try {
      const res = await fetch(`/api/admin/spare-parts/products/${editingPriceProd.id}/price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: newPrice,
          mrp: newMrp,
          stockQuantity: newStock,
          notes: priceNote || "Admin manual price verification",
        }),
      });
      if (res.ok) {
        showNotification(`Price updated to ₹${newPrice} and logged to history.`);
        setEditingPriceProd(null);
        loadAllData();
      }
    } catch (e) {
      console.warn("Price update failed", e);
    }
  };

  // Seller Moderation
  const handleModerateSeller = async (sellerId: string, status: string, listingEnabled?: boolean) => {
    try {
      const res = await fetch(`/api/admin/spare-parts/sellers/${sellerId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, listingEnabled }),
      });
      if (res.ok) {
        showNotification(`Seller status updated to ${status}`);
        loadAllData();
      }
    } catch (e) {
      console.warn("Seller moderate failed", e);
    }
  };

  // Order Status Update
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/spare-parts/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: `Status updated to ${status} by admin operations` }),
      });
      if (res.ok) {
        showNotification(`Order status updated to ${status}`);
        loadAllData();
      }
    } catch (e) {
      console.warn("Order update failed", e);
    }
  };

  // Enquiry Status Update
  const handleUpdateEnquiry = async (enqId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/spare-parts/enquiries/${enqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: `Marked as ${status}` }),
      });
      if (res.ok) {
        showNotification(`Enquiry status updated to ${status}`);
        loadAllData();
      }
    } catch (e) {
      console.warn("Enquiry update failed", e);
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return;
    try {
      const res = await fetch("/api/admin/spare-parts/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName,
          slug: newCatSlug,
          description: newCatDesc,
          displayOrder: categories.length + 1,
        }),
      });
      if (res.ok) {
        showNotification(`Category "${newCatName}" created successfully!`);
        setNewCategoryModal(false);
        setNewCatName("");
        setNewCatSlug("");
        setNewCatDesc("");
        loadAllData();
      }
    } catch (e) {
      console.warn("Failed to create category", e);
    }
  };

  // Login view if unauthenticated
  if (!adminUser && !authLoading) {
    return (
      <div className={styles.loginWrapper}>
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <Image src="/wowcars-logo.png" alt="WowCars" width={128} height={45} className={styles.loginLogo} />
            <h2>Spare Parts Control Center</h2>
            <p>Authorized Admin Access Only</p>
          </div>

          {loginError && (
            <div className={styles.errorAlert}>
              <AlertTriangle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div className={styles.field}>
              <label className={styles.label}>Admin Username</label>
              <input
                type="text"
                required
                className={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                required
                placeholder="Enter password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className={styles.loginBtn}>
              Log In to Control Center
            </button>
          </form>

          <div className={styles.devHint}>
            <span>Dev Admin Credentials: founder / (configured in environment)</span>
          </div>
        </div>
      </div>
    );
  }

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (productStatusFilter !== "ALL" && p.status !== productStatusFilter) return false;
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.partNumber && p.partNumber.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className={styles.adminLayout}>
      {/* Top Navbar */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <Link href="/admin" className={styles.backLink}>
            ← Used Cars Admin
          </Link>
          <div className={styles.topbarDivider} />
          <span className={styles.brandTitle}>Spare Parts Marketplace Control Center</span>
        </div>
        <div className={styles.topbarRight}>
          <Link href="/spare-parts" target="_blank" className={styles.storefrontLink}>
            View Public Storefront <ChevronRight size={14} />
          </Link>
          <span className={styles.adminBadge}>
            <ShieldCheck size={14} /> {adminUser?.fullName || "Operations Admin"}
          </span>
        </div>
      </header>

      {notification && (
        <div className={styles.notificationToast}>
          <CheckCircle size={16} />
          <span>{notification}</span>
        </div>
      )}

      <div className={styles.mainContainer}>
        {/* Sidebar Navigation */}
        <nav className={styles.sidebar}>
          <button
            onClick={() => setActiveTab("STATS")}
            className={`${styles.sidebarItem} ${activeTab === "STATS" ? styles.activeItem : ""}`}
          >
            <TrendingUp size={16} /> Marketplace Overview
          </button>
          <button
            onClick={() => setActiveTab("PRODUCTS")}
            className={`${styles.sidebarItem} ${activeTab === "PRODUCTS" ? styles.activeItem : ""}`}
          >
            <Package size={16} /> Products & Catalogue ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("CATEGORIES")}
            className={`${styles.sidebarItem} ${activeTab === "CATEGORIES" ? styles.activeItem : ""}`}
          >
            <Layers size={16} /> Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab("SELLERS")}
            className={`${styles.sidebarItem} ${activeTab === "SELLERS" ? styles.activeItem : ""}`}
          >
            <Users size={16} /> Sellers & Vendors ({sellers.length})
          </button>
          <button
            onClick={() => setActiveTab("ORDERS")}
            className={`${styles.sidebarItem} ${activeTab === "ORDERS" ? styles.activeItem : ""}`}
          >
            <ShoppingBag size={16} /> Customer Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("PRICE_HISTORY")}
            className={`${styles.sidebarItem} ${activeTab === "PRICE_HISTORY" ? styles.activeItem : ""}`}
          >
            <DollarSign size={16} /> Price History ({priceHistory.length})
          </button>
          <button
            onClick={() => setActiveTab("ENQUIRIES")}
            className={`${styles.sidebarItem} ${activeTab === "ENQUIRIES" ? styles.activeItem : ""}`}
          >
            <HelpCircle size={16} /> Fitment Enquiries ({enquiries.length})
          </button>
        </nav>

        {/* Content Area */}
        <section className={styles.contentArea}>
          {/* TAB 1: Real Database Stats */}
          {activeTab === "STATS" && (
            <div className={styles.sectionWrap}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>PAN-India Marketplace Analytics</h2>
                  <p className={styles.headerSubtitle}>Real data calculated directly from active marketplace records</p>
                </div>
                <button onClick={loadAllData} className={styles.refreshBtn}>
                  <RefreshCw size={14} /> Refresh Metrics
                </button>
              </div>

              {stats && (
                <div className={styles.metricsGrid}>
                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Published Products</span>
                    <strong className={styles.metricNum}>{stats.publishedProducts}</strong>
                    <span className={styles.metricSub}>{stats.pendingModerationProducts} pending review</span>
                  </div>

                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Approved Sellers</span>
                    <strong className={styles.metricNum}>{stats.approvedSellers}</strong>
                    <span className={styles.metricSub}>{stats.pendingSellers} onboarding pending</span>
                  </div>

                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Total Orders</span>
                    <strong className={styles.metricNum}>{stats.totalOrders}</strong>
                    <span className={styles.metricSub}>Delivered: {stats.deliveredOrders}</span>
                  </div>

                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Total Marketplace Revenue</span>
                    <strong className={styles.metricNum}>₹{(stats.totalRevenue || 0).toLocaleString("en-IN")}</strong>
                    <span className={styles.metricSub}>All paid customer orders</span>
                  </div>

                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Inventory Alerts</span>
                    <strong className={styles.metricNum}>{stats.lowStockProducts}</strong>
                    <span className={styles.metricSub}>{stats.outOfStockProducts} out of stock</span>
                  </div>

                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Customer Enquiries</span>
                    <strong className={styles.metricNum}>{stats.openEnquiries}</strong>
                    <span className={styles.metricSub}>Fitment & OEM verification</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Products Catalog & Moderation */}
          {activeTab === "PRODUCTS" && (
            <div className={styles.sectionWrap}>
              <div className={styles.sectionHeader}>
                <h2>Product Catalogue & Moderation</h2>
                <div className={styles.filterBar}>
                  <input
                    type="text"
                    placeholder="Search title, brand, part no..."
                    className={styles.tableSearch}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  <select
                    className={styles.statusSelect}
                    value={productStatusFilter}
                    onChange={(e) => setProductStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div className={styles.tableCard}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category & Brand</th>
                      <th>Type & Condition</th>
                      <th>Selling Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className={styles.prodItem}>
                            <Image
                              src={p.images?.[0] || "/parts/image-unavailable.svg"}
                              alt={p.title}
                              width={44}
                              height={33}
                              className={styles.miniThumb}
                            />
                            <div>
                              <strong>{p.title}</strong>
                              <span className={styles.miniPn}>PN: {p.partNumber || "N/A"}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span>{p.brand}</span>
                          <span className={styles.miniSub}>{p.categorySlug}</span>
                        </td>
                        <td>
                          <span className={styles.typeTag}>{p.partType}</span>
                          <span className={styles.miniSub}>{p.condition}</span>
                        </td>
                        <td>
                          <strong>₹{(p.price ?? p.priceINR ?? 0).toLocaleString("en-IN")}</strong>
                          {(p.mrp || p.mrpINR) && <span className={styles.miniSub}>MRP ₹{p.mrp || p.mrpINR}</span>}
                        </td>
                        <td>
                          <span className={p.stockQuantity === 0 ? styles.redText : ""}>
                            {p.stockQuantity} units
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.statusPill} ${styles[`status_${p.status}`]}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            {p.status !== "PUBLISHED" && (
                              <button
                                onClick={() => handleModerateProduct(p.id, "PUBLISHED")}
                                className={styles.btnApprove}
                                title="Approve & Publish"
                              >
                                Publish
                              </button>
                            )}
                            {p.status === "PUBLISHED" && (
                              <button
                                onClick={() => handleModerateProduct(p.id, "ARCHIVED")}
                                className={styles.btnReject}
                                title="Archive / Hide"
                              >
                                Archive
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingPriceProd(p);
                                setNewPrice(p.price ?? p.priceINR ?? 0);
                                setNewMrp(p.mrp ?? p.mrpINR ?? p.price ?? p.priceINR ?? 0);
                                setNewStock(p.stockQuantity);
                              }}
                              className={styles.btnPrice}
                              title="Update Price & Stock"
                            >
                              Price/Stock
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Category Management */}
          {activeTab === "CATEGORIES" && (
            <div className={styles.sectionWrap}>
              <div className={styles.sectionHeader}>
                <h2>Category Hierarchy & Reordering</h2>
                <button onClick={() => setNewCategoryModal(true)} className={styles.btnPrimary}>
                  <Plus size={14} /> Add Category
                </button>
              </div>

              <div className={styles.categoryCardsGrid}>
                {categories.map((cat) => (
                  <div key={cat.id} className={styles.catCard}>
                    <div className={styles.catTop}>
                      <Image
                        src={cat.image || `/parts/categories/${cat.slug}.svg`}
                        alt={cat.name}
                        width={60}
                        height={45}
                        className={styles.catThumb}
                      />
                      <div>
                        <h4>{cat.name}</h4>
                        <span className={styles.catSlug}>slug: {cat.slug}</span>
                      </div>
                    </div>
                    <p className={styles.catDesc}>{cat.description}</p>
                    <div className={styles.subcatTags}>
                      {cat.subcategories?.map((s, idx) => {
                        const name = typeof s === "string" ? s : s.name;
                        const slug = typeof s === "string" ? s.toLowerCase().replace(/[^a-z0-9]+/g, "-") : s.slug;
                        return (
                          <span key={slug || idx} className={styles.subcatPill}>
                            {name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Seller Applications & Verification */}
          {activeTab === "SELLERS" && (
            <div className={styles.sectionWrap}>
              <div className={styles.sectionHeader}>
                <h2>Seller & Supplier Management</h2>
              </div>

              <div className={styles.tableCard}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Entity Type</th>
                      <th>GSTIN / PAN</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Listing Permission</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellers.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.businessName}</strong>
                          <span className={styles.miniSub}>{s.city}, {s.state}</span>
                        </td>
                        <td>{s.sellerType}</td>
                        <td>
                          <span className={styles.monoText}>{s.gstin}</span>
                          <span className={styles.miniSub}>PAN: {s.pan}</span>
                        </td>
                        <td>
                          <span>{s.contactName}</span>
                          <span className={styles.miniSub}>{s.contactEmail}</span>
                        </td>
                        <td>
                          <span className={`${styles.statusPill} ${styles[`status_${s.status}`]}`}>
                            {s.status}
                          </span>
                        </td>
                        <td>
                          {s.listingEnabled ? (
                            <span className={styles.greenText}>Active</span>
                          ) : (
                            <span className={styles.amberText}>Disabled</span>
                          )}
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            {s.status !== "APPROVED" && (
                              <button
                                onClick={() => handleModerateSeller(s.id, "APPROVED", true)}
                                className={styles.btnApprove}
                              >
                                Approve
                              </button>
                            )}
                            {s.status === "APPROVED" && (
                              <button
                                onClick={() => handleModerateSeller(s.id, "SUSPENDED", false)}
                                className={styles.btnReject}
                              >
                                Suspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: Orders & Lifecycle Status */}
          {activeTab === "ORDERS" && (
            <div className={styles.sectionWrap}>
              <div className={styles.sectionHeader}>
                <h2>Customer Orders & Dispatch Lifecycle</h2>
              </div>

              <div className={styles.tableCard}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Total Amount</th>
                      <th>Items Count</th>
                      <th>Status</th>
                      <th>Lifecycle Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.orderNumber}</strong>
                        </td>
                        <td>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                        <td>
                          <span>{o.customerName}</span>
                          <span className={styles.miniSub}>{o.shippingAddress.city}, {o.shippingAddress.state}</span>
                        </td>
                        <td>
                          <strong>₹{(o.totalAmount || o.totalINR || 0).toLocaleString("en-IN")}</strong>
                        </td>
                        <td>{o.items.length} items</td>
                        <td>
                          <span className={`${styles.statusPill} ${styles[`status_${o.orderStatus}`]}`}>
                            {o.orderStatus}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            {o.orderStatus === "PAYMENT_CONFIRMED" && (
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, "PROCESSING")}
                                className={styles.btnAction}
                              >
                                Process
                              </button>
                            )}
                            {o.orderStatus === "PROCESSING" && (
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, "DISPATCHED")}
                                className={styles.btnAction}
                              >
                                Dispatch
                              </button>
                            )}
                            {o.orderStatus === "DISPATCHED" && (
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, "DELIVERED")}
                                className={styles.btnApprove}
                              >
                                Deliver
                              </button>
                            )}
                            {o.orderStatus !== "CANCELLED" && o.orderStatus !== "DELIVERED" && (
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, "CANCELLED")}
                                className={styles.btnReject}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: Price History Logs */}
          {activeTab === "PRICE_HISTORY" && (
            <div className={styles.sectionWrap}>
              <div className={styles.sectionHeader}>
                <h2>Price Change & Audit History</h2>
                <p className={styles.headerSubtitle}>Tracks previous price, new price, authorized user, and timestamp</p>
              </div>

              <div className={styles.tableCard}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Product ID</th>
                      <th>Old Price</th>
                      <th>New Price</th>
                      <th>Price Source</th>
                      <th>Authorized By</th>
                      <th>Audit Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.map((h) => (
                      <tr key={h.id}>
                        <td>{new Date(h.changedAt).toLocaleString("en-IN")}</td>
                        <td className={styles.monoText}>{h.productId}</td>
                        <td>₹{(h.oldPrice ?? h.previousPriceINR ?? 0).toLocaleString("en-IN")}</td>
                        <td>
                          <strong>₹{(h.newPrice ?? h.newPriceINR ?? 0).toLocaleString("en-IN")}</strong>
                        </td>
                        <td>
                          <span className={styles.typeTag}>{h.source}</span>
                        </td>
                        <td>{h.changedBy || h.changedByUserName || "System"}</td>
                        <td className={styles.miniSub}>{h.notes || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: Customer Enquiries */}
          {activeTab === "ENQUIRIES" && (
            <div className={styles.sectionWrap}>
              <div className={styles.sectionHeader}>
                <h2>Customer Fitment & OEM Enquiries</h2>
              </div>

              <div className={styles.tableCard}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Vehicle Specs</th>
                      <th>Part Details</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map((enq) => (
                      <tr key={enq.id}>
                        <td>{new Date(enq.createdAt).toLocaleDateString("en-IN")}</td>
                        <td>
                          <strong>{enq.customerName}</strong>
                          <span className={styles.miniSub}>{enq.customerPhone}</span>
                        </td>
                        <td>
                          <span>{enq.vehicleYear} {enq.vehicleMake} {enq.vehicleModel}</span>
                          {enq.vehicleVariant && <span className={styles.miniSub}>{enq.vehicleVariant}</span>}
                        </td>
                        <td>
                          <p className={styles.enqReqText}>{enq.partRequirement}</p>
                        </td>
                        <td>
                          <span className={`${styles.statusPill} ${styles[`status_${enq.status}`]}`}>
                            {enq.status}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            {enq.status === "PENDING" && (
                              <button
                                onClick={() => handleUpdateEnquiry(enq.id, "IN_REVIEW")}
                                className={styles.btnAction}
                              >
                                Review
                              </button>
                            )}
                            {enq.status !== "RESOLVED" && (
                              <button
                                onClick={() => handleUpdateEnquiry(enq.id, "RESOLVED")}
                                className={styles.btnApprove}
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Price / Stock Modal */}
      {editingPriceProd && (
        <div className={styles.modalOverlay} onClick={() => setEditingPriceProd(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Adjust Price & Stock: {editingPriceProd.title}</h3>
              <button onClick={() => setEditingPriceProd(null)} className={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label className={styles.label}>Selling Price (INR) *</label>
                <input
                  type="number"
                  className={styles.input}
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>MRP (INR)</label>
                <input
                  type="number"
                  className={styles.input}
                  value={newMrp}
                  onChange={(e) => setNewMrp(Number(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Stock Quantity *</label>
                <input
                  type="number"
                  className={styles.input}
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Audit Reason / Price Source *</label>
                <input
                  type="text"
                  placeholder="e.g. Authorized distributor price adjustment"
                  className={styles.input}
                  value={priceNote}
                  onChange={(e) => setPriceNote(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setEditingPriceProd(null)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleSavePrice} className={styles.savePriceBtn}>
                Save Price & Log History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {newCategoryModal && (
        <div className={styles.modalOverlay} onClick={() => setNewCategoryModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Create New Spare Parts Category</h3>
              <button onClick={() => setNewCategoryModal(false)} className={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className={styles.modalBody}>
                <div className={styles.field}>
                  <label className={styles.label}>Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Air Conditioning & Heating"
                    className={styles.input}
                    value={newCatName}
                    onChange={(e) => {
                      setNewCatName(e.target.value);
                      if (!newCatSlug) {
                        setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                      }
                    }}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Category Slug *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. air-conditioning-and-heating"
                    className={styles.input}
                    value={newCatSlug}
                    onChange={(e) => setNewCatSlug(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    rows={2}
                    className={styles.textarea}
                    placeholder="Compressors, condensers, AC filters..."
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setNewCategoryModal(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
