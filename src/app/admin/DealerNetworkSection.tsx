"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./Admin.module.css";
import { Dealer, State, District, ExpansionStatus, DealerApprovalStatus } from "@/lib/db/types";
import { NetworkOverviewStats, StateCoverageMetric, DistrictCoverageMetric } from "@/lib/db/adapter";

interface AugmentedDealer extends Dealer {
  activeListingsCount?: number;
  enquiriesCount?: number;
}

interface DealerNetworkSectionProps {
  dealers: AugmentedDealer[];
  onRefreshData: () => Promise<void>;
  onShowNewDealerModal: () => void;
}

type NetworkSubTab =
  | "overview"
  | "states"
  | "districts"
  | "directory"
  | "applications"
  | "uncovered"
  | "expansion";

export default function DealerNetworkSection({
  dealers,
  onRefreshData,
  onShowNewDealerModal,
}: DealerNetworkSectionProps) {
  // Navigation
  const [subTab, setSubTab] = useState<NetworkSubTab>("overview");

  // Network metrics state
  const [stats, setStats] = useState<NetworkOverviewStats | null>(null);
  const [stateMetrics, setStateMetrics] = useState<StateCoverageMetric[]>([]);
  const [districtMetrics, setDistrictMetrics] = useState<DistrictCoverageMetric[]>([]);
  const [allStates, setAllStates] = useState<State[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // State & District filters
  const [selectedStateId, setSelectedStateId] = useState<string>("");
  const [districtSearch, setDistrictSearch] = useState<string>("");
  const [districtStatusFilter, setDistrictStatusFilter] = useState<string>("ALL");
  const [stateSearch, setStateSearch] = useState<string>("");

  // Directory filters
  const [dirSearch, setDirSearch] = useState<string>("");
  const [dirStateFilter, setDirStateFilter] = useState<string>("");
  const [dirDistrictFilter, setDirDistrictFilter] = useState<string>("");
  const [dirStatusFilter, setDirStatusFilter] = useState<string>("ALL");

  // Location edit modal
  const [editingDealer, setEditingDealer] = useState<AugmentedDealer | null>(null);
  const [editStateId, setEditStateId] = useState<string>("");
  const [editDistrictId, setEditDistrictId] = useState<string>("");
  const [editCityName, setEditCityName] = useState<string>("");
  const [editPincode, setEditPincode] = useState<string>("");
  const [editDistrictsList, setEditDistrictsList] = useState<District[]>([]);
  const [savingLocation, setSavingLocation] = useState<boolean>(false);

  // New District creation modal
  const [showNewDistrictModal, setShowNewDistrictModal] = useState<boolean>(false);
  const [newDistrictStateId, setNewDistrictStateId] = useState<string>("IN-KA");
  const [newDistrictName, setNewDistrictName] = useState<string>("");
  const [creatingDistrict, setCreatingDistrict] = useState<boolean>(false);

  // Fetch all network data
  const loadNetworkData = useCallback(async () => {
    try {
      const [statsRes, statesRes, districtsRes, allStatesRes] = await Promise.all([
        fetch("/api/admin/network/stats"),
        fetch("/api/admin/network/states"),
        fetch("/api/admin/network/districts"),
        fetch("/api/locations/states"),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
      if (statesRes.ok) {
        const d = await statesRes.json();
        setStateMetrics(d.states || []);
      }
      if (districtsRes.ok) {
        const d = await districtsRes.json();
        setDistrictMetrics(d.districts || []);
      }
      if (allStatesRes.ok) {
        const d = await allStatesRes.json();
        setAllStates(d.states || []);
      }
    } catch (err) {
      console.error("Failed to load network data:", err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [statsRes, statesRes, districtsRes, allStatesRes] = await Promise.all([
          fetch("/api/admin/network/stats"),
          fetch("/api/admin/network/states"),
          fetch("/api/admin/network/districts"),
          fetch("/api/locations/states"),
        ]);
        if (!active) return;
        if (statsRes.ok) {
          const d = await statsRes.json();
          setStats(d.stats);
        }
        if (statesRes.ok) {
          const d = await statesRes.json();
          setStateMetrics(d.states || []);
        }
        if (districtsRes.ok) {
          const d = await districtsRes.json();
          setDistrictMetrics(d.districts || []);
        }
        if (allStatesRes.ok) {
          const d = await allStatesRes.json();
          setAllStates(d.states || []);
        }
      } catch (err) {
        console.error("Initial network load error:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Handle dealer approval / rejection / suspension
  const handleModerateDealer = async (dealerId: string, action: string, status?: DealerApprovalStatus) => {
    try {
      const res = await fetch(`/api/admin/dealers/${dealerId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, approvalStatus: status }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update dealership.");
        return;
      }
      setStatusMessage(data.message || `Dealer updated successfully.`);
      setTimeout(() => setStatusMessage(null), 4000);
      await Promise.all([onRefreshData(), loadNetworkData()]);
    } catch (err) {
      console.error("Failed to moderate dealer:", err);
      alert("Failed to connect to moderation server.");
    }
  };

  // Open location editor for dealer
  const handleOpenEditLocation = async (dealer: AugmentedDealer) => {
    setEditingDealer(dealer);
    const sId = dealer.stateId || "IN-KA";
    setEditStateId(sId);
    setEditDistrictId(dealer.districtId || "");
    setEditCityName(dealer.cityName || dealer.locality || "");
    setEditPincode(dealer.pincode || "");

    try {
      const res = await fetch(`/api/locations/districts?stateId=${sId}`);
      if (res.ok) {
        const d = await res.json();
        setEditDistrictsList(d.districts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // State change inside location editor
  const handleEditStateChange = async (newStateId: string) => {
    setEditStateId(newStateId);
    setEditDistrictId("");
    try {
      const res = await fetch(`/api/locations/districts?stateId=${newStateId}`);
      if (res.ok) {
        const d = await res.json();
        setEditDistrictsList(d.districts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save location assignment
  const handleSaveLocation = async () => {
    if (!editingDealer) return;
    if (!editStateId || !editDistrictId) {
      alert("State and District are required.");
      return;
    }
    if (!editPincode || !/^[1-9][0-9]{5}$/.test(editPincode.trim())) {
      alert("Please enter a valid 6-digit Indian PIN code.");
      return;
    }

    setSavingLocation(true);
    try {
      const res = await fetch(`/api/admin/dealers/${editingDealer.id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateId: editStateId,
          districtId: editDistrictId,
          cityName: editCityName,
          pincode: editPincode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update location.");
        return;
      }
      setStatusMessage(`Location updated for ${editingDealer.name}.`);
      setTimeout(() => setStatusMessage(null), 4000);
      setEditingDealer(null);
      await Promise.all([onRefreshData(), loadNetworkData()]);
    } catch (e) {
      console.error(e);
      alert("Error saving location.");
    } finally {
      setSavingLocation(false);
    }
  };

  // Save expansion updates for a district
  const handleUpdateDistrictExpansion = async (
    districtId: string,
    updates: { expansionStatus?: ExpansionStatus; expansionOwner?: string; expansionNotes?: string; followUpDate?: string }
  ) => {
    try {
      const res = await fetch("/api/admin/network/districts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ districtId, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update district expansion.");
        return;
      }
      setStatusMessage(`District expansion updated.`);
      setTimeout(() => setStatusMessage(null), 3000);
      await loadNetworkData();
    } catch (err) {
      console.error("Failed to update district expansion:", err);
    }
  };

  // Create new official district
  const handleCreateDistrict = async () => {
    if (!newDistrictName.trim() || !newDistrictStateId) {
      alert("District name and State are required.");
      return;
    }
    setCreatingDistrict(true);
    try {
      const res = await fetch("/api/admin/network/districts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateId: newDistrictStateId, name: newDistrictName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create district.");
        return;
      }
      setStatusMessage(`District "${data.district?.name}" created successfully.`);
      setTimeout(() => setStatusMessage(null), 4000);
      setShowNewDistrictModal(false);
      setNewDistrictName("");
      await loadNetworkData();
    } catch (e) {
      console.error(e);
      alert("Failed to create district.");
    } finally {
      setCreatingDistrict(false);
    }
  };

  // Filtered state coverage
  const filteredStates = useMemo(() => {
    return stateMetrics.filter((s) =>
      s.stateName.toLowerCase().includes(stateSearch.toLowerCase()) ||
      s.stateCode.toLowerCase().includes(stateSearch.toLowerCase())
    );
  }, [stateMetrics, stateSearch]);

  // Filtered districts
  const filteredDistricts = useMemo(() => {
    return districtMetrics.filter((d) => {
      if (selectedStateId && d.stateId !== selectedStateId) return false;
      if (districtStatusFilter !== "ALL" && d.networkStatus !== districtStatusFilter) return false;
      if (districtSearch) {
        const q = districtSearch.toLowerCase();
        return (
          d.districtName.toLowerCase().includes(q) ||
          (d.stateName && d.stateName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [districtMetrics, selectedStateId, districtStatusFilter, districtSearch]);

  // Filtered dealer directory
  const filteredDirectory = useMemo(() => {
    return dealers.filter((d) => {
      if (dirStateFilter && d.stateId !== dirStateFilter) return false;
      if (dirDistrictFilter && d.districtId !== dirDistrictFilter) return false;
      if (dirStatusFilter !== "ALL") {
        if (dirStatusFilter === "APPROVED" && (d.approvalStatus === "APPROVED" || (d.isVerified && d.approvalStatus !== "SUSPENDED" && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "INACTIVE"))) {
          // match
        } else if (dirStatusFilter === "PENDING" && (d.approvalStatus === "PENDING" || d.approvalStatus === "APPLICATION_RECEIVED" || d.approvalStatus === "UNDER_VERIFICATION")) {
          // match
        } else if (d.approvalStatus === dirStatusFilter) {
          // match
        } else {
          return false;
        }
      }
      if (dirSearch) {
        const q = dirSearch.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          (d.legalBusinessName && d.legalBusinessName.toLowerCase().includes(q)) ||
          (d.gstin && d.gstin.toLowerCase().includes(q)) ||
          (d.locality && d.locality.toLowerCase().includes(q)) ||
          (d.cityName && d.cityName.toLowerCase().includes(q)) ||
          d.whatsappNumber.includes(q)
        );
      }
      return true;
    });
  }, [dealers, dirStateFilter, dirDistrictFilter, dirStatusFilter, dirSearch]);

  // Pending applications queue
  const pendingApplications = useMemo(() => {
    return dealers.filter(
      (d) =>
        d.approvalStatus === "APPLICATION_RECEIVED" ||
        d.approvalStatus === "UNDER_VERIFICATION" ||
        d.approvalStatus === "PENDING" ||
        (!d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED" && d.approvalStatus !== "INACTIVE")
    );
  }, [dealers]);

  // Uncovered districts
  const uncoveredDistricts = useMemo(() => {
    return districtMetrics.filter((d) => d.networkStatus === "Uncovered");
  }, [districtMetrics]);

  return (
    <div className={styles.sectionCard}>
      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>🇮🇳 PAN-India Dealer Network Control Center</h2>
          <p className={styles.sectionSubtitle}>
            Scale, monitor and manage state-wise, district-wise, and city-wise used-car dealership operations across India
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setShowNewDistrictModal(true)}
            className={`${styles.btnSm} ${styles.btnSmSecondary}`}
            style={{ padding: "8px 14px" }}
          >
            + Add District
          </button>
          <button
            onClick={onShowNewDealerModal}
            className={`${styles.btnSm} ${styles.btnSmApprove}`}
            style={{ padding: "8px 14px" }}
          >
            + Onboard Partner Dealer
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{
          background: "rgba(16, 185, 129, 0.15)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          color: "#34d399",
          padding: "10px 16px",
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
        }}>
          ✓ {statusMessage}
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        paddingBottom: 14,
        marginBottom: 20,
      }}>
        {[
          { id: "overview", label: "📊 Network Overview" },
          { id: "states", label: `🗺️ State-wise Coverage (${stateMetrics.length})` },
          { id: "districts", label: `📍 District-wise Coverage (${districtMetrics.length})` },
          { id: "directory", label: `🏢 Dealer Directory (${dealers.length})` },
          { id: "applications", label: `📑 Dealer Applications (${pendingApplications.length})`, badge: pendingApplications.length },
          { id: "uncovered", label: `🔍 Uncovered Districts (${uncoveredDistricts.length})` },
          { id: "expansion", label: "🚀 Expansion Planning & Export" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as NetworkSubTab)}
            className={`${styles.btnSm} ${subTab === tab.id ? styles.btnSmApprove : styles.btnSmSecondary}`}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span style={{
                background: "#e50914",
                color: "#fff",
                fontSize: 11,
                padding: "2px 6px",
                borderRadius: 10,
                fontWeight: 700,
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 1. NETWORK OVERVIEW */}
      {subTab === "overview" && stats && (
        <div>
          {/* Top National Coverage Banner */}
          <div style={{
            background: "linear-gradient(135deg, rgba(229, 9, 20, 0.12) 0%, rgba(20, 20, 28, 0.8) 100%)",
            border: "1px solid rgba(229, 9, 20, 0.3)",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}>
            <div>
              <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#ff4d58", fontWeight: 700 }}>
                PAN-India Expansion Progress
              </span>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "4px 0" }}>
                {stats.nationalCoveragePercentage}% National District Coverage
              </h3>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                {stats.districtsWithActiveDealers} of {stats.districtsWithActiveDealers + stats.districtsWithoutActiveDealers} administrative districts currently covered with approved active dealers.
              </p>
            </div>
            <div style={{ width: 220, textAlign: "right" }}>
              <div style={{
                width: "100%",
                height: 10,
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: 5,
                overflow: "hidden",
                marginBottom: 6,
              }}>
                <div style={{
                  width: `${Math.min(100, stats.nationalCoveragePercentage)}%`,
                  height: "100%",
                  background: "#10b981",
                  borderRadius: 5,
                }} />
              </div>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>
                Active in {stats.statesWithActiveDealers} States / UTs
              </span>
            </div>
          </div>

          {/* 8 Real Database-Backed Metrics */}
          <div className={styles.statsGrid}>
            <div
              onClick={() => { setDirStatusFilter("ALL"); setSubTab("directory"); }}
              className={styles.statCard}
              style={{ cursor: "pointer" }}
              title="Click to view all dealers"
            >
              <span className={styles.statLabel}>Total Registered Dealers</span>
              <div className={styles.statValue}>{stats.totalRegisteredDealers}</div>
              <span className={styles.statSub}>Full network database</span>
            </div>

            <div
              onClick={() => { setDirStatusFilter("APPROVED"); setSubTab("directory"); }}
              className={styles.statCard}
              style={{ cursor: "pointer", borderColor: "rgba(16, 185, 129, 0.4)" }}
              title="Click to view approved active dealers"
            >
              <span className={styles.statLabel}>Approved & Active Dealers</span>
              <div className={styles.statValue} style={{ color: "#34d399" }}>
                {stats.approvedActiveDealers}
              </div>
              <span className={styles.statSub}>Displayable on public marketplace</span>
            </div>

            <div
              onClick={() => setSubTab("applications")}
              className={styles.statCard}
              style={{ cursor: "pointer", borderColor: "rgba(245, 158, 11, 0.4)" }}
              title="Click to view pending dealer applications"
            >
              <span className={styles.statLabel}>Pending Dealer Applications</span>
              <div className={styles.statValue} style={{ color: "#fbbf24" }}>
                {stats.pendingDealerApplications}
              </div>
              <span className={styles.statSub}>Awaiting KYC inspection</span>
            </div>

            <div
              onClick={() => { setDirStatusFilter("SUSPENDED"); setSubTab("directory"); }}
              className={styles.statCard}
              style={{ cursor: "pointer" }}
              title="Click to view inactive/suspended dealers"
            >
              <span className={styles.statLabel}>Rejected / Suspended</span>
              <div className={styles.statValue} style={{ color: "#f87171" }}>
                {stats.rejectedSuspendedInactiveDealers}
              </div>
              <span className={styles.statSub}>Quarantined accounts</span>
            </div>

            <div
              onClick={() => setSubTab("states")}
              className={styles.statCard}
              style={{ cursor: "pointer" }}
              title="Click to view state-wise coverage"
            >
              <span className={styles.statLabel}>States/UTs with Active Dealers</span>
              <div className={styles.statValue} style={{ color: "#60a5fa" }}>
                {stats.statesWithActiveDealers}
              </div>
              <span className={styles.statSub}>Of 36 Indian States & UTs</span>
            </div>

            <div
              onClick={() => { setDistrictStatusFilter("Covered"); setSubTab("districts"); }}
              className={styles.statCard}
              style={{ cursor: "pointer" }}
              title="Click to view covered districts"
            >
              <span className={styles.statLabel}>Districts with Active Dealers</span>
              <div className={styles.statValue} style={{ color: "#34d399" }}>
                {stats.districtsWithActiveDealers}
              </div>
              <span className={styles.statSub}>With ≥1 active showroom</span>
            </div>

            <div
              onClick={() => setSubTab("uncovered")}
              className={styles.statCard}
              style={{ cursor: "pointer", borderColor: "rgba(239, 68, 68, 0.4)" }}
              title="Click to view uncovered districts"
            >
              <span className={styles.statLabel}>Districts Without Active Dealers</span>
              <div className={styles.statValue} style={{ color: "#f87171" }}>
                {stats.districtsWithoutActiveDealers}
              </div>
              <span className={styles.statSub}>Expansion opportunities</span>
            </div>

            <div
              onClick={() => setSubTab("directory")}
              className={styles.statCard}
              style={{ cursor: "pointer" }}
              title="Click to view recent dealers"
            >
              <span className={styles.statLabel}>Dealers Added (Last 30 Days)</span>
              <div className={styles.statValue} style={{ color: "#a78bfa" }}>
                {stats.dealersAddedLast30Days}
              </div>
              <span className={styles.statSub}>Recent network growth</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. STATE-WISE COVERAGE */}
      {subTab === "states" && (
        <div>
          <div className={styles.filterToolbar}>
            <input
              type="text"
              placeholder="Search Indian State or UT..."
              value={stateSearch}
              onChange={(e) => setStateSearch(e.target.value)}
              className={styles.input}
              style={{ maxWidth: 320 }}
            />
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              Showing {filteredStates.length} States & Union Territories
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>State / UT</th>
                  <th>Type</th>
                  <th>Districts Covered</th>
                  <th>Coverage %</th>
                  <th>Active Dealers</th>
                  <th>Pending Apps</th>
                  <th>Active Listings</th>
                  <th>Buyer Enquiries</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStates.map((s) => (
                  <tr key={s.stateId}>
                    <td>
                      <span style={{ fontWeight: 700, color: "#fff" }}>{s.stateName}</span>
                      <span style={{ display: "block", fontSize: 11, color: "#8e8e9f" }}>
                        Code: {s.stateCode}
                      </span>
                    </td>
                    <td>
                      <span className={styles.badge} style={{ background: "rgba(255,255,255,0.06)", color: "#b0b0c2" }}>
                        {s.type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {s.coveredDistricts} / {s.activeDistricts}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 60,
                          height: 6,
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}>
                          <div style={{
                            width: `${Math.min(100, s.coveragePercentage)}%`,
                            height: "100%",
                            background: s.coveragePercentage > 50 ? "#10b981" : s.coveragePercentage > 0 ? "#f59e0b" : "#4b5563",
                          }} />
                        </div>
                        <span style={{ fontWeight: 700, color: s.coveragePercentage > 0 ? "#34d399" : "#9ca3af" }}>
                          {s.coveragePercentage}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: s.activeApprovedDealers > 0 ? "#34d399" : "#9ca3af", fontWeight: 700 }}>
                        {s.activeApprovedDealers}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: s.pendingApplications > 0 ? "#fbbf24" : "#9ca3af", fontWeight: 600 }}>
                        {s.pendingApplications}
                      </span>
                    </td>
                    <td>{s.activeVehicleListings}</td>
                    <td>{s.buyerEnquiriesReceived}</td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedStateId(s.stateId);
                          setSubTab("districts");
                        }}
                        className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                        style={{ padding: "6px 10px" }}
                      >
                        View Districts →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. DISTRICT-WISE COVERAGE */}
      {subTab === "districts" && (
        <div>
          <div className={styles.filterToolbar} style={{ flexWrap: "wrap", gap: 12 }}>
            <select
              value={selectedStateId}
              onChange={(e) => setSelectedStateId(e.target.value)}
              className={styles.input}
              style={{ maxWidth: 220 }}
            >
              <option value="">All States & UTs</option>
              {allStates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>

            <select
              value={districtStatusFilter}
              onChange={(e) => setDistrictStatusFilter(e.target.value)}
              className={styles.input}
              style={{ maxWidth: 180 }}
            >
              <option value="ALL">All Network Statuses</option>
              <option value="Covered">Covered (≥1 Active Dealer)</option>
              <option value="Partially Covered">Partially Covered</option>
              <option value="Uncovered">Uncovered (0 Dealers)</option>
            </select>

            <input
              type="text"
              placeholder="Search district name..."
              value={districtSearch}
              onChange={(e) => setDistrictSearch(e.target.value)}
              className={styles.input}
              style={{ maxWidth: 220 }}
            />

            <div style={{ fontSize: 13, color: "#9ca3af", marginLeft: "auto" }}>
              Showing {filteredDistricts.length} districts
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>District</th>
                  <th>State / UT</th>
                  <th>Network Status</th>
                  <th>Active Dealers</th>
                  <th>Pending Apps</th>
                  <th>Active Listings</th>
                  <th>Buyer Enquiries</th>
                  <th>Expansion Status</th>
                  <th>Latest Registration</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDistricts.map((d) => (
                  <tr key={d.districtId}>
                    <td>
                      <span style={{ fontWeight: 700, color: "#fff" }}>{d.districtName}</span>
                      <span style={{ display: "block", fontSize: 11, color: "#8e8e9f" }}>
                        ID: {d.districtId}
                      </span>
                    </td>
                    <td>{d.stateName || d.stateId}</td>
                    <td>
                      <span
                        className={styles.badge}
                        style={{
                          background:
                            d.networkStatus === "Covered"
                              ? "rgba(16, 185, 129, 0.15)"
                              : d.networkStatus === "Partially Covered"
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(107, 114, 128, 0.2)",
                          color:
                            d.networkStatus === "Covered"
                              ? "#34d399"
                              : d.networkStatus === "Partially Covered"
                              ? "#fbbf24"
                              : "#9ca3af",
                        }}
                      >
                        {d.networkStatus}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: d.activeApprovedDealers > 0 ? "#34d399" : "#9ca3af" }}>
                        {d.activeApprovedDealers}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: d.pendingApplications > 0 ? "#fbbf24" : "#9ca3af", fontWeight: 600 }}>
                        {d.pendingApplications}
                      </span>
                    </td>
                    <td>{d.activeVehicleListings}</td>
                    <td>{d.buyerEnquiries}</td>
                    <td>
                      <span style={{ fontSize: 12, color: "#b0b0c2" }}>
                        {d.expansionStatus}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        {d.latestRegistrationDate ? new Date(d.latestRegistrationDate).toLocaleDateString("en-IN") : "None"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setDirDistrictFilter(d.districtId);
                          setSubTab("directory");
                        }}
                        className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                        style={{ padding: "4px 8px", fontSize: 12 }}
                      >
                        View Dealers →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. DEALER DIRECTORY */}
      {subTab === "directory" && (
        <div>
          <div className={styles.filterToolbar} style={{ flexWrap: "wrap", gap: 10 }}>
            <input
              type="text"
              placeholder="Search dealer name, locality, phone..."
              value={dirSearch}
              onChange={(e) => setDirSearch(e.target.value)}
              className={styles.input}
              style={{ maxWidth: 260 }}
            />

            <select
              value={dirStateFilter}
              onChange={(e) => {
                setDirStateFilter(e.target.value);
                setDirDistrictFilter("");
              }}
              className={styles.input}
              style={{ maxWidth: 180 }}
            >
              <option value="">All States</option>
              {allStates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={dirStatusFilter}
              onChange={(e) => setDirStatusFilter(e.target.value)}
              className={styles.input}
              style={{ maxWidth: 190 }}
            >
              <option value="ALL">All Statuses</option>
              <option value="APPLICATION_RECEIVED">Application Received</option>
              <option value="UNDER_VERIFICATION">Under Verification</option>
              <option value="APPROVED">Approved Active</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            {(dirStateFilter || dirDistrictFilter || dirStatusFilter !== "ALL" || dirSearch) && (
              <button
                onClick={() => {
                  setDirStateFilter("");
                  setDirDistrictFilter("");
                  setDirStatusFilter("ALL");
                  setDirSearch("");
                }}
                className={`${styles.btnSm} ${styles.btnSmSecondary}`}
              >
                Clear Filters
              </button>
            )}

            <div style={{ fontSize: 13, color: "#9ca3af", marginLeft: "auto" }}>
              Showing {filteredDirectory.length} of {dealers.length} dealers
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Dealership & Legal Entity</th>
                  <th>Location (State / District / PIN)</th>
                  <th>Authorized Contact</th>
                  <th>Status & KYC</th>
                  <th>Active Listings</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDirectory.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ fontSize: 22, marginTop: 2 }}>{d.avatarEmoji || "🏢"}</span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 700, color: "#fff" }}>{d.name}</span>
                            {d.isSeedData && (
                              <span style={{ fontSize: 10, background: "rgba(107, 114, 128, 0.3)", color: "#d1d5db", padding: "1px 5px", borderRadius: 4 }}>
                                DEMO
                              </span>
                            )}
                          </div>
                          {d.legalBusinessName && d.legalBusinessName !== d.name && (
                            <span style={{ display: "block", fontSize: 11, color: "#cbd5e1" }}>
                              Legal: {d.legalBusinessName}
                            </span>
                          )}
                          <span style={{ display: "block", fontSize: 11, color: "#8e8e9f", marginTop: 2 }}>
                            ID: <strong style={{ color: "#38bdf8" }}>{d.id}</strong> · Est. {d.establishedYear}
                            {d.gstin && ` · GST: ${d.gstin}`}
                            {d.pan && ` · PAN: ${d.pan}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontWeight: 600, color: "#f3f4f6" }}>
                        {d.districtName || d.locality}, {d.stateName || "Karnataka"}
                      </span>
                      <span style={{ display: "block", fontSize: 11, color: "#9ca3af" }}>
                        {d.address} {d.pincode ? `· PIN: ${d.pincode}` : ""}
                      </span>
                    </td>

                    <td>
                      <a
                        href={`https://wa.me/91${d.whatsappNumber.replace(/\D/g, "").slice(-10)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#34d399", textDecoration: "none", fontWeight: 600, fontSize: 12 }}
                      >
                        💬 {d.whatsappNumber}
                      </a>
                      {d.contactEmail && (
                        <span style={{ display: "block", fontSize: 11, color: "#9ca3af" }}>
                          ✉️ {d.contactEmail}
                        </span>
                      )}
                      {d.authorizedSignatory && (
                        <span style={{ display: "block", fontSize: 11, color: "#64748b" }}>
                          Signatory: {d.authorizedSignatory}
                        </span>
                      )}
                    </td>

                    <td>
                      <div>
                        {d.approvalStatus === "APPROVED_LISTING_ENABLED" || (d.approvalStatus === "APPROVED" && d.listingEnabled !== false) ? (
                          <span className={`${styles.badge} ${styles.badgeActive}`}>Approved — Listing Enabled</span>
                        ) : d.approvalStatus === "APPROVED" ? (
                          <span className={styles.badge} style={{ background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" }}>
                            Approved (Listings Disabled)
                          </span>
                        ) : d.approvalStatus === "UNDER_VERIFICATION" ? (
                          <span className={styles.badge} style={{ background: "rgba(234, 179, 8, 0.2)", color: "#facc15" }}>
                            Under Verification
                          </span>
                        ) : d.approvalStatus === "APPLICATION_RECEIVED" || d.approvalStatus === "APPLICATION_PENDING" || d.approvalStatus === "PENDING" ? (
                          <span className={`${styles.badge} ${styles.badgePending}`}>
                            Application Pending
                          </span>
                        ) : d.approvalStatus === "INACTIVE" ? (
                          <span className={styles.badge} style={{ background: "rgba(107, 114, 128, 0.2)", color: "#9ca3af" }}>
                            Inactive
                          </span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeRejected}`}>{d.approvalStatus}</span>
                        )}
                        <span style={{ display: "block", fontSize: 10, color: d.kycStatus === "VERIFIED" ? "#34d399" : "#fbbf24", marginTop: 3 }}>
                          KYC: {d.kycStatus || (d.isVerified ? "VERIFIED" : "PENDING")}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontWeight: 700, color: "#fff" }}>
                        {d.activeListingsCount ?? 0}
                      </span>
                    </td>

                    <td>
                      <div className={styles.actionBtnGroup}>
                        {d.approvalStatus !== "APPROVED" && d.approvalStatus !== "APPROVED_LISTING_ENABLED" && (
                          <button
                            onClick={() => handleModerateDealer(d.id, "APPROVE_ENABLE_LISTING", "APPROVED_LISTING_ENABLED")}
                            className={`${styles.btnSm} ${styles.btnSmApprove}`}
                            title="Approve & authorize vehicle listings"
                          >
                            ✓ Approve & Enable Listings
                          </button>
                        )}

                        {d.approvalStatus === "APPLICATION_RECEIVED" && (
                          <button
                            onClick={() => handleModerateDealer(d.id, "UNDER_VERIFICATION", "UNDER_VERIFICATION")}
                            className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                            style={{ borderColor: "#facc15", color: "#facc15" }}
                            title="Move to Under Verification"
                          >
                            Verify KYC
                          </button>
                        )}

                        {(d.approvalStatus === "APPROVED" || d.approvalStatus === "APPROVED_LISTING_ENABLED") && (
                          <>
                            {d.listingEnabled !== false ? (
                              <button
                                onClick={() => handleModerateDealer(d.id, "DISABLE_LISTING")}
                                className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                                style={{ borderColor: "#f59e0b", color: "#fbbf24" }}
                                title="Pause vehicle listing permission"
                              >
                                Pause Listings
                              </button>
                            ) : (
                              <button
                                onClick={() => handleModerateDealer(d.id, "ENABLE_LISTING")}
                                className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                                style={{ borderColor: "#10b981", color: "#34d399" }}
                                title="Authorize vehicle listing permission"
                              >
                                Enable Listings
                              </button>
                            )}

                            <button
                              onClick={() => handleModerateDealer(d.id, "SUSPEND", "SUSPENDED")}
                              className={`${styles.btnSm} ${styles.btnSmReject}`}
                              title="Suspend dealer"
                            >
                              Suspend
                            </button>
                            <button
                              onClick={() => handleModerateDealer(d.id, "INACTIVE", "INACTIVE")}
                              className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                              title="Deactivate dealer"
                            >
                              Deactivate
                            </button>
                          </>
                        )}

                        {d.approvalStatus === "SUSPENDED" && (
                          <button
                            onClick={() => handleModerateDealer(d.id, "REACTIVATE", "APPROVED")}
                            className={`${styles.btnSm} ${styles.btnSmApprove}`}
                            title="Reactivate dealer account"
                          >
                            Reactivate
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEditLocation(d)}
                          className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                          title="Reassign State / District / City"
                        >
                          📍 Location
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

      {/* 5. DEALER APPLICATIONS (KYC REVIEW QUEUE) */}
      {subTab === "applications" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
              📑 Dealership KYC & Registration Applications Queue ({pendingApplications.length})
            </h3>
            <p style={{ fontSize: 13, color: "#9ca3af" }}>
              Review submitted PAN-India dealer credentials before activating their accounts on public dealer discovery
            </p>
          </div>

          {pendingApplications.length === 0 ? (
            <div style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: 12,
              border: "1px dashed rgba(255, 255, 255, 0.1)",
            }}>
              <span style={{ fontSize: 32 }}>🎉</span>
              <h4 style={{ color: "#fff", fontSize: 16, marginTop: 8 }}>All Dealer Applications Reviewed!</h4>
              <p style={{ color: "#8e8e9f", fontSize: 13 }}>No unmoderated applications in queue.</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Location Details</th>
                    <th>Contact Phone</th>
                    <th>Submitted Date</th>
                    <th>KYC Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApplications.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: "#fff" }}>{app.name}</span>
                        <span style={{ display: "block", fontSize: 11, color: "#8e8e9f" }}>
                          Est. {app.establishedYear} · {app.speciality}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600, color: "#f3f4f6" }}>
                          {app.districtName || app.locality}, {app.stateName || "Karnataka"}
                        </span>
                        <span style={{ display: "block", fontSize: 11, color: "#9ca3af" }}>
                          {app.address} · PIN: {app.pincode || "Not entered"}
                        </span>
                      </td>

                      <td>
                        <span style={{ color: "#34d399", fontWeight: 600 }}>
                          📞 {app.whatsappNumber}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>
                          {new Date(app.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>

                      <td>
                        <div className={styles.actionBtnGroup}>
                          <button
                            onClick={() => handleModerateDealer(app.id, "APPROVE", "APPROVED")}
                            className={`${styles.btnSm} ${styles.btnSmApprove}`}
                          >
                            ✓ Approve & Activate
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt("Enter rejection reason for dealer application:");
                              if (reason) handleModerateDealer(app.id, "REJECT", "REJECTED");
                            }}
                            className={`${styles.btnSm} ${styles.btnSmReject}`}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. UNCOVERED DISTRICTS */}
      {subTab === "uncovered" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
              🔍 Uncovered Administrative Districts ({uncoveredDistricts.length})
            </h3>
            <p style={{ fontSize: 13, color: "#9ca3af" }}>
              Districts with 0 approved active dealers. Track outreach status and assign expansion owners without claiming unverified demand.
            </p>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>District</th>
                  <th>State / UT</th>
                  <th>Active Listings</th>
                  <th>Enquiries</th>
                  <th>Pipeline Apps</th>
                  <th>Expansion Status</th>
                  <th>Expansion Owner</th>
                  <th>Follow-up Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {uncoveredDistricts.map((d) => (
                  <tr key={d.districtId}>
                    <td>
                      <span style={{ fontWeight: 700, color: "#fff" }}>{d.districtName}</span>
                      <span style={{ display: "block", fontSize: 11, color: "#8e8e9f" }}>
                        ID: {d.districtId}
                      </span>
                    </td>
                    <td>{d.stateName || d.stateId}</td>
                    <td>{d.activeVehicleListings > 0 ? d.activeVehicleListings : "Not available"}</td>
                    <td>{d.buyerEnquiries > 0 ? d.buyerEnquiries : "Not available"}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: d.pendingApplications > 0 ? "#fbbf24" : "#9ca3af" }}>
                        {d.pendingApplications}
                      </span>
                    </td>
                    <td>
                      <select
                        value={d.expansionStatus || "NOT_STARTED"}
                        onChange={(e) =>
                          handleUpdateDistrictExpansion(d.districtId, {
                            expansionStatus: e.target.value as ExpansionStatus,
                          })
                        }
                        className={styles.input}
                        style={{ padding: "4px 8px", fontSize: 12, minWidth: 140 }}
                      >
                        <option value="NOT_STARTED">Not Started</option>
                        <option value="OUTREACH">Outreach</option>
                        <option value="APPLICATIONS_RECEIVED">Applications Received</option>
                        <option value="ONBOARDING">Onboarding</option>
                        <option value="COVERED">Covered</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={d.expansionOwner || ""}
                        placeholder="Assign owner"
                        onBlur={(e) =>
                          handleUpdateDistrictExpansion(d.districtId, {
                            expansionOwner: e.target.value,
                          })
                        }
                        className={styles.input}
                        style={{ padding: "4px 8px", fontSize: 12, width: 120 }}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        defaultValue={d.followUpDate || ""}
                        onChange={(e) =>
                          handleUpdateDistrictExpansion(d.districtId, {
                            followUpDate: e.target.value,
                          })
                        }
                        className={styles.input}
                        style={{ padding: "4px 8px", fontSize: 12, width: 130 }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={d.expansionNotes || ""}
                        placeholder="Add notes..."
                        onBlur={(e) =>
                          handleUpdateDistrictExpansion(d.districtId, {
                            expansionNotes: e.target.value,
                          })
                        }
                        className={styles.input}
                        style={{ padding: "4px 8px", fontSize: 12, width: 140 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. EXPANSION PLANNING & EXPORT */}
      {subTab === "expansion" && (
        <div>
          <div style={{
            background: "#141418",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              📥 Export PAN-India Network Data
            </h3>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
              Download real, database-backed district network coverage, pipeline metrics, and outreach progress as CSV for offline analysis.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <a
                href="/api/admin/network/districts?format=csv"
                className={`${styles.btnSm} ${styles.btnSmApprove}`}
                style={{ padding: "10px 18px", textDecoration: "none", display: "inline-block" }}
              >
                📊 Export All Districts (CSV)
              </a>
              <a
                href="/api/admin/network/districts?format=csv&uncoveredOnly=true"
                className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                style={{ padding: "10px 18px", textDecoration: "none", display: "inline-block" }}
              >
                🔍 Export Uncovered Districts Only (CSV)
              </a>
            </div>
          </div>

          <div style={{
            background: "#141418",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: 24,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              📋 Administrative Hierarchy Architecture
            </h3>
            <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>
              WowCars PAN-India Location Hierarchy adheres strictly to:
              <br />
              <strong style={{ color: "#f3f4f6" }}>India → State / Union Territory → District → City / Town → Dealer Showroom</strong>.
              <br />
              All official names, ISO codes, and district boundaries are stored relationally with foreign keys to prevent spelling duplication. PIN codes are validated strictly against Indian postal formats.
            </p>
          </div>
        </div>
      )}

      {/* MODAL: Edit Dealer Location */}
      {editingDealer && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 520 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              📍 Reassign Dealer Location
            </h3>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>
              Updating official location for <strong style={{ color: "#fff" }}>{editingDealer.name}</strong>
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Select State / Union Territory</label>
              <select
                value={editStateId}
                onChange={(e) => handleEditStateChange(e.target.value)}
                className={styles.input}
              >
                {allStates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Select District</label>
              <select
                value={editDistrictId}
                onChange={(e) => setEditDistrictId(e.target.value)}
                className={styles.input}
              >
                <option value="">-- Choose District --</option>
                {editDistrictsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>City / Town</label>
              <input
                type="text"
                value={editCityName}
                onChange={(e) => setEditCityName(e.target.value)}
                placeholder="e.g. Bengaluru, Mysuru, Hubballi"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>6-Digit Indian PIN Code</label>
              <input
                type="text"
                value={editPincode}
                maxLength={6}
                onChange={(e) => setEditPincode(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 560001"
                className={styles.input}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button
                onClick={() => setEditingDealer(null)}
                className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                disabled={savingLocation}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLocation}
                className={`${styles.btnSm} ${styles.btnSmApprove}`}
                disabled={savingLocation}
              >
                {savingLocation ? "Saving..." : "Save Location"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add New District */}
      {showNewDistrictModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 480 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              + Add New Administrative District
            </h3>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>
              Create a new official administrative district when government boundaries change
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Select State / UT</label>
              <select
                value={newDistrictStateId}
                onChange={(e) => setNewDistrictStateId(e.target.value)}
                className={styles.input}
              >
                {allStates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Official District Name</label>
              <input
                type="text"
                value={newDistrictName}
                onChange={(e) => setNewDistrictName(e.target.value)}
                placeholder="e.g. Vijayanagara"
                className={styles.input}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button
                onClick={() => setShowNewDistrictModal(false)}
                className={`${styles.btnSm} ${styles.btnSmSecondary}`}
                disabled={creatingDistrict}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDistrict}
                className={`${styles.btnSm} ${styles.btnSmApprove}`}
                disabled={creatingDistrict}
              >
                {creatingDistrict ? "Creating..." : "Create District"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
