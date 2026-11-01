"use client";

import React, { useState } from "react";
import { X, Send, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import styles from "./FitmentEnquiryModal.module.css";

interface FitmentEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: {
    id: string;
    title: string;
    partNumber?: string | null;
  };
  initialVehicle?: {
    make?: string;
    model?: string;
    year?: string;
  };
}

export default function FitmentEnquiryModal({
  isOpen,
  onClose,
  product,
  initialVehicle,
}: FitmentEnquiryModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [vehicleMake, setVehicleMake] = useState(initialVehicle?.make || "");
  const [vehicleModel, setVehicleModel] = useState(initialVehicle?.model || "");
  const [vehicleYear, setVehicleYear] = useState(initialVehicle?.year || "");
  const [vehicleVariant, setVehicleVariant] = useState("");
  const [vinOrChassis, setVinOrChassis] = useState("");
  const [partRequirement, setPartRequirement] = useState(
    product ? `Inquiring about fitment for: ${product.title} (PN: ${product.partNumber || "N/A"})` : ""
  );

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !vehicleMake || !vehicleModel) {
      setErrorMsg("Please provide your name, phone number, vehicle make and model.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/spare-parts/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          vehicleMake,
          vehicleModel,
          vehicleYear: vehicleYear ? Number(vehicleYear) : undefined,
          vehicleVariant,
          vinOrChassis,
          partRequirement,
          productId: product?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit enquiry");
      }

      setSuccessMsg(
        `Fitment request submitted successfully! Your Ticket ID is ${data.enquiry?.id || "WF-ENQ"}. Our engineering specialists will verify OEM schematics and contact you within 2 hours.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit verification request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <ShieldCheck size={20} className={styles.shieldIcon} />
            <h3>Vehicle Fitment & Part Verification</h3>
          </div>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {successMsg ? (
          <div className={styles.successState}>
            <CheckCircle2 size={48} className={styles.successIcon} />
            <h4>Fitment Verification Request Received</h4>
            <p>{successMsg}</p>
            <button onClick={onClose} className={styles.doneBtn}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <p className={styles.notice}>
              Provide your vehicle details. Our catalog team cross-checks manufacturer EPC (Electronic Parts Catalog) databases to guarantee 100% correct fitment before dispatch.
            </p>

            {errorMsg && (
              <div className={styles.errorBox}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className={styles.input}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  className={styles.input}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Vehicle Make *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maruti Suzuki, Hyundai"
                  className={styles.input}
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Vehicle Model *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swift, Creta, City"
                  className={styles.input}
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Manufacturing Year</label>
                <input
                  type="number"
                  placeholder="e.g. 2021"
                  className={styles.input}
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Variant & Engine (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ZXi+ 1.2 Petrol / CRDi"
                  className={styles.input}
                  value={vehicleVariant}
                  onChange={(e) => setVehicleVariant(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Part Details / What do you need?</label>
              <textarea
                rows={3}
                className={styles.textarea}
                placeholder="Mention specific part number, symptoms, or OEM requirements..."
                value={partRequirement}
                onChange={(e) => setPartRequirement(e.target.value)}
              />
            </div>

            <p className={styles.privacyNote}>
              Note: Complete registration/VIN is only requested if required by the manufacturer&apos;s technical bulletin.
            </p>

            <div className={styles.modalFooter}>
              <button type="button" onClick={onClose} className={styles.cancelBtn}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className={styles.submitBtn}>
                <Send size={14} />
                {loading ? "Submitting..." : "Submit Verification Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
