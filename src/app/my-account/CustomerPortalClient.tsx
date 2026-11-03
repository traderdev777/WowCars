"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./CustomerPortal.module.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/common/PageHero";
import DashboardStatCard from "@/components/common/DashboardStatCard";
import CTASection from "@/components/common/CTASection";
import {
  Car, Wrench, Shield, CheckCircle, Clock, AlertTriangle, FileText,
  Package, MessageSquare, Plus, Trash2, ArrowRight, LogOut, User,
  RefreshCw, X, ChevronRight, Phone, Mail, MapPin, Calendar, ExternalLink
} from "lucide-react";
import {
  Customer, CustomerVehicle, GarageJobCard, PartOrder,
  CustomerSupportTicket
} from "@/lib/db/types";

type PortalTab = "overview" | "garage" | "appointments" | "orders" | "invoices" | "support" | "profile";

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  sourceType: "GARAGE_SERVICE" | "SPARE_PARTS";
  date: string;
  outletOrSeller: string;
  vehicleDetails?: string;
  subtotalINR: number;
  taxINR: number;
  discountINR: number;
  totalINR: number;
  paymentStatus: "PAID" | "PAYMENT_DUE" | "PENDING";
}

interface CompatiblePart {
  id: string;
  name: string;
  sku: string;
  price: number;
  mrp: number;
  categoryName: string;
  compatibilityConfidence: "EXACT" | "HIGH" | "UNIVERSAL";
  matchReason: string;
}

