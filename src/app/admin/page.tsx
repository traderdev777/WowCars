"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Admin.module.css";
import { Car, Enquiry, ModerationEvent, Dealer, Seller, AdminRole, EnquiryStatus } from "@/lib/db/types";
import DealerNetworkSection from "./DealerNetworkSection";
import DashboardStatCard from "@/components/common/DashboardStatCard";

interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: AdminRole;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

interface PlatformStats {
  totalCars: number;
  activeCars: number;
  pendingCars: number;
  changesRequestedCars?: number;
  suspendedCars?: number;
  soldCars: number;
  totalInventoryValueINR?: number;
  totalEnquiries: number;
  newEnquiries: number;
  testDrivesScheduled?: number;
  leadsConverted?: number;
  totalDealers: number;
  verifiedDealers?: number;
  pendingDealers?: number;
  totalSellers: number;
}

interface AugmentedCar extends Car {
  seller?: {
    fullName: string;
    phone: string;
    whatsapp: string;
    locality: string;
  } | null;
}

interface AugmentedDealer extends Dealer {
  inventoryCount?: number;
}

interface EnrichedSeller extends Seller {
  listingStats?: {
    total: number;
    active: number;
    sold: number;
  };
}

type TabType =
  | "overview"
  | "inventory"
  | "dealers"
  | "sellers"
  | "leads"
  | "quality"
  | "locations"
  | "reports"
  | "users"
  | "audits"
  | "settings";

