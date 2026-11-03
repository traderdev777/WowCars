"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { DEAL_LABEL, DEAL_TOOLTIP, dealEstimate, priceShort, type Listing } from "@/lib/listings/listing";
import styles from "./DealBadge.module.css";

interface Props {
  car: Listing;
  size?: "sm" | "md";
  align?: "left" | "right";
}

/** WowPrice rating pill with an honest "how is this calculated" tooltip. */
export default function DealBadge({ car, size = "sm", align = "left" }: Props) {
  const est = dealEstimate(car);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const label = est ? DEAL_LABEL[est.rating] : "Not rated";
  const cls = est ? `deal-${est.rating}` : "deal-none";

  return (
    <span className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={`deal ${cls} ${styles.btn} ${size === "md" ? styles.md : ""}`}
        aria-expanded={open}
        aria-label={`${label}. What does this mean?`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {label}
        <Info size={12} aria-hidden="true" className={styles.info} />
      </button>
      {open && (
        <span role="tooltip" className={`${styles.tip} ${align === "right" ? styles.tipRight : ""}`}>
          <strong>WowPrice estimate</strong>
          {est ? (
            <span className={styles.range}>
              Similar cars: {priceShort(est.low)} – {priceShort(est.high)}
            </span>
          ) : (
            <span className={styles.range}>Not enough comparable data to rate this car.</span>
          )}
          <span>{DEAL_TOOLTIP}</span>
        </span>
      )}
    </span>
  );
}
