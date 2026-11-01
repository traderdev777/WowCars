"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Phone, MessageSquare, Calendar } from "lucide-react";
import styles from "./EnquiryForm.module.css";

export interface EnquiryFormProps {
  carId?: string;
  carTitle?: string;
  enquiryType?: "TEST_DRIVE_REQUEST" | "CALLBACK_REQUEST" | "WHATSAPP_CLICK" | "LOAN_INQUIRY";
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
  className?: string;
}

export default function EnquiryForm({
  carId,
  carTitle,
  enquiryType = "CALLBACK_REQUEST",
  title = "Request Callback or Test Drive",
  subtitle = "Our Bengaluru specialists will connect directly with transparent details.",
  onSuccess,
  className = "",
}: EnquiryFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredMethod, setPreferredMethod] = useState<"PHONE" | "WHATSAPP">("PHONE");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate phone number (10-digit Indian mobile)
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: carId || "general-enquiry",
          type: enquiryType,
          buyerName: name.trim(),
          buyerPhone: cleanPhone,
          buyerEmail: email.trim() || undefined,
          preferredContactMethod: preferredMethod,
          preferredDate: preferredDate || undefined,
          message: message.trim() || `Enquiry for ${carTitle || "vehicle catalog"}`,
          consentNoticeVersion: "v2.0-oct2026",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit enquiry");
      }

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`${styles.successCard} ${className}`}>
        <CheckCircle2 size={44} className={styles.successIcon} />
        <h3 className={styles.successTitle}>Enquiry Received!</h3>
        <p className={styles.successMessage}>
          Thank you, <strong>{name}</strong>. Our specialist will contact you on{" "}
          <strong>+91 {phone}</strong> within 30 minutes during showroom hours.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setName("");
            setPhone("");
            setEmail("");
            setMessage("");
          }}
          className="btn btn-outline btn-sm"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${styles.form} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      {error && (
        <div className={styles.errorBox}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Honeypot anti-spam */}
      <input type="text" name="company_website" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Full Name *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rahul Sharma"
          className={styles.input}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Mobile Number *</label>
        <div className={styles.phoneInputWrap}>
          <span className={styles.phonePrefix}>+91</span>
          <input
            type="tel"
            required
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="98765 43210"
            className={`${styles.input} ${styles.phoneInput}`}
          />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Email Address (Optional)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="rahul@example.com"
          className={styles.input}
        />
      </div>

      {enquiryType === "TEST_DRIVE_REQUEST" && (
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <Calendar size={14} style={{ display: "inline", marginRight: "4px" }} />
            Preferred Test Drive Date
          </label>
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className={styles.input}
          />
        </div>
      )}

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Preferred Contact Mode</label>
        <div className={styles.radioGroup}>
          <label className={`${styles.radioCard} ${preferredMethod === "PHONE" ? styles.radioActive : ""}`}>
            <input
              type="radio"
              name="preferredMethod"
              checked={preferredMethod === "PHONE"}
              onChange={() => setPreferredMethod("PHONE")}
            />
            <Phone size={14} />
            <span>Phone Call</span>
          </label>
          <label className={`${styles.radioCard} ${preferredMethod === "WHATSAPP" ? styles.radioActive : ""}`}>
            <input
              type="radio"
              name="preferredMethod"
              checked={preferredMethod === "WHATSAPP"}
              onChange={() => setPreferredMethod("WHATSAPP")}
            />
            <MessageSquare size={14} />
            <span>WhatsApp</span>
          </label>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Message or Specific Questions</label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about inspection report, pricing breakdown, or loan eligibility..."
          className={styles.textarea}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`btn btn-primary btn-full ${styles.submitBtn}`}
      >
        <Send size={16} />
        <span>{submitting ? "Sending..." : "Submit Enquiry"}</span>
      </button>

      <p className={styles.consentNotice}>
        By submitting, you agree to receive transparent communication from WowCars. Zero spam guarantee.
      </p>
    </form>
  );
}
