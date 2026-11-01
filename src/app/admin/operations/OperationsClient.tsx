"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import styles from "./Operations.module.css";
import {
  OperationsOverviewStats, Outlet, Supplier, SupplierQuotation,
  PurchaseOrder, OutletInventoryItem, GarageJobCard, GarageServiceItem,
  UsedCarEconomics, OperatingExpense, MonthlyBudget
} from "@/lib/db/types";

type OperationsTab =
  | "overview"
  | "garage"
  | "products"
  | "inventory"
  | "suppliers"
  | "procurement"
  | "retail"
  | "usedcars"
  | "financials"
  | "scenario"
  | "franchise";

export default function OperationsClient() {
  const [activeTab, setActiveTab] = useState<OperationsTab>("overview");
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Data states
  const [stats, setStats] = useState<OperationsOverviewStats | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quotations, setQuotations] = useState<SupplierQuotation[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [inventory, setInventory] = useState<OutletInventoryItem[]>([]);
  const [jobCards, setJobCards] = useState<GarageJobCard[]>([]);
  const [services, setServices] = useState<GarageServiceItem[]>([]);
  const [usedCars, setUsedCars] = useState<UsedCarEconomics[]>([]);
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Modals state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Open New Service Centre & Store modal state
  const [showCreateOutletModal, setShowCreateOutletModal] = useState(false);
  const [newOutletForm, setNewOutletForm] = useState({
    name: "",
    code: "",
    type: "FRANCHISE" as "COMPANY_OWNED" | "FRANCHISE",
    city: "Bengaluru",
    districtId: "IN-KA-BLRU",
    stateId: "IN-KA",
    pinCode: "",
    address: "",
    phone: "",
    managerName: "",
    franchiseOwnerName: "",
    franchiseFeeAnnualINR: 150000,
    royaltyPercent: 5.0,
    procurementLimitINR: 500000,
    isFranchiseOnboardingEnabled: true,
  });

  // Scenario Planner State
  const [scenarioInput, setScenarioInput] = useState({
    preset: "7.5", // 5, 7.5, 10
    monthlyRevenue: 650000,
    grossMarginPercent: 38,
    monthlyOpex: 165000,
    inventoryInvestment: 350000,
    workingCapital: 150000,
  });

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const outletQuery = selectedOutletId ? `?outletId=${selectedOutletId}` : "";
      const [
        statsRes,
        suppRes,
        quotesRes,
        poRes,
        invRes,
        jobRes,
        srvRes,
        carsRes,
        finRes,
        outletsRes,
      ] = await Promise.all([
        fetch(`/api/admin/operations/stats${outletQuery}`).then((r) => r.json()),
        fetch("/api/admin/operations/suppliers").then((r) => r.json()),
        fetch("/api/admin/operations/suppliers/quotations").then((r) => r.json()),
        fetch(`/api/admin/operations/procurement/orders${outletQuery}`).then((r) => r.json()),
        fetch(`/api/admin/operations/inventory${outletQuery}`).then((r) => r.json()),
        fetch(`/api/admin/operations/garage/jobs${outletQuery}`).then((r) => r.json()),
        fetch("/api/admin/operations/garage/services").then((r) => r.json()),
        fetch("/api/admin/operations/used-cars/economics").then((r) => r.json()),
        fetch(`/api/admin/operations/financials${outletQuery}`).then((r) => r.json()),
        fetch("/api/admin/operations/outlets").then((r) => r.json()),
      ]);

      if (statsRes.success) setStats(statsRes);
      if (suppRes.success) setSuppliers(suppRes.suppliers);
      if (quotesRes.success) setQuotations(quotesRes.quotations);
      if (poRes.success) setPurchaseOrders(poRes.orders);
      if (invRes.success) setInventory(invRes.inventory);
      if (jobRes.success) setJobCards(jobRes.jobs);
      if (srvRes.success) setServices(srvRes.services);
      if (carsRes.success) setUsedCars(carsRes.economics);
      if (finRes.success) {
        setExpenses(finRes.expenses || []);
        setBudget(finRes.budget || null);
      }
      if (outletsRes.success) setOutlets(outletsRes.outlets);
    } catch (err) {
      console.error("Failed to load operations data:", err);
      setNotification({ message: "Error loading operational data. Check admin authentication.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedOutletId]);

  // Flash notification helper
  const showNotice = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // CSV Export Trigger
  const triggerExport = (type: "summary" | "jobs" | "inventory") => {
    const outletQuery = selectedOutletId ? `&outletId=${selectedOutletId}` : "";
    window.open(`/api/admin/operations/financials/export-csv?type=${type}${outletQuery}`, "_blank");
  };

  // Scenario Calculator Computation
  const scenarioResults = useMemo(() => {
    const rev = scenarioInput.monthlyRevenue;
    const margin = scenarioInput.grossMarginPercent;
    const opex = scenarioInput.monthlyOpex;

    const grossProfit = Math.round(rev * (margin / 100));
    const operatingSurplus = grossProfit - opex;
    const operatingMargin = rev > 0 ? Math.round((operatingSurplus / rev) * 1000) / 10 : 0;
    // Break-even Revenue = Fixed Opex / (Gross Margin % / 100)
    const breakEvenRevenue = margin > 0 ? Math.round(opex / (margin / 100)) : 0;
    const safetyMarginPercent = rev > breakEvenRevenue ? Math.round(((rev - breakEvenRevenue) / rev) * 100) : 0;

    return {
      grossProfit,
      operatingSurplus,
      operatingMargin,
      breakEvenRevenue,
      safetyMarginPercent,
    };
  }, [scenarioInput]);

  const applyScenarioPreset = (preset: "5" | "7.5" | "10") => {
    if (preset === "5") {
      setScenarioInput({
        preset: "5",
        monthlyRevenue: 380000,
        grossMarginPercent: 42,
        monthlyOpex: 110000,
        inventoryInvestment: 220000,
        workingCapital: 120000,
      });
    } else if (preset === "7.5") {
      setScenarioInput({
        preset: "7.5",
        monthlyRevenue: 650000,
        grossMarginPercent: 38,
        monthlyOpex: 165000,
        inventoryInvestment: 350000,
        workingCapital: 150000,
      });
    } else {
      setScenarioInput({
        preset: "10",
        monthlyRevenue: 980000,
        grossMarginPercent: 36,
        monthlyOpex: 240000,
        inventoryInvestment: 500000,
        workingCapital: 200000,
      });
    }
  };

  // Handle PO Status update
  const handlePOStatusUpdate = async (poId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/operations/procurement/orders/${poId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Purchase Order ${data.order.poNumber} status updated to ${status}`);
        loadData();
      } else {
        showNotice(data.error || "Failed to update PO status", "error");
      }
    } catch {
      showNotice("Network error updating PO", "error");
    }
  };

  // Handle GRN Goods Receipt
  const handleConfirmGRN = async (po: PurchaseOrder) => {
    try {
      const items = po.items.map((i) => ({
        productId: i.productId,
        sku: i.sku,
        quantityReceived: i.quantityOrdered - (i.quantityReceived || 0),
        quantityRejected: 0,
      }));

      const res = await fetch("/api/admin/operations/procurement/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poId: po.id,
          poNumber: po.poNumber,
          outletId: po.outletId,
          supplierChallanNo: `CH-${Date.now().toString().slice(-6)}`,
          items,
          idempotencyKey: `grn-receipt-${po.id}-${po.items.length}`,
          notes: "Full consignment confirmed at hub receiving dock",
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotice(`GRN ${data.grn.grnNumber} processed. Inventory & WAC stock updated!`);
        setActiveModal(null);
        loadData();
      } else {
        showNotice(data.error || "Failed to receive goods", "error");
      }
    } catch {
      showNotice("Network error processing GRN", "error");
    }
  };

  // Handle Job Card Status update
  const handleJobStatusUpdate = async (jobId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/operations/garage/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Job Card status transitioned to ${status}`);
        loadData();
      } else {
        showNotice(data.error || "Failed to update job status", "error");
      }
    } catch {
      showNotice("Network error updating job", "error");
    }
  };

  // Handle Opening / Registering a New Service Centre & Parts Store
  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutletForm.name || !newOutletForm.city || !newOutletForm.managerName || !newOutletForm.phone) {
      showNotice("Please fill all required outlet fields (name, city, manager, phone)", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/operations/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOutletForm),
      });

      const data = await res.json();
      if (data.success) {
        showNotice(`Service Centre & Store "${data.outlet.name}" (${data.outlet.code}) created successfully!`);
        setShowCreateOutletModal(false);
        setNewOutletForm({
          name: "",
          code: "",
          type: "FRANCHISE",
          city: "Bengaluru",
          districtId: "IN-KA-BLRU",
          stateId: "IN-KA",
          pinCode: "",
          address: "",
          phone: "",
          managerName: "",
          franchiseOwnerName: "",
          franchiseFeeAnnualINR: 150000,
          royaltyPercent: 5.0,
          procurementLimitINR: 500000,
          isFranchiseOnboardingEnabled: true,
        });
        loadData();
      } else {
        showNotice(data.error || "Failed to create outlet", "error");
      }
    } catch {
      showNotice("Network error creating outlet", "error");
    }
  };

  // Handle Supplier Status Moderation
  const handleSupplierModeration = async (supplierId: string, approvalStatus: string) => {
    try {
      const res = await fetch(`/api/admin/operations/suppliers/${supplierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Supplier ${data.supplier.businessName} updated to ${approvalStatus}`);
        loadData();
      } else {
        showNotice(data.error || "Failed to update supplier status", "error");
      }
    } catch {
      showNotice("Network error updating supplier", "error");
    }
  };

  return (
    <div className={styles.operationsLayout}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <Link href="/admin" className={styles.backLink}>
            ← Back to Admin
          </Link>
          <div className={styles.topbarDivider} />
          <div className={styles.brandTitle}>
            <span>⚙️ WowCars Operations Control Hub</span>
            <span className={styles.badgePilot}>₹5–10L Pilot Operational Engine</span>
          </div>
        </div>

        <div className={styles.topbarRight}>
          <select
            className={styles.outletSelect}
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
          >
            <option value="">🏢 Consolidated All Outlets</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.type === "COMPANY_OWNED" ? "Company Hub" : "Franchise"})
              </option>
            ))}
          </select>

          <button
            className={styles.exportBtn}
            onClick={() => triggerExport("summary")}
            title="Download CSV Profitability Report"
          >
            📥 Export P&L CSV
          </button>
        </div>
      </header>

      {/* Notifications */}
      {notification && (
        <div
          className={`${styles.alertBox} ${
            notification.type === "success" ? styles.alertSuccess : styles.alertWarning
          }`}
          style={{ margin: "16px 24px 0" }}
        >
          {notification.message}
        </div>
      )}

      {/* Main Container */}
      <div className={styles.mainContainer}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarGroupTitle}>Operations & Financials</div>
          <button
            className={`${styles.navItem} ${activeTab === "overview" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <span>📊 Overview & Margins</span>
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "financials" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("financials")}
          >
            <span>📈 Financial Reports</span>
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "scenario" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("scenario")}
          >
            <span>💡 Scenario Planner</span>
          </button>

          <div className={styles.sidebarGroupTitle}>Workshop & Garage</div>
          <button
            className={`${styles.navItem} ${activeTab === "garage" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("garage")}
          >
            <span>🔧 Garage & Job Cards</span>
            <span className={styles.navCountBadge}>{jobCards.length}</span>
          </button>

          <div className={styles.sidebarGroupTitle}>Procurement & Stock</div>
          <button
            className={`${styles.navItem} ${activeTab === "inventory" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
            <span>🏬 Inventory & WAC</span>
            {inventory.filter((i) => i.quantityOnHand <= i.reorderPoint).length > 0 && (
              <span className={`${styles.navCountBadge} ${styles.navCountBadgeAlert}`}>
                {inventory.filter((i) => i.quantityOnHand <= i.reorderPoint).length} low
              </span>
            )}
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "procurement" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("procurement")}
          >
            <span>📝 Purchase Orders</span>
            <span className={styles.navCountBadge}>{purchaseOrders.length}</span>
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "suppliers" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("suppliers")}
          >
            <span>🤝 Suppliers & Quotes</span>
            <span className={styles.navCountBadge}>{suppliers.length}</span>
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "products" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("products")}
          >
            <span>📦 Multi-Brand Catalogue</span>
          </button>

          <div className={styles.sidebarGroupTitle}>Sales & Franchising</div>
          <button
            className={`${styles.navItem} ${activeTab === "usedcars" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("usedcars")}
          >
            <span>🚗 Used-Car Economics</span>
            <span className={styles.navCountBadge}>{usedCars.length}</span>
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "franchise" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("franchise")}
          >
            <span>🏢 Outlets & Franchise</span>
            <span className={styles.navCountBadge}>{outlets.length}</span>
          </button>
        </aside>

        {/* Content Area */}
        <main className={styles.contentArea}>
          {loading ? (
            <div className={styles.emptyState}>Loading operational intelligence...</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & MARGINS */}
              {activeTab === "overview" && stats && (
                <div>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h1 className={styles.sectionTitle}>Operations Overview & Margin Intelligence</h1>
                      <div className={styles.sectionDesc}>
                        Audited consolidated performance: used-car transactions, multi-brand garage jobs, parts retail & franchise fees.
                      </div>
                    </div>
                  </div>

                  {/* Warning for provisional cost items if any */}
                  {stats.metrics.provisionalCostItemsCount > 0 && (
                    <div className={`${styles.alertBox} ${styles.alertWarning}`}>
                      ⚠️ <strong>Provisional Cost Warning:</strong> {stats.metrics.provisionalCostItemsCount} items have incomplete purchase cost records. Affecting calculations are marked as provisional.
                    </div>
                  )}

                  {/* KPI Grid */}
                  <div className={styles.kpiGrid}>
                    <div className={styles.kpiCard}>
                      <div className={styles.kpiLabel}>
                        <span>Consolidated Revenue</span>
                        <span className={`${styles.kpiTag} ${styles.tagActual}`}>ACTUAL</span>
                      </div>
                      <div className={styles.kpiValue}>₹{stats.metrics.totalRevenueINR.toLocaleString("en-IN")}</div>
                      <div className={styles.kpiSubtext}>Excluding internal inter-outlet transfers</div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={styles.kpiLabel}>
                        <span>Cost of Goods Sold (COGS)</span>
                        <span className={`${styles.kpiTag} ${styles.tagActual}`}>ACTUAL</span>
                      </div>
                      <div className={styles.kpiValue}>₹{stats.metrics.cogsINR.toLocaleString("en-IN")}</div>
                      <div className={styles.kpiSubtext}>Parts WAC + Tech labour + Car acquisition</div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={styles.kpiLabel}>
                        <span>Gross Profit & Margin</span>
                        <span className={`${styles.kpiTag} ${styles.tagActual}`}>ACTUAL</span>
                      </div>
                      <div className={`${styles.kpiValue} ${styles.positiveDelta}`}>
                        ₹{stats.metrics.grossProfitINR.toLocaleString("en-IN")}
                        <span style={{ fontSize: "16px", marginLeft: "6px" }}>({stats.metrics.grossMarginPercent}%)</span>
                      </div>
                      <div className={styles.kpiSubtext}>Revenue excl taxes − Direct COGS</div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={styles.kpiLabel}>
                        <span>Operating Expenses (Opex)</span>
                        <span className={`${styles.kpiTag} ${styles.tagActual}`}>ACTUAL</span>
                      </div>
                      <div className={styles.kpiValue}>₹{stats.metrics.operatingExpensesINR.toLocaleString("en-IN")}</div>
                      <div className={styles.kpiSubtext}>Rent, utilities, staff salaries & tools</div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={styles.kpiLabel}>
                        <span>Operating Profit</span>
                        <span className={`${styles.kpiTag} ${styles.tagActual}`}>ACTUAL</span>
                      </div>
                      <div className={`${styles.kpiValue} ${stats.metrics.operatingProfitINR >= 0 ? styles.positiveDelta : styles.negativeDelta}`}>
                        ₹{stats.metrics.operatingProfitINR.toLocaleString("en-IN")}
                        <span style={{ fontSize: "16px", marginLeft: "6px" }}>({stats.metrics.operatingMarginPercent}%)</span>
                      </div>
                      <div className={styles.kpiSubtext}>Gross Profit − Recorded Opex</div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={styles.kpiLabel}>
                        <span>Total Inventory Value</span>
                        <span className={`${styles.kpiTag} ${styles.tagActual}`}>ACTUAL</span>
                      </div>
                      <div className={styles.kpiValue}>₹{stats.metrics.totalInventoryValueINR.toLocaleString("en-IN")}</div>
                      <div className={styles.kpiSubtext}>Weighted Average Cost (WAC) valuation</div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={styles.kpiLabel}>
                        <span>Garage Completed Jobs</span>
                        <span className={`${styles.kpiTag} ${styles.tagActual}`}>ACTUAL</span>
                      </div>
                      <div className={styles.kpiValue}>{stats.metrics.completedGarageJobs} / {stats.metrics.totalGarageBookings}</div>
                      <div className={styles.kpiSubtext}>Avg ticket: ₹{stats.metrics.averageJobInvoiceINR.toLocaleString("en-IN")}</div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={styles.kpiLabel}>
                        <span>Supplier Payables</span>
                        <span className={`${styles.kpiTag} ${styles.tagActual}`}>ACTUAL</span>
                      </div>
                      <div className={styles.kpiValue}>₹{stats.metrics.supplierOutstandingINR.toLocaleString("en-IN")}</div>
                      <div className={styles.kpiSubtext}>Pending PO invoice settlements</div>
                    </div>
                  </div>

                  {/* Segment Breakdown */}
                  <div className={styles.tableCard}>
                    <div className={styles.tableToolbar}>
                      <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>Revenue & COGS Breakdown by Business Segment</h3>
                    </div>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Business Segment</th>
                          <th>Recognized Revenue (INR)</th>
                          <th>Direct COGS (INR)</th>
                          <th>Gross Contribution (INR)</th>
                          <th>Gross Margin %</th>
                          <th>Accounting Treatment & Rules</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>🚗 Used-Car Transactions</strong></td>
                          <td>₹{stats.revenueBySegment.usedCarsINR.toLocaleString("en-IN")}</td>
                          <td>₹{stats.cogsBySegment.usedCarsCOGSINR.toLocaleString("en-IN")}</td>
                          <td className={styles.positiveDelta}>
                            ₹{(stats.revenueBySegment.usedCarsINR - stats.cogsBySegment.usedCarsCOGSINR).toLocaleString("en-IN")}
                          </td>
                          <td>
                            {stats.revenueBySegment.usedCarsINR > 0
                              ? Math.round(((stats.revenueBySegment.usedCarsINR - stats.cogsBySegment.usedCarsCOGSINR) / stats.revenueBySegment.usedCarsINR) * 100)
                              : 0}%
                          </td>
                          <td>Owned inventory recognized at sale price; Consignments recognized at brokerage fee only.</td>
                        </tr>
                        <tr>
                          <td><strong>🔧 Garage & Workshop Services</strong></td>
                          <td>₹{stats.revenueBySegment.garageServicesINR.toLocaleString("en-IN")}</td>
                          <td>₹{(stats.cogsBySegment.garagePartsCOGSINR + stats.cogsBySegment.garageLabourCOGSINR).toLocaleString("en-IN")}</td>
                          <td className={styles.positiveDelta}>
                            ₹{(stats.revenueBySegment.garageServicesINR - (stats.cogsBySegment.garagePartsCOGSINR + stats.cogsBySegment.garageLabourCOGSINR)).toLocaleString("en-IN")}
                          </td>
                          <td>
                            {stats.revenueBySegment.garageServicesINR > 0
                              ? Math.round(((stats.revenueBySegment.garageServicesINR - (stats.cogsBySegment.garagePartsCOGSINR + stats.cogsBySegment.garageLabourCOGSINR)) / stats.revenueBySegment.garageServicesINR) * 100)
                              : 0}%
                          </td>
                          <td>Labour charges + consumed spare parts at billed price minus direct technician & parts WAC.</td>
                        </tr>
                        <tr>
                          <td><strong>🛒 Spare Parts Retail Store</strong></td>
                          <td>₹{stats.revenueBySegment.partsRetailINR.toLocaleString("en-IN")}</td>
                          <td>₹{stats.cogsBySegment.partsRetailCOGSINR.toLocaleString("en-IN")}</td>
                          <td className={styles.positiveDelta}>
                            ₹{(stats.revenueBySegment.partsRetailINR - stats.cogsBySegment.partsRetailCOGSINR).toLocaleString("en-IN")}
                          </td>
                          <td>
                            {stats.revenueBySegment.partsRetailINR > 0
                              ? Math.round(((stats.revenueBySegment.partsRetailINR - stats.cogsBySegment.partsRetailCOGSINR) / stats.revenueBySegment.partsRetailINR) * 100)
                              : 0}%
                          </td>
                          <td>Direct counter & e-commerce sales of verified automotive components and workshop tools.</td>
                        </tr>
                        <tr>
                          <td><strong>🏢 Franchise Royalties & Fees</strong></td>
                          <td>₹{stats.revenueBySegment.franchiseRoyaltiesINR.toLocaleString("en-IN")}</td>
                          <td>₹0</td>
                          <td className={styles.positiveDelta}>
                            ₹{stats.revenueBySegment.franchiseRoyaltiesINR.toLocaleString("en-IN")}
                          </td>
                          <td>100%</td>
                          <td>Contractual 5% franchise revenue royalty and annual territory franchise management fee.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Budget Comparison */}
                  {stats.budgetComparison && (
                    <div className={styles.tableCard}>
                      <div className={styles.tableToolbar}>
                        <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>
                          Monthly Budget vs Actual ({stats.budgetComparison.month})
                        </h3>
                      </div>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Performance Metric</th>
                            <th>Budgeted (Target)</th>
                            <th>Actual (Recorded)</th>
                            <th>Variance (INR)</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Revenue</td>
                            <td>₹{stats.budgetComparison.budgetedRevenue.toLocaleString("en-IN")}</td>
                            <td>₹{stats.budgetComparison.actualRevenue.toLocaleString("en-IN")}</td>
                            <td className={stats.budgetComparison.revenueVariance >= 0 ? styles.positiveDelta : styles.negativeDelta}>
                              {stats.budgetComparison.revenueVariance >= 0 ? "+" : ""}
                              ₹{stats.budgetComparison.revenueVariance.toLocaleString("en-IN")}
                            </td>
                            <td>
                              <span className={`${styles.statusBadge} ${stats.budgetComparison.revenueVariance >= 0 ? styles.statusGreen : styles.statusYellow}`}>
                                {stats.budgetComparison.revenueVariance >= 0 ? "Target Exceeded" : "Under Target"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>Gross Profit</td>
                            <td>₹{stats.budgetComparison.budgetedGrossProfit.toLocaleString("en-IN")}</td>
                            <td>₹{stats.budgetComparison.actualGrossProfit.toLocaleString("en-IN")}</td>
                            <td className={stats.budgetComparison.actualGrossProfit >= stats.budgetComparison.budgetedGrossProfit ? styles.positiveDelta : styles.negativeDelta}>
                              ₹{(stats.budgetComparison.actualGrossProfit - stats.budgetComparison.budgetedGrossProfit).toLocaleString("en-IN")}
                            </td>
                            <td>
                              <span className={`${styles.statusBadge} ${stats.budgetComparison.actualGrossProfit >= stats.budgetComparison.budgetedGrossProfit ? styles.statusGreen : styles.statusYellow}`}>
                                {stats.budgetComparison.actualGrossProfit >= stats.budgetComparison.budgetedGrossProfit ? "Healthy Margin" : "Review Margins"}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>Operating Profit</td>
                            <td>₹{stats.budgetComparison.budgetedOperatingProfit.toLocaleString("en-IN")}</td>
                            <td>₹{stats.budgetComparison.actualOperatingProfit.toLocaleString("en-IN")}</td>
                            <td className={stats.budgetComparison.actualOperatingProfit >= stats.budgetComparison.budgetedOperatingProfit ? styles.positiveDelta : styles.negativeDelta}>
                              ₹{(stats.budgetComparison.actualOperatingProfit - stats.budgetComparison.budgetedOperatingProfit).toLocaleString("en-IN")}
                            </td>
                            <td>
                              <span className={`${styles.statusBadge} ${stats.budgetComparison.actualOperatingProfit >= stats.budgetComparison.budgetedOperatingProfit ? styles.statusGreen : styles.statusYellow}`}>
                                {stats.budgetComparison.actualOperatingProfit >= stats.budgetComparison.budgetedOperatingProfit ? "Operating Surplus" : "Watch Opex"}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: GARAGE & WORKSHOP */}
              {activeTab === "garage" && (
                <div>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h1 className={styles.sectionTitle}>Multi-Brand Garage & Workshop Jobs</h1>
                      <div className={styles.sectionDesc}>
                        Job cards pipeline, customer WhatsApp work authorization, parts consumption & job gross profit.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className={styles.exportBtn} onClick={() => triggerExport("jobs")}>
                        📥 Export Jobs CSV
                      </button>
                    </div>
                  </div>

                  <div className={styles.tableCard}>
                    <div className={styles.tableToolbar}>
                      <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search by Job Card, Vehicle Number or Customer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className={styles.tableFilterGroup}>
                        <select
                          className={styles.filterSelect}
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="ALL">All Statuses</option>
                          <option value="BOOKED">Booked</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="AWAITING_CUSTOMER_APPROVAL">Awaiting Approval</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="DELIVERED">Delivered</option>
                        </select>
                      </div>
                    </div>

                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Job Card #</th>
                          <th>Vehicle & Reg</th>
                          <th>Customer</th>
                          <th>Technician</th>
                          <th>Labour (₹)</th>
                          <th>Parts (₹)</th>
                          <th>Direct Cost (₹)</th>
                          <th>Gross Profit (₹)</th>
                          <th>Margin %</th>
                          <th>Customer Approval</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobCards
                          .filter((j) => {
                            if (filterStatus !== "ALL" && j.status !== filterStatus) return false;
                            if (searchQuery) {
                              const q = searchQuery.toLowerCase();
                              return (
                                j.jobCardNumber.toLowerCase().includes(q) ||
                                j.vehicleNumber.toLowerCase().includes(q) ||
                                j.customerName.toLowerCase().includes(q)
                              );
                            }
                            return true;
                          })
                          .map((j) => (
                            <tr key={j.id}>
                              <td><strong>{j.jobCardNumber}</strong></td>
                              <td>
                                <div><strong>{j.vehicleNumber}</strong></div>
                                <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                                  {j.vehicleMake} {j.vehicleModel} ({j.vehicleType === "TWO_WHEELER" ? "🏍️ 2W" : "🚗 4W"})
                                </div>
                              </td>
                              <td>
                                <div>{j.customerName}</div>
                                <div style={{ fontSize: "11px", color: "#9ca3af" }}>{j.customerPhone}</div>
                              </td>
                              <td>{j.assignedTechnicianName || "Unassigned"}</td>
                              <td>₹{j.labourRevenueINR.toLocaleString("en-IN")}</td>
                              <td>₹{j.partsRevenueINR.toLocaleString("en-IN")}</td>
                              <td>₹{(j.directLabourCostINR + j.directPartsCostINR).toLocaleString("en-IN")}</td>
                              <td className={styles.positiveDelta}>
                                ₹{j.grossProfitINR.toLocaleString("en-IN")}
                              </td>
                              <td>
                                <strong>{j.grossMarginPercent}%</strong>
                                {j.isProvisionalCost && (
                                  <span style={{ color: "#fbbf24", marginLeft: "4px", fontSize: "11px" }} title="Provisional Cost">⚠️</span>
                                )}
                              </td>
                              <td>
                                <span className={`${styles.statusBadge} ${j.customerApprovalStatus === "APPROVED" ? styles.statusGreen : styles.statusYellow}`}>
                                  {j.customerApprovalStatus}
                                </span>
                              </td>
                              <td>
                                <span className={`${styles.statusBadge} ${
                                  j.status === "DELIVERED"
                                    ? styles.statusGreen
                                    : j.status === "IN_PROGRESS"
                                    ? styles.statusBlue
                                    : styles.statusYellow
                                }`}>
                                  {j.status.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  {j.status === "AWAITING_CUSTOMER_APPROVAL" && (
                                    <button
                                      className={styles.primaryActionBtn}
                                      style={{ padding: "4px 8px", fontSize: "11px" }}
                                      onClick={() => handleJobStatusUpdate(j.id, "IN_PROGRESS")}
                                    >
                                      Approve & Start
                                    </button>
                                  )}
                                  {j.status === "IN_PROGRESS" && (
                                    <button
                                      className={styles.primaryActionBtn}
                                      style={{ padding: "4px 8px", fontSize: "11px", background: "#10b981" }}
                                      onClick={() => handleJobStatusUpdate(j.id, "COMPLETED")}
                                    >
                                      Complete Job
                                    </button>
                                  )}
                                  {j.status === "COMPLETED" && (
                                    <button
                                      className={styles.primaryActionBtn}
                                      style={{ padding: "4px 8px", fontSize: "11px", background: "#6b7280" }}
                                      onClick={() => handleJobStatusUpdate(j.id, "DELIVERED")}
                                    >
                                      Deliver to Client
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

              {/* TAB 3: PRODUCTS & CATALOGUE */}
              {activeTab === "products" && (
                <div>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h1 className={styles.sectionTitle}>Multi-Brand Automotive Catalogue & Fitment</h1>
                      <div className={styles.sectionDesc}>
                        Comprehensive Indian aftermarket inventory: Cars, Two-Wheelers, Lubricants, Tyres, Batteries & Tools.
                      </div>
                    </div>
                  </div>

                  <div className={styles.tableCard}>
                    <div className={styles.tableToolbar}>
                      <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search by SKU, Brand, Part Number or Title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>SKU & Part #</th>
                          <th>Product Name</th>
                          <th>Category</th>
                          <th>Vehicle Application</th>
                          <th>Purchase Cost</th>
                          <th>WAC Landed Cost</th>
                          <th>Selling Price (MRP)</th>
                          <th>Gross Margin</th>
                          <th>Reorder Point</th>
                          <th>Authenticity & Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory
                          .filter((i) => {
                            if (searchQuery) {
                              const q = searchQuery.toLowerCase();
                              return (
                                i.title.toLowerCase().includes(q) ||
                                i.sku.toLowerCase().includes(q) ||
                                i.brand.toLowerCase().includes(q)
                              );
                            }
                            return true;
                          })
                          .map((item) => {
                            const retailPrice = item.weightedAverageCostINR ? Math.round(item.weightedAverageCostINR * 1.4) : 0;
                            const profit = retailPrice - item.weightedAverageCostINR;
                            const margin = retailPrice > 0 ? Math.round((profit / retailPrice) * 100) : 0;

                            return (
                              <tr key={item.id}>
                                <td>
                                  <div><strong>{item.sku}</strong></div>
                                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>PN: {item.partNumber || "N/A"}</div>
                                </td>
                                <td>
                                  <div><strong>{item.title}</strong></div>
                                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>Brand: {item.brand}</div>
                                </td>
                                <td>{item.categoryName}</td>
                                <td>
                                  <span className={`${styles.statusBadge} ${styles.statusBlue}`}>
                                    {item.sku.includes("2W") || item.categoryName.includes("Lubricant") ? "Universal / Multi-Brand" : "Multi-Brand Car"}
                                  </span>
                                </td>
                                <td>₹{item.weightedAverageCostINR.toLocaleString("en-IN")}</td>
                                <td><strong>₹{item.weightedAverageCostINR.toLocaleString("en-IN")}</strong></td>
                                <td>₹{retailPrice.toLocaleString("en-IN")}</td>
                                <td className={styles.positiveDelta}>
                                  <strong>{margin}%</strong> (₹{profit})
                                </td>
                                <td>{item.reorderPoint} units</td>
                                <td>
                                  <span className={`${styles.statusBadge} ${styles.statusGreen}`}>
                                    Verified Distributor Invoices
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: INVENTORY & WAREHOUSE */}
              {activeTab === "inventory" && (
                <div>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h1 className={styles.sectionTitle}>Warehouse Inventory & Stock Movements</h1>
                      <div className={styles.sectionDesc}>
                        Location tracking (Bay, Rack, Bin), Weighted Average Cost (WAC) valuation, and stock replenishment alerts.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className={styles.exportBtn} onClick={() => triggerExport("inventory")}>
                        📥 Export Stock CSV
                      </button>
                    </div>
                  </div>

                  <div className={styles.tableCard}>
                    <div className={styles.tableToolbar}>
                      <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search Inventory by SKU, Title or Bin Location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>SKU & Part #</th>
                          <th>Product Title</th>
                          <th>Bin Location</th>
                          <th>On Hand</th>
                          <th>Available</th>
                          <th>WAC Cost (INR)</th>
                          <th>Total Value (INR)</th>
                          <th>Reorder Level</th>
                          <th>Stock Health</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory
                          .filter((i) => {
                            if (searchQuery) {
                              const q = searchQuery.toLowerCase();
                              return (
                                i.title.toLowerCase().includes(q) ||
                                i.sku.toLowerCase().includes(q) ||
                                i.partNumber.toLowerCase().includes(q)
                              );
                            }
                            return true;
                          })
                          .map((i) => (
                            <tr key={i.id}>
                              <td>
                                <div><strong>{i.sku}</strong></div>
                                <div style={{ fontSize: "11px", color: "#9ca3af" }}>{i.partNumber}</div>
                              </td>
                              <td>{i.title}</td>
                              <td>
                                <code>{i.location.bay || "B1"}-{i.location.rack || "R1"}-{i.location.bin || "Bin"}</code>
                              </td>
                              <td><strong>{i.quantityOnHand}</strong></td>
                              <td>{i.quantityAvailable}</td>
                              <td>₹{i.weightedAverageCostINR.toLocaleString("en-IN")}</td>
                              <td><strong>₹{Math.round(i.quantityOnHand * i.weightedAverageCostINR).toLocaleString("en-IN")}</strong></td>
                              <td>{i.reorderPoint}</td>
                              <td>
                                <span className={`${styles.statusBadge} ${i.quantityOnHand <= i.reorderPoint ? styles.statusRed : styles.statusGreen}`}>
                                  {i.quantityOnHand <= i.reorderPoint ? "REORDER REQUIRED" : "OPTIMAL"}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: SUPPLIERS & VERIFICATION */}
              {activeTab === "suppliers" && (
                <div>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h1 className={styles.sectionTitle}>Supplier Master & Authorization Verification</h1>
                      <div className={styles.sectionDesc}>
                        Evidence-based supplier approval, GSTIN compliance, manufacturer authorization agreements & price quotes.
                      </div>
                    </div>
                  </div>

                  <div className={styles.tableCard}>
                    <div className={styles.tableToolbar}>
                      <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search Suppliers by Name, GSTIN or Contact..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Supplier Name</th>
                          <th>GSTIN & PAN</th>
                          <th>Contact Details</th>
                          <th>Categories</th>
                          <th>Payment Terms</th>
                          <th>Rating</th>
                          <th>Approval Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliers.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <div><strong>{s.businessName}</strong></div>
                              <div style={{ fontSize: "11px", color: "#9ca3af" }}>{s.legalName}</div>
                            </td>
                            <td>
                              <div><code>{s.gstin}</code></div>
                              <div style={{ fontSize: "11px", color: "#9ca3af" }}>PAN: {s.pan || "On file"}</div>
                            </td>
                            <td>
                              <div>{s.contactPerson}</div>
                              <div style={{ fontSize: "11px", color: "#9ca3af" }}>{s.phone}</div>
                            </td>
                            <td>{s.supplierCategories.join(", ")}</td>
                            <td>{s.paymentTerms}</td>
                            <td>⭐ {s.performanceRating}</td>
                            <td>
                              <span className={`${styles.statusBadge} ${s.approvalStatus === "APPROVED" ? styles.statusGreen : s.approvalStatus === "PENDING_VERIFICATION" ? styles.statusYellow : styles.statusRed}`}>
                                {s.approvalStatus.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td>
                              {s.approvalStatus === "PENDING_VERIFICATION" ? (
                                <button
                                  className={styles.primaryActionBtn}
                                  style={{ padding: "4px 8px", fontSize: "11px" }}
                                  onClick={() => handleSupplierModeration(s.id, "APPROVED")}
                                >
                                  Verify & Approve
                                </button>
                              ) : (
                                <span style={{ fontSize: "12px", color: "#9ca3af" }}>Verified</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Supplier Quotation Comparison Tool */}
                  <div className={styles.tableCard}>
                    <div className={styles.tableToolbar}>
                      <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>
                        🔍 Multi-Supplier Quotation Comparison (SKU: BOSCH-OF-019 Oil Filter)
                      </h3>
                    </div>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Supplier</th>
                          <th>Quoted Unit Price (INR)</th>
                          <th>MOQ</th>
                          <th>Freight Terms</th>
                          <th>Lead Time</th>
                          <th>Warranty</th>
                          <th>Verified Date</th>
                          <th>Commercial Assessment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotations.map((q) => (
                          <tr key={q.id}>
                            <td><strong>{q.supplierName}</strong></td>
                            <td className={styles.positiveDelta}><strong>₹{q.quotedUnitPriceINR}</strong></td>
                            <td>{q.moq} units</td>
                            <td>{q.freightTerms}</td>
                            <td>{q.leadTimeDays} days</td>
                            <td>{q.warrantyMonths} months</td>
                            <td>{q.verifiedDate}</td>
                            <td>
                              <span className={`${styles.statusBadge} ${q.quotedUnitPriceINR <= 240 ? styles.statusGreen : styles.statusBlue}`}>
                                {q.quotedUnitPriceINR <= 240 ? "Best Price (Wholesale)" : "Fast Delivery Option"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: PROCUREMENT & PURCHASE ORDERS */}
              {activeTab === "procurement" && (
                <div>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h1 className={styles.sectionTitle}>Procurement & Goods Receipt (GRN)</h1>
                      <div className={styles.sectionDesc}>
                        Draft purchase orders, calculate expected landed cost, and confirm goods receipts with duplicate prevention.
                      </div>
                    </div>
                  </div>

                  <div className={styles.tableCard}>
                    <div className={styles.tableToolbar}>
                      <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>Purchase Orders Workflow</h3>
                    </div>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>PO Number</th>
                          <th>Supplier</th>
                          <th>Outlet</th>
                          <th>Items Count</th>
                          <th>Subtotal (₹)</th>
                          <th>Freight (₹)</th>
                          <th>Total Amount (₹)</th>
                          <th>Payment Status</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseOrders.length === 0 ? (
                          <tr>
                            <td colSpan={10} style={{ textAlign: "center", padding: "24px", color: "#9ca3af" }}>
                              No purchase orders drafted yet.
                            </td>
                          </tr>
                        ) : (
                          purchaseOrders.map((po) => (
                            <tr key={po.id}>
                              <td><strong>{po.poNumber}</strong></td>
                              <td>{po.supplierName}</td>
                              <td>{po.outletName}</td>
                              <td>{po.items.length} items</td>
                              <td>₹{po.subtotalINR.toLocaleString("en-IN")}</td>
                              <td>₹{po.freightINR.toLocaleString("en-IN")}</td>
                              <td><strong>₹{po.totalAmountINR.toLocaleString("en-IN")}</strong></td>
                              <td>
                                <span className={`${styles.statusBadge} ${po.paymentStatus === "PAID" ? styles.statusGreen : styles.statusYellow}`}>
                                  {po.paymentStatus}
                                </span>
                              </td>
                              <td>
                                <span className={`${styles.statusBadge} ${
                                  po.status === "RECEIVED"
                                    ? styles.statusGreen
                                    : po.status === "APPROVED"
                                    ? styles.statusBlue
                                    : styles.statusYellow
                                }`}>
                                  {po.status}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  {po.status === "DRAFT" && (
                                    <button
                                      className={styles.primaryActionBtn}
                                      style={{ padding: "4px 8px", fontSize: "11px" }}
                                      onClick={() => handlePOStatusUpdate(po.id, "APPROVED")}
                                    >
                                      Approve PO
                                    </button>
                                  )}
                                  {po.status === "APPROVED" && (
                                    <button
                                      className={styles.primaryActionBtn}
                                      style={{ padding: "4px 8px", fontSize: "11px", background: "#10b981" }}
                                      onClick={() => handleConfirmGRN(po)}
                                    >
                                      Confirm GRN Receipt
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 7: USED-CAR ECONOMICS */}
              {activeTab === "usedcars" && (
                <div>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h1 className={styles.sectionTitle}>Used-Car Unit Economics & Profitability</h1>
                      <div className={styles.sectionDesc}>
                        Strict accounting separation: Owned inventory (full sale revenue) vs Consignment brokerage (commission only).
                      </div>
                    </div>
                  </div>

                  <div className={styles.tableCard}>
                    <div className={styles.tableToolbar}>
                      <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>Recorded Vehicle Unit Economics</h3>
                    </div>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Listing Code</th>
                          <th>Vehicle</th>
                          <th>Ownership Model</th>
                          <th>Acquisition Cost</th>
                          <th>Refurbishment Cost</th>
                          <th>Sale Price</th>
                          <th>Recognized Revenue</th>
                          <th>Total Direct Costs</th>
                          <th>Contribution Profit</th>
                          <th>Margin %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usedCars.map((c) => (
                          <tr key={c.carId}>
                            <td><strong>{c.listingCode}</strong></td>
                            <td>{c.make} {c.model} ({c.year})</td>
                            <td>
                              <span className={`${styles.statusBadge} ${c.ownershipType === "OWNED_INVENTORY" ? styles.statusBlue : styles.statusPurple}`}>
                                {c.ownershipType === "OWNED_INVENTORY" ? "OWNED INVENTORY" : "CONSIGNMENT"}
                              </span>
                            </td>
                            <td>₹{c.acquisitionCostINR.toLocaleString("en-IN")}</td>
                            <td>₹{c.totalRefurbishmentCostINR.toLocaleString("en-IN")}</td>
                            <td>₹{c.salePriceINR.toLocaleString("en-IN")}</td>
                            <td><strong>₹{c.recognizedRevenueINR.toLocaleString("en-IN")}</strong></td>
                            <td>₹{c.totalDirectCostsINR.toLocaleString("en-IN")}</td>
                            <td className={styles.positiveDelta}>
                              <strong>₹{c.transactionContributionINR.toLocaleString("en-IN")}</strong>
                            </td>
                            <td><strong>{c.contributionMarginPercent}%</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 8: SCENARIO PLANNER */}
              {activeTab === "scenario" && (
                <div>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h1 className={styles.sectionTitle}>Interactive Pilot Scenario Planning Calculator</h1>
                      <div className={styles.sectionDesc}>
                        Editable assumptions for pilot investment models (₹5 Lakh to ₹10 Lakh lean garage & parts store).
                      </div>
                    </div>
                  </div>

                  {/* Presets Grid */}
                  <div className={styles.scenarioPresetGrid}>
                    <div
                      className={`${styles.scenarioPresetCard} ${scenarioInput.preset === "5" ? styles.scenarioPresetActive : ""}`}
                      onClick={() => applyScenarioPreset("5")}
                    >
                      <div className={styles.presetHeader}>
                        <span className={styles.presetTitle}>Lean 1-Bay Workshop</span>
                        <span className={styles.presetAmount}>₹5 Lakh</span>
                      </div>
                      <div className={styles.presetDesc}>
                        1 Car Service Bay + 1 Bike Ramp + fast-moving parts counter. Focus on PM services, brake jobs, lubricants & batteries.
                      </div>
                    </div>

                    <div
                      className={`${styles.scenarioPresetCard} ${scenarioInput.preset === "7.5" ? styles.scenarioPresetActive : ""}`}
                      onClick={() => applyScenarioPreset("7.5")}
                    >
                      <div className={styles.presetHeader}>
                        <span className={styles.presetTitle}>Standard Hub & Store</span>
                        <span className={styles.presetAmount}>₹7.5 Lakh</span>
                      </div>
                      <div className={styles.presetDesc}>
                        2 Car Hoists + 2 Two-Wheeler Ramps + retail parts showroom. In-house diagnostics, AC gas recovery, brake resurfacing.
                      </div>
                    </div>

                    <div
                      className={`${styles.scenarioPresetCard} ${scenarioInput.preset === "10" ? styles.scenarioPresetActive : ""}`}
                      onClick={() => applyScenarioPreset("10")}
                    >
                      <div className={styles.presetHeader}>
                        <span className={styles.presetTitle}>Full Regional Hub</span>
                        <span className={styles.presetAmount}>₹10 Lakh</span>
                      </div>
                      <div className={styles.presetDesc}>
                        3 Car Bays + detailing studio + full inventory warehouse. High turnover commercial tyres, batteries & used-car inspection.
                      </div>
                    </div>
                  </div>

                  {/* Calculator Grid */}
                  <div className={styles.calcGrid}>
                    <div className={styles.calcCard}>
                      <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "15px", color: "#fff" }}>
                        Editable Operating Assumptions
                      </h3>

                      <div className={styles.calcSliderGroup}>
                        <div className={styles.sliderLabelRow}>
                          <span className={styles.formLabel}>Monthly Net Revenue</span>
                          <strong>₹{scenarioInput.monthlyRevenue.toLocaleString("en-IN")}</strong>
                        </div>
                        <input
                          type="range"
                          min={200000}
                          max={2000000}
                          step={25000}
                          className={styles.sliderInput}
                          value={scenarioInput.monthlyRevenue}
                          onChange={(e) =>
                            setScenarioInput({ ...scenarioInput, monthlyRevenue: Number(e.target.value) })
                          }
                        />
                      </div>

                      <div className={styles.calcSliderGroup}>
                        <div className={styles.sliderLabelRow}>
                          <span className={styles.formLabel}>Blended Gross Margin %</span>
                          <strong>{scenarioInput.grossMarginPercent}%</strong>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={60}
                          step={1}
                          className={styles.sliderInput}
                          value={scenarioInput.grossMarginPercent}
                          onChange={(e) =>
                            setScenarioInput({ ...scenarioInput, grossMarginPercent: Number(e.target.value) })
                          }
                        />
                      </div>

                      <div className={styles.calcSliderGroup}>
                        <div className={styles.sliderLabelRow}>
                          <span className={styles.formLabel}>Monthly Operating Expenses (Opex)</span>
                          <strong>₹{scenarioInput.monthlyOpex.toLocaleString("en-IN")}</strong>
                        </div>
                        <input
                          type="range"
                          min={50000}
                          max={500000}
                          step={5000}
                          className={styles.sliderInput}
                          value={scenarioInput.monthlyOpex}
                          onChange={(e) =>
                            setScenarioInput({ ...scenarioInput, monthlyOpex: Number(e.target.value) })
                          }
                        />
                      </div>

                      <div className={styles.calcSliderGroup}>
                        <div className={styles.sliderLabelRow}>
                          <span className={styles.formLabel}>Inventory Investment (Working Stock)</span>
                          <strong>₹{scenarioInput.inventoryInvestment.toLocaleString("en-IN")}</strong>
                        </div>
                        <input
                          type="range"
                          min={100000}
                          max={1000000}
                          step={25000}
                          className={styles.sliderInput}
                          value={scenarioInput.inventoryInvestment}
                          onChange={(e) =>
                            setScenarioInput({ ...scenarioInput, inventoryInvestment: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className={styles.calcCard}>
                      <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "15px", color: "#fff" }}>
                        Projected Financial Yield & Break-Even
                      </h3>

                      <div className={styles.calcResultBox}>
                        <div className={styles.calcResultLabel}>Monthly Gross Profit</div>
                        <div className={`${styles.calcResultValue} ${styles.positiveDelta}`}>
                          ₹{scenarioResults.grossProfit.toLocaleString("en-IN")}
                        </div>
                      </div>

                      <div className={styles.calcResultBox}>
                        <div className={styles.calcResultLabel}>Operating Surplus / Loss (EBITDA)</div>
                        <div className={`${styles.calcResultValue} ${scenarioResults.operatingSurplus >= 0 ? styles.positiveDelta : styles.negativeDelta}`}>
                          ₹{scenarioResults.operatingSurplus.toLocaleString("en-IN")}
                          <span style={{ fontSize: "14px", marginLeft: "6px" }}>({scenarioResults.operatingMargin}%)</span>
                        </div>
                      </div>

                      <div className={`${styles.calcResultBox} ${styles.breakEvenHighlight}`}>
                        <div className={styles.calcResultLabel}>Monthly Break-Even Revenue</div>
                        <div className={styles.calcResultValue}>
                          ₹{scenarioResults.breakEvenRevenue.toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                          Formula: Fixed Opex ÷ (Blended Margin % ÷ 100)
                        </div>
                      </div>

                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "12px", lineHeight: "1.5" }}>
                        * Note: Planning assumptions only. Does not represent a guaranteed return or live distributor quote. Capex equipment amortisation is accounted over a 36-month horizon.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 9: FINANCIAL REPORTS */}
              {activeTab === "financials" && stats && (
                <div>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h1 className={styles.sectionTitle}>Financial Profitability & Opex Breakdown</h1>
                      <div className={styles.sectionDesc}>
                        Comprehensive profit and loss statement with recorded expenses and CSV download.
                      </div>
                    </div>
                    <button className={styles.exportBtn} onClick={() => triggerExport("summary")}>
                      📥 Download Full P&L CSV
                    </button>
                  </div>

                  <div className={styles.tableCard}>
                    <div className={styles.tableToolbar}>
                      <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>Recorded Operating Expenses (Opex)</h3>
                    </div>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Recorded By</th>
                          <th>Amount (INR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((e) => (
                          <tr key={e.id}>
                            <td>{e.date}</td>
                            <td>
                              <span className={`${styles.statusBadge} ${styles.statusBlue}`}>{e.category}</span>
                            </td>
                            <td>{e.description}</td>
                            <td>{e.recordedBy}</td>
                            <td><strong>₹{e.amountINR.toLocaleString("en-IN")}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 10: OUTLETS & FRANCHISE */}
              {activeTab === "franchise" && (
                <div>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h1 className={styles.sectionTitle}>Multi-Outlet Network & Franchise Terms</h1>
                      <div className={styles.sectionDesc}>
                        Company-owned hub vs franchise outlet parameters, royalty tracking & onboarding gating.
                      </div>
                    </div>
                  </div>

                  <div className={styles.tableCard}>
                    <div className={styles.tableToolbar} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>Active Outlets Master</h3>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowCreateOutletModal(true)}
                      >
                        + Open New Outlet & Store
                      </button>
                    </div>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Outlet Code</th>
                          <th>Outlet Name</th>
                          <th>Type</th>
                          <th>Location</th>
                          <th>Manager</th>
                          <th>Procurement Limit</th>
                          <th>Franchise Terms</th>
                          <th>Self-Onboarding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outlets.map((o) => (
                          <tr key={o.id}>
                            <td><strong>{o.code}</strong></td>
                            <td>{o.name}</td>
                            <td>
                              <span className={`${styles.statusBadge} ${o.type === "COMPANY_OWNED" ? styles.statusBlue : styles.statusPurple}`}>
                                {o.type === "COMPANY_OWNED" ? "COMPANY OWNED" : "FRANCHISE"}
                              </span>
                            </td>
                            <td>{o.city}, {o.pinCode}</td>
                            <td>{o.managerName} ({o.phone})</td>
                            <td>₹{o.procurementLimitINR.toLocaleString("en-IN")}</td>
                            <td>
                              {o.type === "FRANCHISE" ? (
                                <div>
                                  <div>Royalty: {o.royaltyPercent}%</div>
                                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>Fee: ₹{o.franchiseFeeAnnualINR?.toLocaleString("en-IN")}/yr</div>
                                </div>
                              ) : (
                                "100% Owned"
                              )}
                            </td>
                            <td>
                              <span className={`${styles.statusBadge} ${o.isFranchiseOnboardingEnabled ? styles.statusGreen : styles.statusYellow}`}>
                                {o.isFranchiseOnboardingEnabled ? "ENABLED" : "DISABLED (ADMIN GATED)"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Open New Outlet Modal */}
                  {showCreateOutletModal && (
                    <div className={styles.modalBackdrop}>
                      <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                          <h3 className={styles.modalTitle}>Launch New Service Centre & Spare Parts Store</h3>
                          <button
                            type="button"
                            className={styles.modalCloseBtn}
                            onClick={() => setShowCreateOutletModal(false)}
                          >
                            ×
                          </button>
                        </div>
                        <form onSubmit={handleCreateOutlet}>
                          <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                              <label className={styles.formLabel}>Outlet Model Type *</label>
                              <select
                                className={styles.formSelect}
                                value={newOutletForm.type}
                                onChange={(e) =>
                                  setNewOutletForm({
                                    ...newOutletForm,
                                    type: e.target.value as "COMPANY_OWNED" | "FRANCHISE",
                                  })
                                }
                              >
                                <option value="FRANCHISE">Franchisee Model (FOFO / FOCO)</option>
                                <option value="COMPANY_OWNED">Company-Owned Hub (COCO)</option>
                              </select>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                              <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Outlet Name *</label>
                                <input
                                  type="text"
                                  className={styles.formInput}
                                  placeholder="e.g. WowCars Express — Yelahanka"
                                  value={newOutletForm.name}
                                  onChange={(e) => setNewOutletForm({ ...newOutletForm, name: e.target.value })}
                                  required
                                />
                              </div>

                              <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Outlet Code</label>
                                <input
                                  type="text"
                                  className={styles.formInput}
                                  placeholder="e.g. OUT-KA-BLR-02 (auto if empty)"
                                  value={newOutletForm.code}
                                  onChange={(e) => setNewOutletForm({ ...newOutletForm, code: e.target.value.toUpperCase() })}
                                />
                              </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                              <div className={styles.formGroup}>
                                <label className={styles.formLabel}>City *</label>
                                <input
                                  type="text"
                                  className={styles.formInput}
                                  placeholder="e.g. Bengaluru, Mysuru, Hubballi"
                                  value={newOutletForm.city}
                                  onChange={(e) => setNewOutletForm({ ...newOutletForm, city: e.target.value })}
                                  required
                                />
                              </div>

                              <div className={styles.formGroup}>
                                <label className={styles.formLabel}>PIN Code</label>
                                <input
                                  type="text"
                                  className={styles.formInput}
                                  placeholder="6-digit PIN code"
                                  value={newOutletForm.pinCode}
                                  onChange={(e) => setNewOutletForm({ ...newOutletForm, pinCode: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className={styles.formGroup}>
                              <label className={styles.formLabel}>Full Street Address</label>
                              <input
                                type="text"
                                className={styles.formInput}
                                placeholder="Plot/Survey number, Main Road, Landmark"
                                value={newOutletForm.address}
                                onChange={(e) => setNewOutletForm({ ...newOutletForm, address: e.target.value })}
                              />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                              <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Manager / Supervisor Name *</label>
                                <input
                                  type="text"
                                  className={styles.formInput}
                                  placeholder="e.g. Rajesh Kumar"
                                  value={newOutletForm.managerName}
                                  onChange={(e) => setNewOutletForm({ ...newOutletForm, managerName: e.target.value })}
                                  required
                                />
                              </div>

                              <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Contact Phone *</label>
                                <input
                                  type="tel"
                                  className={styles.formInput}
                                  placeholder="+91 98XXX XXXXX"
                                  value={newOutletForm.phone}
                                  onChange={(e) => setNewOutletForm({ ...newOutletForm, phone: e.target.value })}
                                  required
                                />
                              </div>
                            </div>

                            {newOutletForm.type === "FRANCHISE" && (
                              <div style={{ padding: "12px", background: "rgba(147, 51, 234, 0.1)", border: "1px solid rgba(147, 51, 234, 0.25)", borderRadius: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
                                  <label className={styles.formLabel}>Franchise Entity / Owner Name</label>
                                  <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="e.g. Apex Auto Ventures LLP"
                                    value={newOutletForm.franchiseOwnerName}
                                    onChange={(e) => setNewOutletForm({ ...newOutletForm, franchiseOwnerName: e.target.value })}
                                  />
                                </div>

                                <div className={styles.formGroup}>
                                  <label className={styles.formLabel}>Annual Franchise Fee (INR)</label>
                                  <input
                                    type="number"
                                    className={styles.formInput}
                                    value={newOutletForm.franchiseFeeAnnualINR}
                                    onChange={(e) => setNewOutletForm({ ...newOutletForm, franchiseFeeAnnualINR: Number(e.target.value) })}
                                  />
                                </div>

                                <div className={styles.formGroup}>
                                  <label className={styles.formLabel}>Royalty Share (%)</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    className={styles.formInput}
                                    value={newOutletForm.royaltyPercent}
                                    onChange={(e) => setNewOutletForm({ ...newOutletForm, royaltyPercent: Number(e.target.value) })}
                                  />
                                </div>
                              </div>
                            )}

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                              <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Procurement Credit Limit (INR)</label>
                                <input
                                  type="number"
                                  className={styles.formInput}
                                  value={newOutletForm.procurementLimitINR}
                                  onChange={(e) => setNewOutletForm({ ...newOutletForm, procurementLimitINR: Number(e.target.value) })}
                                />
                              </div>

                              <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Self-Onboarding Enabled</label>
                                <select
                                  className={styles.formSelect}
                                  value={newOutletForm.isFranchiseOnboardingEnabled ? "true" : "false"}
                                  onChange={(e) => setNewOutletForm({ ...newOutletForm, isFranchiseOnboardingEnabled: e.target.value === "true" })}
                                >
                                  <option value="true">Enabled (Allow Self-Onboarding)</option>
                                  <option value="false">Disabled (Admin Controlled)</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className={styles.modalFooter}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setShowCreateOutletModal(false)}
                            >
                              Cancel
                            </button>
                            <button type="submit" className="btn btn-primary btn-sm">
                              Confirm & Register Outlet
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
