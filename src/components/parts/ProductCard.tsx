"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingCart, ShieldCheck, AlertCircle, Wrench } from "lucide-react";
import { PartProduct } from "@/lib/db/types";
import { useCart } from "@/lib/cart/CartContext";
import styles from "./ProductCard.module.css";

interface ProductCardProps {
  product: PartProduct;
  selectedVehicle?: string | null;
}

export default function ProductCard({ product, selectedVehicle }: ProductCardProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const mainImage = product.images?.[0] || "/parts/image-unavailable.svg";
  const inStock = product.stockQuantity > 0 && product.status === "PUBLISHED";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;

    const effectivePrice = product.price || product.priceINR || 0;
    const effectiveMrp = product.mrp || product.mrpINR;

    addItem({
      productId: product.id,
      quantity: 1,
      product: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        brand: product.brand,
        price: effectivePrice,
        mrp: effectiveMrp,
        partNumber: product.partNumber,
        images: product.images,
        stockQuantity: product.stockQuantity,
        partType: product.partType,
        warrantyMonths: product.warrantyMonths,
      },
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const getPartTypeBadgeClass = () => {
    switch (product.partType) {
      case "GENUINE_OEM":
        return styles.badgeOem;
      case "OES":
        return styles.badgeOes;
      default:
        return styles.badgeAftermarket;
    }
  };

  const getPartTypeLabel = () => {
    switch (product.partType) {
      case "GENUINE_OEM":
        return "Genuine OEM";
      case "OES":
        return "OES Quality";
      default:
        return "Aftermarket";
    }
  };

  return (
    <div className={styles.card}>
      {/* Card Header with Badges */}
      <div className={styles.imageContainer}>
        <Link href={`/spare-parts/product/${product.slug}`} className={styles.imageLink}>
          <Image
            src={mainImage}
            alt={product.title}
            width={320}
            height={220}
            className={styles.image}
            loading="lazy"
          />
        </Link>

        {/* Condition & Part Type Tags */}
        <div className={styles.tagGroup}>
          <span className={`${styles.badge} ${getPartTypeBadgeClass()}`}>
            {getPartTypeLabel()}
          </span>
          {product.condition !== "NEW" && (
            <span className={`${styles.badge} ${styles.badgeCondition}`}>
              {product.condition}
            </span>
          )}
        </div>

        {/* Discount Badge */}
        {product.discountPercent && product.discountPercent > 0 ? (
          <div className={styles.discountBadge}>
            {product.discountPercent}% OFF
          </div>
        ) : null}
      </div>

      {/* Card Content */}
      <div className={styles.content}>
        {/* Brand & Part Number */}
        <div className={styles.metaRow}>
          <span className={styles.brand}>{product.brand}</span>
          {product.partNumber && (
            <span className={styles.partNo}>PN: {product.partNumber}</span>
          )}
        </div>

        {/* Title */}
        <h3 className={styles.title}>
          <Link href={`/spare-parts/product/${product.slug}`} className={styles.titleLink}>
            {product.title}
          </Link>
        </h3>

        {/* Vehicle Fitment Hint */}
        <div className={styles.fitmentRow}>
          {product.compatibleVehicles?.[0]?.make === "Universal" ? (
            <span className={styles.fitUniversal}>
              <Wrench size={12} /> Universal Fitment
            </span>
          ) : selectedVehicle ? (
            <span className={styles.fitConfirmed}>
              <ShieldCheck size={12} /> Fits {selectedVehicle}
            </span>
          ) : (
            <span className={styles.fitModels}>
              Fits {product.compatibleVehicles?.map((v) => `${v.make} ${v.model}`).slice(0, 2).join(", ")}
              {product.compatibleVehicles && product.compatibleVehicles.length > 2 ? " +more" : ""}
            </span>
          )}
        </div>

        {/* Price and Stock Row */}
        <div className={styles.footerRow}>
          <div className={styles.priceCol}>
            <div className={styles.priceRow}>
              <span className={styles.sellingPrice}>₹{(product.price || product.priceINR).toLocaleString("en-IN")}</span>
              {(product.mrp || product.mrpINR) && (product.mrp || product.mrpINR)! > (product.price || product.priceINR) && (
                <span className={styles.mrp}>₹{(product.mrp || product.mrpINR)!.toLocaleString("en-IN")}</span>
              )}
            </div>
            <span className={styles.verifiedPrice}>
              <ShieldCheck size={10} /> Verified Price
            </span>
          </div>

          {/* Action Button */}
          {inStock ? (
            <button
              onClick={handleAddToCart}
              className={`${styles.cartBtn} ${added ? styles.added : ""}`}
              aria-label={`Add ${product.title} to cart`}
              disabled={added}
            >
              {added ? (
                <>
                  <Check size={14} /> Added
                </>
              ) : (
                <>
                  <ShoppingCart size={14} /> Add
                </>
              )}
            </button>
          ) : (
            <span className={styles.outOfStockBadge}>
              <AlertCircle size={12} /> Out of Stock
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
