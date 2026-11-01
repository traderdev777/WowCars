"use client";

import React from "react";
import styles from "./DashboardStatCard.module.css";

export interface DashboardStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  variant?: "default" | "highlight" | "danger" | "success";
  onClick?: () => void;
}

export default function DashboardStatCard({
  title,
  value,
  subtitle,
  change,
  changeType = "neutral",
  icon,
  variant = "default",
  onClick,
}: DashboardStatCardProps) {
  return (
    <div
      className={`${styles.card} ${styles[variant]} ${onClick ? styles.clickable : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.topRow}>
        <span className={styles.title}>{title}</span>
        {icon && <div className={styles.iconBox}>{icon}</div>}
      </div>

      <div className={styles.valueRow}>
        <div className={styles.value}>{value}</div>
        {change && (
          <span className={`${styles.changeBadge} ${styles[changeType]}`}>
            {change}
          </span>
        )}
      </div>

      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
    </div>
  );
}
