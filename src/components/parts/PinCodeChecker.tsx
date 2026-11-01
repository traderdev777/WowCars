"use client";

import React, { useState } from "react";
import { MapPin, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import styles from "./PinCodeChecker.module.css";

interface PinCodeCheckerProps {
  onValidated?: (pinCode: string, eligible: boolean) => void;
  defaultPin?: string;
}

export default function PinCodeChecker({ onValidated, defaultPin = "" }: PinCodeCheckerProps) {
  const [pinCode, setPinCode] = useState(defaultPin);
  const [status, setStatus] = useState<"IDLE" | "CHECKING" | "VALID" | "INVALID">("IDLE");
  const [details, setDetails] = useState<{ city?: string; state?: string; deliveryDays?: string } | null>(null);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinCode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      setStatus("INVALID");
      setDetails(null);
      if (onValidated) onValidated(cleanPin, false);
      return;
    }

    setStatus("CHECKING");

    // Standard simulated Indian logistics dispatch resolution
    setTimeout(() => {
      let state = "Karnataka";
      let city = "Bengaluru";
      let days = "2 - 3 Days";

      const prefix = cleanPin.substring(0, 2);
      if (["11", "12", "13"].includes(prefix)) {
        state = "Delhi NCR / Haryana";
        city = "Gurugram / New Delhi";
        days = "2 - 4 Days";
      } else if (["40", "41", "42"].includes(prefix)) {
        state = "Maharashtra";
        city = "Mumbai / Pune";
        days = "2 - 3 Days";
      } else if (["60", "61", "62", "63", "64"].includes(prefix)) {
        state = "Tamil Nadu";
        city = "Chennai / Coimbatore";
        days = "3 - 4 Days";
      } else if (["50", "51", "52", "53"].includes(prefix)) {
        state = "Telangana / AP";
        city = "Hyderabad";
        days = "2 - 4 Days";
      } else if (["56", "57", "58", "59"].includes(prefix)) {
        state = "Karnataka";
        city = "Bengaluru / Hubbali";
        days = "1 - 2 Days Express";
      } else {
        state = "All India Logistics Hub";
        city = "Tier 1 & 2 Network";
        days = "3 - 5 Days";
      }

      setDetails({ city, state, deliveryDays: days });
      setStatus("VALID");
      if (onValidated) onValidated(cleanPin, true);
    }, 400);
  };

  return (
    <div className={styles.wrapper}>
      <form onSubmit={handleCheck} className={styles.inputGroup}>
        <div className={styles.inputIconWrapper}>
          <MapPin size={16} className={styles.pinIcon} />
          <input
            type="text"
            className={styles.input}
            placeholder="Enter 6-digit PIN code"
            maxLength={6}
            value={pinCode}
            onChange={(e) => {
              setPinCode(e.target.value);
              if (status !== "IDLE") setStatus("IDLE");
            }}
          />
        </div>
        <button
          type="submit"
          className={styles.checkBtn}
          disabled={status === "CHECKING" || pinCode.length < 6}
        >
          {status === "CHECKING" ? "Checking..." : "Check"}
          <ArrowRight size={14} />
        </button>
      </form>

      {status === "VALID" && details && (
        <div className={styles.resultValid}>
          <CheckCircle size={14} className={styles.greenIcon} />
          <span>
            Delivery available to <strong>{details.city}, {details.state}</strong> ({details.deliveryDays}).
          </span>
        </div>
      )}

      {status === "INVALID" && (
        <div className={styles.resultInvalid}>
          <AlertCircle size={14} className={styles.redIcon} />
          <span>Please enter a valid 6-digit Indian Postal PIN code.</span>
        </div>
      )}
    </div>
  );
}
