"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { getAssetPath } from "@/lib/assets";
import styles from "./ResponsiveGallery.module.css";

export interface ResponsiveGalleryProps {
  images: string[];
  title?: string;
  className?: string;
}

export default function ResponsiveGallery({
  images,
  title = "Vehicle Gallery",
  className = "",
}: ResponsiveGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const rawImages = images.length > 0 ? images : ["/images/staff-used-cars.jpg"];
  const displayImages = rawImages.map(getAssetPath);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={`${styles.gallery} ${className}`}>
      {/* Main Image Display */}
      <div className={styles.mainWrapper}>
        <Image
          src={displayImages[activeIndex]}
          alt={`${title} - Photo ${activeIndex + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 800px)"
          className={styles.mainImage}
        />
        <div className={styles.imageOverlay} />

        {/* Counter Badge */}
        <div className={styles.counterBadge}>
          {activeIndex + 1} / {displayImages.length}
        </div>

        {/* Expand Button */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className={styles.expandBtn}
          aria-label="Expand image"
        >
          <Maximize2 size={16} />
        </button>

        {/* Prev / Next controls */}
        {displayImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className={`${styles.navBtn} ${styles.prevBtn}`}
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={`${styles.navBtn} ${styles.nextBtn}`}
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className={styles.thumbnailStrip}>
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`${styles.thumbBtn} ${idx === activeIndex ? styles.thumbActive : ""}`}
            >
              <Image
                src={img}
                alt={`${title} thumbnail ${idx + 1}`}
                fill
                sizes="80px"
                className={styles.thumbImage}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className={styles.lightbox} onClick={() => setIsLightboxOpen(false)}>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <Image
              src={displayImages[activeIndex]}
              alt={`${title} full preview`}
              fill
              sizes="90vw"
              className={styles.lightboxImage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
