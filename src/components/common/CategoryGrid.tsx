"use client";

import React from "react";
import Link from "next/link";
import { Car, Zap, Bike, Truck, Wrench, Shield, CircleDot } from "lucide-react";
import styles from "./CategoryGrid.module.css";

export interface CategoryItem {
  id: string;
  name: string;
  countLabel?: string;
  icon?: React.ReactNode;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

export interface CategoryGridProps {
  categories?: CategoryItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  title?: string;
  subtitle?: string;
}

export default function CategoryGrid({
  categories,
  selectedId,
  onSelect,
  title,
  subtitle,
}: CategoryGridProps) {
  const defaultCategories: CategoryItem[] = [
    {
      id: "CAR",
      name: "Passenger Cars",
      countLabel: "Hatchbacks, Sedans, SUVs",
      icon: <Car size={22} />,
      href: "/cars?category=CAR",
    },
    {
      id: "ELECTRIC",
      name: "Electric Vehicles",
      countLabel: "EV Cars & 2W · 400V Ready",
      icon: <Zap size={22} />,
      href: "/cars?fuel=Electric",
    },
    {
      id: "TWO_WHEELER",
      name: "Two-Wheelers",
      countLabel: "Motorcycles & Scooters",
      icon: <Bike size={22} />,
      href: "/cars?category=TWO_WHEELER",
    },
    {
      id: "COMMERCIAL",
      name: "Commercial & Fleet",
      countLabel: "LCVs, Vans, Cargo",
      icon: <Truck size={22} />,
      href: "/cars?category=COMMERCIAL",
    },
    {
      id: "PARTS",
      name: "Spare Parts",
      countLabel: "PAN-India OEM & Aftermarket",
      icon: <Wrench size={22} />,
      href: "/spare-parts",
    },
    {
      id: "SERVICE",
      name: "Garage Services",
      countLabel: "Certified Hubs & Inspection",
      icon: <Shield size={22} />,
      href: "/service-centres",
    },
  ];

  const items = categories || defaultCategories;

  return (
    <div className={styles.wrapper}>
      {(title || subtitle) && (
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}

      <div className={styles.grid}>
        {items.map((cat) => {
          const isSelected = selectedId ? selectedId === cat.id : cat.active;

          const content = (
            <div
              className={`${styles.card} ${isSelected ? styles.cardActive : ""}`}
              onClick={() => {
                if (onSelect) onSelect(cat.id);
                if (cat.onClick) cat.onClick();
              }}
            >
              <div className={styles.iconBox}>{cat.icon || <CircleDot size={20} />}</div>
              <div className={styles.info}>
                <div className={styles.name}>{cat.name}</div>
                {cat.countLabel && <div className={styles.count}>{cat.countLabel}</div>}
              </div>
            </div>
          );

          if (cat.href && !onSelect) {
            return (
              <Link key={cat.id} href={cat.href} className={styles.link}>
                {content}
              </Link>
            );
          }

          return <React.Fragment key={cat.id}>{content}</React.Fragment>;
        })}
      </div>
    </div>
  );
}
