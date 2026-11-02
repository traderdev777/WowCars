"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Phone, ArrowRight, ShieldCheck } from "lucide-react";
import styles from "./CTASection.module.css";
import { getAssetPath } from "@/lib/assets";

export interface CTAAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface CTASectionProps {
  badge?: string;
  title?: React.ReactNode;
  subtitle?: string;
  primaryActionLabel?: string;
  primaryActionHref?: string;
  primaryAction?: CTAAction;
  secondaryAction?: CTAAction;
  onPrimaryClick?: () => void;
  showWhatsApp?: boolean;
  showPhone?: boolean;
  imageSrc?: string;
  imageAlt?: string;
  variant?: "default" | "red" | "black" | string;
}

export default function CTASection({
  badge = "BENGALURU EXPERIENCE CENTRE",
  title = "Ready for a Transparent Automotive Experience?",
  subtitle = "Whether buying, selling, servicing, or sourcing genuine parts, our certified specialists are standing by to assist you.",
  primaryActionLabel = "Browse Catalog",
  primaryActionHref = "/cars",
  primaryAction,
  secondaryAction,
  onPrimaryClick,
  showWhatsApp = true,
  showPhone = true,
  imageSrc = "/images/staff-customer-support.jpg",
  imageAlt = "WowCars Customer Concierge Arjun",
  variant = "default",
}: CTASectionProps) {
  const finalPrimaryLabel = primaryAction?.label || primaryActionLabel;
  const finalPrimaryHref = primaryAction?.href || primaryActionHref;
  const finalPrimaryClick = primaryAction?.onClick || onPrimaryClick;
  return (
    <section className={styles.ctaSection}>
      <div className={`container ${styles.container}`}>
        <div className={styles.card}>
          <div className={styles.contentCol}>
            <div className={styles.badgePill}>{badge}</div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>{subtitle}</p>

            <div className={styles.features}>
              <div className={styles.featureItem}>
                <ShieldCheck size={16} className={styles.featureIcon} />
                <span>Verified 140-Point Inspection</span>
              </div>
              <div className={styles.featureItem}>
                <ShieldCheck size={16} className={styles.featureIcon} />
                <span>₹0 Buyer Hidden Charges</span>
              </div>
              <div className={styles.featureItem}>
                <ShieldCheck size={16} className={styles.featureIcon} />
                <span>Certified High-Voltage EV Bays</span>
              </div>
            </div>

            <div className={styles.actions}>
              {finalPrimaryHref ? (
                <Link href={finalPrimaryHref} className={`btn btn-primary ${styles.primaryBtn}`}>
                  <span>{finalPrimaryLabel}</span>
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={finalPrimaryClick}
                  className={`btn btn-primary ${styles.primaryBtn}`}
                >
                  <span>{finalPrimaryLabel}</span>
                  <ArrowRight size={16} />
                </button>
              )}

              {secondaryAction && secondaryAction.href && (
                <Link href={secondaryAction.href} className="btn btn-secondary">
                  <span>{secondaryAction.label}</span>
                </Link>
              )}

              {showWhatsApp && !secondaryAction && (
                <a
                  href="https://wa.me/919019088160?text=Hi%20WowCars!%20I%20would%20like%20to%20enquire."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp"
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp Concierge</span>
                </a>
              )}

              {showPhone && (
                <a href="tel:+919019088160" className={`btn btn-ghost ${styles.phoneBtn}`}>
                  <Phone size={15} />
                  <span>+91 901 908 8160</span>
                </a>
              )}
            </div>
          </div>

          <div className={styles.visualCol}>
            <div className={styles.imageWrapper}>
              <Image
                src={getAssetPath(imageSrc)}
                alt={imageAlt}
                fill
                sizes="(max-width: 768px) 100vw, 480px)"
                className={styles.image}
              />
              <div className={styles.imageOverlay} />
              <div className={styles.specialistBadge}>
                <div className={styles.specialistDot} />
                <div>
                  <div className={styles.specialistTitle}>Arjun Sharma</div>
                  <div className={styles.specialistSub}>Customer Concierge Lead</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
