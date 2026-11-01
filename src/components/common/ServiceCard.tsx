"use client";

import React from "react";
import { Clock, Shield, Check, ArrowRight } from "lucide-react";
import styles from "./ServiceCard.module.css";

export interface ServiceCardProps {
  title: string;
  category?: string;
  description: string;
  priceINR: number;
  durationMinutes?: number;
  warranty?: string;
  features?: string[];
  isHighVoltageEv?: boolean;
  onBook?: () => void;
  bookLabel?: string;
}

export default function ServiceCard({
  title,
  category,
  description,
  priceINR,
  durationMinutes = 60,
  warranty = "6 Months / 5,000 km Warranty",
  features = [],
  isHighVoltageEv = false,
  onBook,
  bookLabel = "Book Service",
}: ServiceCardProps) {
  return (
    <div className={`${styles.card} ${isHighVoltageEv ? styles.evCard : ""}`}>
      {isHighVoltageEv && (
        <div className={styles.evBadge}>
          <span>EV CERTIFIED · IEC 60900 SAFE</span>
        </div>
      )}

      <div className={styles.header}>
        {category && <span className={styles.category}>{category}</span>}
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
      </div>

      <div className={styles.pricingRow}>
        <div className={styles.priceBox}>
          <span className={styles.priceLabel}>Starting from</span>
          <div className={styles.price}>
            <span className={styles.currency}>₹</span>
            <span>{priceINR.toLocaleString("en-IN")}</span>
          </div>
        </div>
        <div className={styles.metaBox}>
          <div className={styles.metaItem}>
            <Clock size={13} className={styles.metaIcon} />
            <span>~{durationMinutes} mins</span>
          </div>
          <div className={styles.metaItem}>
            <Shield size={13} className={styles.metaIcon} />
            <span>{warranty}</span>
          </div>
        </div>
      </div>

      {features.length > 0 && (
        <ul className={styles.featuresList}>
          {features.map((feat, idx) => (
            <li key={idx} className={styles.featureItem}>
              <Check size={14} className={styles.checkIcon} />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onBook}
        className={`btn btn-primary btn-full ${styles.bookBtn}`}
      >
        <span>{bookLabel}</span>
        <ArrowRight size={15} />
      </button>
    </div>
  );
}
