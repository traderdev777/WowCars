"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import styles from "./LiveActivityTicker.module.css";

const LIVE_EVENTS = [
  {
    id: 1,
    emoji: "🚗",
    badge: "Verified Booking",
    message: "Rahul S. booked a test drive for Creta SX (KA-50)",
    time: "2m ago",
  },
  {
    id: 2,
    emoji: "✨",
    badge: "New Listing",
    message: "2022 Swift ZXi listed in Rajajinagar — 18,500 km",
    time: "4m ago",
  },
  {
    id: 3,
    emoji: "🛡️",
    badge: "Dealer Inspection",
    message: "Sri Balaji Motors certified 2 new SUVs in Yelahanka",
    time: "7m ago",
  },
  {
    id: 4,
    emoji: "💰",
    badge: "Saved Brokerage",
    message: "Seller in Whitefield saved ₹38,000 on broker fees",
    time: "11m ago",
  },
  {
    id: 5,
    emoji: "🔥",
    badge: "High Demand",
    message: "5 buyers viewed 2020 Innova Crysta in last hour",
    time: "15m ago",
  },
  {
    id: 6,
    emoji: "⚡",
    badge: "Instant Approval",
    message: "Ananya H. listed 2019 Honda City — Approved in 45m",
    time: "18m ago",
  },
];

export default function LiveActivityTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isDismissed) return;

    const interval = setInterval(() => {
      // Fade out, then change index, then fade in
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % LIVE_EVENTS.length);
        setIsVisible(true);
      }, 400);
    }, 6000);

    return () => clearInterval(interval);
  }, [isDismissed]);

  if (isDismissed) return null;

  const current = LIVE_EVENTS[currentIndex];

  return (
    <aside className={styles.tickerWrapper} aria-live="polite">
      {isVisible && (
        <div className={styles.toastCard}>
          <div className={styles.avatar}>{current.emoji}</div>
          <div className={styles.content}>
            <div className={styles.headerRow}>
              <span className={styles.badge}>
                <span className="radar-dot" style={{ width: 6, height: 6 }} />
                {current.badge}
              </span>
              <span className={styles.time}>· {current.time}</span>
            </div>
            <div className={styles.message}>{current.message}</div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </aside>
  );
}
