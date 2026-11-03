"use client";

import React from "react";
import Link from "next/link";
import StaffBrandingImage from "./StaffBrandingImage";
import styles from "./PageHero.module.css";

export interface PageHeroStat {
  label: string;
  value: string;
}

export interface PageHeroAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "whatsapp" | "outline";
}

export interface PageHeroProps {
  /** Hide the staff photo and stats strip on phones so content starts sooner */
  compactOnMobile?: boolean;
  badge?: string;
  title: React.ReactNode;
  subtitle: string;
  stats?: PageHeroStat[];
  primaryAction?: PageHeroAction;
  secondaryAction?: PageHeroAction;
  imageSrc?: string;
  staffImage?: string;
  imageAlt?: string;
  staffName?: string;
  staffRole?: string;
  staffContext?: string;
  staffBadge?: string;
  children?: React.ReactNode;
}

export default function PageHero({
  badge,
  title,
  subtitle,
  stats,
  primaryAction,
  secondaryAction,
  imageSrc,
  staffImage,
  imageAlt,
  staffName,
  staffRole,
  staffContext,
  staffBadge,
  children,
  compactOnMobile = false,
}: PageHeroProps) {
  const finalImage = imageSrc || staffImage;
  const finalRole = staffRole || staffContext || "Automotive Experience Lead";
  return (
    <section className={`${styles.heroSection} ${compactOnMobile ? styles.compactMobile : ""}`}>
      <div className={styles.ambientGlow} />
      <div className={`container ${styles.container}`}>
        <div className={styles.grid}>
          {/* Content Column */}
          <div className={styles.contentCol}>
            {badge && (
              <div className={styles.badgeWrapper}>
                <span className={styles.badgePill}>{badge}</span>
              </div>
            )}

            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>

            {/* Actions */}
            {(primaryAction || secondaryAction) && (
              <div className={styles.actions}>
                {primaryAction &&
                  (primaryAction.href ? (
                    <Link
                      href={primaryAction.href}
                      className={`btn btn-primary ${styles.heroBtn}`}
                    >
                      {primaryAction.icon}
                      <span>{primaryAction.label}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={primaryAction.onClick}
                      className={`btn btn-primary ${styles.heroBtn}`}
                    >
                      {primaryAction.icon}
                      <span>{primaryAction.label}</span>
                    </button>
                  ))}

                {secondaryAction &&
                  (secondaryAction.href ? (
                    <Link
                      href={secondaryAction.href}
                      className={`btn btn-outline ${styles.heroBtnSecondary}`}
                    >
                      {secondaryAction.icon}
                      <span>{secondaryAction.label}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={secondaryAction.onClick}
                      className={`btn btn-outline ${styles.heroBtnSecondary}`}
                    >
                      {secondaryAction.icon}
                      <span>{secondaryAction.label}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* Stats */}
            {stats && stats.length > 0 && (
              <div className={styles.statsStrip}>
                {stats.map((stat, idx) => (
                  <div key={idx} className={styles.statItem}>
                    <div className={styles.statValue}>{stat.value}</div>
                    <div className={styles.statLabel}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {children}
          </div>

          {/* Visual Column */}
          {finalImage && (
            <div className={styles.visualCol}>
              <StaffBrandingImage
                src={finalImage}
                alt={imageAlt || "WowCars Representative"}
                name={staffName || "Arjun Sharma"}
                role={finalRole}
                badgeText={staffBadge || "Verified WowCars Specialist"}
                aspectRatio="16/9"
                priority
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
