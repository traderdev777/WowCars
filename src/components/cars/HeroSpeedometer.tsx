"use client";

import { useState, useEffect, useRef } from "react";
import { Gauge, Zap, Flame, Shield, CheckCircle2 } from "lucide-react";
import styles from "./HeroSpeedometer.module.css";

export default function HeroSpeedometer() {
  const [rpm, setRpm] = useState(1200); // Idle RPM
  const [isRevving, setIsRevving] = useState(false);
  const revIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth decay to idle when not revving
  useEffect(() => {
    if (!isRevving) {
      const decayTimer = setInterval(() => {
        setRpm((prev) => {
          if (prev <= 1250) return 1200;
          return Math.max(1200, prev - 180);
        });
      }, 30);
      return () => clearInterval(decayTimer);
    }
  }, [isRevving]);

  const handleRevStart = () => {
    setIsRevving(true);
    if (revIntervalRef.current) clearInterval(revIntervalRef.current);
    revIntervalRef.current = setInterval(() => {
      setRpm((prev) => {
        const next = prev + Math.floor(Math.random() * 350) + 200;
        return Math.min(6800, next);
      });
    }, 40);
  };

  const handleRevEnd = () => {
    setIsRevving(false);
    if (revIntervalRef.current) clearInterval(revIntervalRef.current);
  };

  // SVG Gauge calculations
  // Semi-circle arc: radius 80, length is PI * 80 ~= 251.3
  const arcLength = 251.3;
  const maxRpm = 7000;
  const progressFraction = Math.min(1, Math.max(0, rpm / maxRpm));
  const dashOffset = arcLength * (1 - progressFraction);

  const isRedline = rpm >= 5800;

  return (
    <div className={styles.speedoCard}>
      <div className={styles.gaugeContainer}>
        <svg viewBox="0 0 200 110" className={styles.svgGauge}>
          <defs>
            <linearGradient id="speedoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="65%" stopColor="#F59E0B" />
              <stop offset="90%" stopColor="#E50914" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            className={styles.gaugeTrack}
          />

          {/* Active Progress Fill */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            className={styles.gaugeFill}
            style={{
              strokeDasharray: arcLength,
              strokeDashoffset: dashOffset,
            }}
          />
        </svg>

        <div className={styles.digitalHub}>
          <span
            className={styles.rpmValue}
            style={{ color: isRedline ? "var(--color-primary)" : "var(--color-white)" }}
          >
            {rpm.toLocaleString("en-IN")}
          </span>
          <span className={styles.rpmUnit}>
            {isRedline ? "🔥 REDLINE ACTIVE" : "RPM · ENGINE IDLE"}
          </span>
        </div>
      </div>

      <button
        type="button"
        className={styles.revButton}
        onMouseDown={handleRevStart}
        onMouseUp={handleRevEnd}
        onMouseLeave={handleRevEnd}
        onTouchStart={handleRevStart}
        onTouchEnd={handleRevEnd}
      >
        <Flame size={16} style={{ color: isRedline ? "#FBBF24" : "var(--color-primary)" }} />
        <span>Hold to Rev Engine</span>
      </button>

      {/* Ticker HUD Strip */}
      <div className={styles.tickerStrip}>
        <div className={styles.tickerItem}>
          <span className={styles.tickerNumber}>150-Pt</span>
          <span className={styles.tickerLabel}>Certified</span>
        </div>
        <div className={styles.tickerItem}>
          <span className={styles.tickerNumber} style={{ color: "var(--color-trust-green)" }}>₹0</span>
          <span className={styles.tickerLabel}>Brokerage</span>
        </div>
        <div className={styles.tickerItem}>
          <span className={styles.tickerNumber}>KA RTO</span>
          <span className={styles.tickerLabel}>Verified</span>
        </div>
        <div className={styles.tickerItem}>
          <span className={styles.tickerNumber} style={{ color: "var(--color-accent)" }}>4.9★</span>
          <span className={styles.tickerLabel}>Dealer Trust</span>
        </div>
      </div>
    </div>
  );
}