export default function AdminPage() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Login form state
  const [username, setUsername] = useState("founder");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Active Control Center Section
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Core Data State
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [cars, setCars] = useState<AugmentedCar[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [dealers, setDealers] = useState<AugmentedDealer[]>([]);
  const [sellers, setSellers] = useState<EnrichedSeller[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [auditEvents, setAuditEvents] = useState<ModerationEvent[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filters state
  const [carSearch, setCarSearch] = useState("");
  const [carStatusFilter, setCarStatusFilter] = useState<string>("ALL");
  const [carFuelFilter, setCarFuelFilter] = useState<string>("ALL");

  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("ALL");

  // Modals & Action Dialogs
  const [previewCar, setPreviewCar] = useState<AugmentedCar | null>(null);
  const [previewCarImgIdx, setPreviewCarImgIdx] = useState(0);

  const [actionDialog, setActionDialog] = useState<{
    carId: string;
    carCode: string;
    action: "REJECTED" | "REQUEST_CHANGES" | "SUSPEND";
    reason: string;
  } | null>(null);

  const [showNewDealerModal, setShowNewDealerModal] = useState(false);
  const [onboardingDealer, setOnboardingDealer] = useState(false);
  const [newDealerForm, setNewDealerForm] = useState({
    name: "",
    locality: "",
    address: "",
    whatsappNumber: "",
    establishedYear: 2021,
    speciality: "Certified Pre-Owned Cars",
    isVerified: true,
  });

  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    role: "OPERATIONS" as AdminRole,
  });

  const [leadEditModal, setLeadEditModal] = useState<Enquiry | null>(null);
  const [leadNoteInput, setLeadNoteInput] = useState("");
  const [leadAssignInput, setLeadAssignInput] = useState("");
  const [leadLossReason, setLeadLossReason] = useState("");
  const [leadStatusInput, setLeadStatusInput] = useState<EnquiryStatus>("NEW");
  const [leadFollowUpDate, setLeadFollowUpDate] = useState("");
  const [leadCancelledReason, setLeadCancelledReason] = useState("");
  const [leadSaleAmount, setLeadSaleAmount] = useState("");
  const [leadSaleCommission, setLeadSaleCommission] = useState("");
  const [leadAttemptChannel, setLeadAttemptChannel] = useState<"PHONE" | "WHATSAPP" | "EMAIL">("PHONE");
  const [leadAttemptOutcome, setLeadAttemptOutcome] = useState<"REACHED" | "NO_ANSWER" | "BUSY" | "CALLBACK_REQUESTED" | "WRONG_NUMBER">("REACHED");
  const [leadAttemptNotes, setLeadAttemptNotes] = useState("");
  const [leadInternalNote, setLeadInternalNote] = useState("");

  // Check auth session
  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (isMounted && json?.authenticated && json?.admin) {
          setAdmin(json.admin);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingAuth(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const [statsRes, carsRes, enqRes, dealersRes, sellersRes, usersRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/cars?status=ALL"),
        fetch("/api/enquiries"),
        fetch("/api/admin/dealers"),
        fetch("/api/admin/sellers"),
        fetch("/api/admin/users"),
      ]);

      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s.stats);
        if (s.auditEvents) setAuditEvents(s.auditEvents);
      }

      if (carsRes.ok) {
        const c = await carsRes.json();
        setCars(c.cars || []);
      }

      if (enqRes.ok) {
        const e = await enqRes.json();
        setEnquiries(e.enquiries || []);
      }

      if (dealersRes.ok) {
        const d = await dealersRes.json();
        setDealers(d.dealers || []);
      }

      if (sellersRes.ok) {
        const sel = await sellersRes.json();
        setSellers(sel.sellers || []);
      }

      if (usersRes.ok) {
        const usr = await usersRes.json();
        setAdminUsers(usr.users || []);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  }, []);

  useEffect(() => {
    if (!admin) return;
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [admin, loadDashboardData]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Authentication failed.");
      }

      setAdmin(json.admin);
      setPassword("");
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAdmin(null);
  };

  // Car Moderation Action
  const handleModerateCar = async (
    carId: string,
    action: "APPROVED" | "REJECTED" | "MARKED_SOLD" | "RESTORED" | "REQUEST_CHANGES" | "SUSPEND",
    reason?: string
  ) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/cars/${carId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Action failed.");
      }

      setActionMessage(json.message);
      setActionDialog(null);
      loadDashboardData();
    } catch (err: unknown) {
      setActionMessage(`Error: ${err instanceof Error ? err.message : "Moderation failed"}`);
    }
  };

  // Onboard New Dealer
  const handleCreateDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingDealer(true);
    setActionMessage(null);

    try {
      const res = await fetch("/api/admin/dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDealerForm),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Onboarding failed.");
      }

      setActionMessage(json.message);
      setShowNewDealerModal(false);
      setNewDealerForm({
        name: "",
        locality: "",
        address: "",
        whatsappNumber: "",
        establishedYear: 2021,
        speciality: "Certified Pre-Owned Cars",
        isVerified: true,
      });
      loadDashboardData();
    } catch (err: unknown) {
      setActionMessage(`Error: ${err instanceof Error ? err.message : "Onboarding failed"}`);
    } finally {
      setOnboardingDealer(false);
    }
  };

  // Create Staff Account
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setActionMessage(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "User creation failed.");
      }

      setActionMessage(json.message);
      setShowNewUserModal(false);
      setNewUserForm({
        username: "",
        fullName: "",
        email: "",
        password: "",
        role: "OPERATIONS",
      });
      loadDashboardData();
    } catch (err: unknown) {
      setActionMessage(`Error: ${err instanceof Error ? err.message : "User creation failed"}`);
    } finally {
      setCreatingUser(false);
    }
  };

  // Update Enquiry Status & Pipeline
  const handleUpdateEnquiry = async (
    enquiryId: string,
    updates: {
      status?: EnquiryStatus;
      assignedTo?: string;
      followUpDate?: string;
      notes?: string;
      contactNotes?: string;
      lossReason?: string;
      cancelledReason?: string;
      contactAttempt?: {
        channel: "PHONE" | "WHATSAPP" | "EMAIL";
        outcome: "REACHED" | "NO_ANSWER" | "BUSY" | "CALLBACK_REQUESTED" | "WRONG_NUMBER";
        notes?: string;
      };
      saleOutcome?: {
        amountINR?: number;
        commissionINR?: number;
        soldDate?: string;
        attributionNotes?: string;
      };
      internalNote?: string;
    }
  ) => {
    try {
      const res = await fetch(`/api/enquiries/${enquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setActionMessage("Lead updated successfully.");
        setLeadEditModal(null);
        setLeadNoteInput("");
        setLeadInternalNote("");
        setLeadAttemptNotes("");
        loadDashboardData();
      }
    } catch (err) {
      console.error("Enquiry update error:", err);
    }
  };

  // Formatting helpers
  const formatINR = (val?: number) => {
    if (!val) return "₹0";
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
  };

  // Fraud & Quality Heuristics computed from real inventory records
  const qualityReviewItems = useMemo(() => {
    return cars.map((c) => {
      const flags: { level: "danger" | "warning"; text: string }[] = [];
      if (!c.images || c.images.length === 0) {
        flags.push({ level: "danger", text: "Zero photographs uploaded" });
      } else if (c.images.length < 3) {
        flags.push({ level: "warning", text: `Low photo count (${c.images.length})` });
      }

      if (c.priceINR < 60000) {
        flags.push({ level: "danger", text: `Unusually low price (${formatINR(c.priceINR)})` });
      } else if (c.priceINR > 12000000) {
        flags.push({ level: "warning", text: `High luxury tier (${formatINR(c.priceINR)})` });
      }

      if (c.kmDriven > 180000) {
        flags.push({ level: "warning", text: `High mileage (${c.kmDriven.toLocaleString()} km)` });
      }

      if (c.sellerType === "Verified Dealer" && !c.dealerName) {
        flags.push({ level: "danger", text: "Dealer listing without linked dealership" });
      }

      return {
        car: c,
        flags,
        hasIssues: flags.length > 0,
      };
    });
  }, [cars]);

  // Bengaluru RTO Hub breakdown
  const rtoBreakdown = useMemo(() => {
    const hubMap: Record<string, { name: string; count: number; totalVal: number }> = {
      "KA-01": { name: "Koramangala (Central)", count: 0, totalVal: 0 },
      "KA-02": { name: "Rajajinagar (West)", count: 0, totalVal: 0 },
      "KA-03": { name: "Indiranagar (East)", count: 0, totalVal: 0 },
      "KA-04": { name: "Yeshwanthpur (North)", count: 0, totalVal: 0 },
      "KA-05": { name: "Jayanagar (South)", count: 0, totalVal: 0 },
      "KA-51": { name: "Electronic City (Tech Corridor)", count: 0, totalVal: 0 },
      "KA-53": { name: "KR Puram / Whitefield (IT Belt)", count: 0, totalVal: 0 },
      "OTHER": { name: "Other Karnataka RTOs", count: 0, totalVal: 0 },
    };

    for (const car of cars) {
      const code = (car.rtoCode || "OTHER").toUpperCase();
      const target = hubMap[code] || hubMap["OTHER"];
      target.count++;
      if (car.status === "ACTIVE") {
        target.totalVal += car.priceINR || 0;
      }
    }

    return Object.entries(hubMap).map(([code, data]) => ({
      code,
      ...data,
    }));
  }, [cars]);

  // Loading screen
  if (loadingAuth) {
    return (
      <div className={styles.adminPage}>
        <div className={styles.container} style={{ textAlign: "center", paddingTop: 100 }}>
          <p>Verifying secure session...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated Login Screen
  if (!admin) {
    return (
      <div className={styles.adminPage}>
        <div className={styles.loginWrapper}>
          <div className={styles.loginCard}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <Link href="/">
                <Image
                  src="/wowcars-logo.png"
                  alt="WowCars Logo"
                  width={140}
                  height={48}
                  style={{ objectFit: "contain", margin: "0 auto" }}
                  priority
                />
              </Link>
            </div>

            <h1 className={styles.loginTitle}>Marketplace Control Center</h1>
            <p className={styles.loginSubtitle}>
              Sign in with your verified administrator credentials to access WowCars operations.
            </p>

            {loginError && <div className={styles.errorBanner}>⚠️ {loginError}</div>}

            <form onSubmit={handleLogin}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. founder"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Enter administrator password"
                />
              </div>

              <button type="submit" disabled={loggingIn} className={styles.loginBtn}>
                {loggingIn ? "Verifying..." : "Sign In to Control Center"}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#666" }}>
              Offline native authentication · PBKDF2-HMAC-SHA512 · Zero external API cost
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filtered cars for inventory tab
  const filteredCars = cars.filter((c) => {
    if (carStatusFilter !== "ALL" && c.status !== carStatusFilter) return false;
    if (carFuelFilter !== "ALL" && c.fuelType !== carFuelFilter) return false;
    if (carSearch.trim()) {
      const q = carSearch.toLowerCase();
      const matchMake = c.make.toLowerCase().includes(q);
      const matchModel = c.model.toLowerCase().includes(q);
      const matchCode = c.listingCode.toLowerCase().includes(q);
      const matchLoc = (c.locality || "").toLowerCase().includes(q);
      if (!matchMake && !matchModel && !matchCode && !matchLoc) return false;
    }
    return true;
  });

  // Filtered leads
  const filteredLeads = enquiries.filter((e) => {
    if (leadStatusFilter !== "ALL" && e.status !== leadStatusFilter) return false;
    if (leadSearch.trim()) {
      const q = leadSearch.toLowerCase();
      const matchName = e.buyerName.toLowerCase().includes(q);
      const matchPhone = e.buyerPhone.includes(q);
      const matchCar = (e.carTitle || "").toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchCar) return false;
    }
    return true;
  });

  const pendingModerationCount = cars.filter((c) => c.status === "PENDING_APPROVAL").length;
  const pendingKycCount = dealers.filter((d) => !d.isVerified).length;
  const newLeadsCount = enquiries.filter((e) => e.status === "NEW").length;
  const canViewDealers = admin && ["SUPER_ADMIN", "ADMIN", "OPERATIONS", "VERIFICATION_OFFICER", "DEALER_MANAGER"].includes(admin.role);

  return (
    <div className={styles.adminPage}>
      <div className={styles.container}>
        {/* Top Header */}
        <header className={styles.dashboardHeader}>
          <div className={styles.headerLeft}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Link href="/">
                <Image
                  src="/wowcars-logo.png"
                  alt="WowCars Logo"
                  width={120}
                  height={40}
                  style={{ objectFit: "contain" }}
                  priority
                />
              </Link>
              <div>
                <h1>Marketplace Control Center</h1>
                <p>
                  Bengaluru Hub · Signed in as <strong>{admin.fullName}</strong> (@{admin.username})
                </p>
              </div>
            </div>
          </div>

          <div className={styles.headerRight}>
            <span className={styles.adminBadge}>ROLE: {admin.role}</span>
            <Link href="/cars" target="_blank" className={styles.logoutBtn} style={{ textDecoration: "none" }}>
              🌐 Public Site
            </Link>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Global Action Message Banner */}
        {actionMessage && (
          <div
            style={{
              padding: "12px 18px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              borderRadius: 8,
              color: "#34d399",
              marginBottom: 20,
              fontSize: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>✓ {actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              style={{ background: "none", border: "none", color: "#34d399", cursor: "pointer", fontSize: 16 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 11-Section Layout */}
        <div className={styles.controlCenterLayout}>
          {/* Sidebar Navigation */}
          <aside className={styles.sidebarNav}>
            <button
              onClick={() => setActiveTab("overview")}
              className={`${styles.navItem} ${activeTab === "overview" ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIconLabel}>📊 1. Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("inventory")}
              className={`${styles.navItem} ${activeTab === "inventory" ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIconLabel}>🚗 2. Vehicle Inventory</span>
              {pendingModerationCount > 0 && (
                <span className={styles.navBadge}>{pendingModerationCount}</span>
              )}
            </button>

            {canViewDealers && (
              <button
                onClick={() => setActiveTab("dealers")}
                className={`${styles.navItem} ${activeTab === "dealers" ? styles.navItemActive : ""}`}
              >
                <span className={styles.navIconLabel}>🏢 3. Dealer Network</span>
                {pendingKycCount > 0 && (
                  <span className={styles.navBadge}>{pendingKycCount}</span>
                )}
              </button>
            )}

            <button
              onClick={() => setActiveTab("sellers")}
              className={`${styles.navItem} ${activeTab === "sellers" ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIconLabel}>👤 4. Seller Management</span>
            </button>

            <Link
              href="/admin/spare-parts"
              className={styles.navItem}
              style={{ textDecoration: "none" }}
            >
              <span className={styles.navIconLabel}>🔧 4B. Auto Parts Marketplace</span>
              <span className={styles.navBadge} style={{ background: "rgba(229, 9, 20, 0.2)", color: "#ff4d4d" }}>
                Active
              </span>
            </Link>

            <Link
              href="/admin/operations"
              className={styles.navItem}
              style={{ textDecoration: "none" }}
            >
              <span className={styles.navIconLabel}>🏭 4C. Operations & Garage</span>
              <span className={styles.navBadge} style={{ background: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>
                Live
              </span>
            </Link>

            <button
              onClick={() => setActiveTab("leads")}
              className={`${styles.navItem} ${activeTab === "leads" ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIconLabel}>📩 5. Buyer Leads</span>
              {newLeadsCount > 0 && (
                <span className={styles.navBadge} style={{ background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" }}>
                  {newLeadsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("quality")}
              className={`${styles.navItem} ${activeTab === "quality" ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIconLabel}>🛡️ 6. Quality & Fraud</span>
            </button>

            <button
              onClick={() => setActiveTab("locations")}
              className={`${styles.navItem} ${activeTab === "locations" ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIconLabel}>📍 7. Locations & Hubs</span>
            </button>

            <button
              onClick={() => setActiveTab("reports")}
              className={`${styles.navItem} ${activeTab === "reports" ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIconLabel}>📈 8. Reports & Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`${styles.navItem} ${activeTab === "users" ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIconLabel}>👥 9. Users & Permissions</span>
            </button>

            <button
              onClick={() => setActiveTab("audits")}
              className={`${styles.navItem} ${activeTab === "audits" ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIconLabel}>📜 10. Audit Logs</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`${styles.navItem} ${activeTab === "settings" ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIconLabel}>⚙️ 11. Settings</span>
            </button>
          </aside>

          {/* Main Content Area */}
          <main className={styles.contentArea}>
            {/* 1. OVERVIEW */}
            {activeTab === "overview" && (
              <div>
                {/* Real KPI Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
                  <DashboardStatCard
                    title="Live Active Listings"
                    value={stats?.activeCars ?? 0}
                    subtitle="Verified & published"
                    variant="success"
                    onClick={() => setActiveTab("inventory")}
                  />

                  <DashboardStatCard
                    title="Pending Moderation"
                    value={pendingModerationCount}
                    subtitle="Awaiting inspection review"
                    variant={pendingModerationCount > 0 ? "danger" : "default"}
                    onClick={() => setActiveTab("inventory")}
                  />

                  <DashboardStatCard
                    title="Total Inventory Value"
                    value={formatINR(stats?.totalInventoryValueINR)}
                    subtitle="Aggregate marketplace GMV"
                    variant="highlight"
                  />

                  <DashboardStatCard
                    title="Verified Dealerships"
                    value={dealers.filter((d) => d.isVerified).length}
                    subtitle={pendingKycCount > 0 ? `+${pendingKycCount} pending KYC` : "Full network authorization"}
                    variant="default"
                    onClick={() => setActiveTab("dealers")}
                  />

                  <DashboardStatCard
                    title="Buyer Enquiries"
                    value={stats?.totalEnquiries ?? 0}
                    subtitle="Direct lead requests"
                    variant="default"
                    onClick={() => setActiveTab("leads")}
                  />
                </div>

                {/* Operations Action Center */}
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>⚡ Operational Action Center</h2>
                      <p className={styles.sectionSubtitle}>Immediate tasks requiring moderator and operations staff review</p>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                    <div style={{ background: "#0d0d11", padding: 18, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: "#f3f4f6" }}>Inventory Moderation Queue</span>
                        <span className={styles.badgePending}>{pendingModerationCount} Waiting</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>
                        Cars submitted by individual private sellers and onboarding dealers awaiting inspection.
                      </p>
                      <button
                        onClick={() => {
                          setCarStatusFilter("PENDING_APPROVAL");
                          setActiveTab("inventory");
                        }}
                        className={`${styles.btnSm} ${styles.btnSmApprove}`}
                      >
                        Review Pending Cars →
                      </button>
                    </div>

                    <div style={{ background: "#0d0d11", padding: 18, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: "#f3f4f6" }}>Dealer KYC Backlog</span>
                        <span className={styles.badgePending}>{pendingKycCount} Pending</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>
                        Dealership applications needing physical address verification and trade license confirmation.
                      </p>
                      <button
                        onClick={() => {
                          setActiveTab("dealers");
                        }}
                        className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                      >
                        Inspect Applications →
                      </button>
                    </div>

                    <div style={{ background: "#0d0d11", padding: 18, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: "#f3f4f6" }}>New Buyer Enquiries</span>
                        <span className={styles.badgeSold}>{newLeadsCount} Unassigned</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>
                        Customer test drive requests and negotiation enquiries from Bangalore buyers.
                      </p>
                      <button
                        onClick={() => {
                          setLeadStatusFilter("NEW");
                          setActiveTab("leads");
                        }}
                        className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                      >
                        Manage Lead Inbox →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Platform Architecture & Resilience */}
                <div className={styles.sectionCard}>
                  <h3 className={styles.sectionTitle}>🔒 Zero-Cloud-Cost Infrastructure Health</h3>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, fontSize: 13 }}>
                    <div style={{ background: "#0b0b0e", padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ color: "#9ca3af", marginBottom: 4 }}>Primary Database Adapter</div>
                      <div style={{ color: "#34d399", fontWeight: 700 }}>
                        {process.env.DB_ADAPTER === "mysql" ? "MySQL 8 Relational Pool" : "FileStore JSON (Local Dev)"}
                      </div>
                    </div>
                    <div style={{ background: "#0b0b0e", padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ color: "#9ca3af", marginBottom: 4 }}>Admin Session Security</div>
                      <div style={{ color: "#34d399", fontWeight: 700 }}>PBKDF2-SHA512 + Signed Cookie</div>
                    </div>
                    <div style={{ background: "#0b0b0e", padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ color: "#9ca3af", marginBottom: 4 }}>Public Search Protection</div>
                      <div style={{ color: "#34d399", fontWeight: 700 }}>Only ACTIVE Listings Indexable</div>
                    </div>
                    <div style={{ background: "#0b0b0e", padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ color: "#9ca3af", marginBottom: 4 }}>Hosting Budget</div>
                      <div style={{ color: "#38bdf8", fontWeight: 700 }}>₹0 Added Cost (Included cPanel)</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. VEHICLE INVENTORY */}
            {activeTab === "inventory" && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>🚗 Vehicle Moderation & Catalog Control</h2>
                    <p className={styles.sectionSubtitle}>
                      Review, approve, request changes, or suspend vehicles across Bengaluru
                    </p>
                  </div>
                  <div style={{ fontSize: 13, color: "#9ca3af" }}>
                    Showing <strong>{filteredCars.length}</strong> of {cars.length} vehicles
                  </div>
                </div>

                {/* Filter Toolbar */}
                <div className={styles.filterToolbar}>
                  <input
                    type="text"
                    placeholder="Search make, model, code, locality..."
                    value={carSearch}
                    onChange={(e) => setCarSearch(e.target.value)}
                    className={styles.filterInput}
                  />

                  <select
                    value={carStatusFilter}
                    onChange={(e) => setCarStatusFilter(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING_APPROVAL">Pending Review ({pendingModerationCount})</option>
                    <option value="ACTIVE">Active (Live)</option>
                    <option value="CHANGES_REQUESTED">Changes Requested</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="SOLD">Sold</option>
                  </select>

                  <select
                    value={carFuelFilter}
                    onChange={(e) => setCarFuelFilter(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="ALL">All Fuel Types</option>
                    <option value="PETROL">Petrol</option>
                    <option value="DIESEL">Diesel</option>
                    <option value="ELECTRIC">Electric</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="CNG">CNG</option>
                  </select>

                  {(carSearch || carStatusFilter !== "ALL" || carFuelFilter !== "ALL") && (
                    <button
                      onClick={() => {
                        setCarSearch("");
                        setCarStatusFilter("ALL");
                        setCarFuelFilter("ALL");
                      }}
                      className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* Table */}
                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Code / Image</th>
                        <th>Vehicle Details</th>
                        <th>Price</th>
                        <th>Seller / Dealer</th>
                        <th>RTO / Hub</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCars.length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <div className={styles.emptyState}>
                              <div className={styles.emptyStateTitle}>No listings found</div>
                              <div className={styles.emptyStateDesc}>Try adjusting your search criteria or filter status.</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredCars.map((car) => {
                          const statusClass =
                            car.status === "ACTIVE"
                              ? styles.badgeActive
                              : car.status === "PENDING_APPROVAL"
                              ? styles.badgePending
                              : car.status === "CHANGES_REQUESTED"
                              ? styles.badgeChanges
                              : car.status === "SUSPENDED"
                              ? styles.badgeSuspended
                              : car.status === "REJECTED"
                              ? styles.badgeRejected
                              : styles.badgeSold;

                          return (
                            <tr key={car.id}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div
                                    style={{
                                      width: 54,
                                      height: 38,
                                      borderRadius: 6,
                                      overflow: "hidden",
                                      position: "relative",
                                      background: "#0b0b0e",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {car.images && car.images[0] ? (
                                      <Image
                                        src={car.images[0]}
                                        alt={car.model}
                                        fill
                                        style={{ objectFit: "cover" }}
                                        unoptimized
                                      />
                                    ) : (
                                      <div style={{ textAlign: "center", paddingTop: 8, fontSize: 16 }}>🚗</div>
                                    )}
                                  </div>
                                  <div>
                                    <span style={{ fontWeight: 700, color: "#fff", display: "block" }}>
                                      {car.listingCode}
                                    </span>
                                    <span style={{ fontSize: 11, color: "#8e8e9f" }}>
                                      {car.images?.length || 0} photo(s)
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <div>
                                  <span style={{ fontWeight: 700, color: "#fff" }}>
                                    {car.year} {car.make} {car.model}
                                  </span>
                                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                                    {car.variant} · {car.kmDriven?.toLocaleString()} km · {car.transmission} · {car.fuelType}
                                  </div>
                                </div>
                              </td>

                              <td>
                                <span style={{ fontWeight: 700, color: "#34d399", fontSize: 14 }}>
                                  {formatINR(car.priceINR)}
                                </span>
                              </td>

                              <td>
                                {car.sellerType === "Verified Dealer" || Boolean(car.dealerId) ? (
                                  <div>
                                    <span style={{ color: "#c084fc", fontWeight: 600 }}>🏢 {car.dealerName || "Partner Dealer"}</span>
                                    <span style={{ display: "block", fontSize: 11, color: "#9ca3af" }}>Dealer Network</span>
                                  </div>
                                ) : (
                                  <div>
                                    <span style={{ color: "#60a5fa", fontWeight: 600 }}>👤 Private Seller</span>
                                    <span style={{ display: "block", fontSize: 11, color: "#9ca3af" }}>
                                      {car.seller?.fullName || car.locality || "Bangalore"}
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td>
                                <span style={{ fontWeight: 600, color: "#f3f4f6" }}>{car.rtoCode || "KA-01"}</span>
                                <span style={{ display: "block", fontSize: 11, color: "#9ca3af" }}>
                                  {car.locality || car.city || "Bengaluru"}
                                </span>
                              </td>

                              <td>
                                <span className={`${styles.badge} ${statusClass}`}>{car.status}</span>
                                {car.rejectionReason && (
                                  <span style={{ display: "block", fontSize: 10, color: "#f87171", maxWidth: 120, marginTop: 4 }}>
                                    Note: {car.rejectionReason}
                                  </span>
                                )}
                              </td>

                              <td>
                                <div className={styles.actionBtnGroup}>
                                  <button
                                    onClick={() => {
                                      setPreviewCar(car);
                                      setPreviewCarImgIdx(0);
                                    }}
                                    className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                                    title="View full specs & photos"
                                  >
                                    👁️ Preview
                                  </button>

                                  {car.status === "PENDING_APPROVAL" && (
                                    <>
                                      <button
                                        onClick={() => handleModerateCar(car.id, "APPROVED")}
                                        className={`${styles.btnSm} ${styles.btnSmApprove}`}
                                        title="Approve listing for public view"
                                      >
                                        ✓ Approve
                                      </button>
                                      <button
                                        onClick={() =>
                                          setActionDialog({
                                            carId: car.id,
                                            carCode: car.listingCode,
                                            action: "REQUEST_CHANGES",
                                            reason: "",
                                          })
                                        }
                                        className={`${styles.btnSm} ${styles.btnSmChanges}`}
                                        title="Request changes from seller"
                                      >
                                        ✏️ Changes
                                      </button>
                                      <button
                                        onClick={() =>
                                          setActionDialog({
                                            carId: car.id,
                                            carCode: car.listingCode,
                                            action: "REJECTED",
                                            reason: "",
                                          })
                                        }
                                        className={`${styles.btnSm} ${styles.btnSmReject}`}
                                        title="Reject listing"
                                      >
                                        ✕ Reject
                                      </button>
                                    </>
                                  )}

                                  {car.status === "ACTIVE" && (
                                    <>
                                      <button
                                        onClick={() => handleModerateCar(car.id, "MARKED_SOLD")}
                                        className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                                        title="Mark car as sold"
                                      >
                                        🏷️ Sold
                                      </button>
                                      <button
                                        onClick={() =>
                                          setActionDialog({
                                            carId: car.id,
                                            carCode: car.listingCode,
                                            action: "SUSPEND",
                                            reason: "",
                                          })
                                        }
                                        className={`${styles.btnSm} ${styles.btnSmReject}`}
                                        title="Suspend listing temporarily"
                                      >
                                        ⏸️ Suspend
                                      </button>
                                    </>
                                  )}

                                  {(car.status === "CHANGES_REQUESTED" ||
                                    car.status === "SUSPENDED" ||
                                    car.status === "REJECTED") && (
                                    <button
                                      onClick={() => handleModerateCar(car.id, "APPROVED")}
                                      className={`${styles.btnSm} ${styles.btnSmApprove}`}
                                      title="Re-activate listing"
                                    >
                                      ✓ Re-Approve
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. DEALER NETWORK (Admin-Only) */}
            {activeTab === "dealers" && canViewDealers && (
              <DealerNetworkSection
                dealers={dealers}
                onRefreshData={loadDashboardData}
                onShowNewDealerModal={() => setShowNewDealerModal(true)}
              />
            )}

            {/* 4. SELLER MANAGEMENT */}
            {activeTab === "sellers" && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>👤 Private Sellers Directory</h2>
                    <p className={styles.sectionSubtitle}>
                      Direct customer listings submitted across Bengaluru neighborhoods
                    </p>
                  </div>
                  <div style={{ fontSize: 13, color: "#9ca3af" }}>
                    Total Registered Sellers: <strong>{sellers.length}</strong>
                  </div>
                </div>

                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Seller Name</th>
                        <th>Phone / WhatsApp</th>
                        <th>Locality</th>
                        <th>Total Listings</th>
                        <th>Active Listings</th>
                        <th>Sold Listings</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellers.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <span style={{ fontWeight: 700, color: "#fff" }}>{s.fullName}</span>
                            <span style={{ display: "block", fontSize: 11, color: "#8e8e9f" }}>ID: {s.id}</span>
                          </td>

                          <td>
                            <span style={{ color: "#f3f4f6" }}>{s.phone}</span>
                            {s.whatsapp && (
                              <a
                                href={`https://wa.me/91${s.whatsapp.replace(/\D/g, "").slice(-10)}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: "block", fontSize: 11, color: "#34d399", textDecoration: "none" }}
                              >
                                💬 WhatsApp
                              </a>
                            )}
                          </td>

                          <td>
                            <span style={{ color: "#d1d5db" }}>{s.locality}, Bengaluru</span>
                          </td>

                          <td>
                            <span style={{ fontWeight: 700, color: "#fff" }}>
                              {s.listingStats?.total ?? 1}
                            </span>
                          </td>

                          <td>
                            <span style={{ fontWeight: 700, color: "#34d399" }}>
                              {s.listingStats?.active ?? 1}
                            </span>
                          </td>

                          <td>
                            <span style={{ fontWeight: 700, color: "#60a5fa" }}>
                              {s.listingStats?.sold ?? 0}
                            </span>
                          </td>

                          <td>
                            <button
                              onClick={() => {
                                setCarSearch(s.phone);
                                setActiveTab("inventory");
                              }}
                              className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                            >
                              View Listings →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. BUYER LEADS AND CENTRALIZED CRM */}
            {activeTab === "leads" && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>📩 Centralized Buyer Enquiry CRM</h2>
                    <p className={styles.sectionSubtitle}>
                      Manage buyer qualification, test drives, staff assignments, and sale tracking
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 13, color: "#9ca3af" }}>
                      Showing <strong>{filteredLeads.length}</strong> active CRM records
                    </div>
                    <a
                      href="/api/enquiries?format=csv"
                      download
                      className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      📥 Export CRM CSV
                    </a>
                  </div>
                </div>

                {/* Filter Toolbar */}
                <div className={styles.filterToolbar}>
                  <input
                    type="text"
                    placeholder="Search enquiry ID, buyer name, phone, vehicle ref..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className={styles.filterInput}
                  />

                  <select
                    value={leadStatusFilter}
                    onChange={(e) => setLeadStatusFilter(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="ALL">All CRM Stages ({enquiries.length})</option>
                    <option value="NEW">1. New Inquiries ({newLeadsCount})</option>
                    <option value="CONTACT_ATTEMPTED">2. Contact Attempted</option>
                    <option value="QUALIFIED">3. Qualified Lead</option>
                    <option value="DEALER_COORDINATION">4. Dealer Coordination</option>
                    <option value="TEST_DRIVE_SCHEDULED">5. Test Drive Scheduled</option>
                    <option value="NEGOTIATION">6. Negotiation</option>
                    <option value="BOOKING_IN_PROGRESS">7. Booking In Progress</option>
                    <option value="SOLD">8. Completed Sale (Won)</option>
                    <option value="LOST">9. Lost Opportunity</option>
                    <option value="CANCELLED">10. Cancelled</option>
                  </select>
                </div>

                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Enquiry Ref</th>
                        <th>Buyer Information</th>
                        <th>Vehicle Interest</th>
                        <th>Type / Timing</th>
                        <th>CRM Stage</th>
                        <th>Assigned Staff / Dealer</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <div className={styles.emptyState}>
                              <div className={styles.emptyStateTitle}>No enquiries found</div>
                              <div className={styles.emptyStateDesc}>Try adjusting search or status filters.</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredLeads.map((e) => (
                          <tr key={e.id}>
                            <td>
                              <span style={{ fontWeight: 700, color: "#38bdf8", fontSize: 13 }}>
                                {e.enquiryCode || e.id.slice(0, 8)}
                              </span>
                              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                                {new Date(e.createdAt).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </td>

                            <td>
                              <span style={{ fontWeight: 700, color: "#fff" }}>{e.buyerName}</span>
                              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                                📞 {e.buyerPhone}
                                {e.buyerEmail && ` · ${e.buyerEmail}`}
                              </div>
                            </td>

                            <td>
                              <span style={{ fontWeight: 600, color: "#f3f4f6" }}>
                                {e.carTitle || "General Marketplace Lead"}
                              </span>
                              {e.carListingCode && (
                                <span style={{ display: "block", fontSize: 11, color: "#38bdf8" }}>
                                  Ref: {e.carListingCode}
                                </span>
                              )}
                            </td>

                            <td>
                              <span className={styles.badge} style={{ background: "rgba(255,255,255,0.06)", color: "#fff" }}>
                                {e.enquiryType}
                              </span>
                              {(e.preferredDate || e.preferredTime) && (
                                <span style={{ display: "block", fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                                  📅 {e.preferredDate} {e.preferredSlot || e.preferredTime}
                                </span>
                              )}
                            </td>

                            <td>
                              <select
                                value={e.status}
                                onChange={(evt) =>
                                  handleUpdateEnquiry(e.id, { status: evt.target.value as EnquiryStatus })
                                }
                                className={styles.filterSelect}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: 12,
                                  borderColor:
                                    e.status === "SOLD" || e.status === "CONVERTED"
                                      ? "#10b981"
                                      : e.status === "LOST" || e.status === "CANCELLED"
                                      ? "#ef4444"
                                      : undefined,
                                }}
                              >
                                <option value="NEW">1. NEW</option>
                                <option value="CONTACT_ATTEMPTED">2. CONTACT ATTEMPTED</option>
                                <option value="QUALIFIED">3. QUALIFIED</option>
                                <option value="DEALER_COORDINATION">4. DEALER COORDINATION</option>
                                <option value="TEST_DRIVE_SCHEDULED">5. TEST DRIVE SCHEDULED</option>
                                <option value="NEGOTIATION">6. NEGOTIATION</option>
                                <option value="BOOKING_IN_PROGRESS">7. BOOKING IN PROGRESS</option>
                                <option value="SOLD">8. SOLD (WON)</option>
                                <option value="LOST">9. LOST</option>
                                <option value="CANCELLED">10. CANCELLED</option>
                              </select>
                            </td>

                            <td>
                              <span style={{ color: "#d1d5db", fontSize: 12 }}>
                                {e.assignedTo ? `Assigned: @${e.assignedTo}` : e.dealerId ? `Dealer: ${e.dealerId}` : "Unassigned"}
                              </span>
                              {e.followUpDate && (
                                <span style={{ display: "block", fontSize: 11, color: "#fbbf24" }}>
                                  ⏰ Follow-up: {e.followUpDate}
                                </span>
                              )}
                              {e.lossReason && (
                                <span style={{ display: "block", fontSize: 11, color: "#f87171" }}>
                                  Lost: {e.lossReason}
                                </span>
                              )}
                            </td>

                            <td>
                              <button
                                onClick={() => {
                                  setLeadEditModal(e);
                                  setLeadStatusInput(e.status);
                                  setLeadAssignInput(e.assignedTo || "");
                                  setLeadFollowUpDate(e.followUpDate || "");
                                  setLeadLossReason(e.lossReason || "");
                                  setLeadCancelledReason(e.cancelledReason || "");
                                  setLeadSaleAmount(e.saleOutcome?.amountINR ? String(e.saleOutcome.amountINR) : "");
                                  setLeadSaleCommission(e.saleOutcome?.commissionINR ? String(e.saleOutcome.commissionINR) : "");
                                }}
                                className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                              >
                                CRM Operations
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. QUALITY AND FRAUD REVIEW */}
            {activeTab === "quality" && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>🛡️ Automated Quality & Fraud Quarantine</h2>
                    <p className={styles.sectionSubtitle}>
                      Algorithmic inspection flags computed from live database records
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                  {qualityReviewItems
                    .filter((item) => item.hasIssues)
                    .map(({ car, flags }) => (
                      <div
                        key={car.id}
                        style={{
                          background: "#0d0d11",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: 10,
                          padding: 16,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>
                              {car.listingCode} · {car.year} {car.make} {car.model}
                            </span>
                            <span className={styles.badgePending}>{car.status}</span>
                            <span style={{ color: "#34d399", fontWeight: 700 }}>{formatINR(car.priceINR)}</span>
                          </div>

                          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                            {flags.map((f, i) => (
                              <span
                                key={i}
                                className={f.level === "danger" ? styles.flagDanger : styles.flagWarning}
                              >
                                {f.level === "danger" ? "🚨" : "⚠️"} {f.text}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className={styles.actionBtnGroup}>
                          <button
                            onClick={() => {
                              setPreviewCar(car);
                              setPreviewCarImgIdx(0);
                            }}
                            className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                          >
                            Inspect Car
                          </button>
                          <button
                            onClick={() =>
                              setActionDialog({
                                carId: car.id,
                                carCode: car.listingCode,
                                action: "REQUEST_CHANGES",
                                reason: flags.map((f) => f.text).join("; "),
                              })
                            }
                            className={`${styles.btnSm} ${styles.btnSmChanges}`}
                          >
                            Request Changes
                          </button>
                        </div>
                      </div>
                    ))}

                  {qualityReviewItems.filter((item) => item.hasIssues).length === 0 && (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyStateTitle}>✨ All listings meet quality standards</div>
                      <div className={styles.emptyStateDesc}>
                        No pricing anomalies, missing photographs, or unverified seller issues detected.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. LOCATIONS AND CATEGORIES */}
            {activeTab === "locations" && (
              <div>
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>📍 Bengaluru RTO Hub Distribution</h2>
                      <p className={styles.sectionSubtitle}>
                        Live inventory allocation across major Bangalore registration offices
                      </p>
                    </div>
                  </div>

                  <div className={styles.analyticsGrid}>
                    {rtoBreakdown.map((hub) => (
                      <div key={hub.code} className={styles.analyticsCard}>
                        <div className={styles.analyticsTitle}>
                          <span>{hub.code} · {hub.name}</span>
                          <span style={{ color: "#34d399", fontWeight: 700 }}>{hub.count} cars</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#9ca3af" }}>
                          Active Value: <strong>{formatINR(hub.totalVal)}</strong>
                        </div>
                        <div className={styles.progressBarContainer}>
                          <div
                            className={styles.progressBarFill}
                            style={{
                              width: `${Math.min(100, (hub.count / (cars.length || 1)) * 100)}%`,
                              background: "#e50914",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.sectionCard}>
                  <h3 className={styles.sectionTitle}>🚙 Vehicle Body Types & Fuel Breakdown</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 14 }}>
                    {["SUV", "SEDAN", "HATCHBACK", "MUV"].map((type) => {
                      const count = cars.filter((c) => c.bodyType === type).length;
                      return (
                        <div key={type} style={{ background: "#0d0d11", padding: 16, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontWeight: 700, color: "#fff" }}>{type}</span>
                            <span style={{ color: "#60a5fa", fontWeight: 700 }}>{count}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                            {cars.length > 0 ? ((count / cars.length) * 100).toFixed(0) : 0}% of total inventory
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 8. REPORTS AND ANALYTICS */}
            {activeTab === "reports" && (
              <div>
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>📈 Marketplace Operations Intelligence</h2>
                      <p className={styles.sectionSubtitle}>
                        Database-computed platform performance (Zero fake metrics)
                      </p>
                    </div>
                  </div>

                  <div className={styles.analyticsGrid}>
                    <div className={styles.analyticsCard}>
                      <div className={styles.analyticsTitle}>
                        <span>Average Vehicle Selling Price</span>
                        <span>🏷️</span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#34d399", margin: "6px 0" }}>
                        {formatINR(
                          cars.length > 0
                            ? cars.reduce((acc, c) => acc + (c.priceINR || 0), 0) / cars.length
                            : 0
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: "#8e8e9f" }}>Computed across all {cars.length} active and archived vehicles.</p>
                    </div>

                    <div className={styles.analyticsCard}>
                      <div className={styles.analyticsTitle}>
                        <span>Lead Conversion Rate</span>
                        <span>🎯</span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#60a5fa", margin: "6px 0" }}>
                        {enquiries.length > 0
                          ? ((enquiries.filter((e) => e.status === "CONVERTED").length / enquiries.length) * 100).toFixed(1)
                          : "0.0"}%
                      </div>
                      <p style={{ fontSize: 12, color: "#8e8e9f" }}>
                        {enquiries.filter((e) => e.status === "CONVERTED").length} won out of {enquiries.length} total enquiries.
                      </p>
                    </div>

                    <div className={styles.analyticsCard}>
                      <div className={styles.analyticsTitle}>
                        <span>Average Vehicle Odometer</span>
                        <span>⏱️</span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#fbbf24", margin: "6px 0" }}>
                        {cars.length > 0
                          ? Math.round(cars.reduce((acc, c) => acc + (c.kmDriven || 0), 0) / cars.length).toLocaleString()
                          : 0}{" "}
                        km
                      </div>
                      <p style={{ fontSize: 12, color: "#8e8e9f" }}>Average mileage for verified Bengaluru pre-owned cars.</p>
                    </div>
                  </div>

                  {/* Funnel Pipeline */}
                  <h3 className={styles.sectionTitle} style={{ marginTop: 24 }}>Lead Progression Funnel</h3>
                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                    {[
                      { label: "New Leads", count: enquiries.filter((e) => e.status === "NEW").length, color: "#60a5fa" },
                      { label: "Contacted", count: enquiries.filter((e) => e.status === "CONTACTED").length, color: "#fbbf24" },
                      { label: "Test Drive", count: enquiries.filter((e) => e.status === "TEST_DRIVE_SCHEDULED").length, color: "#c084fc" },
                      { label: "Negotiation", count: enquiries.filter((e) => e.status === "NEGOTIATION").length, color: "#fb923c" },
                      { label: "Converted", count: enquiries.filter((e) => e.status === "CONVERTED").length, color: "#34d399" },
                    ].map((step, idx) => (
                      <div key={idx} style={{ background: "#0d0d11", padding: 14, borderRadius: 8, textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: step.color }}>{step.count}</div>
                        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{step.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 9. USERS AND PERMISSIONS */}
            {activeTab === "users" && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>👥 Administrative Users & Role-Based Access</h2>
                    <p className={styles.sectionSubtitle}>
                      Least-privilege permissions: Super Admin, Operations Admin, Dealer Manager, Support Staff
                    </p>
                  </div>
                  {(admin.role === "SUPER_ADMIN" || admin.role === "ADMIN") && (
                    <button
                      onClick={() => setShowNewUserModal(true)}
                      className={`${styles.btnSm} ${styles.btnSmApprove}`}
                    >
                      + Add Staff Account
                    </button>
                  )}
                </div>

                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Assigned Role</th>
                        <th>Account Status</th>
                        <th>Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <span style={{ fontWeight: 700, color: "#fff" }}>@{u.username}</span>
                          </td>
                          <td>
                            <span style={{ color: "#f3f4f6" }}>{u.fullName}</span>
                          </td>
                          <td>
                            <span style={{ color: "#9ca3af" }}>{u.email}</span>
                          </td>
                          <td>
                            <span className={styles.badge} style={{ background: "rgba(229,9,20,0.15)", color: "#ff4d58" }}>
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <span className={styles.flagOk}>Active</span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: "#8e8e9f" }}>
                              {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-IN") : "Never"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 10. AUDIT LOGS */}
            {activeTab === "audits" && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>📜 Immutable Operations Audit Trail</h2>
                    <p className={styles.sectionSubtitle}>
                      Sensitive action recording: actor, entity, status change, and recorded reason
                    </p>
                  </div>
                </div>

                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Actor (Admin)</th>
                        <th>Listing / Entity</th>
                        <th>Action Performed</th>
                        <th>Recorded Reason / Justification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditEvents.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <div className={styles.emptyState}>
                              <div className={styles.emptyStateTitle}>No audit events recorded yet</div>
                              <div className={styles.emptyStateDesc}>Moderation actions will appear here automatically.</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        auditEvents.map((evt) => (
                          <tr key={evt.id}>
                            <td style={{ whiteSpace: "nowrap", color: "#8e8e9f", fontSize: 12 }}>
                              {new Date(evt.createdAt).toLocaleString("en-IN")}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "#f3f4f6" }}>@{evt.adminName}</span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: "#38bdf8" }}>{evt.carListingCode}</span>
                            </td>
                            <td>
                              <span className={styles.badge} style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>
                                {evt.action}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: "#d1d5db", fontSize: 12 }}>
                                {evt.reason || "Standard operational review"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 11. SETTINGS */}
            {activeTab === "settings" && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>⚙️ Platform Operations Settings</h2>
                    <p className={styles.sectionSubtitle}>
                      Marketplace operational parameters and staging safety guarantees
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ background: "#0d0d11", padding: 18, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <h4 style={{ color: "#fff", marginBottom: 6 }}>🛡️ Search Engine Staging Protection</h4>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>
                      Enforces <code>X-Robots-Tag: noindex, nofollow</code> across staging domains to prevent search engines from crawling test listings.
                    </p>
                    <span className={styles.flagOk}>✓ Active: Unapproved cars excluded from public search</span>
                  </div>

                  <div style={{ background: "#0d0d11", padding: 18, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <h4 style={{ color: "#fff", marginBottom: 6 }}>💾 Persistence & Snapshot Engine</h4>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>
                      Local development uses zero-cost JSON storage at <code>data/wowcars_db.json</code>. Production uses cPanel MySQL with connection pooling.
                    </p>
                    <button
                      onClick={() => {
                        window.open("/api/admin/cars?status=ALL", "_blank");
                      }}
                      className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                    >
                      Export Full Inventory JSON
                    </button>
                  </div>

                  <div style={{ background: "#0d0d11", padding: 18, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <h4 style={{ color: "#fff", marginBottom: 6 }}>🔑 Authentication & Secret Rotation</h4>
                    <p style={{ fontSize: 13, color: "#9ca3af" }}>
                      Administrative passwords are encrypted using PBKDF2 with 100,000 SHA-512 rounds. Active tokens are signed with HMAC-SHA256 and stored in HttpOnly SameSite=Lax cookies.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Action / Rejection Dialog Modal */}
        {actionDialog && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCard}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  {actionDialog.action === "REJECTED"
                    ? "Reject Vehicle Listing"
                    : actionDialog.action === "REQUEST_CHANGES"
                    ? "Request Listing Modifications"
                    : "Suspend Vehicle Listing"}
                </h3>
                <button onClick={() => setActionDialog(null)} className={styles.modalClose}>
                  ✕
                </button>
              </div>

              <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
                Listing: <strong>{actionDialog.carCode}</strong>. Please provide a clear reason for the seller or dealer.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Quick Preset Reason</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {[
                    "Blurry or dark photographs",
                    "Missing registration / RC documents",
                    "Unrealistic pricing for market segment",
                    "Contact number unreachable",
                    "Incorrect odometer or fuel specification",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setActionDialog({ ...actionDialog, reason: preset })}
                      className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                      style={{ fontSize: 11 }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <label className={styles.label}>Detailed Justification</label>
                <textarea
                  required
                  rows={3}
                  value={actionDialog.reason}
                  onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
                  className={styles.input}
                  placeholder="Enter reason recorded in audit logs..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setActionDialog(null)}
                  className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleModerateCar(actionDialog.carId, actionDialog.action, actionDialog.reason)
                  }
                  className={`${styles.btnSm} ${
                    actionDialog.action === "REJECTED" ? styles.btnSmReject : styles.btnSmChanges
                  }`}
                >
                  Confirm Action
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Car Detail Preview Modal */}
        {previewCar && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCardWide}>
              <div className={styles.modalHeader}>
                <div>
                  <h3 className={styles.modalTitle}>
                    {previewCar.year} {previewCar.make} {previewCar.model} ({previewCar.listingCode})
                  </h3>
                  <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
                    {previewCar.variant} · {previewCar.locality}, {previewCar.city}
                  </div>
                </div>
                <button onClick={() => setPreviewCar(null)} className={styles.modalClose}>
                  ✕
                </button>
              </div>

              {/* Photos Gallery Carousel */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 320,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#000",
                  }}
                >
                  {previewCar.images && previewCar.images[previewCarImgIdx] ? (
                    <Image
                      src={previewCar.images[previewCarImgIdx]}
                      alt="Car Preview"
                      fill
                      style={{ objectFit: "contain" }}
                      unoptimized
                    />
                  ) : (
                    <div style={{ textAlign: "center", paddingTop: 140, color: "#666" }}>No photo uploaded</div>
                  )}
                </div>

                {previewCar.images && previewCar.images.length > 1 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto" }}>
                    {previewCar.images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewCarImgIdx(i)}
                        style={{
                          width: 60,
                          height: 40,
                          borderRadius: 6,
                          overflow: "hidden",
                          position: "relative",
                          border: previewCarImgIdx === i ? "2px solid #e50914" : "1px solid #333",
                          cursor: "pointer",
                          background: "#000",
                        }}
                      >
                        <Image src={img} alt="Thumb" fill style={{ objectFit: "cover" }} unoptimized />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Specs Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20, fontSize: 13 }}>
                <div style={{ background: "#0d0d11", padding: 12, borderRadius: 8 }}>
                  <span style={{ color: "#8e8e9f", display: "block" }}>Price</span>
                  <strong style={{ color: "#34d399", fontSize: 16 }}>{formatINR(previewCar.priceINR)}</strong>
                </div>
                <div style={{ background: "#0d0d11", padding: 12, borderRadius: 8 }}>
                  <span style={{ color: "#8e8e9f", display: "block" }}>Odometer</span>
                  <strong>{previewCar.kmDriven?.toLocaleString()} km</strong>
                </div>
                <div style={{ background: "#0d0d11", padding: 12, borderRadius: 8 }}>
                  <span style={{ color: "#8e8e9f", display: "block" }}>Fuel / Transmission</span>
                  <strong>{previewCar.fuelType} · {previewCar.transmission}</strong>
                </div>
                <div style={{ background: "#0d0d11", padding: 12, borderRadius: 8 }}>
                  <span style={{ color: "#8e8e9f", display: "block" }}>RTO Registration</span>
                  <strong>{previewCar.rtoCode || "KA-01"} ({previewCar.rtoArea || "Bengaluru"})</strong>
                </div>
                <div style={{ background: "#0d0d11", padding: 12, borderRadius: 8 }}>
                  <span style={{ color: "#8e8e9f", display: "block" }}>Ownership</span>
                  <strong>{previewCar.numOwners || 1} Owner(s)</strong>
                </div>
                <div style={{ background: "#0d0d11", padding: 12, borderRadius: 8 }}>
                  <span style={{ color: "#8e8e9f", display: "block" }}>Insurance Status</span>
                  <strong>{previewCar.insuranceType || "Comprehensive"}</strong>
                </div>
              </div>

              {previewCar.overview && (
                <div style={{ background: "#0d0d11", padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 13, color: "#d1d5db" }}>
                  <strong style={{ color: "#fff", display: "block", marginBottom: 4 }}>Seller Description:</strong>
                  {previewCar.overview}
                </div>
              )}

              {/* Moderation Actions Inside Preview */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setPreviewCar(null)}
                  className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                >
                  Close Preview
                </button>
                {previewCar.status === "PENDING_APPROVAL" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleModerateCar(previewCar.id, "APPROVED");
                        setPreviewCar(null);
                      }}
                      className={`${styles.btnSm} ${styles.btnSmApprove}`}
                    >
                      ✓ Approve Listing
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = previewCar;
                        setPreviewCar(null);
                        setActionDialog({
                          carId: target.id,
                          carCode: target.listingCode,
                          action: "REQUEST_CHANGES",
                          reason: "",
                        });
                      }}
                      className={`${styles.btnSm} ${styles.btnSmChanges}`}
                    >
                      ✏️ Request Changes
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lead Detail & Assignment Modal */}
        {leadEditModal && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCard} style={{ maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }}>
              <div className={styles.modalHeader}>
                <div>
                  <h3 className={styles.modalTitle}>Centralized CRM Operations</h3>
                  <div style={{ fontSize: 12, color: "#38bdf8", marginTop: 2 }}>
                    Ref: <strong>{leadEditModal.enquiryCode || leadEditModal.id}</strong>
                  </div>
                </div>
                <button onClick={() => setLeadEditModal(null)} className={styles.modalClose}>
                  ✕
                </button>
              </div>

              {/* Buyer & Vehicle Summary */}
              <div style={{ background: "#0d0d11", padding: 14, borderRadius: 8, marginBottom: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h4 style={{ color: "#fff", marginBottom: 2 }}>
                      {leadEditModal.buyerName}{" "}
                      {leadEditModal.phoneVerified ? (
                        <span style={{ fontSize: 11, background: "rgba(16,185,129,0.2)", color: "#10b981", padding: "2px 6px", borderRadius: 4 }}>
                          ✓ Phone Verified
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, background: "rgba(239,68,68,0.2)", color: "#f87171", padding: "2px 6px", borderRadius: 4 }}>
                          Unverified
                        </span>
                      )}
                    </h4>
                    <div style={{ fontSize: 13, color: "#9ca3af" }}>
                      📞 {leadEditModal.buyerPhone} · {leadEditModal.buyerEmail || "No email"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={styles.badge} style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8" }}>
                      {leadEditModal.enquiryType}
                    </span>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                      Channel: {leadEditModal.preferredContactMethod || "WHATSAPP"}
                      {leadEditModal.consentNoticeVersion && ` · Consent: ${leadEditModal.consentNoticeVersion}`}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "#cbd5e1" }}>
                  🚗 <strong>Vehicle:</strong> {leadEditModal.carTitle || "General Enquiry"}{" "}
                  <span style={{ color: "#9ca3af" }}>({leadEditModal.carId})</span>
                  {leadEditModal.campaignSource && (
                    <div style={{ color: "#9ca3af", marginTop: 2 }}>
                      Source: {leadEditModal.campaignSource} {leadEditModal.campaignMedium && `· Medium: ${leadEditModal.campaignMedium}`}
                    </div>
                  )}
                  {leadEditModal.message && (
                    <div style={{ marginTop: 6, fontStyle: "italic", color: "#e2e8f0", background: "rgba(255,255,255,0.03)", padding: 8, borderRadius: 6 }}>
                      &ldquo;{leadEditModal.message}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* 1. Pipeline Status & Assignment */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.label}>Pipeline Stage</label>
                  <select
                    value={leadStatusInput}
                    onChange={(e) => setLeadStatusInput(e.target.value as EnquiryStatus)}
                    className={styles.filterSelect}
                    style={{ width: "100%", padding: "8px 10px" }}
                  >
                    <option value="NEW">1. NEW</option>
                    <option value="CONTACT_ATTEMPTED">2. CONTACT ATTEMPTED</option>
                    <option value="QUALIFIED">3. QUALIFIED</option>
                    <option value="DEALER_COORDINATION">4. DEALER COORDINATION</option>
                    <option value="TEST_DRIVE_SCHEDULED">5. TEST DRIVE SCHEDULED</option>
                    <option value="NEGOTIATION">6. NEGOTIATION</option>
                    <option value="BOOKING_IN_PROGRESS">7. BOOKING IN PROGRESS</option>
                    <option value="SOLD">8. SOLD (WON)</option>
                    <option value="LOST">9. LOST</option>
                    <option value="CANCELLED">10. CANCELLED</option>
                  </select>
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.label}>Assign to Staff or Dealer ID</label>
                  <input
                    type="text"
                    value={leadAssignInput}
                    onChange={(e) => setLeadAssignInput(e.target.value)}
                    className={styles.input}
                    placeholder="e.g. founder, operations_team, or dealer-01"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Next Follow-Up Date & Time</label>
                <input
                  type="datetime-local"
                  value={leadFollowUpDate}
                  onChange={(e) => setLeadFollowUpDate(e.target.value)}
                  className={styles.input}
                />
              </div>

              {/* Conditional: Lost or Cancelled Reason */}
              {leadStatusInput === "LOST" && (
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ color: "#f87171" }}>
                    Reason Lead is Lost *
                  </label>
                  <input
                    type="text"
                    value={leadLossReason}
                    onChange={(e) => setLeadLossReason(e.target.value)}
                    className={styles.input}
                    placeholder="e.g. Purchased rival car, budget mismatch, unreachable..."
                  />
                </div>
              )}

              {leadStatusInput === "CANCELLED" && (
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ color: "#f87171" }}>
                    Cancellation Reason *
                  </label>
                  <input
                    type="text"
                    value={leadCancelledReason}
                    onChange={(e) => setLeadCancelledReason(e.target.value)}
                    className={styles.input}
                    placeholder="e.g. Buyer changed mind, duplicate submission..."
                  />
                </div>
              )}

              {/* Conditional: Sale Attribution */}
              {(leadStatusInput === "SOLD" || leadStatusInput === "CONVERTED") && (
                <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 8 }}>
                    🎉 Sale Attribution & Commercial Outcome
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label className={styles.label} style={{ fontSize: 11 }}>Final Vehicle Sale Price (₹)</label>
                      <input
                        type="number"
                        value={leadSaleAmount}
                        onChange={(e) => setLeadSaleAmount(e.target.value)}
                        className={styles.input}
                        placeholder="e.g. 850000"
                      />
                    </div>
                    <div>
                      <label className={styles.label} style={{ fontSize: 11 }}>WowCars Commission Earned (₹)</label>
                      <input
                        type="number"
                        value={leadSaleCommission}
                        onChange={(e) => setLeadSaleCommission(e.target.value)}
                        className={styles.input}
                        placeholder="e.g. 15000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Contact Attempt Logger */}
              <div style={{ background: "#0b0b0e", border: "1px solid rgba(255,255,255,0.05)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>
                  📞 Log Contact Attempt
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                  <div>
                    <label className={styles.label} style={{ fontSize: 11 }}>Channel</label>
                    <select
                      value={leadAttemptChannel}
                      onChange={(e) => setLeadAttemptChannel(e.target.value as "PHONE" | "WHATSAPP" | "EMAIL")}
                      className={styles.filterSelect}
                      style={{ width: "100%", padding: "6px 8px" }}
                    >
                      <option value="PHONE">Phone Call</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className={styles.label} style={{ fontSize: 11 }}>Call Outcome</label>
                    <select
                      value={leadAttemptOutcome}
                      onChange={(e) => setLeadAttemptOutcome(e.target.value as "REACHED" | "NO_ANSWER" | "BUSY" | "CALLBACK_REQUESTED" | "WRONG_NUMBER")}
                      className={styles.filterSelect}
                      style={{ width: "100%", padding: "6px 8px" }}
                    >
                      <option value="REACHED">Reached / Spoke</option>
                      <option value="CALLBACK_REQUESTED">Callback Requested</option>
                      <option value="NO_ANSWER">No Answer</option>
                      <option value="BUSY">Line Busy</option>
                      <option value="WRONG_NUMBER">Wrong Number</option>
                    </select>
                  </div>
                </div>
                <input
                  type="text"
                  value={leadAttemptNotes}
                  onChange={(e) => setLeadAttemptNotes(e.target.value)}
                  className={styles.input}
                  placeholder="Attempt notes (e.g. Customer asked to call back Saturday 2pm)..."
                />
              </div>

              {/* 3. Internal Confidential Notes */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  🔒 Internal Staff Note <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Strictly hidden from dealers & buyers)</span>
                </label>
                <textarea
                  rows={2}
                  value={leadInternalNote}
                  onChange={(e) => setLeadInternalNote(e.target.value)}
                  className={styles.input}
                  placeholder="Add confidential note for WowCars team..."
                />
              </div>

              {/* History / Audit Log Display */}
              {((leadEditModal.contactAttempts && leadEditModal.contactAttempts.length > 0) ||
                (leadEditModal.internalNotes && leadEditModal.internalNotes.length > 0) ||
                (leadEditModal.contactNotes && leadEditModal.contactNotes.length > 0)) && (
                <div style={{ background: "#070709", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
                  <strong style={{ color: "#9ca3af", display: "block", marginBottom: 6 }}>Recent History & Contact Log:</strong>
                  {leadEditModal.contactAttempts?.map((att, idx) => (
                    <div key={`att-${idx}`} style={{ color: "#cbd5e1", marginBottom: 4, display: "flex", gap: 6 }}>
                      <span style={{ color: "#38bdf8" }}>[{new Date(att.timestamp).toLocaleDateString()}]</span>
                      <strong>{att.channel} ({att.outcome}):</strong>
                      <span>{att.notes || "No notes"}</span>
                      <span style={{ color: "#64748b" }}>by @{att.agentUsername || "Staff"}</span>
                    </div>
                  ))}
                  {leadEditModal.internalNotes?.map((inote, idx) => (
                    <div key={`inote-${idx}`} style={{ color: "#fbbf24", marginBottom: 4 }}>
                      🔒 {inote}
                    </div>
                  ))}
                  {leadEditModal.contactNotes?.map((note, idx) => (
                    <div key={`cnote-${idx}`} style={{ color: "#9ca3af", marginBottom: 4 }}>
                      • {note}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setLeadEditModal(null)}
                  className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateEnquiry(leadEditModal.id, {
                      status: leadStatusInput,
                      assignedTo: leadAssignInput,
                      followUpDate: leadFollowUpDate || undefined,
                      lossReason: leadStatusInput === "LOST" ? leadLossReason : undefined,
                      cancelledReason: leadStatusInput === "CANCELLED" ? leadCancelledReason : undefined,
                      saleOutcome: (leadStatusInput === "SOLD" || leadStatusInput === "CONVERTED") && leadSaleAmount ? {
                        amountINR: Number(leadSaleAmount),
                        commissionINR: leadSaleCommission ? Number(leadSaleCommission) : undefined,
                        soldDate: new Date().toISOString(),
                      } : undefined,
                      contactAttempt: leadAttemptNotes ? {
                        channel: leadAttemptChannel,
                        outcome: leadAttemptOutcome,
                        notes: leadAttemptNotes,
                      } : undefined,
                      internalNote: leadInternalNote || undefined,
                      contactNotes: leadNoteInput || undefined,
                    });
                  }}
                  className={`${styles.btnSm} ${styles.btnSmApprove}`}
                >
                  Save Updates
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Onboard New Dealer Modal */}
        {showNewDealerModal && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCard}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Onboard Partner Dealership</h3>
                <button onClick={() => setShowNewDealerModal(false)} className={styles.modalClose}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateDealer}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Dealership Business Name</label>
                  <input
                    type="text"
                    required
                    value={newDealerForm.name}
                    onChange={(e) => setNewDealerForm({ ...newDealerForm, name: e.target.value })}
                    className={styles.input}
                    placeholder="e.g. Prime Wheels Bengaluru"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Bengaluru Locality / Area</label>
                  <input
                    type="text"
                    required
                    value={newDealerForm.locality}
                    onChange={(e) => setNewDealerForm({ ...newDealerForm, locality: e.target.value })}
                    className={styles.input}
                    placeholder="e.g. Indiranagar, Koramangala, Whitefield"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Physical Showroom Address</label>
                  <input
                    type="text"
                    required
                    value={newDealerForm.address}
                    onChange={(e) => setNewDealerForm({ ...newDealerForm, address: e.target.value })}
                    className={styles.input}
                    placeholder="100 Feet Rd, Indiranagar, Bengaluru"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Official WhatsApp Contact Number</label>
                  <input
                    type="text"
                    required
                    value={newDealerForm.whatsappNumber}
                    onChange={(e) => setNewDealerForm({ ...newDealerForm, whatsappNumber: e.target.value })}
                    className={styles.input}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Established Year</label>
                    <input
                      type="number"
                      required
                      value={newDealerForm.establishedYear}
                      onChange={(e) =>
                        setNewDealerForm({ ...newDealerForm, establishedYear: parseInt(e.target.value, 10) || 2021 })
                      }
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Verification Status</label>
                    <select
                      value={newDealerForm.isVerified ? "true" : "false"}
                      onChange={(e) =>
                        setNewDealerForm({ ...newDealerForm, isVerified: e.target.value === "true" })
                      }
                      className={styles.input}
                    >
                      <option value="true">Verified Partner (Live)</option>
                      <option value="false">Pending KYC Review</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setShowNewDealerModal(false)}
                    className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={onboardingDealer} className={`${styles.btnSm} ${styles.btnSmApprove}`}>
                    {onboardingDealer ? "Creating..." : "Confirm & Save Dealer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Staff Account Modal */}
        {showNewUserModal && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCard}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Provision New Staff Account</h3>
                <button onClick={() => setShowNewUserModal(false)} className={styles.modalClose}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Username</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    className={styles.input}
                    placeholder="e.g. rahul_ops"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.fullName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                    className={styles.input}
                    placeholder="Rahul Sharma"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className={styles.input}
                    placeholder="rahul@wowcars.in"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Temporary Password (min 8 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className={styles.input}
                    placeholder="Set strong initial password"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Role & Permissions</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as AdminRole })}
                    className={styles.input}
                  >
                    <option value="OPERATIONS">Operations Admin (Full Moderation)</option>
                    <option value="DEALER_MANAGER">Dealer Manager (KYC & Dealerships)</option>
                    <option value="SUPPORT">Support Staff (Leads & Inquiries)</option>
                    <option value="SUPER_ADMIN">Super Admin (Full System Access)</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setShowNewUserModal(false)}
                    className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={creatingUser} className={`${styles.btnSm} ${styles.btnSmApprove}`}>
                    {creatingUser ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
