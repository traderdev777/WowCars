"use client";

import React, { useState } from "react";
import styles from "./Contact.module.css";
import { Send, CheckCircle, AlertCircle } from "lucide-react";

export default function ContactFormClient() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("BUY_CAR");
  const [city, setCity] = useState("Bengaluru");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: "GENERAL_INQUIRY",
          customerName: name,
          phone,
          email,
          city,
          type: department,
          message: `[Department: ${department}] ${message}`,
        }),
      });

      if (!res.ok) {
        throw new Error("Unable to submit inquiry. Please try calling directly.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please contact our helpline.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}>Send an Automotive Inquiry</h3>
      <p className={styles.formSubtitle}>
        Our concierge responds to verified inquiries within 15 minutes during business hours.
      </p>

      {submitted ? (
        <div className={styles.successBox}>
          <CheckCircle size={20} />
          <div>
            <strong>Thank you, {name}!</strong>
            <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "#A7F3D0" }}>
              Your inquiry has been routed to our Bengaluru concierge team. We will call you on +91 {phone} shortly.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Inquiry Category *</label>
            <select
              className={styles.select}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="BUY_CAR">Buy a Pre-Owned Vehicle (140-Point Certified)</option>
              <option value="SELL_CAR">Sell My Vehicle (Instant Valuation)</option>
              <option value="SERVICE_APPOINTMENT">Book Workshop Service / Repair</option>
              <option value="SPARE_PARTS">Spare Parts & Accessories Inquiry</option>
              <option value="DEALERSHIP_FRANCHISE">Dealership / Franchise Partnership</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Your Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Mobile Phone Number *</label>
            <input
              type="tel"
              required
              placeholder="10-digit mobile number"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>City / Location *</label>
            <select
              className={styles.select}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="Bengaluru">Bengaluru (Koramangala Hub)</option>
              <option value="Mysuru">Mysuru (Hebbal Hub)</option>
              <option value="Other">Other City (PAN-India Delivery)</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Message or Vehicle Details</label>
            <textarea
              className={styles.textarea}
              placeholder="Tell us what make, model, or service you are interested in..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={styles.submitBtn}
          >
            <Send size={16} />
            <span>{submitting ? "Transmitting Inquiry..." : "Submit Inquiry to Concierge"}</span>
          </button>
        </form>
      )}
    </div>
  );
}
