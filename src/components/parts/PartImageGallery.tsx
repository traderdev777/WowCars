"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./PartImageGallery.module.css";

interface PartImageGalleryProps {
  images: string[];
  title: string;
}

export default function PartImageGallery({ images, title }: PartImageGalleryProps) {
  const safeImages = images && images.length > 0 ? images : ["/parts/image-unavailable.svg"];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const currentImage = safeImages[activeIndex] || safeImages[0];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % safeImages.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length);
  };

  return (
    <div className={styles.gallery}>
      {/* Main Image Viewport */}
      <div className={`${styles.mainContainer} ${isZoomed ? styles.zoomed : ""}`}>
        <Image
          src={currentImage}
          alt={`${title} - View ${activeIndex + 1}`}
          width={600}
          height={450}
          className={styles.mainImage}
          priority
          onClick={() => setIsZoomed(!isZoomed)}
        />

        {/* Zoom Toggle Button */}
        <button
          className={styles.zoomBtn}
          onClick={() => setIsZoomed(!isZoomed)}
          aria-label={isZoomed ? "Zoom out" : "Zoom in"}
        >
          {isZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
        </button>

        {/* Gallery Navigation arrows */}
        {safeImages.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className={`${styles.navBtn} ${styles.prevBtn}`}
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              className={`${styles.navBtn} ${styles.nextBtn}`}
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Row */}
      {safeImages.length > 1 && (
        <div className={styles.thumbnails}>
          {safeImages.map((img, idx) => (
            <button
              key={`${img}-${idx}`}
              onClick={() => {
                setActiveIndex(idx);
                setIsZoomed(false);
              }}
              className={`${styles.thumbBtn} ${idx === activeIndex ? styles.activeThumb : ""}`}
              aria-label={`Thumbnail view ${idx + 1}`}
            >
              <Image
                src={img}
                alt={`${title} thumb ${idx + 1}`}
                width={80}
                height={60}
                className={styles.thumbImage}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
