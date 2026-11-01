"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Dealer.module.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/common/PageHero";
import DashboardStatCard from "@/components/common/DashboardStatCard";
import CTASection from "@/components/common/CTASection";
import { Car, Enquiry } from "@/lib/db/types";

interface DealerProfile {
  id: string;
  name: string;
  slug: string;
  legalBusinessName?: string;
  gstin?: string;
  pan?: string;
  authorizedSignatory?: string;
  contactEmail?: string;
  whatsappNumber: string;
  stateId?: string;
  stateName?: string;
  districtId?: string;
  districtName?: string;
  cityId?: string;
  cityName?: string;
  pincode?: string;
  locality: string;
  address: string;
  isVerified: boolean;
  approvalStatus?: string;
  listingEnabled?: boolean;
  accountStatus?: string;
  speciality?: string;
  inventoryCount: number;
  enquiriesCount: number;
}

interface MarketplaceCar {
  id: string;
  listingCode: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  priceINR: number;
  kmDriven: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  color?: string;
  city: string;
  locality: string;
  status: string;
  images: string[];
  isOwnListing: boolean;
  dealerName?: string;
  dealerId?: string;
}

export default function DealerPortalPage() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [dealer, setDealer] = useState<DealerProfile | null>(null);

  // Login form
  const [loginUsername, setLoginUsername] = useState("sri-balaji-motors");
  const [loginPassword, setLoginPassword] = useState("dealer123");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Portal State
  const [activeTab, setActiveTab] = useState<"inventory" | "marketplace" | "enquiries" | "profile">("inventory");
  const [cars, setCars] = useState<Car[]>([]);
  const [marketplaceCars, setMarketplaceCars] = useState<MarketplaceCar[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Marketplace Filters
  const [mpSearch, setMpSearch] = useState("");
  const [mpCityFilter, setMpCityFilter] = useState("ALL");
  const [mpFuelFilter, setMpFuelFilter] = useState("ALL");
  const [mpTransFilter, setMpTransFilter] = useState("ALL");
  const [mpBudgetFilter, setMpBudgetFilter] = useState("ALL");
  const [mpAvailabilityFilter, setMpAvailabilityFilter] = useState("ALL");
  const [mpOwnershipFilter, setMpOwnershipFilter] = useState<"ALL" | "OWN" | "NETWORK">("ALL");

  // Add Car Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingCar, setSubmittingCar] = useState(false);
  const [addCarForm, setAddCarForm] = useState({
    make: "Hyundai",
    model: "Creta",
    variant: "1.5 SX (O) Turbo Petrol DCT",
    year: "2022",
    priceINR: "1650000",
    kmDriven: "28500",
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "SUV",
    color: "Titan Grey",
    numOwners: "1",
    overview: "Pristine single owner automatic SUV with complete authorized service record.",
  });

  // Edit Car Modal
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editKm, setEditKm] = useState("");
  const [editOverview, setEditOverview] = useState("");
  const [savingCarEdit, setSavingCarEdit] = useState(false);

  // Location correction form
  const [correctionState, setCorrectionState] = useState("");
  const [correctionDistrict, setCorrectionDistrict] = useState("");
  const [correctionCity, setCorrectionCity] = useState("");
  const [correctionPincode, setCorrectionPincode] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  const loadDealerData = useCallback(async () => {
    try {
      const [profileRes, invRes, mpRes, enqRes] = await Promise.all([
        fetch("/api/dealer/profile"),
        fetch("/api/dealer/inventory"),
        fetch("/api/dealer/inventory?scope=marketplace"),
        fetch("/api/dealer/enquiries"),
      ]);

      if (profileRes.ok) {
        const pJson = await profileRes.json();
        setDealer(pJson.dealer);
      }
      if (invRes.ok) {
        const iJson = await invRes.json();
        setCars(iJson.cars || []);
      }
      if (mpRes.ok) {
        const mJson = await mpRes.json();
        setMarketplaceCars(mJson.cars || []);
      }
      if (enqRes.ok) {
        const eJson = await enqRes.json();
        setEnquiries(eJson.enquiries || []);
      }
    } catch (err) {
      console.error("Dealer data load error:", err);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = await res.json();
        if (json.authenticated && json.role === "DEALER") {
          setAuthenticated(true);
          loadDealerData();
        } else {
          setAuthenticated(false);
        }
      } else {
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setLoadingAuth(false);
    }
  }, [loadDealerData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAuth();
    }, 0);
    return () => clearTimeout(timer);
  }, [checkAuth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Login failed");
      }

      if (json.role !== "DEALER") {
        throw new Error("Logged in account is not a dealership account.");
      }

      setAuthenticated(true);
      await loadDealerData();
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAuthenticated(false);
      setDealer(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealer?.listingEnabled) {
      alert("Listing permission required. Your dealership must be approved and authorized for vehicle listings by WowCars administrators before submitting vehicles.");
      return;
    }

    setSubmittingCar(true);
    setActionMessage(null);

    try {
      const res = await fetch("/api/dealer/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addCarForm),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add vehicle");
      }

      setShowAddModal(false);
      setActionMessage("Vehicle submitted successfully! It has been queued for WowCars moderation before going public.");
      await loadDealerData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add car");
    } finally {
      setSubmittingCar(false);
    }
  };

  const handleUpdateCarStatus = async (carId: string, status: "SOLD" | "UNAVAILABLE") => {
    if (!dealer?.listingEnabled) {
      alert("Listing permission required. Please contact WowCars administrators.");
      return;
    }

    try {
      const res = await fetch(`/api/dealer/inventory/${carId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update vehicle status");
      }

      setActionMessage(`Vehicle ${status === "SOLD" ? "marked as Sold" : "hidden/marked Unavailable"}.`);
      await loadDealerData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating vehicle status");
    }
  };

  const openEditModal = (car: Car) => {
    setEditingCar(car);
    setEditPrice(String(car.priceINR));
    setEditKm(String(car.kmDriven));
    setEditOverview(car.overview || "");
  };

  const handleSaveCarEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCar) return;

    if (!dealer?.listingEnabled) {
      alert("Listing permission required. Please contact WowCars administrators.");
      return;
    }

    setSavingCarEdit(true);
    try {
      const res = await fetch(`/api/dealer/inventory/${editingCar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceINR: Number(editPrice),
          kmDriven: Number(editKm),
          overview: editOverview,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update vehicle details");
      }

      setEditingCar(null);
      setActionMessage(`Vehicle ${editingCar.listingCode} updated successfully.`);
      await loadDealerData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating vehicle details");
    } finally {
      setSavingCarEdit(false);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCorrection(true);
    setActionMessage(null);

    try {
      const res = await fetch("/api/dealer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateId: correctionState.trim(),
          districtId: correctionDistrict.trim(),
          city: correctionCity.trim(),
          pincode: correctionPincode.trim(),
          reason: correctionReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit correction request");
      }

      setActionMessage("Location correction request submitted to WowCars operations team.");
      setCorrectionReason("");
      await loadDealerData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error submitting request");
    } finally {
      setSubmittingCorrection(false);
    }
  };

  // Filtered Marketplace Cars
  const filteredMarketplaceCars = useMemo(() => {
    return marketplaceCars.filter((c) => {
      // Search
      if (mpSearch) {
        const q = mpSearch.toLowerCase();
        const matches =
          c.make.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q) ||
          c.variant.toLowerCase().includes(q) ||
          c.listingCode.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          (c.dealerName && c.dealerName.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // City
      if (mpCityFilter !== "ALL" && c.city.toLowerCase() !== mpCityFilter.toLowerCase()) {
        return false;
      }

      // Fuel
      if (mpFuelFilter !== "ALL" && c.fuelType.toLowerCase() !== mpFuelFilter.toLowerCase()) {
        return false;
      }

      // Transmission
      if (mpTransFilter !== "ALL" && c.transmission.toLowerCase() !== mpTransFilter.toLowerCase()) {
        return false;
      }

      // Budget
      if (mpBudgetFilter === "under-8" && c.priceINR >= 800000) return false;
      if (mpBudgetFilter === "8-15" && (c.priceINR < 800000 || c.priceINR > 1500000)) return false;
      if (mpBudgetFilter === "above-15" && c.priceINR <= 1500000) return false;

      // Availability
      if (mpAvailabilityFilter === "AVAILABLE" && c.status === "SOLD") return false;
      if (mpAvailabilityFilter === "SOLD" && c.status !== "SOLD") return false;

      // Ownership filter
      if (mpOwnershipFilter === "OWN" && !c.isOwnListing) return false;
      if (mpOwnershipFilter === "NETWORK" && c.isOwnListing) return false;

      return true;
    });
  }, [
    marketplaceCars,
    mpSearch,
    mpCityFilter,
    mpFuelFilter,
    mpTransFilter,
    mpBudgetFilter,
    mpAvailabilityFilter,
    mpOwnershipFilter,
  ]);

  // Unique cities in marketplace
  const marketplaceCities = useMemo(() => {
    const set = new Set<string>();
    marketplaceCars.forEach((c) => {
      if (c.city) set.add(c.city);
    });
    return Array.from(set).sort();
  }, [marketplaceCars]);

  if (loadingAuth) {
    return (
      <div className={styles.dealerPage}>
        <Navbar />
        <div className={styles.container} style={{ textAlign: "center", padding: "120px 0", minHeight: "60vh" }}>
          <p style={{ color: "#9ca3af", fontSize: "1.1rem" }}>Verifying secure dealership session...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!authenticated || !dealer) {
    return (
      <div className={styles.dealerPage}>
        <Navbar />

        <PageHero
          badge="B2B Dealership Network"
          title="Authorized Dealership Portal"
          subtitle="Secure access for verified multi-brand pre-owned dealerships. Manage listings, monitor 140-point inspection status, review qualified buyer enquiries, and access nationwide dealer-to-dealer trade inventory."
          stats={[
            { label: "Verified Dealers", value: "180+" },
            { label: "Inspection", value: "140-Point" },
            { label: "SLA Support", value: "Dedicated" },
            { label: "Portal Access", value: "24x7" },
          ]}
          staffImage="/images/staff-franchise-b2b.jpg"
          staffName="Arjun Sharma"
          staffRole="Head of B2B & Dealership Network"
          staffContext="Authorized Partner Verification & Inventory Lead"
        />

        <div className={styles.container} style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
          <div className={styles.loginWrapper}>
            <div className={styles.loginCard}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 40 }}>🏢</span>
              </div>
              <h1 className={styles.loginTitle}>Partner Dealership Portal</h1>
              <p className={styles.loginSubtitle}>
                Private portal for authorized used-car dealerships on the WowCars India Network
              </p>

              {loginError && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid #ef4444",
                    borderRadius: 8,
                    color: "#fca5a5",
                    fontSize: 13,
                    marginBottom: 20,
                  }}
                >
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Dealership ID / Username</label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className={styles.input}
                    placeholder="e.g. sri-balaji-motors or dealer-1"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Enter account password"
                  />
                </div>

                <button type="submit" disabled={loggingIn} className={styles.loginBtn}>
                  {loggingIn ? "Verifying..." : "Sign In to Dealer Portal"}
                </button>
              </form>

              <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "#8e8e9f" }}>
                Need help or partner onboarding? Contact <strong style={{ color: "#ffffff" }}>partners@wowcars.in</strong>
              </div>
            </div>
          </div>
        </div>

        <CTASection
          title="Looking to Onboard Your Dealership or Expand Your Lot?"
          subtitle="Join 180+ verified multi-brand dealerships leveraging WowCars digital 140-point certification and instant buyer financing."
          primaryAction={{
            label: "Speak with B2B Partnerships",
            href: "tel:+919880123456",
          }}
          secondaryAction={{
            label: "Explore Retail Inventory",
            href: "/cars",
          }}
          variant="black"
        />

        <Footer />
      </div>
    );
  }

  const activeCarsCount = cars.filter((c) => c.status === "ACTIVE" || c.status === "APPROVED").length;
  const pendingCarsCount = cars.filter(
    (c) => c.status === "PENDING_APPROVAL" || c.status === "PENDING_REVIEW" || c.status === "CHANGES_REQUESTED"
  ).length;
  const soldCarsCount = cars.filter((c) => c.status === "SOLD" || c.status === "UNAVAILABLE").length;

  return (
    <div className={styles.dealerPage}>
      <Navbar />

      <PageHero
        badge="Partner Dealership Portal"
        title={dealer.name}
        subtitle={`${dealer.locality}, ${dealer.cityName || "Bengaluru"} · ${dealer.isVerified ? "Verified Partner Dealership" : "Registered Partner"} with full inventory, inspection moderation, and qualified buyer lead management.`}
        stats={[
          { label: "My Inventory", value: `${cars.length}` },
          { label: "Network Cars", value: `${marketplaceCars.length}` },
          { label: "Live Listed", value: `${activeCarsCount}` },
          { label: "In Moderation", value: `${pendingCarsCount}` },
        ]}
        staffImage="/images/staff-franchise-b2b.jpg"
        staffName="Arjun Sharma"
        staffRole="Head of B2B & Dealership Network"
        staffContext="Your Dedicated Dealership Success Representative"
      />

      <div className={styles.container} style={{ paddingTop: "2rem" }}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>🏢</span>
              <div>
                <h1 className={styles.headerTitle}>{dealer.name}</h1>
                <p className={styles.headerSubtitle}>
                  {dealer.locality}, {dealer.cityName || "Bengaluru"} · {dealer.districtName || "Bengaluru Urban"}
                  {dealer.isVerified && (
                    <span className={`${styles.badge} ${styles.badgeApproved}`} style={{ marginLeft: 8 }}>
                      ✓ Verified Dealer
                    </span>
                  )}
                  {dealer.listingEnabled ? (
                    <span className={`${styles.badge} ${styles.badgeApproved}`} style={{ marginLeft: 8, background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>
                      ✓ Listing Enabled
                    </span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgePending}`} style={{ marginLeft: 8, background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" }}>
                      Listing Pending Authorization
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/" target="_blank" className={styles.btnSecondary} style={{ textDecoration: "none" }}>
              🌐 Public Site
            </Link>
            <button onClick={handleLogout} className={styles.btnSecondary}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Global Feedback Banner */}
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

        {/* Listing Permission Warning if not enabled */}
        {!dealer.listingEnabled && (
          <div
            style={{
              padding: "14px 18px",
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              borderRadius: 8,
              color: "#fcd34d",
              marginBottom: 20,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <strong>Listing Permission Pending Authorization:</strong> Your dealership account is active, but vehicle listing permission has not yet been authorized by WowCars administrators. You can browse all approved marketplace vehicles, but new listing submissions are paused until authorized.
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <DashboardStatCard
            title="My Dealership Cars"
            value={cars.length}
            subtitle="Current lot count"
            variant="highlight"
          />
          <DashboardStatCard
            title="All Network Vehicles"
            value={marketplaceCars.length}
            subtitle="PAN-India marketplace"
            variant="default"
          />
          <DashboardStatCard
            title="Live & Listed"
            value={activeCarsCount}
            subtitle="Visible to buyers"
            variant="success"
          />
          <DashboardStatCard
            title="Under Moderation"
            value={pendingCarsCount}
            subtitle="Inspection review"
            variant={pendingCarsCount > 0 ? "danger" : "default"}
          />
          <DashboardStatCard
            title="Sold / Offline"
            value={soldCarsCount}
            subtitle="Completed sales"
            variant="default"
          />
          <DashboardStatCard
            title="Assigned Buyer Leads"
            value={enquiries.length}
            subtitle="Direct customer leads"
            variant="default"
          />
        </div>

        {/* Tabs Bar */}
        <div className={styles.tabsBar}>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`${styles.tabBtn} ${activeTab === "inventory" ? styles.tabBtnActive : ""}`}
          >
            🚗 My Inventory ({cars.length})
          </button>
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`${styles.tabBtn} ${activeTab === "marketplace" ? styles.tabBtnActive : ""}`}
          >
            🌐 All Network Vehicles ({marketplaceCars.length})
          </button>
          <button
            onClick={() => setActiveTab("enquiries")}
            className={`${styles.tabBtn} ${activeTab === "enquiries" ? styles.tabBtnActive : ""}`}
          >
            📩 Assigned Inquiries ({enquiries.length})
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`${styles.tabBtn} ${activeTab === "profile" ? styles.tabBtnActive : ""}`}
          >
            🏢 Dealership Compliance & KYC
          </button>
        </div>

        {/* TAB 1: MY INVENTORY */}
        {activeTab === "inventory" && (
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>My Dealership Inventory</h2>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0 0" }}>
                  All additions are reviewed by WowCars moderators before appearing on the public marketplace.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!dealer.listingEnabled) {
                    alert("Vehicle listing authorization required. Please contact WowCars operations.");
                    return;
                  }
                  setShowAddModal(true);
                }}
                disabled={!dealer.listingEnabled}
                className={styles.btnPrimary}
                style={{ opacity: dealer.listingEnabled ? 1 : 0.5, cursor: dealer.listingEnabled ? "pointer" : "not-allowed" }}
                title={dealer.listingEnabled ? "Add New Vehicle" : "Listing permission required"}
              >
                + Add Vehicle
              </button>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Ref Code</th>
                    <th>Vehicle Details</th>
                    <th>Price</th>
                    <th>Kilometers</th>
                    <th>Moderation Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "#8e8e9f" }}>
                        No vehicles currently uploaded. Click &ldquo;+ Add Vehicle&rdquo; to add your first car.
                      </td>
                    </tr>
                  ) : (
                    cars.map((car) => {
                      const isActive = car.status === "ACTIVE" || car.status === "APPROVED";
                      const isPending =
                        car.status === "PENDING_APPROVAL" ||
                        car.status === "PENDING_REVIEW" ||
                        car.status === "CHANGES_REQUESTED";

                      return (
                        <tr key={car.id}>
                          <td>
                            <strong style={{ color: "#38bdf8" }}>{car.listingCode}</strong>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: "#ffffff" }}>
                              {car.year} {car.make} {car.model}
                            </div>
                            <div style={{ fontSize: 12, color: "#9ca3af" }}>
                              {car.variant} · {car.fuelType} · {car.transmission}
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: "#ffffff" }}>
                              ₹{(car.priceINR / 100000).toFixed(2)} Lakh
                            </strong>
                          </td>
                          <td>{car.kmDriven?.toLocaleString()} km</td>
                          <td>
                            <span
                              className={`${styles.badge} ${
                                isActive
                                  ? styles.badgeApproved
                                  : isPending
                                  ? styles.badgePending
                                  : styles.badgeSold
                              }`}
                            >
                              {car.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => openEditModal(car)}
                                className={styles.btnSecondary}
                                title="Edit Price & Details"
                              >
                                Edit
                              </button>
                              {car.status !== "SOLD" && (
                                <button
                                  onClick={() => handleUpdateCarStatus(car.id, "SOLD")}
                                  className={styles.btnSecondary}
                                  title="Mark as Sold"
                                >
                                  Mark Sold
                                </button>
                              )}
                              {car.status !== "UNAVAILABLE" && (
                                <button
                                  onClick={() => handleUpdateCarStatus(car.id, "UNAVAILABLE")}
                                  className={styles.btnSecondary}
                                  title="Mark as Unavailable"
                                >
                                  Hide
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

        {/* TAB 2: ALL MARKETPLACE VEHICLES (Cross-Dealership Browsing) */}
        {activeTab === "marketplace" && (
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                  All Approved Network Vehicles ({filteredMarketplaceCars.length})
                </h2>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0 0" }}>
                  Browse all approved and publicly visible vehicles across WowCars partner dealerships in India.
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Ownership Filter:</span>
                <select
                  value={mpOwnershipFilter}
                  onChange={(e) => setMpOwnershipFilter(e.target.value as "ALL" | "OWN" | "NETWORK")}
                  className={styles.select}
                  style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}
                >
                  <option value="ALL">All Network Vehicles</option>
                  <option value="OWN">My Vehicles Only</option>
                  <option value="NETWORK">Other Dealerships</option>
                </select>
              </div>
            </div>

            {/* Filter Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
                background: "rgba(255, 255, 255, 0.02)",
                padding: 14,
                borderRadius: 8,
                marginBottom: 16,
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div>
                <label className={styles.label} style={{ fontSize: 11 }}>Search Make / Model</label>
                <input
                  type="text"
                  placeholder="e.g. Creta, City, SUV..."
                  value={mpSearch}
                  onChange={(e) => setMpSearch(e.target.value)}
                  className={styles.input}
                  style={{ padding: "8px 10px", fontSize: 13 }}
                />
              </div>

              <div>
                <label className={styles.label} style={{ fontSize: 11 }}>City / Town</label>
                <select
                  value={mpCityFilter}
                  onChange={(e) => setMpCityFilter(e.target.value)}
                  className={styles.select}
                  style={{ padding: "8px 10px", fontSize: 13 }}
                >
                  <option value="ALL">All Cities</option>
                  {marketplaceCities.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={styles.label} style={{ fontSize: 11 }}>Fuel Type</label>
                <select
                  value={mpFuelFilter}
                  onChange={(e) => setMpFuelFilter(e.target.value)}
                  className={styles.select}
                  style={{ padding: "8px 10px", fontSize: 13 }}
                >
                  <option value="ALL">All Fuel Types</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric</option>
                  <option value="CNG">CNG</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className={styles.label} style={{ fontSize: 11 }}>Transmission</label>
                <select
                  value={mpTransFilter}
                  onChange={(e) => setMpTransFilter(e.target.value)}
                  className={styles.select}
                  style={{ padding: "8px 10px", fontSize: 13 }}
                >
                  <option value="ALL">All Transmissions</option>
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                </select>
              </div>

              <div>
                <label className={styles.label} style={{ fontSize: 11 }}>Price Range</label>
                <select
                  value={mpBudgetFilter}
                  onChange={(e) => setMpBudgetFilter(e.target.value)}
                  className={styles.select}
                  style={{ padding: "8px 10px", fontSize: 13 }}
                >
                  <option value="ALL">Any Budget</option>
                  <option value="under-8">Under ₹8 Lakhs</option>
                  <option value="8-15">₹8 Lakhs – ₹15 Lakhs</option>
                  <option value="above-15">Above ₹15 Lakhs</option>
                </select>
              </div>

              <div>
                <label className={styles.label} style={{ fontSize: 11 }}>Availability</label>
                <select
                  value={mpAvailabilityFilter}
                  onChange={(e) => setMpAvailabilityFilter(e.target.value)}
                  className={styles.select}
                  style={{ padding: "8px 10px", fontSize: 13 }}
                >
                  <option value="ALL">All Listings</option>
                  <option value="AVAILABLE">Available Only</option>
                  <option value="SOLD">Sold Only</option>
                </select>
              </div>
            </div>

            {/* Marketplace Table */}
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Ref Code</th>
                    <th>Vehicle Details</th>
                    <th>Price</th>
                    <th>Kilometers</th>
                    <th>Location</th>
                    <th>Listed By</th>
                    <th>Ownership</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarketplaceCars.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "#8e8e9f" }}>
                        No approved vehicles match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMarketplaceCars.map((car) => {
                      return (
                        <tr key={car.id}>
                          <td>
                            <strong style={{ color: "#38bdf8" }}>{car.listingCode}</strong>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {car.images && car.images[0] && (
                                <Image
                                  src={car.images[0]}
                                  alt={car.make}
                                  width={48}
                                  height={36}
                                  style={{ borderRadius: 4, objectFit: "cover" }}
                                />
                              )}
                              <div>
                                <div style={{ fontWeight: 600, color: "#ffffff" }}>
                                  {car.year} {car.make} {car.model}
                                </div>
                                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                                  {car.variant} · {car.fuelType} · {car.transmission}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: "#ffffff" }}>
                              ₹{(car.priceINR / 100000).toFixed(2)} Lakh
                            </strong>
                          </td>
                          <td>{car.kmDriven?.toLocaleString()} km</td>
                          <td>
                            <span style={{ color: "#d1d5db" }}>
                              📍 {car.locality ? `${car.locality}, ` : ""}{car.city || "Bengaluru"}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: "#93c5fd", fontWeight: 500 }}>
                              {car.dealerName || "Verified Dealership"}
                            </span>
                          </td>
                          <td>
                            {car.isOwnListing ? (
                              <span
                                className={`${styles.badge} ${styles.badgeApproved}`}
                                style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}
                              >
                                🏢 Your Listing
                              </span>
                            ) : (
                              <span
                                className={styles.badge}
                                style={{ background: "rgba(148, 163, 184, 0.15)", color: "#cbd5e1" }}
                              >
                                🤝 Network Dealer
                              </span>
                            )}
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

        {/* TAB 3: ASSIGNED ENQUIRIES */}
        {activeTab === "enquiries" && (
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Assigned Buyer Inquiries</h2>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0 0" }}>
                  Customer leads routed by WowCars for vehicle inspection and test drive availability.
                </p>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Customer Name</th>
                    <th>Vehicle Interest</th>
                    <th>Type</th>
                    <th>Preferred Schedule</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiries.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "#8e8e9f" }}>
                        No buyer inquiries assigned yet. Inquiries will appear when buyers request test drives on your cars.
                      </td>
                    </tr>
                  ) : (
                    enquiries.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <span style={{ color: "#38bdf8", fontWeight: 600 }}>
                            {e.enquiryCode || e.id.slice(0, 8)}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: "#ffffff" }}>{e.buyerName}</strong>
                        </td>
                        <td>
                          <div style={{ color: "#f3f4f6" }}>{e.carTitle || "Vehicle"}</div>
                          {e.carListingCode && (
                            <span style={{ fontSize: 11, color: "#9ca3af" }}>Ref: {e.carListingCode}</span>
                          )}
                        </td>
                        <td>
                          <span className={styles.badge}>{e.enquiryType}</span>
                        </td>
                        <td>
                          {e.preferredDate || e.preferredTime ? (
                            <span style={{ fontSize: 13, color: "#e5e7eb" }}>
                              📅 {e.preferredDate || "Any day"} · {e.preferredSlot || e.preferredTime || "Flexible"}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: "#6b7280" }}>Standard Callback</span>
                          )}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${styles.badgeApproved}`}>
                            {e.status}
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

        {/* TAB 4: DEALERSHIP COMPLIANCE PROFILE & KYC */}
        {activeTab === "profile" && (
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Dealership Compliance Profile</h2>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0 0" }}>
                  Verified business records, listing authorization permissions, and location assignments.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 30 }}>
              <div style={{ background: "#18181f", padding: 20, borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", marginTop: 0 }}>Legal Business Entity</h3>
                <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
                  <div>
                    <span style={{ color: "#8e8e9f" }}>Legal Name:</span>{" "}
                    <strong style={{ color: "#f3f4f6" }}>{dealer.legalBusinessName || dealer.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#8e8e9f" }}>GSTIN:</span>{" "}
                    <strong style={{ color: "#f3f4f6" }}>{dealer.gstin || "Not Submitted"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#8e8e9f" }}>PAN:</span>{" "}
                    <strong style={{ color: "#f3f4f6" }}>{dealer.pan || "Not Submitted"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#8e8e9f" }}>Signatory:</span>{" "}
                    <strong style={{ color: "#f3f4f6" }}>{dealer.authorizedSignatory || "Authorized Partner"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#8e8e9f" }}>Official Email:</span>{" "}
                    <strong style={{ color: "#f3f4f6" }}>{dealer.contactEmail || "partners@wowcars.in"}</strong>
                  </div>
                </div>
              </div>

              <div style={{ background: "#18181f", padding: 20, borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", marginTop: 0 }}>Account & Listing Authorization</h3>
                <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
                  <div>
                    <span style={{ color: "#8e8e9f" }}>Account Status:</span>{" "}
                    <span className={`${styles.badge} ${dealer.accountStatus === "ACTIVE" ? styles.badgeApproved : styles.badgeSold}`}>
                      {dealer.accountStatus || "ACTIVE"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#8e8e9f" }}>Listing Permission:</span>{" "}
                    {dealer.listingEnabled ? (
                      <span className={`${styles.badge} ${styles.badgeApproved}`} style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>
                        Approved — Listing Enabled
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgePending}`} style={{ background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" }}>
                        Pending Listing Authorization
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: "#8e8e9f" }}>KYC Status:</span>{" "}
                    <span className={`${styles.badge} ${dealer.isVerified ? styles.badgeApproved : styles.badgePending}`}>
                      {dealer.isVerified ? "VERIFIED" : "PENDING_REVIEW"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#8e8e9f" }}>Physical Address:</span>{" "}
                    <span style={{ color: "#d1d5db" }}>{dealer.address}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Correction Request */}
            <div style={{ background: "#18181f", padding: 20, borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", marginTop: 0 }}>
                Request Location Hierarchy Update
              </h3>
              <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
                Need to relocate showroom or update administrative district assignment? Submit an update request for WowCars operations review.
              </p>

              <form onSubmit={handleCorrectionSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className={styles.label}>Target State ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. IN-KA"
                      value={correctionState}
                      onChange={(e) => setCorrectionState(e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Target District ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. IN-KA-BLRU"
                      value={correctionDistrict}
                      onChange={(e) => setCorrectionDistrict(e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <label className={styles.label}>City / Town</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bengaluru"
                      value={correctionCity}
                      onChange={(e) => setCorrectionCity(e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Postal PIN Code</label>
                    <input
                      type="text"
                      required
                      pattern="[1-9][0-9]{5}"
                      placeholder="e.g. 560001"
                      value={correctionPincode}
                      onChange={(e) => setCorrectionPincode(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className={styles.label}>Reason for Location Update</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Provide operational reason (e.g. Relocated to new showroom in Koramangala)"
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className={styles.textarea}
                  />
                </div>

                <button type="submit" disabled={submittingCorrection} className={styles.btnPrimary}>
                  {submittingCorrection ? "Submitting Request..." : "Submit Correction Request for Admin Review"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add Vehicle Modal */}
        {showAddModal && (
          <div className={styles.modalBackdrop} onClick={() => setShowAddModal(false)}>
            <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowAddModal(false)} className={styles.modalClose}>
                ✕
              </button>

              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#ffffff", margin: "0 0 6px 0" }}>
                Add Vehicle to Inventory
              </h2>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 20px 0" }}>
                Enter complete automotive specifications. Listings enter WowCars moderation before being published.
              </p>

              <form onSubmit={handleAddVehicle}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className={styles.label}>Make *</label>
                    <input
                      type="text"
                      required
                      value={addCarForm.make}
                      onChange={(e) => setAddCarForm({ ...addCarForm, make: e.target.value })}
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Model *</label>
                    <input
                      type="text"
                      required
                      value={addCarForm.model}
                      onChange={(e) => setAddCarForm({ ...addCarForm, model: e.target.value })}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className={styles.label}>Variant *</label>
                  <input
                    type="text"
                    required
                    value={addCarForm.variant}
                    onChange={(e) => setAddCarForm({ ...addCarForm, variant: e.target.value })}
                    className={styles.input}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className={styles.label}>Year *</label>
                    <input
                      type="number"
                      required
                      min={1995}
                      max={2027}
                      value={addCarForm.year}
                      onChange={(e) => setAddCarForm({ ...addCarForm, year: e.target.value })}
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Price (INR) *</label>
                    <input
                      type="number"
                      required
                      min={50000}
                      step={10000}
                      value={addCarForm.priceINR}
                      onChange={(e) => setAddCarForm({ ...addCarForm, priceINR: e.target.value })}
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Kilometers Driven *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={addCarForm.kmDriven}
                      onChange={(e) => setAddCarForm({ ...addCarForm, kmDriven: e.target.value })}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className={styles.label}>Fuel Type</label>
                    <select
                      value={addCarForm.fuelType}
                      onChange={(e) => setAddCarForm({ ...addCarForm, fuelType: e.target.value })}
                      className={styles.select}
                    >
                      <option>Petrol</option>
                      <option>Diesel</option>
                      <option>CNG</option>
                      <option>Electric</option>
                      <option>Hybrid</option>
                    </select>
                  </div>

                  <div>
                    <label className={styles.label}>Transmission</label>
                    <select
                      value={addCarForm.transmission}
                      onChange={(e) => setAddCarForm({ ...addCarForm, transmission: e.target.value })}
                      className={styles.select}
                    >
                      <option>Manual</option>
                      <option>Automatic</option>
                    </select>
                  </div>

                  <div>
                    <label className={styles.label}>Body Type</label>
                    <select
                      value={addCarForm.bodyType}
                      onChange={(e) => setAddCarForm({ ...addCarForm, bodyType: e.target.value })}
                      className={styles.select}
                    >
                      <option>SUV</option>
                      <option>Sedan</option>
                      <option>Hatchback</option>
                      <option>MUV</option>
                      <option>Luxury</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className={styles.label}>Vehicle Overview & Condition</label>
                  <textarea
                    rows={3}
                    value={addCarForm.overview}
                    onChange={(e) => setAddCarForm({ ...addCarForm, overview: e.target.value })}
                    className={styles.textarea}
                  />
                </div>

                <button type="submit" disabled={submittingCar} className={styles.loginBtn}>
                  {submittingCar ? "Submitting for Moderation..." : "Submit Vehicle for Moderation"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Edit Vehicle Modal */}
        {editingCar && (
          <div className={styles.modalBackdrop} onClick={() => setEditingCar(null)}>
            <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setEditingCar(null)} className={styles.modalClose}>
                ✕
              </button>

              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#ffffff", margin: "0 0 6px 0" }}>
                Edit Listing: {editingCar.listingCode}
              </h2>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 20px 0" }}>
                {editingCar.year} {editingCar.make} {editingCar.model} {editingCar.variant}
              </p>

              <form onSubmit={handleSaveCarEdit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className={styles.label}>Price (INR) *</label>
                    <input
                      type="number"
                      required
                      min={50000}
                      step={10000}
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Kilometers Driven *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editKm}
                      onChange={(e) => setEditKm(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className={styles.label}>Listing Overview</label>
                  <textarea
                    rows={3}
                    value={editOverview}
                    onChange={(e) => setEditOverview(e.target.value)}
                    className={styles.textarea}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setEditingCar(null)}
                    className={styles.btnSecondary}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCarEdit}
                    className={styles.btnPrimary}
                  >
                    {savingCarEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <CTASection
        title="Need Technical Help with Inventory Feeds or Bulk Ingestion?"
        subtitle="Our partner success managers can assist with DMS integrations, automatic price syncing, and 140-point certification scheduling."
        primaryAction={{
          label: "Contact Partner Support",
          href: "tel:+919880123456",
        }}
        secondaryAction={{
          label: "View Public Inventory",
          href: "/cars",
        }}
        variant="red"
      />

      <Footer />
    </div>
  );
}
