"use client";

import Image from "next/image";
import { ShieldCheck, Award } from "lucide-react";
import styles from "./StaffBrandingImage.module.css";
import { getAssetPath } from "@/lib/assets";

export interface StaffBrandingImageProps {
  src?: string;
  imageSrc?: string;
  alt: string;
  badgeText?: string;
  name?: string;
  role?: string;
  caption?: string;
  aspectRatio?: "16/9" | "3/4" | "4/3" | "1/1";
  priority?: boolean;
  className?: string;
  showCaption?: boolean;
}

export default function StaffBrandingImage({
  src,
  imageSrc,
  alt,
  badgeText = "Verified WowCars Specialist",
  name = "Arjun Sharma",
  role = "Lead Automotive Specialist",
  caption,
  aspectRatio = "16/9",
  priority = false,
  className = "",
  showCaption = true,
}: StaffBrandingImageProps) {
  const rawSrc = src || imageSrc || "/images/staff-representative.jpg";
  const finalSrc = getAssetPath(rawSrc);
  const displayRole = caption || (role ? `${role} · Bengaluru Pilot Hub` : "Lead Specialist · Bengaluru Pilot Hub");
  return (
    <div
      className={`${styles.container} ${styles[`aspect_${aspectRatio.replace("/", "_")}`]} ${className}`}
    >
      <div className={styles.imageWrapper}>
        <Image
          src={finalSrc}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px)"
          priority={priority}
          className={styles.image}
        />
        <div className={styles.vignette} />
      </div>

      {badgeText && (
        <div className={styles.trustBadge}>
          <ShieldCheck size={14} className={styles.badgeIcon} />
          <span>{badgeText}</span>
        </div>
      )}

      {showCaption && (
        <div className={styles.captionBar}>
          <div className={styles.captionText}>
            <div className={styles.specialistName}>
              <Award size={13} className={styles.nameIcon} />
              <span>{name}</span>
            </div>
            <div className={styles.specialistRole}>{displayRole}</div>
          </div>
          <div className={styles.brandTag}>
            <span className={styles.brandDot} />
            <span>Official Uniform</span>
          </div>
        </div>
      )}
    </div>
  );
}