export default function CustomerPortalClient() {
  // Auth State
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>("overview");

  // OTP Login Form State
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [fullName, setFullName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Portal Data States
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [appointments, setAppointments] = useState<GarageJobCard[]>([]);
  const [orders, setOrders] = useState<PartOrder[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [tickets, setTickets] = useState<CustomerSupportTicket[]>([]);

  // Modals & Drawers
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showBookServiceModal, setShowBookServiceModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState<string | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [activeThreadTicket, setActiveThreadTicket] = useState<CustomerSupportTicket | null>(null);
  const [threadReplyMessage, setThreadReplyMessage] = useState("");

  // Compatible Parts State
  const [selectedVehicleForSpares, setSelectedVehicleForSpares] = useState<CustomerVehicle | null>(null);
  const [compatibleParts, setCompatibleParts] = useState<CompatiblePart[]>([]);
  const [loadingSpares, setLoadingSpares] = useState(false);

  // Add Vehicle Form State
  const [vMake, setVMake] = useState("Maruti Suzuki");
  const [vModel, setVModel] = useState("Swift");
  const [vYear, setVYear] = useState("2022");
  const [vVariant, setVVariant] = useState("ZXi");
  const [vFuel, setVFuel] = useState<"PETROL" | "DIESEL" | "CNG" | "ELECTRIC">("PETROL");
  const [vTransmission, setVTransmission] = useState<"MANUAL" | "AUTOMATIC">("MANUAL");
  const [vRegNumber, setVRegNumber] = useState("");
  const [vMileage, setVMileage] = useState("");

  // Book Service Form State
  const [bookOutletId, setBookOutletId] = useState("out-blr-koramangala");
  const [bookServiceType, setBookServiceType] = useState("General Periodic Service");
  const [bookPreferredDate, setBookPreferredDate] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  // Return Request Form State
  const [returnReason, setReturnReason] = useState<"DEFECTIVE_OR_DAMAGED" | "WRONG_ITEM_DELIVERED" | "FITMENT_ISSUE" | "NO_LONGER_NEEDED">("DEFECTIVE_OR_DAMAGED");
  const [returnDescription, setReturnDescription] = useState("");

  // Support Ticket Form State
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("SERVICE_QUERY");
  const [ticketPriority, setTicketPriority] = useState("MEDIUM");
  const [ticketMessage, setTicketMessage] = useState("");

  // Profile Edit State
  const [pFullName, setPFullName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pCity, setPCity] = useState("");
  const [pState, setPState] = useState("");
  const [pPincode, setPPincode] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // 1. Initial Authentication Check
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customer/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setPFullName(data.customer.fullName || "");
        setPEmail(data.customer.email || "");
        setPCity(data.customer.city || "");
        setPState(data.customer.state || "");
        setPPincode(data.customer.pincode || "");
        setPAddress(data.customer.address || "");
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 2. Fetch Customer Data once authenticated
  const loadCustomerData = useCallback(async () => {
    if (!customer) return;

    try {
      const [vRes, aRes, oRes, iRes, tRes] = await Promise.all([
        fetch("/api/customer/garage/vehicles", { cache: "no-store" }),
        fetch("/api/customer/garage/appointments", { cache: "no-store" }),
        fetch("/api/customer/orders", { cache: "no-store" }),
        fetch("/api/customer/invoices", { cache: "no-store" }),
        fetch("/api/customer/tickets", { cache: "no-store" }),
      ]);

      if (vRes.ok) {
        const vData = await vRes.json();
        setVehicles(vData.vehicles || []);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAppointments(aData.appointments || []);
      }
      if (oRes.ok) {
        const oData = await oRes.json();
        setOrders(oData.orders || []);
      }
      if (iRes.ok) {
        const iData = await iRes.json();
        setInvoices(iData.invoices || []);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTickets(tData.tickets || []);
      }
    } catch (err) {
      console.error("Error loading customer data:", err);
    }
  }, [customer]);

  useEffect(() => {
    if (customer) {
      loadCustomerData();
    }
  }, [customer, loadCustomerData]);

  // Auth Handlers
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthSubmitting(true);

    try {
      const res = await fetch("/api/customer/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Failed to send OTP.");
      } else {
        setOtpSent(true);
        setAuthSuccess(data.message || "OTP sent successfully.");
        if (data.demoOtp) {
          setDemoOtpHint(data.demoOtp);
          const digits = data.demoOtp.split("");
          setOtp(digits);
        }
      }
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);

    const fullOtp = otp.join("");
    try {
      const res = await fetch("/api/customer/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: fullOtp, fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Invalid OTP.");
      } else {
        setCustomer(data.customer);
        setAuthSuccess("Login successful!");
      }
    } catch {
      setAuthError("Verification failed. Please try again.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/customer/auth/logout", { method: "POST" });
      setCustomer(null);
      setOtpSent(false);
      setPhone("");
      setOtp(["", "", "", "", "", ""]);
      setDemoOtpHint(null);
      setActiveTab("overview");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Add Vehicle Handler
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/customer/garage/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: vMake,
          model: vModel,
          year: vYear,
          variant: vVariant,
          fuel: vFuel,
          transmission: vTransmission,
          regNumber: vRegNumber,
          mileageKm: vMileage,
        }),
      });
      if (res.ok) {
        setShowAddVehicleModal(false);
        setVRegNumber("");
        setVMileage("");
        loadCustomerData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add vehicle.");
      }
    } catch {
      alert("Error adding vehicle.");
    }
  };

  // Delete Vehicle Handler
  const handleDeleteVehicle = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from My Garage?`)) return;
    try {
      const res = await fetch(`/api/customer/garage/vehicles/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadCustomerData();
        if (selectedVehicleForSpares?.id === id) {
          setSelectedVehicleForSpares(null);
          setCompatibleParts([]);
        }
      }
    } catch {
      alert("Error deleting vehicle.");
    }
  };

  // Load Compatible Parts for a Vehicle
  const handleViewCompatibleParts = async (vehicle: CustomerVehicle) => {
    setSelectedVehicleForSpares(vehicle);
    setLoadingSpares(true);
    try {
      const res = await fetch(`/api/customer/garage/compatible-parts?vehicleId=${vehicle.id}`);
      if (res.ok) {
        const data = await res.json();
        setCompatibleParts(data.recommendations || []);
      }
    } catch (err) {
      console.error("Error loading compatible parts:", err);
    } finally {
      setLoadingSpares(false);
    }
  };

  // Book Service Handler
  const handleBookService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/customer/garage/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: bookOutletId,
          vehicleId: vehicles[0]?.id,
          serviceType: bookServiceType,
          preferredDate: bookPreferredDate,
          notes: bookNotes,
        }),
      });
      if (res.ok) {
        setShowBookServiceModal(false);
        setBookNotes("");
        setBookPreferredDate("");
        loadCustomerData();
        setActiveTab("appointments");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to schedule appointment.");
      }
    } catch {
      alert("Error scheduling appointment.");
    }
  };

  // Estimate Approval Handler
  const handleApproveEstimate = async (jobId: string, action: "APPROVE" | "REJECT") => {
    const promptMsg = action === "APPROVE"
      ? "Confirm approval of this repair estimate?"
      : "Please state reason for declining or requesting revision:";
    let notes = "";
    if (action === "REJECT") {
      const input = prompt(promptMsg);
      if (!input) return;
      notes = input;
    } else {
      if (!confirm(promptMsg)) return;
    }

    try {
      const res = await fetch(`/api/customer/garage/appointments/${jobId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      if (res.ok) {
        loadCustomerData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to process estimate approval.");
      }
    } catch {
      alert("Error updating estimate approval.");
    }
  };

  // Return Request Handler
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReturnModal) return;

    try {
      const res = await fetch(`/api/customer/orders/${showReturnModal}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: returnReason,
          reasonDescription: returnDescription,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Return requested successfully.");
        setShowReturnModal(null);
        setReturnDescription("");
        loadCustomerData();
      } else {
        alert(data.error || "Failed to submit return request.");
      }
    } catch {
      alert("Error submitting return request.");
    }
  };

  // Support Ticket Handler
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/customer/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: ticketSubject,
          category: ticketCategory,
          priority: ticketPriority,
          message: ticketMessage,
        }),
      });
      if (res.ok) {
        setShowTicketModal(false);
        setTicketSubject("");
        setTicketMessage("");
        loadCustomerData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create support ticket.");
      }
    } catch {
      alert("Error creating ticket.");
    }
  };

  // Ticket Message Reply Handler
  const handleSendThreadReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThreadTicket || !threadReplyMessage.trim()) return;

    try {
      const res = await fetch(`/api/customer/tickets/${activeThreadTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: threadReplyMessage }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveThreadTicket(data.ticket);
        setThreadReplyMessage("");
        loadCustomerData();
      }
    } catch {
      alert("Error sending message.");
    }
  };

  // Profile Update Handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccessMsg("");
    try {
      const res = await fetch("/api/customer/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: pFullName,
          email: pEmail,
          city: pCity,
          state: pState,
          pincode: pPincode,
          address: pAddress,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setProfileSuccessMsg("Profile details updated successfully.");
        setTimeout(() => setProfileSuccessMsg(""), 4000);
      }
    } catch {
      alert("Error updating profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  // RENDER: Loading Spinner
  if (loading) {
    return (
      <div className={styles.portalPage}>
        <Navbar />
        <div style={{ textAlign: "center", padding: "10rem 0", minHeight: "60vh" }}>
          <RefreshCw size={36} className="spin" style={{ color: "#ED1C24", margin: "0 auto 1rem" }} />
          <p style={{ color: "#8E8E93" }}>Loading your WowCars Customer Account...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // RENDER: Unauthenticated Mobile OTP Login Card
  if (!customer) {
    return (
      <div className={styles.portalPage}>
        <Navbar />
        <PageHero
          badge="Customer Concierge"
          title="Sign In to Connected Garage"
          subtitle="Access your vehicles, review live repair job cards, approve digital estimates, and track genuine spare parts deliveries."
          stats={[
            { label: "Connected Hubs", value: "Bengaluru & Mysuru" },
            { label: "Inspection", value: "140-Point Digital" },
            { label: "Warranty", value: "6 Months" },
            { label: "Support", value: "24x7 Concierge" },
          ]}
          staffImage="/images/staff-customer-support.jpg"
          staffName="Arjun Sharma"
          staffRole="Customer Concierge Specialist"
          staffContext="Dedicated Garage & Service Relationship Manager"
        />
        <div className={styles.portalContainer} style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
          <div className={styles.authContainer}>
            <div className={styles.authBadge}>
              <Shield size={14} />
              <span>Secure Customer Portal</span>
            </div>
            <h1 className={styles.authTitle}>Sign In to WowCars</h1>
            <p className={styles.authSubtitle}>
              Access your connected garage, review service estimates, track spare parts orders, and view GST invoices.
            </p>

            {authError && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #EF4444", color: "#FCA5A5", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                {authError}
              </div>
            )}

            {authSuccess && (
              <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10B981", color: "#6EE7B7", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                {authSuccess}
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>Indian Mobile Number</label>
                  <div className={styles.phoneInputGroup}>
                    <span className={styles.phonePrefix}>+91</span>
                    <input
                      type="tel"
                      className={styles.phoneInput}
                      placeholder="98765 43210"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={authSubmitting || phone.length < 10}
                >
                  {authSubmitting ? "Sending OTP..." : "Continue with Mobile OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                {demoOtpHint && (
                  <div className={styles.demoOtpNotice}>
                    <span>Auto-Generated Demo OTP: <strong>{demoOtpHint}</strong></span>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", color: "#fff", textDecoration: "underline", cursor: "pointer", fontSize: "0.75rem" }}
                      onClick={() => setOtp(demoOtpHint.split(""))}
                    >
                      Fill
                    </button>
                  </div>
                )}

                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>Enter 6-Digit OTP</label>
                  <div className={styles.otpGrid}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-box-${idx}`}
                        type="text"
                        maxLength={1}
                        className={styles.otpInput}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const nextOtp = [...otp];
                          nextOtp[idx] = val;
                          setOtp(nextOtp);
                          if (val && idx < 5) {
                            const nextEl = document.getElementById(`otp-box-${idx + 1}`);
                            nextEl?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !digit && idx > 0) {
                            const prevEl = document.getElementById(`otp-box-${idx - 1}`);
                            prevEl?.focus();
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>Your Full Name (First-Time Registration)</label>
                  <input
                    type="text"
                    className={styles.authInput}
                    placeholder="e.g. Ramesh Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => { setOtpSent(false); setAuthError(""); }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={authSubmitting || otp.join("").length < 6}
                  >
                    {authSubmitting ? "Verifying..." : "Verify & Sign In"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        <CTASection
          title="Need Immediate Assistance or Breakdown Support?"
          subtitle="Call our 24x7 emergency helpline or speak to our Bengaluru workshop manager directly."
          primaryAction={{
            label: "Call Concierge: +91 98801 23456",
            href: "tel:+919880123456",
          }}
          secondaryAction={{
            label: "Explore Multi-Brand Services",
            href: "/service-centres",
          }}
          variant="black"
        />
        <Footer />
      </div>
    );
  }

  // Pending Estimate Approvals Count
  const pendingApprovals = appointments.filter(
    (a) => a.customerApprovalStatus === "PENDING" || a.status === "AWAITING_CUSTOMER_APPROVAL"
  );

  return (
    <div className={styles.portalPage}>
      <Navbar />

      <PageHero
        badge="Connected Garage & Account"
        title={customer.fullName ? `${customer.fullName}'s Garage` : "Connected Garage & Account"}
        subtitle="Manage your vehicles, review live workshop job cards, approve estimates with 1-click, and track genuine spare parts orders across India."
        stats={[
          { label: "Garage Vehicles", value: `${vehicles.length}` },
          { label: "Service Bookings", value: `${appointments.length}` },
          { label: "Parts Orders", value: `${orders.length}` },
          { label: "Account Status", value: customer.isPhoneVerified ? "Verified" : "Active" },
        ]}
        staffImage="/images/staff-customer-support.jpg"
        staffName="Arjun Sharma"
        staffRole="Customer Concierge Specialist"
        staffContext="Dedicated Garage & Service Relationship Manager"
      />

      <div className={styles.portalContainer} style={{ paddingTop: "2rem" }}>
        {/* Header Banner */}
        <header className={styles.portalHeader}>
          <div>
            <h1 className={styles.portalTitle}>My Account & Connected Garage</h1>
            <div className={styles.customerMeta}>
              <span>{customer.fullName}</span>
              <span>•</span>
              <span>+91 {customer.phone}</span>
              {customer.isPhoneVerified && (
                <span className={styles.verifiedBadge}>
                  <CheckCircle size={12} />
                  <span>Verified Customer</span>
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={() => setShowAddVehicleModal(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={16} />
              <span>Add Vehicle</span>
            </button>
            <button
              onClick={() => setShowBookServiceModal(true)}
              className="btn btn-secondary btn-sm"
            >
              <Wrench size={16} />
              <span>Book Service</span>
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className={styles.tabsNav} aria-label="Account Tabs">
          <button
            className={`${styles.tabBtn} ${activeTab === "overview" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <User size={16} />
            <span>Overview</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "garage" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("garage")}
          >
            <Car size={16} />
            <span>My Garage</span>
            <span className={styles.tabBadge}>{vehicles.length}</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "appointments" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("appointments")}
          >
            <Wrench size={16} />
            <span>Service & Estimates</span>
            {pendingApprovals.length > 0 ? (
              <span className={`${styles.tabBadge} ${styles.tabBadgeHighlight}`}>
                {pendingApprovals.length} Approval
              </span>
            ) : (
              <span className={styles.tabBadge}>{appointments.length}</span>
            )}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "orders" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <Package size={16} />
            <span>Parts Orders</span>
            <span className={styles.tabBadge}>{orders.length}</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "invoices" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("invoices")}
          >
            <FileText size={16} />
            <span>GST Invoices</span>
            <span className={styles.tabBadge}>{invoices.length}</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "support" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("support")}
          >
            <MessageSquare size={16} />
            <span>Support Tickets</span>
            <span className={styles.tabBadge}>{tickets.length}</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "profile" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <Shield size={16} />
            <span>Profile & Security</span>
          </button>
        </nav>

        {/* =========================================================================
            TAB 1: OVERVIEW & QUICK STATS
            ========================================================================= */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <DashboardStatCard
                title="Vehicles in My Garage"
                value={vehicles.length}
                subtitle="Connected digital garage"
                variant="highlight"
                icon={<Car size={18} />}
                onClick={() => setActiveTab("garage")}
              />
              <DashboardStatCard
                title="Service Appointments"
                value={appointments.length}
                subtitle={pendingApprovals.length > 0 ? `${pendingApprovals.length} estimate awaiting approval` : "All jobs up to date"}
                variant={pendingApprovals.length > 0 ? "danger" : "default"}
                icon={<Wrench size={18} />}
                onClick={() => setActiveTab("appointments")}
              />
              <DashboardStatCard
                title="Spare Parts Orders"
                value={orders.length}
                subtitle="Track deliveries & AWBs"
                variant="default"
                icon={<Package size={18} />}
                onClick={() => setActiveTab("orders")}
              />
              <DashboardStatCard
                title="Total Spend & Invoices"
                value={`₹${invoices.reduce((acc, i) => acc + (i.totalINR || 0), 0).toLocaleString("en-IN")}`}
                subtitle="GST tax invoices available"
                variant="success"
                icon={<FileText size={18} />}
                onClick={() => setActiveTab("invoices")}
              />
            </div>

            {/* Pending Approvals Alert Banner */}
            {pendingApprovals.length > 0 && (
              <div className={styles.estimateAlert}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <AlertTriangle size={28} color="#FBBF24" />
                  <div>
                    <h4 style={{ color: "#FBBF24", fontWeight: 700, margin: 0, fontSize: "1.05rem" }}>
                      Action Required: {pendingApprovals.length} Repair Estimate Awaiting Your Approval
                    </h4>
                    <p style={{ margin: "0.25rem 0 0", color: "#CCC", fontSize: "0.85rem" }}>
                      Our technician has prepared the digital inspection and part quotation. Review and approve to begin work.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("appointments")}
                  className="btn btn-primary btn-sm"
                >
                  Review Estimates
                </button>
              </div>
            )}

            {/* Quick Garage Overview */}
            <div style={{ marginTop: "2rem" }}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <Car size={20} color="#E50914" />
                  <span>My Garage Quick Access</span>
                </h2>
                <button onClick={() => setShowAddVehicleModal(true)} className="btn btn-ghost btn-sm">
                  + Add New Vehicle
                </button>
              </div>

              {vehicles.length === 0 ? (
                <div className={styles.emptyState}>
                  <Car size={42} className={styles.emptyIcon} />
                  <h3 className={styles.emptyTitle}>No Vehicles Saved in My Garage</h3>
                  <p className={styles.emptyText}>
                    Add your car or two-wheeler to receive automated service reminders, PUC expiry alerts, and guaranteed compatible spare parts.
                  </p>
                  <button onClick={() => setShowAddVehicleModal(true)} className="btn btn-primary">
                    + Add Your First Vehicle
                  </button>
                </div>
              ) : (
                <div className={styles.vehiclesGrid}>
                  {vehicles.map((v) => (
                    <div key={v.id} className={styles.vehicleCard}>
                      <div className={styles.vehicleCardHeader}>
                        <div>
                          <h3 className={styles.vehicleTitle}>{v.make} {v.model}</h3>
                          <span className={styles.regNumberPlate}>{v.regNumber || "REG PENDING"}</span>
                        </div>
                        <span className={styles.specPill}>{v.year}</span>
                      </div>
                      <div className={styles.vehicleSpecs}>
                        <span className={styles.specPill}>{v.fuel || v.fuelType || "Petrol"}</span>
                        <span className={styles.specPill}>{v.transmission}</span>
                        <span className={styles.specPill}>{v.variant}</span>
                        {(v.mileageKm || v.odometerKm) && <span className={styles.specPill}>{(v.mileageKm || v.odometerKm)?.toLocaleString("en-IN")} km</span>}
                      </div>

                      <div className={styles.vehicleActions}>
                        <button
                          onClick={() => handleViewCompatibleParts(v)}
                          className="btn btn-secondary btn-sm btn-full"
                        >
                          <Wrench size={14} />
                          <span>View Spares</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowBookServiceModal(true);
                          }}
                          className="btn btn-primary btn-sm btn-full"
                        >
                          Book Service
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: MY GARAGE (CONNECTED VEHICLE ECOSYSTEM)
            ========================================================================= */}
        {activeTab === "garage" && (
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <Car size={22} color="#E50914" />
                  <span>My Garage Vehicles</span>
                </h2>
                <p style={{ color: "#8E8E93", fontSize: "0.9rem", margin: "0.25rem 0 0" }}>
                  Save your household vehicles for 100% verified part compatibility matching and scheduled garage servicing.
                </p>
              </div>
              <button onClick={() => setShowAddVehicleModal(true)} className="btn btn-primary">
                + Add Vehicle
              </button>
            </div>

            {vehicles.length === 0 ? (
              <div className={styles.emptyState}>
                <Car size={48} className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>Your Garage is Currently Empty</h3>
                <p className={styles.emptyText}>
                  Add your vehicle registration number, make, model and variant to unlock vehicle-specific maintenance schedules.
                </p>
                <button onClick={() => setShowAddVehicleModal(true)} className="btn btn-primary">
                  + Add Your First Vehicle
                </button>
              </div>
            ) : (
              <div className={styles.vehiclesGrid}>
                {vehicles.map((v) => (
                  <div key={v.id} className={styles.vehicleCard}>
                    <div className={styles.vehicleCardHeader}>
                      <div>
                        <h3 className={styles.vehicleTitle}>{v.make} {v.model}</h3>
                        <span className={styles.regNumberPlate}>{v.regNumber || "NO REG"}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteVehicle(v.id, `${v.make} ${v.model}`)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#EF4444" }}
                        title="Remove vehicle"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className={styles.vehicleSpecs}>
                      <span className={styles.specPill}>Year: {v.year}</span>
                      <span className={styles.specPill}>{v.fuel || v.fuelType || "Petrol"}</span>
                      <span className={styles.specPill}>{v.transmission}</span>
                      <span className={styles.specPill}>Variant: {v.variant}</span>
                    </div>

                    <div className={styles.remindersList}>
                      <div className={styles.reminderItem}>
                        <Calendar size={14} color="#F59E0B" />
                        <span>Next Periodic Service: <strong>Due in 3,000 km</strong></span>
                      </div>
                      <div className={styles.reminderItem}>
                        <Shield size={14} color="#10B981" />
                        <span>Insurance Status: <strong>Comprehensive Active</strong></span>
                      </div>
                    </div>

                    <div className={styles.vehicleActions}>
                      <button
                        onClick={() => handleViewCompatibleParts(v)}
                        className="btn btn-secondary btn-sm btn-full"
                      >
                        <Wrench size={14} />
                        <span>Compatible Spares</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowBookServiceModal(true);
                        }}
                        className="btn btn-primary btn-sm btn-full"
                      >
                        Book Service
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Live Compatible Spares Panel */}
            {selectedVehicleForSpares && (
              <div className={styles.compatibleDrawer}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text)" }}>
                      Verified Compatible Spares for {selectedVehicleForSpares.make} {selectedVehicleForSpares.model} ({selectedVehicleForSpares.year})
                    </h3>
                    <p style={{ margin: "0.25rem 0 0", color: "#8E8E93", fontSize: "0.85rem" }}>
                      Matched using OEM catalog cross-references and engine compatibility algorithms.
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedVehicleForSpares(null)}
                    style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {loadingSpares ? (
                  <div style={{ padding: "2rem 0", textAlign: "center", color: "#888" }}>
                    <RefreshCw size={24} className="spin" style={{ margin: "0 auto 0.5rem" }} />
                    <p>Matching compatibility matrix...</p>
                  </div>
                ) : compatibleParts.length === 0 ? (
                  <p style={{ color: "#888", marginTop: "1rem" }}>
                    No exact matching catalog components found. Contact our parts desk for custom procurement.
                  </p>
                ) : (
                  <div className={styles.partsMiniGrid}>
                    {compatibleParts.map((p) => (
                      <div key={p.id} className={styles.partMiniCard}>
                        <div>
                          <span className={`${styles.matchConfidence} ${
                            p.compatibilityConfidence === "EXACT" ? styles.confidenceExact :
                            p.compatibilityConfidence === "HIGH" ? styles.confidenceHigh : styles.confidenceUniversal
                          }`}>
                            {p.compatibilityConfidence} Match
                          </span>
                          <h4 style={{ margin: "0.25rem 0", fontSize: "0.95rem", color: "var(--text)" }}>{p.name}</h4>
                          <span style={{ fontSize: "0.75rem", color: "#888" }}>SKU: {p.sku}</span>
                          <p style={{ fontSize: "0.8rem", color: "#AAA", margin: "0.4rem 0" }}>{p.matchReason}</p>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", borderTop: "1px solid #282828", paddingTop: "0.5rem" }}>
                          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)" }}>
                            ₹{p.price.toLocaleString("en-IN")}
                          </span>
                          <Link href={`/spare-parts/${p.id}`} className="btn btn-primary btn-sm">
                            View Part
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: SERVICE APPOINTMENTS & DIGITAL QUOTATIONS
            ========================================================================= */}
        {activeTab === "appointments" && (
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <Wrench size={22} color="#E50914" />
                  <span>Garage Appointments & Digital Estimates</span>
                </h2>
                <p style={{ color: "#8E8E93", fontSize: "0.9rem", margin: "0.25rem 0 0" }}>
                  Track live job card stages, inspect technician labor and parts line items, and approve quotations with 1-click.
                </p>
              </div>
              <button onClick={() => setShowBookServiceModal(true)} className="btn btn-primary">
                + Book Service
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className={styles.emptyState}>
                <Wrench size={48} className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>No Service Bookings Found</h3>
                <p className={styles.emptyText}>
                  Book your car or two-wheeler for scheduled periodic maintenance, brake servicing, or comprehensive diagnostic inspection.
                </p>
                <button onClick={() => setShowBookServiceModal(true)} className="btn btn-primary">
                  Book Service Appointment
                </button>
              </div>
            ) : (
              <div className={styles.appointmentsList}>
                {appointments.map((a) => (
                  <div key={a.id} className={styles.jobCard}>
                    <div className={styles.jobHeader}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
                          <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text)" }}>
                            Job Card #{a.jobCardNumber}
                          </h3>
                          <span className={`${styles.statusPill} ${
                            a.status === "DELIVERED" ? styles.statusResolved :
                            a.status === "IN_PROGRESS" ? styles.statusInProgress : styles.statusOpen
                          }`}>
                            {a.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div style={{ color: "#8E8E93", fontSize: "0.85rem" }}>
                          Vehicle: <strong>{a.vehicleMake} {a.vehicleModel} ({a.vehicleNumber})</strong> • Outlet: {a.outletId}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)" }}>
                          ₹{a.totalInvoiceINR.toLocaleString("en-IN")}
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "#888" }}>
                          Customer Approval: <strong>{a.customerApprovalStatus}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Estimate Approval Callout */}
                    {(a.customerApprovalStatus === "PENDING" || a.status === "AWAITING_CUSTOMER_APPROVAL") && (
                      <div className={styles.estimateAlert}>
                        <div>
                          <strong style={{ color: "#FBBF24", display: "block" }}>
                            Digital Estimate Ready for Approval
                          </strong>
                          <span style={{ fontSize: "0.85rem", color: "#CCC" }}>
                            Labor: ₹{a.labourRevenueINR.toLocaleString("en-IN")} • Parts: ₹{a.partsRevenueINR.toLocaleString("en-IN")} • Tax: ₹{a.taxAmountINR.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => handleApproveEstimate(a.id, "REJECT")}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#EF4444" }}
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleApproveEstimate(a.id, "APPROVE")}
                            className="btn btn-primary btn-sm"
                          >
                            <CheckCircle size={14} />
                            <span>Approve Estimate</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Services & Parts Line Items */}
                    <div style={{ marginTop: "1rem", background: "#141414", borderRadius: "8px", padding: "1rem", border: "1px solid #282828" }}>
                      <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "#888", textTransform: "uppercase" }}>
                        Labor Services & Parts Included
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#DDD", fontSize: "0.85rem" }}>
                        {a.services.map((s, idx) => (
                          <li key={idx} style={{ marginBottom: "0.25rem" }}>
                            {s.serviceName} — ₹{s.labourChargeINR.toLocaleString("en-IN")}
                          </li>
                        ))}
                        {a.parts.map((p, idx) => (
                          <li key={idx} style={{ marginBottom: "0.25rem" }}>
                            [Part] {p.title} (Qty {p.quantity}) — ₹{(p.unitBillableINR * p.quantity).toLocaleString("en-IN")}
                          </li>
                        ))}
                      </ul>
                      {a.inspectionNotes && (
                        <p style={{ margin: "0.75rem 0 0", color: "#8E8E93", fontSize: "0.8rem", borderTop: "1px dashed #333", paddingTop: "0.5rem" }}>
                          Service Notes: {a.inspectionNotes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: PARTS ORDERS & LIVE TRACKING
            ========================================================================= */}
        {activeTab === "orders" && (
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <Package size={22} color="#E50914" />
                  <span>Spare Parts Orders & Shipments</span>
                </h2>
                <p style={{ color: "#8E8E93", fontSize: "0.9rem", margin: "0.25rem 0 0" }}>
                  Real-time warehouse dispatch milestones, courier AWB tracking, and 7-day hassle-free return requests.
                </p>
              </div>
              <Link href="/spare-parts" className="btn btn-primary">
                Browse Parts Catalog
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className={styles.emptyState}>
                <Package size={48} className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>No Parts Orders Found</h3>
                <p className={styles.emptyText}>
                  Order OEM filters, brake pads, fluids, batteries and tyres with 100% genuine warranty and PAN-India courier delivery.
                </p>
                <Link href="/spare-parts" className="btn btn-primary">
                  Explore Spare Parts
                </Link>
              </div>
            ) : (
              <div className={styles.ordersList}>
                {orders.map((o) => (
                  <div key={o.id} className={styles.orderCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text)" }}>
                          Order #{o.orderNumber}
                        </h3>
                        <span style={{ fontSize: "0.85rem", color: "#888" }}>
                          Placed on {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} • {o.items.length} Item(s)
                        </span>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)" }}>
                          ₹{o.totalAmount.toLocaleString("en-IN")}
                        </div>
                        <span className={`${styles.statusPill} ${
                          o.paymentStatus === "PAID" ? styles.statusResolved : styles.statusInProgress
                        }`}>
                          Payment: {o.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {/* Order Progress Timeline */}
                    <div className={styles.orderTimeline}>
                      <div className={`${styles.timelineStep} ${styles.stepCompleted}`}>
                        <div className={styles.stepDot}>1</div>
                        <span>Placed</span>
                      </div>
                      <div className={`${styles.timelineStep} ${
                        ["PAYMENT_CONFIRMED", "PROCESSING", "DISPATCHED", "DELIVERED"].includes(o.orderStatus) ? styles.stepCompleted : ""
                      }`}>
                        <div className={styles.stepDot}>2</div>
                        <span>Confirmed</span>
                      </div>
                      <div className={`${styles.timelineStep} ${
                        ["DISPATCHED", "DELIVERED"].includes(o.orderStatus) ? styles.stepCompleted : ""
                      }`}>
                        <div className={styles.stepDot}>3</div>
                        <span>Dispatched</span>
                      </div>
                      <div className={`${styles.timelineStep} ${
                        o.orderStatus === "DELIVERED" ? styles.stepCompleted : ""
                      }`}>
                        <div className={styles.stepDot}>4</div>
                        <span>Delivered</span>
                      </div>
                    </div>

                    {/* Courier Tracking Info */}
                    {o.trackingNumber && (
                      <div style={{ background: "#141414", padding: "0.75rem 1rem", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <span style={{ fontSize: "0.85rem", color: "#CCC" }}>
                          Courier: <strong>{o.courierPartner || o.shippingCourier || "Bluedart Express"}</strong> • AWB: <strong>{o.trackingNumber}</strong>
                        </span>
                        <a
                          href={`https://track.wowcars.in/awb/${o.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                        >
                          <span>Live Track</span>
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    )}

                    {/* Ordered Items List */}
                    <div style={{ borderTop: "1px solid #282828", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                      <div style={{ fontSize: "0.85rem", color: "#AAA" }}>
                        {o.items.map((it, idx) => (
                          <span key={idx} style={{ display: "inline-block", marginRight: "1rem" }}>
                            • {it.title} (x{it.quantity})
                          </span>
                        ))}
                      </div>

                      {/* Return Request Button */}
                      <div>
                        {o.orderStatus === "DELIVERED" && (
                          <button
                            onClick={() => setShowReturnModal(o.id)}
                            className="btn btn-secondary btn-sm"
                          >
                            Return / Replacement
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 5: GST INVOICES & PAYMENT HISTORY
            ========================================================================= */}
        {activeTab === "invoices" && (
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <FileText size={22} color="#E50914" />
                  <span>GST Tax Invoices & Payment Records</span>
                </h2>
                <p style={{ color: "#8E8E93", fontSize: "0.9rem", margin: "0.25rem 0 0" }}>
                  Compliant GST B2C and B2B invoices for all garage services, replacement components and spare parts.
                </p>
              </div>
            </div>

            {invoices.length === 0 ? (
              <div className={styles.emptyState}>
                <FileText size={48} className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>No Invoices Issued Yet</h3>
                <p className={styles.emptyText}>
                  Your GST tax invoices with HSN/SAC codes will appear here immediately after completed services or paid part shipments.
                </p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Outlet / Supplier</th>
                      <th>Subtotal</th>
                      <th>GST Tax</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 700, color: "var(--text)" }}>{inv.invoiceNumber}</td>
                        <td>{new Date(inv.date).toLocaleDateString("en-IN")}</td>
                        <td>
                          <span className={styles.specPill}>
                            {inv.sourceType === "GARAGE_SERVICE" ? "Garage Work" : "Spare Parts"}
                          </span>
                        </td>
                        <td>{inv.outletOrSeller}</td>
                        <td>₹{inv.subtotalINR.toLocaleString("en-IN")}</td>
                        <td>₹{inv.taxINR.toLocaleString("en-IN")}</td>
                        <td style={{ fontWeight: 800, color: "var(--text)" }}>₹{inv.totalINR.toLocaleString("en-IN")}</td>
                        <td>
                          <span className={`${styles.statusPill} ${
                            inv.paymentStatus === "PAID" ? styles.statusResolved : styles.statusInProgress
                          }`}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 6: SUPPORT TICKETS & RESOLUTION DESK
            ========================================================================= */}
        {activeTab === "support" && (
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <MessageSquare size={22} color="#E50914" />
                  <span>Customer Support & Resolution Center</span>
                </h2>
                <p style={{ color: "#8E8E93", fontSize: "0.9rem", margin: "0.25rem 0 0" }}>
                  Raise queries for garage service estimates, part fitments, order return pickups, and warranty coverage.
                </p>
              </div>
              <button onClick={() => setShowTicketModal(true)} className="btn btn-primary">
                + Raise New Ticket
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className={styles.emptyState}>
                <MessageSquare size={48} className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>No Support Tickets</h3>
                <p className={styles.emptyText}>
                  Need assistance with vehicle compatibility, return status, or garage appointments? Our support team is here to assist 24x7.
                </p>
                <button onClick={() => setShowTicketModal(true)} className="btn btn-primary">
                  Raise a Support Ticket
                </button>
              </div>
            ) : (
              <div className={styles.ticketsList}>
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className={styles.ticketCard}
                    onClick={() => setActiveThreadTicket(t)}
                  >
                    <div className={styles.ticketHeader}>
                      <div>
                        <span style={{ fontSize: "0.8rem", color: "#888", fontWeight: 700 }}>
                          #{t.ticketNumber} • {t.category}
                        </span>
                        <h4 style={{ margin: "0.2rem 0", fontSize: "1.1rem", color: "var(--text)" }}>
                          {t.subject}
                        </h4>
                      </div>
                      <span className={`${styles.statusPill} ${
                        t.status === "RESOLVED" || t.status === "CLOSED" ? styles.statusResolved :
                        t.status === "IN_PROGRESS" ? styles.statusInProgress : styles.statusOpen
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <p style={{ color: "#AAA", fontSize: "0.85rem", margin: "0.25rem 0 0.5rem" }}>
                      {t.messages[t.messages.length - 1]?.message.slice(0, 120)}...
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#666" }}>
                      <span>Updated: {new Date(t.updatedAt).toLocaleString("en-IN")}</span>
                      <span style={{ color: "#E50914", fontWeight: 600 }}>View Thread ({t.messages.length}) →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 7: PROFILE & SECURITY PREFERENCES
            ========================================================================= */}
        {activeTab === "profile" && (
          <div style={{ maxWidth: "680px" }}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <Shield size={22} color="#E50914" />
                  <span>Profile & Communication Preferences</span>
                </h2>
                <p style={{ color: "#8E8E93", fontSize: "0.9rem", margin: "0.25rem 0 0" }}>
                  Manage your verified contact coordinates and billing addresses for tax invoices.
                </p>
              </div>
            </div>

            {profileSuccessMsg && (
              <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10B981", color: "#6EE7B7", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                {profileSuccessMsg}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "12px", padding: "2rem" }}>
              <div className={styles.authFormGroup}>
                <label className={styles.authLabel}>Full Name</label>
                <input
                  type="text"
                  className={styles.authInput}
                  value={pFullName}
                  onChange={(e) => setPFullName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.authFormGroup}>
                <label className={styles.authLabel}>Verified Mobile Phone</label>
                <input
                  type="text"
                  className={styles.authInput}
                  value={`+91 ${customer.phone}`}
                  disabled
                  style={{ opacity: 0.7, cursor: "not-allowed" }}
                />
              </div>

              <div className={styles.authFormGroup}>
                <label className={styles.authLabel}>Email Address (For Tax Invoices & Estimates)</label>
                <input
                  type="email"
                  className={styles.authInput}
                  placeholder="ramesh@example.com"
                  value={pEmail}
                  onChange={(e) => setPEmail(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>City</label>
                  <input
                    type="text"
                    className={styles.authInput}
                    value={pCity}
                    onChange={(e) => setPCity(e.target.value)}
                  />
                </div>
                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>PIN Code</label>
                  <input
                    type="text"
                    className={styles.authInput}
                    value={pPincode}
                    onChange={(e) => setPPincode(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.authFormGroup}>
                <label className={styles.authLabel}>State</label>
                <input
                  type="text"
                  className={styles.authInput}
                  value={pState}
                  onChange={(e) => setPState(e.target.value)}
                />
              </div>

              <div className={styles.authFormGroup}>
                <label className={styles.authLabel}>Default Delivery & Service Address</label>
                <textarea
                  className={styles.authInput}
                  rows={3}
                  value={pAddress}
                  onChange={(e) => setPAddress(e.target.value)}
                  placeholder="Street, Landmark, Apartment number"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={profileSaving}
                style={{ marginTop: "1rem" }}
              >
                {profileSaving ? "Saving Changes..." : "Save Profile Details"}
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            MODAL 1: ADD VEHICLE TO MY GARAGE
            ========================================================================= */}
        {showAddVehicleModal && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCard}>
              <button onClick={() => setShowAddVehicleModal(false)} className={styles.modalClose}>
                <X size={20} />
              </button>

              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.4rem", color: "var(--text)" }}>
                Add Vehicle to My Garage
              </h3>
              <p style={{ margin: "0 0 1.5rem", color: "#8E8E93", fontSize: "0.85rem" }}>
                Enter vehicle specs for automated compatibility filters and scheduled service reminders.
              </p>

              <form onSubmit={handleAddVehicle}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className={styles.authFormGroup}>
                    <label className={styles.authLabel}>Make</label>
                    <input
                      type="text"
                      className={styles.authInput}
                      value={vMake}
                      onChange={(e) => setVMake(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.authFormGroup}>
                    <label className={styles.authLabel}>Model</label>
                    <input
                      type="text"
                      className={styles.authInput}
                      value={vModel}
                      onChange={(e) => setVModel(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className={styles.authFormGroup}>
                    <label className={styles.authLabel}>Manufacturing Year</label>
                    <input
                      type="number"
                      className={styles.authInput}
                      value={vYear}
                      onChange={(e) => setVYear(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.authFormGroup}>
                    <label className={styles.authLabel}>Variant</label>
                    <input
                      type="text"
                      className={styles.authInput}
                      value={vVariant}
                      onChange={(e) => setVVariant(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className={styles.authFormGroup}>
                    <label className={styles.authLabel}>Fuel Type</label>
                    <select
                      className={styles.authInput}
                      value={vFuel}
                      onChange={(e) => setVFuel(e.target.value as any)}
                    >
                      <option value="PETROL">Petrol</option>
                      <option value="DIESEL">Diesel</option>
                      <option value="CNG">CNG</option>
                      <option value="ELECTRIC">Electric</option>
                    </select>
                  </div>
                  <div className={styles.authFormGroup}>
                    <label className={styles.authLabel}>Transmission</label>
                    <select
                      className={styles.authInput}
                      value={vTransmission}
                      onChange={(e) => setVTransmission(e.target.value as any)}
                    >
                      <option value="MANUAL">Manual</option>
                      <option value="AUTOMATIC">Automatic</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className={styles.authFormGroup}>
                    <label className={styles.authLabel}>Registration Number</label>
                    <input
                      type="text"
                      className={styles.authInput}
                      placeholder="KA01AB1234"
                      value={vRegNumber}
                      onChange={(e) => setVRegNumber(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className={styles.authFormGroup}>
                    <label className={styles.authLabel}>Current Odometer (km)</label>
                    <input
                      type="number"
                      className={styles.authInput}
                      placeholder="35000"
                      value={vMileage}
                      onChange={(e) => setVMileage(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: "1rem" }}>
                  Save Vehicle to Garage
                </button>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 2: BOOK SERVICE APPOINTMENT
            ========================================================================= */}
        {showBookServiceModal && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCard}>
              <button onClick={() => setShowBookServiceModal(false)} className={styles.modalClose}>
                <X size={20} />
              </button>

              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.4rem", color: "var(--text)" }}>
                Book Service Appointment
              </h3>
              <p style={{ margin: "0 0 1.5rem", color: "#8E8E93", fontSize: "0.85rem" }}>
                Select your preferred WowCars service centre outlet and maintenance package.
              </p>

              <form onSubmit={handleBookService}>
                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>Service Centre Outlet</label>
                  <select
                    className={styles.authInput}
                    value={bookOutletId}
                    onChange={(e) => setBookOutletId(e.target.value)}
                    required
                  >
                    <option value="out-blr-koramangala">WowCars Koramangala Hub (Bengaluru)</option>
                    <option value="out-blr-whitefield">WowCars Whitefield Workshop (Bengaluru)</option>
                    <option value="out-mys-hunsur">WowCars Mysuru Express Centre (Mysuru)</option>
                  </select>
                </div>

                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>Service Package</label>
                  <select
                    className={styles.authInput}
                    value={bookServiceType}
                    onChange={(e) => setBookServiceType(e.target.value)}
                    required
                  >
                    <option value="General Periodic Service">General Periodic Service (Engine Oil + Filters)</option>
                    <option value="Comprehensive Brake Service">Comprehensive Brake Service (Pads + Calipers)</option>
                    <option value="Diagnostic & AC Inspection">Full Diagnostic & AC Cooling Overhaul</option>
                    <option value="Suspension & Steering Overhaul">Suspension & Steering Overhaul</option>
                  </select>
                </div>

                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>Preferred Service Date</label>
                  <input
                    type="date"
                    className={styles.authInput}
                    value={bookPreferredDate}
                    onChange={(e) => setBookPreferredDate(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>Customer Complaints / Notes</label>
                  <textarea
                    className={styles.authInput}
                    rows={3}
                    placeholder="Describe any specific noise, vibration, or warning lights..."
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: "1rem" }}>
                  Confirm Booking
                </button>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 3: RETURN & REFUND REQUEST
            ========================================================================= */}
        {showReturnModal && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCard}>
              <button onClick={() => setShowReturnModal(null)} className={styles.modalClose}>
                <X size={20} />
              </button>

              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.4rem", color: "var(--text)" }}>
                Request Return & Refund
              </h3>
              <p style={{ margin: "0 0 1.5rem", color: "#8E8E93", fontSize: "0.85rem" }}>
                WowCars 7-Day Hassle-Free Return Guarantee with doorstep pickup across India.
              </p>

              <form onSubmit={handleSubmitReturn}>
                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>Reason for Return</label>
                  <select
                    className={styles.authInput}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value as any)}
                  >
                    <option value="DEFECTIVE_OR_DAMAGED">Defective or Damaged Product</option>
                    <option value="WRONG_ITEM_DELIVERED">Wrong Item Delivered</option>
                    <option value="FITMENT_ISSUE">Fitment / Compatibility Issue</option>
                    <option value="NO_LONGER_NEEDED">No Longer Needed</option>
                  </select>
                </div>

                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>Detailed Explanation</label>
                  <textarea
                    className={styles.authInput}
                    rows={4}
                    placeholder="Please explain the reason for return so our QA team can verify..."
                    value={returnDescription}
                    onChange={(e) => setReturnDescription(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: "1rem" }}>
                  Submit Return Request
                </button>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 4: RAISE SUPPORT TICKET
            ========================================================================= */}
        {showTicketModal && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCard}>
              <button onClick={() => setShowTicketModal(false)} className={styles.modalClose}>
                <X size={20} />
              </button>

              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.4rem", color: "var(--text)" }}>
                Raise a Support Ticket
              </h3>
              <p style={{ margin: "0 0 1.5rem", color: "#8E8E93", fontSize: "0.85rem" }}>
                Our automotive desk will respond within 4 business hours.
              </p>

              <form onSubmit={handleCreateTicket}>
                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>Category</label>
                  <select
                    className={styles.authInput}
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                  >
                    <option value="SERVICE_QUERY">Garage Service & Quotation</option>
                    <option value="PARTS_ORDER">Spare Parts Order & Tracking</option>
                    <option value="USED_CAR">Used Car Enquiry & Inspection</option>
                    <option value="BILLING">Billing & GST Invoice</option>
                    <option value="WARRANTY">Warranty Claim</option>
                    <option value="GENERAL">General Assistance</option>
                  </select>
                </div>

                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>Subject</label>
                  <input
                    type="text"
                    className={styles.authInput}
                    placeholder="e.g. Brake pad fitment query for Swift"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.authFormGroup}>
                  <label className={styles.authLabel}>Message</label>
                  <textarea
                    className={styles.authInput}
                    rows={4}
                    placeholder="Provide details about your query..."
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: "1rem" }}>
                  Submit Ticket
                </button>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 5: TICKET MESSAGE THREAD
            ========================================================================= */}
        {activeThreadTicket && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCard} style={{ maxWidth: "680px" }}>
              <button onClick={() => setActiveThreadTicket(null)} className={styles.modalClose}>
                <X size={20} />
              </button>

              <div style={{ marginBottom: "1.25rem", borderBottom: "1px solid #333", paddingBottom: "1rem" }}>
                <span style={{ fontSize: "0.8rem", color: "#888", fontWeight: 700 }}>
                  Ticket #{activeThreadTicket.ticketNumber} • {activeThreadTicket.category}
                </span>
                <h3 style={{ margin: "0.25rem 0", fontSize: "1.3rem", color: "var(--text)" }}>
                  {activeThreadTicket.subject}
                </h3>
              </div>

              {/* Message History */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "350px", overflowY: "auto", marginBottom: "1.5rem", paddingRight: "0.5rem" }}>
                {activeThreadTicket.messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      background: m.senderType === "CUSTOMER" ? "#1E1E1E" : "rgba(229, 9, 20, 0.1)",
                      border: `1px solid ${m.senderType === "CUSTOMER" ? "#333" : "rgba(229, 9, 20, 0.3)"}`,
                      borderRadius: "8px",
                      padding: "1rem",
                      alignSelf: m.senderType === "CUSTOMER" ? "flex-start" : "flex-end",
                      width: "88%",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#888", marginBottom: "0.35rem" }}>
                      <strong style={{ color: m.senderType === "CUSTOMER" ? "#DDD" : "#E50914" }}>
                        {m.senderName || (m.senderType === "CUSTOMER" ? "You" : "WowCars Support")}
                      </strong>
                      <span>{new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p style={{ margin: 0, color: "#fff", fontSize: "0.9rem", lineHeight: 1.5 }}>
                      {m.message}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendThreadReply} style={{ borderTop: "1px solid #333", paddingTop: "1rem" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    className={styles.authInput}
                    placeholder="Type your reply to WowCars support..."
                    value={threadReplyMessage}
                    onChange={(e) => setThreadReplyMessage(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>
                    Send Reply
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <CTASection
        title="Looking to Upgrade or Service Another Vehicle?"
        subtitle="Browse our verified 140-point certified inventory or book a scheduled doorstep pickup with transparent rate cards."
        primaryAction={{
          label: "Browse Certified Cars",
          href: "/cars",
        }}
        secondaryAction={{
          label: "Book Garage Service",
          href: "/service-centres",
        }}
        variant="red"
      />

      <Footer />
    </div>
  );
}
