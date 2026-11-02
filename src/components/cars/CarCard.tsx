"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Fuel, Settings, Users, MessageCircle, Eye, BadgeCheck, Heart } from "lucide-react";
import { formatLakhs, formatKM, generateWhatsAppLink } from "@/lib/formatters";
import type { Car } from "@/lib/mockData";
import { WHATSAPP_CONCIERGE_PHONE } from "@/lib/mockData";
import { getAssetPath } from "@/lib/assets";
import styles from "./CarCard.module.css";

interface CarCardProps {
  car: Car;
}

const FUEL_COLORS: Record<string, string> = {
  Petrol: "badge-amber",
  Diesel: "badge-dark",
  CNG: "badge-green",
  Electric: "badge-green",
  Hybrid: "badge-green",
};

/** Indicative EMI: 80% loan, 9.5% p.a., 60 months */
function estimateEmi(priceINR: number) {
  const principal = priceINR * 0.8;
  const r = 0.095 / 12;
  const n = 60;
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) / 100) * 100;
}

export default function CarCard({ car }: CarCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [imageError, setImageError] = useState(false);

  const rawImage = car.images && car.images.length > 0 && car.images[0] ? car.images[0] : "";
  const resolvedImage = rawImage ? getAssetPath(rawImage) : "";

  const waLink = generateWhatsAppLink(WHATSAPP_CONCIERGE_PHONE, {
    listingCode: car.listingCode,
    title: `${car.year} ${car.make} ${car.model} ${car.variant}`,
    priceLakhs: formatLakhs(car.priceINR),
    url: `https://wowcars.in/cars/${car.listingCode.toLowerCase()}`,
  });

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaved((prev) => !prev);
  };

  return (
    <article className={`card ${styles.carCard}`}>
      {/* Image with glossy shine hover effect */}
      <div className={`${styles.imageWrap} shine-hover`}>
        {resolvedImage && !imageError ? (
          <img
            src={resolvedImage}
            alt={`${car.year} ${car.make} ${car.model}`}
            className={styles.carRealImg}
            loading="lazy"
            decoding="async"
            width={640}
            height={400}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={styles.imagePlaceholder} aria-label={`${car.make} ${car.model} photo`}>
            <div className={styles.placeholderContent}>
              <span className={styles.carEmoji}>🚗</span>
              <span className={styles.carMakeLabel}>{car.make}</span>
            </div>
          </div>
        )}

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={toggleSave}
          className={`${styles.favoriteBtn} ${isSaved ? styles.favoriteBtnActive : ""}`}
          aria-label={isSaved ? "Remove from saved cars" : "Save this car"}
        >
          <Heart
            size={16}
            fill={isSaved ? "#fff" : "none"}
            className={isSaved ? "animate-heart" : ""}
          />
        </button>

        {/* Top Badges */}
        <div className={styles.topBadges}>
          {car.isFeatured && (
            <span className={`badge badge-red ${styles.featuredBadge}`}>★ Featured</span>
          )}
          {car.isVerified && (
            <span className={`badge badge-green ${styles.verifiedBadge}`}>
              <span className="radar-dot" style={{ width: 6, height: 6 }} />
              <BadgeCheck size={12} /> Verified
            </span>
          )}
        </div>

        {/* Listing Code */}
        <span className={`badge badge-white ${styles.listingCode}`}>
          {car.listingCode}
          {car.isSeedData ? " · Sample" : ""}
        </span>
        <div className={styles.imageShade} aria-hidden="true" />
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Title */}
        <Link
          href={`/cars/${car.listingCode.toLowerCase()}`}
          className={styles.titleLink}
        >
          <h3 className={styles.title}>
            {car.year} {car.make} {car.model}
          </h3>
          <p className={styles.variant}>{car.variant}</p>
        </Link>

        {/* Price */}
        <div className={styles.priceRow}>
          <div className={styles.price}>
            <span className={styles.rupee}>₹</span>
            <span className={styles.priceValue}>
              {(car.priceINR / 100000).toFixed(2)}
            </span>
            <span className={styles.priceUnit}>Lakhs</span>
          </div>
          {car.numOwners === 1 && (
            <span className="badge badge-green">1st Owner</span>
          )}
        </div>
        <p className={styles.emiHint}>
          EMI from <strong>₹{estimateEmi(car.priceINR).toLocaleString("en-IN")}/mo</strong>
          <span> · 60 months, 20% down</span>
        </p>

        {/* Specs Row */}
        <div className={styles.specs}>
          <span className={styles.specItem}>
            <Fuel size={12} />
            <span className={`badge ${FUEL_COLORS[car.fuelType] ?? "badge-dark"}`}>
              {car.fuelType}
            </span>
          </span>
          <span className={styles.specItem}>
            <Settings size={12} />
            <span className={styles.specText}>{car.transmission}</span>
          </span>
          <span className={styles.specItem}>
            <Eye size={12} />
            <span className={styles.specText}>{formatKM(car.kmDriven)}</span>
          </span>
          <span className={styles.specItem}>
            <Users size={12} />
            <span className={styles.specText}>{car.numOwners} Owner{car.numOwners > 1 ? "s" : ""}</span>
          </span>
        </div>

        {/* RTO + Location */}
        <div className={styles.location}>
          <MapPin size={12} />
          <span>{car.locality}, {car.city}</span>
          <span className={styles.rtoDot}>·</span>
          <span className={styles.rto}>{car.rtoCode} ({car.rtoArea})</span>
        </div>

        {/* Seller Type */}
        <div className={styles.sellerRow}>
          {car.sellerType === "Verified Dealer" ? (
            <span className={styles.dealerTag}>
              <BadgeCheck size={12} className={styles.dealerIcon} />
              {car.dealerName ?? "Verified Dealer"}
            </span>
          ) : (
            <span className={styles.individualTag}>Individual Seller</span>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Link
            href={`/cars/${car.listingCode.toLowerCase()}`}
            className="btn btn-secondary btn-sm"
            style={{ flex: 1 }}
          >
            View Details
          </Link>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-sm"
            style={{ flex: 1 }}
            aria-label={`WhatsApp enquiry for ${car.make} ${car.model}`}
          >
            <MessageCircle size={14} />
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
