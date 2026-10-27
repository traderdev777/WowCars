"use client";

import { useState, useRef, useEffect } from "react";
import { Zap, Flame, Shield, MapPin, Gauge } from "lucide-react";
import styles from "./MovingCarHighway.module.css";

type SpeedMode = "city" | "highway" | "turbo";

const MODES: Record<SpeedMode, { speed: number; label: string; roadDuration: string; wheelDuration: string }> = {
  city: { speed: 60, label: "City 60 km/h", roadDuration: "0.65s", wheelDuration: "0.5s" },
  highway: { speed: 120, label: "Highway 120 km/h", roadDuration: "0.3s", wheelDuration: "0.22s" },
  turbo: { speed: 220, label: "Nitro 220 km/h", roadDuration: "0.12s", wheelDuration: "0.08s" },
};

export default function MovingCarHighway() {
  const [mode, setMode] = useState<SpeedMode>("highway");
  const [isBoosting, setIsBoosting] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(120);

  // Speed counter smooth interpolation
  useEffect(() => {
    const targetSpeed = isBoosting ? 260 : MODES[mode].speed;
    const interval = setInterval(() => {
      setCurrentSpeed((prev) => {
        if (Math.abs(prev - targetSpeed) < 3) return targetSpeed;
        return prev < targetSpeed ? prev + 4 : prev - 4;
      });
    }, 25);
    return () => clearInterval(interval);
  }, [mode, isBoosting]);

  const activeModeData = isBoosting
    ? { speed: 260, label: "NITRO 260 km/h", roadDuration: "0.08s", wheelDuration: "0.05s" }
    : MODES[mode];

  return (
    <div
      className={styles.sceneWrapper}
      style={{
        "--road-duration": activeModeData.roadDuration,
        "--wheel-duration": activeModeData.wheelDuration,
      } as React.CSSProperties}
    >
      {/* Top HUD Overlay */}
      <div className={styles.hudBar}>
        <div className={styles.hudPill}>
          <span className="radar-dot" style={{ width: 6, height: 6 }} />
          <span>WOwCars Pan-India Expressway</span>
        </div>

        <div className={styles.hudPill}>
          <Gauge size={13} style={{ color: "var(--color-primary)" }} />
          <span className={styles.hudSpeed}>{currentSpeed}</span>
          <span style={{ fontSize: "10px", color: "var(--color-slate)" }}>KM/H</span>
        </div>
      </div>

      {/* The Animated Highway Scene Canvas */}
      <div className={styles.highwayCanvas}>
        {/* Sky Stars */}
        <div className={styles.skyStars} />

        {/* Parallax City Skyline */}
        <div className={styles.citySkyline} />

        {/* Distant Sky Speed Lines */}
        <div className={styles.speedLinesSky} />

        {/* The Animated Moving Car */}
        <div className={styles.carContainer}>
          <div className={styles.carChassis}>
            {/* Volumetric Headlight Light Cone */}
            <div className={styles.headlightBeam} />

            {/* Glowing Red LED Taillight Motion Blur */}
            <div className={styles.taillightStreak} />

            {/* Neon Red Chassis Underglow */}
            <div className={styles.underglow} />

            {/* Nitro Flame (Active in Turbo Mode or when Boosting) */}
            {(mode === "turbo" || isBoosting) && (
              <div className={styles.nitroFlame} />
            )}

            {/* Detailed Vector Sports Car SVG */}
            <svg
              viewBox="0 0 240 76"
              className={styles.carSvg}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Crimson Body Gradient */}
                <linearGradient id="bodyRedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9B0007" />
                  <stop offset="40%" stopColor="#E50914" />
                  <stop offset="70%" stopColor="#FF2E3A" />
                  <stop offset="100%" stopColor="#B3050E" />
                </linearGradient>

                {/* Dark Tinted Glass Gradient */}
                <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2A2A2E" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#121214" stopOpacity="0.95" />
                </linearGradient>

                {/* Metallic Chrome Trim */}
                <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#555" />
                  <stop offset="50%" stopColor="#eee" />
                  <stop offset="100%" stopColor="#777" />
                </linearGradient>

                {/* Alloy Wheel Rim Gradient */}
                <radialGradient id="rimGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#8E8E93" />
                  <stop offset="100%" stopColor="#2C2C2E" />
                </radialGradient>
              </defs>

              {/* Rear Aerodynamic Spoiler */}
              <path
                d="M 12 28 L 26 22 L 32 28 L 18 31 Z"
                fill="#161616"
              />
              <path
                d="M 16 31 L 18 38 L 22 38 L 22 31 Z"
                fill="#2C2C2E"
              />

              {/* Main Sleek Sports Car Body Shell */}
              <path
                d="M 16 46 
                   C 18 36, 26 34, 38 33 
                   L 70 33 
                   C 82 23, 102 14, 134 14 
                   L 165 14 
                   C 184 14, 198 25, 210 36 
                   L 230 42 
                   C 236 44, 238 48, 238 52 
                   L 236 56 
                   C 234 58, 228 58, 222 58 
                   L 196 58 
                   C 192 48, 178 48, 174 58 
                   L 72 58 
                   C 68 48, 54 48, 50 58 
                   L 20 58 
                   C 14 58, 12 54, 12 50 
                   Z"
                fill="url(#bodyRedGrad)"
                stroke="#4a0104"
                strokeWidth="1.2"
              />

              {/* Aerodynamic Aerofoil Roof & Tinted Windows */}
              <path
                d="M 74 32 
                   C 84 24, 104 17, 132 17 
                   L 162 17 
                   C 178 17, 188 24, 198 32 
                   Z"
                fill="url(#glassGrad)"
                stroke="#3a3a40"
                strokeWidth="1"
              />

              {/* Window Pillar (B-Pillar) */}
              <line x1="135" y1="17" x2="135" y2="32" stroke="#1c1c1f" strokeWidth="2.5" />

              {/* Front Headlight Projector Cluster */}
              <polygon
                points="224,44 236,46 230,50 218,48"
                fill="#ffffff"
                filter="drop-shadow(0 0 4px #ffffaa)"
              />

              {/* Rear LED Light Bar (Red Glow) */}
              <path
                d="M 14 43 L 24 43 L 22 47 L 14 46 Z"
                fill="#ff1a26"
                filter="drop-shadow(0 0 5px #ff0000)"
              />

              {/* Front Aerodynamic Splitter & Air Intake */}
              <path
                d="M 218 53 L 236 55 L 235 58 L 216 57 Z"
                fill="#111"
              />

              {/* Side Door Character Line (Sports Crease) */}
              <path
                d="M 68 44 Q 130 41 198 46"
                stroke="#690207"
                strokeWidth="1.5"
                fill="none"
              />

              {/* Side Skirt Ground Effects */}
              <rect x="74" y="56" width="98" height="2.5" fill="#141416" rx="1" />

              {/* Front Wheel Hub & Rim Assembly */}
              <g transform="translate(185, 58)">
                {/* Brake Rotor Disc (Silver) */}
                <circle cx="0" cy="0" r="14" fill="#666" stroke="#444" strokeWidth="1" />
                {/* Red Brake Caliper */}
                <rect x="-12" y="-14" width="7" height="9" rx="1.5" fill="#E50914" />
                {/* Tire Rubber Ring */}
                <circle cx="0" cy="0" r="16.5" fill="#141416" stroke="#000" strokeWidth="2" />
                {/* Spinning 5-Spoke Alloy Rim */}
                <g className={styles.wheelFront}>
                  <circle cx="0" cy="0" r="12" fill="url(#rimGrad)" />
                  <circle cx="0" cy="0" r="4.5" fill="#222" stroke="#fff" strokeWidth="1" />
                  {/* 5 Spoke lines */}
                  <line x1="0" y1="-12" x2="0" y2="12" stroke="#fff" strokeWidth="1.8" />
                  <line x1="-11.4" y1="-3.7" x2="11.4" y2="3.7" stroke="#fff" strokeWidth="1.8" />
                  <line x1="-7" y1="9.7" x2="7" y2="-9.7" stroke="#fff" strokeWidth="1.8" />
                  <line x1="7" y1="9.7" x2="-7" y2="-9.7" stroke="#fff" strokeWidth="1.8" />
                  <line x1="-11.4" y1="3.7" x2="11.4" y2="-3.7" stroke="#fff" strokeWidth="1.8" />
                </g>
              </g>

              {/* Rear Wheel Hub & Rim Assembly */}
              <g transform="translate(61, 58)">
                {/* Brake Rotor Disc */}
                <circle cx="0" cy="0" r="14" fill="#666" stroke="#444" strokeWidth="1" />
                {/* Red Brake Caliper */}
                <rect x="-12" y="-14" width="7" height="9" rx="1.5" fill="#E50914" />
                {/* Tire Rubber Ring */}
                <circle cx="0" cy="0" r="16.5" fill="#141416" stroke="#000" strokeWidth="2" />
                {/* Spinning 5-Spoke Alloy Rim */}
                <g className={styles.wheelRear}>
                  <circle cx="0" cy="0" r="12" fill="url(#rimGrad)" />
                  <circle cx="0" cy="0" r="4.5" fill="#222" stroke="#fff" strokeWidth="1" />
                  {/* 5 Spoke lines */}
                  <line x1="0" y1="-12" x2="0" y2="12" stroke="#fff" strokeWidth="1.8" />
                  <line x1="-11.4" y1="-3.7" x2="11.4" y2="3.7" stroke="#fff" strokeWidth="1.8" />
                  <line x1="-7" y1="9.7" x2="7" y2="-9.7" stroke="#fff" strokeWidth="1.8" />
                  <line x1="7" y1="9.7" x2="-7" y2="-9.7" stroke="#fff" strokeWidth="1.8" />
                  <line x1="-11.4" y1="3.7" x2="11.4" y2="-3.7" stroke="#fff" strokeWidth="1.8" />
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* Road Asphalt Layer */}
        <div className={styles.road}>
          {/* Moving Dashed White Center Line */}
          <div className={styles.laneMarkings} />
          {/* Road Bottom Red/White Safety Curb */}
          <div className={styles.roadCurb} />
        </div>
      </div>

      {/* Interactive Speed & Boost Controls Bar */}
      <div className={styles.controlsBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "11px", color: "var(--color-slate)", textTransform: "uppercase", fontWeight: 700 }}>
            Drive Mode:
          </span>
          <div className={styles.modeButtonGroup}>
            {(["city", "highway", "turbo"] as SpeedMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ""}`}
              >
                {m === "city" && "🟢"}
                {m === "highway" && "⚡"}
                {m === "turbo" && "🔥"}
                <span>{MODES[m].label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={styles.boostBtn}
          onMouseDown={() => setIsBoosting(true)}
          onMouseUp={() => setIsBoosting(false)}
          onMouseLeave={() => setIsBoosting(false)}
          onTouchStart={() => setIsBoosting(true)}
          onTouchEnd={() => setIsBoosting(false)}
        >
          <Flame size={14} />
          <span>Hold for Nitro Boost</span>
        </button>
      </div>
    </div>
  );
}
