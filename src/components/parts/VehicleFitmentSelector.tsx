"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Car, Search, X, CheckCircle, RotateCcw } from "lucide-react";
import styles from "./VehicleFitmentSelector.module.css";

interface VehicleOption {
  make: string;
  models: {
    name: string;
    years: number[];
    variants: string[];
    fuelTypes: string[];
  }[];
}

interface VehicleFitmentSelectorProps {
  onVehicleSelected?: (vehicle: { make: string; model: string; year: string; variant?: string; fuelType?: string }) => void;
  compact?: boolean;
}

export default function VehicleFitmentSelector({ onVehicleSelected, compact = false }: VehicleFitmentSelectorProps) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMake, setSelectedMake] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedFuel, setSelectedFuel] = useState<string>("");

  const [activeSavedVehicle, setActiveSavedVehicle] = useState<string | null>(null);

  useEffect(() => {
    // Check saved vehicle from localStorage
    const saved = localStorage.getItem("wowcars_selected_vehicle");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setActiveSavedVehicle(`${parsed.year} ${parsed.make} ${parsed.model} ${parsed.variant || ""}`.trim());
        setSelectedMake(parsed.make || "");
        setSelectedModel(parsed.model || "");
        setSelectedYear(parsed.year ? String(parsed.year) : "");
        setSelectedVariant(parsed.variant || "");
        setSelectedFuel(parsed.fuelType || "");
      } catch (e) {
        console.warn("Error parsing saved vehicle", e);
      }
    }

    async function fetchVehicles() {
      try {
        const res = await fetch("/api/spare-parts/vehicles");
        const data = await res.json();
        if (data.vehicles) {
          setVehicles(data.vehicles);
        }
      } catch (err) {
        console.error("Failed to load vehicle catalog", err);
      } finally {
        setLoading(false);
      }
    }
    fetchVehicles();
  }, []);

  const currentMakeData = vehicles.find((v) => v.make === selectedMake);
  const currentModelData = currentMakeData?.models.find((m) => m.name === selectedModel);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMake || !selectedModel) return;

    const vehicleObj = {
      make: selectedMake,
      model: selectedModel,
      year: selectedYear,
      variant: selectedVariant || undefined,
      fuelType: selectedFuel || undefined,
    };

    localStorage.setItem("wowcars_selected_vehicle", JSON.stringify(vehicleObj));
    setActiveSavedVehicle(`${selectedYear} ${selectedMake} ${selectedModel} ${selectedVariant}`.trim());

    if (onVehicleSelected) {
      onVehicleSelected(vehicleObj);
    } else {
      // Navigate to search with vehicle parameters
      const params = new URLSearchParams();
      params.set("make", selectedMake);
      params.set("model", selectedModel);
      if (selectedYear) params.set("year", selectedYear);
      if (selectedVariant) params.set("variant", selectedVariant);
      if (selectedFuel) params.set("fuelType", selectedFuel);
      router.push(`/spare-parts/search?${params.toString()}`);
    }
  };

  const handleClear = () => {
    localStorage.removeItem("wowcars_selected_vehicle");
    setActiveSavedVehicle(null);
    setSelectedMake("");
    setSelectedModel("");
    setSelectedYear("");
    setSelectedVariant("");
    setSelectedFuel("");
    if (onVehicleSelected) {
      onVehicleSelected({ make: "", model: "", year: "" });
    }
  };

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ""}`}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Car className={styles.carIcon} size={20} />
          <span>Find Parts for Your Specific Vehicle</span>
        </div>
        {activeSavedVehicle && (
          <div className={styles.activePill}>
            <CheckCircle size={14} className={styles.checkIcon} />
            <span>Active: {activeSavedVehicle}</span>
            <button onClick={handleClear} className={styles.clearBtn} title="Change Vehicle">
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleApply} className={styles.grid}>
        {/* Make */}
        <div className={styles.field}>
          <label className={styles.label}>1. Make</label>
          <select
            className={styles.select}
            value={selectedMake}
            onChange={(e) => {
              setSelectedMake(e.target.value);
              setSelectedModel("");
              setSelectedYear("");
              setSelectedVariant("");
              setSelectedFuel("");
            }}
            disabled={loading}
          >
            <option value="">Select Make (e.g. Maruti, Hyundai)</option>
            {vehicles.map((v) => (
              <option key={v.make} value={v.make}>
                {v.make}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div className={styles.field}>
          <label className={styles.label}>2. Model</label>
          <select
            className={styles.select}
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              setSelectedYear("");
              setSelectedVariant("");
              setSelectedFuel("");
            }}
            disabled={!selectedMake}
          >
            <option value="">Select Model</option>
            {currentMakeData?.models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className={styles.field}>
          <label className={styles.label}>3. Year</label>
          <select
            className={styles.select}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={!selectedModel}
          >
            <option value="">Select Year</option>
            {currentModelData?.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Variant */}
        <div className={styles.field}>
          <label className={styles.label}>4. Variant / Fuel (Optional)</label>
          <select
            className={styles.select}
            value={selectedVariant}
            onChange={(e) => setSelectedVariant(e.target.value)}
            disabled={!selectedModel}
          >
            <option value="">All Variants</option>
            {currentModelData?.variants.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* Action Button */}
        <div className={styles.actionCol}>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!selectedMake || !selectedModel}
          >
            <Search size={16} />
            <span>Check Guaranteed Fit</span>
          </button>
          {activeSavedVehicle && (
            <button type="button" onClick={handleClear} className={styles.resetBtn} title="Reset Filter">
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
