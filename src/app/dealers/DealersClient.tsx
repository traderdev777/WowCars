"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { BadgeCheck, MapPin, MessageCircle, Star, ArrowRight, ShieldCheck, Search, Building2 } from "lucide-react";
import { Dealer, State, District } from "@/lib/db/types";
import styles from "./Dealers.module.css";

interface AugmentedDealer extends Dealer {
  inventoryCount: number;
}

interface DealersClientProps {
  states: State[];
  districts: District[];
  dealers: AugmentedDealer[];
}

export default function DealersClient({
  states,
  districts,
  dealers,
}: DealersClientProps) {
  const [selectedStateId, setSelectedStateId] = useState<string>("IN-KA");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Available districts under the selected state
  const availableDistricts = useMemo(() => {
    if (!selectedStateId) return districts;
    return districts.filter((d) => d.stateId === selectedStateId);
  }, [districts, selectedStateId]);

  // Handle state change
  const handleStateChange = (stateId: string) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId("");
  };

  // Filtered approved dealers
  const filteredDealers = useMemo(() => {
    return dealers.filter((d) => {
      // Must be approved
      const isApproved =
        d.approvalStatus === "APPROVED" ||
        (d.isVerified && d.approvalStatus !== "REJECTED" && d.approvalStatus !== "SUSPENDED");
      if (!isApproved) return false;

      // Filter by state
      if (selectedStateId && d.stateId && d.stateId !== selectedStateId) {
        return false;
      }

      // Filter by district
      if (selectedDistrictId && d.districtId && d.districtId !== selectedDistrictId) {
        return false;
      }

      // Filter by text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          d.name.toLowerCase().includes(q) ||
          (d.locality && d.locality.toLowerCase().includes(q)) ||
          (d.cityName && d.cityName.toLowerCase().includes(q)) ||
          (d.districtName && d.districtName.toLowerCase().includes(q)) ||
          (d.speciality && d.speciality.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [dealers, selectedStateId, selectedDistrictId, searchQuery]);

  // Current selected state & district names
  const currentState = states.find((s) => s.id === selectedStateId);
  const currentDistrict = districts.find((d) => d.id === selectedDistrictId);

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.badgeHeader}>
            <span className="badge badge-primary">
              <ShieldCheck size={14} />
              PAN-India Certified Dealer Network
            </span>
          </div>
          <h1 className={styles.title}>
            Discover Verified Pre-Owned Car Showrooms <span className={styles.titleHighlight}>Across India</span>
          </h1>
          <p className={styles.subtitle}>
            Browse trusted multi-brand used-car dealerships with certified title checks, warranty options, and direct showroom WhatsApp booking.
          </p>
        </div>

        {/* Location Filter Bar */}
        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "20px 24px",
          marginTop: "var(--space-6)",
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, flex: 1, minWidth: 280 }}>
            {/* State Selector */}
            <div style={{ minWidth: 200, flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", color: "var(--color-slate)", fontWeight: 700, marginBottom: 6 }}>
                1. Select State / UT
              </label>
              <select
                value={selectedStateId}
                onChange={(e) => handleStateChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--color-surface-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                }}
              >
                <option value="">All States & UTs (PAN-India)</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* District Selector */}
            <div style={{ minWidth: 200, flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", color: "var(--color-slate)", fontWeight: 700, marginBottom: 6 }}>
                2. Select District
              </label>
              <select
                value={selectedDistrictId}
                onChange={(e) => setSelectedDistrictId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--color-surface-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                }}
              >
                <option value="">All Districts in {currentState ? currentState.name : "India"}</option>
                {availableDistricts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Text Search */}
            <div style={{ minWidth: 200, flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", color: "var(--color-slate)", fontWeight: 700, marginBottom: 6 }}>
                3. Search Dealership or Area
              </label>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--color-slate)" }} />
                <input
                  type="text"
                  placeholder="e.g. Balaji, Yelahanka, Indiranagar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 36px",
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {(selectedStateId !== "IN-KA" || selectedDistrictId || searchQuery) && (
            <button
              onClick={() => {
                setSelectedStateId("IN-KA");
                setSelectedDistrictId("");
                setSearchQuery("");
              }}
              style={{
                background: "transparent",
                border: "1px solid var(--color-border)",
                color: "var(--color-slate)",
                padding: "8px 14px",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                cursor: "pointer",
                height: 40,
                alignSelf: "flex-end",
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Current Location Indicator */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 14, color: "var(--color-slate)" }}>
            Showing verified dealerships in{" "}
            <strong style={{ color: "#fff" }}>
              {currentDistrict ? `${currentDistrict.name}, ${currentState?.name}` : currentState ? currentState.name : "All India"}
            </strong>
            {" "}· ({filteredDealers.length} active {filteredDealers.length === 1 ? "showroom" : "showrooms"})
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            Official RTO & physical showroom premises inspected by WowCars operations
          </div>
        </div>

        {/* Empty State when no approved dealers exist in district */}
        {filteredDealers.length === 0 ? (
          <div style={{
            background: "var(--color-surface)",
            border: "1px dashed var(--color-border)",
            borderRadius: "var(--radius-2xl)",
            padding: "56px 24px",
            textAlign: "center",
            marginTop: "var(--space-8)",
            maxWidth: 680,
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            <Building2 size={48} style={{ color: "var(--color-slate)", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              No Verified Dealers Active in {currentDistrict ? currentDistrict.name : currentState ? currentState.name : "this area"} Yet
            </h3>
            <p style={{ color: "var(--color-slate)", fontSize: 14, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 24px" }}>
              WowCars enforces strict on-ground verification before listing partner showrooms. Our dealer network operations are currently expanding into {currentDistrict ? currentDistrict.name : "this district"}.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setSelectedStateId("IN-KA");
                  setSelectedDistrictId("IN-KA-BLRU");
                  setSearchQuery("");
                }}
                className="btn btn-primary"
                style={{ fontSize: 14, padding: "10px 18px" }}
              >
                Browse Bengaluru Urban Hub (6 Showrooms)
              </button>
              <Link
                href="/cars"
                className="btn btn-secondary"
                style={{ fontSize: 14, padding: "10px 18px", textDecoration: "none" }}
              >
                Browse All Certified Cars
              </Link>
            </div>
            <div style={{ marginTop: 24, fontSize: 13, color: "var(--color-slate)" }}>
              Are you a licensed used-car dealer in {currentDistrict ? currentDistrict.name : "this area"}?{" "}
              <a href="#partner-apply" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "underline" }}>
                Apply to become a verified WowCars showroom
              </a>
            </div>
          </div>
        ) : (
          /* Dealers Grid */
          <div className={styles.dealersGrid}>
            {filteredDealers.map((dealer) => (
              <div key={dealer.id} className={styles.dealerCard}>
                <div className={styles.dealerTop}>
                  <div className={styles.dealerAvatar}>
                    {dealer.avatarEmoji || "🏢"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div className={styles.dealerRating}>
                      <Star size={12} fill="#FBBF24" />
                      <span>{dealer.rating}</span>
                      <span style={{ opacity: 0.75, fontWeight: 500 }}>({dealer.reviewsCount})</span>
                    </div>
                    {dealer.isSeedData && (
                      <span style={{
                        fontSize: 10,
                        background: "rgba(107, 114, 128, 0.3)",
                        color: "#d1d5db",
                        padding: "1px 6px",
                        borderRadius: 4,
                        letterSpacing: "0.04em",
                      }}>
                        DEMO SEED
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.dealerInfo}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <h2 className={styles.dealerName}>{dealer.name}</h2>
                    <BadgeCheck size={18} style={{ color: "#34D399", flexShrink: 0 }} />
                  </div>
                  <div className={styles.dealerAddress}>
                    <MapPin size={13} style={{ flexShrink: 0 }} />
                    <span>
                      {dealer.locality}, {dealer.districtName || dealer.cityName || "Bengaluru Urban"}, {dealer.stateName || "Karnataka"}
                      {dealer.pincode ? ` · ${dealer.pincode}` : ""}
                    </span>
                  </div>
                  <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-light-gray)", marginTop: 4 }}>
                    {dealer.speciality}
                  </p>
                </div>

                <div className={styles.dealerStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statVal}>{dealer.inventoryCount}</span>
                    <span className={styles.statLabel}>Cars In Stock</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statVal}>{dealer.establishedYear}</span>
                    <span className={styles.statLabel}>Established</span>
                  </div>
                </div>

                <div className={styles.dealerActions}>
                  <Link
                    href={`/cars?dealerId=${dealer.id}`}
                    className="btn btn-secondary"
                    style={{ flex: 1, textDecoration: "none", fontSize: "var(--font-size-xs)", padding: "var(--space-2) var(--space-3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <span>View Inventory</span>
                    <ArrowRight size={13} />
                  </Link>
                  <a
                    href={`https://wa.me/91${dealer.whatsappNumber.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hi ${dealer.name}, I am viewing your verified inventory on WowCars and would like to enquire about available cars.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ textDecoration: "none", fontSize: "var(--font-size-xs)", padding: "var(--space-2) var(--space-3)", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Join as Verified Dealer CTA */}
        <div id="partner-apply" className={styles.joinBanner}>
          <h2 className={styles.joinTitle}>Own a Pre-Owned Car Showroom in India?</h2>
          <p className={styles.joinText}>
            Join India&apos;s fastest growing verified used-car dealer network. Get certified buyer leads, digital inventory management, and instant WhatsApp customer test drive requests.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/sell"
              className="btn btn-primary"
              style={{ padding: "var(--space-3) var(--space-8)", textDecoration: "none", fontSize: "var(--font-size-base)" }}
            >
              Apply for Dealership Onboarding
            </Link>
            <a
              href="https://wa.me/919019088160?text=Hi%20WowCars%2C%20I%20want%20to%20register%20my%20used%20car%20dealership%20on%20your%20PAN-India%20network."
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ padding: "var(--space-3) var(--space-8)", textDecoration: "none", fontSize: "var(--font-size-base)", display: "flex", alignItems: "center", gap: 6 }}
            >
              <MessageCircle size={16} />
              <span>Partner WhatsApp Desk</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
