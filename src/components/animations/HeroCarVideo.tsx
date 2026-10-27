"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, Zap, Gauge, Compass, ShieldCheck } from "lucide-react";
import styles from "./HeroCarVideo.module.css";

interface ChannelConfig {
  id: string;
  label: string;
  icon: string;
  videoSrc: string;
  defaultSpeed: number;
  gear: string;
  tag: string;
  loopRange?: { start: number; end: number };
}

const CHANNELS: ChannelConfig[] = [
  {
    id: "left-to-right",
    label: "Left → Right Sprint",
    icon: "⚡",
    videoSrc: "/videos/trailer1.mp4",
    defaultSpeed: 172,
    gear: "D7",
    tag: "HIGH SPEED SPRINT",
    loopRange: { start: 10.2, end: 15.2 },
  },
  {
    id: "highway",
    label: "Highway Cruise (Red 720S)",
    icon: "🛣️",
    videoSrc: "/videos/trailer2.mp4",
    defaultSpeed: 124,
    gear: "D6",
    tag: "PAN-INDIA EXPRESSWAY",
  },
  {
    id: "showroom",
    label: "Showroom 360° (Crimson Red)",
    icon: "🔄",
    videoSrc: "/videos/car3.mp4",
    defaultSpeed: 0,
    gear: "P",
    tag: "WOWCARS 360 INSPECTION",
  },
  {
    id: "track",
    label: "Track Battle",
    icon: "🏁",
    videoSrc: "/videos/trailer3.mp4",
    defaultSpeed: 215,
    gear: "D7",
    tag: "V8 TWIN-TURBO APEX",
  },
];

export default function HeroCarVideo() {
  const [activeChannelId, setActiveChannelId] = useState("left-to-right");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isZoomLoop, setIsZoomLoop] = useState(true);
  const [currentSpeed, setCurrentSpeed] = useState(172);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeChannel = CHANNELS.find((c) => c.id === activeChannelId) || CHANNELS[0];

  // Dynamically fluctuate speedometer around target speed for realistic HUD telemetry
  useEffect(() => {
    if (!isPlaying || activeChannel.defaultSpeed === 0) {
      setCurrentSpeed(activeChannel.defaultSpeed);
      return;
    }
    const interval = setInterval(() => {
      const variation = Math.floor(Math.random() * 7) - 3;
      setCurrentSpeed(activeChannel.defaultSpeed + variation);
    }, 450);
    return () => clearInterval(interval);
  }, [isPlaying, activeChannel.defaultSpeed]);

  // Handle switching channels
  const handleSelectChannel = (channel: ChannelConfig) => {
    setActiveChannelId(channel.id);
    if (channel.id === "left-to-right") {
      setIsZoomLoop(true);
    } else {
      setIsZoomLoop(false);
    }
    if (videoRef.current) {
      videoRef.current.currentTime = channel.loopRange && channel.id === "left-to-right" ? channel.loopRange.start : 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Keep looping specific left-to-right horizontal racing range if zoomLoop is active
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (activeChannel.id === "left-to-right" && isZoomLoop && activeChannel.loopRange) {
      const { start, end } = activeChannel.loopRange;
      if (video.currentTime < start || video.currentTime >= end) {
        video.currentTime = start;
        video.play().catch(() => {});
      }
    }
  }, [activeChannel, isZoomLoop]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!document.fullscreenElement) {
      video.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Attempt initial autoplay on mount
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (activeChannel.loopRange && activeChannel.id === "left-to-right") {
        video.currentTime = activeChannel.loopRange.start;
      }
      video.play().catch(() => {});
    }
  }, [activeChannel.id]);

  return (
    <div className={styles.videoContainer}>
      {/* 21:9 Widescreen Video Frame */}
      <div className={styles.videoFrame} onClick={togglePlay} role="region" aria-label="Car moving video preview">
        <video
          ref={videoRef}
          key={activeChannel.videoSrc}
          src={activeChannel.videoSrc}
          className={styles.videoElement}
          autoPlay
          loop={!isZoomLoop}
          muted={isMuted}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Edge Vignette & Scanline Filters */}
        <div className={styles.vignetteOverlay} />
        <div className={styles.subtleScanline} />

        {/* Top Telemetry HUD Overlay */}
        <div className={styles.hudTopBar}>
          <div className={styles.hudBadge}>
            <span className={styles.radarDot} />
            <span>WOwCars Live Drive • {activeChannel.tag}</span>
          </div>

          <div className={styles.hudTelemetry}>
            {activeChannel.defaultSpeed > 0 && (
              <div className={styles.telemetryPill}>
                <Gauge size={13} style={{ color: "#E50914" }} />
                <span className={styles.telemetrySpeed}>{currentSpeed}</span>
                <span style={{ fontSize: "10px", color: "#a1a1aa" }}>KM/H</span>
              </div>
            )}
            <div className={styles.telemetryPill}>
              <span style={{ color: "#10B981", fontSize: "10px" }}>GEAR</span>
              <span>{activeChannel.gear}</span>
            </div>
          </div>
        </div>

        {/* Center Hover Play/Pause Overlay */}
        <button
          type="button"
          className={`${styles.centerOverlayBtn} ${!isPlaying ? styles.centerOverlayBtnVisible : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 3 }} />}
        </button>
      </div>

      {/* Bottom Controls & Channel Switcher Bar */}
      <div className={styles.bottomControls}>
        {/* Drive Channel Tabs */}
        <div className={styles.channelButtonGroup} role="tablist" aria-label="Automotive video modes">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              role="tab"
              aria-selected={activeChannelId === ch.id}
              className={`${styles.channelBtn} ${activeChannelId === ch.id ? styles.channelBtnActive : ""}`}
              onClick={() => handleSelectChannel(ch)}
            >
              <span>{ch.icon}</span>
              <span>{ch.label}</span>
            </button>
          ))}
        </div>

        {/* Action Toggles */}
        <div className={styles.rightControls}>
          {activeChannel.id === "left-to-right" && (
            <button
              type="button"
              className={`${styles.actionIconBtn} ${isZoomLoop ? styles.actionIconBtnActive : ""}`}
              onClick={() => {
                const nextState = !isZoomLoop;
                setIsZoomLoop(nextState);
                if (videoRef.current && nextState && activeChannel.loopRange) {
                  videoRef.current.currentTime = activeChannel.loopRange.start;
                }
              }}
              title="Loop Left to Right Drive Sprint"
            >
              <Zap size={13} />
              <span>{isZoomLoop ? "Left → Right (Looping)" : "Full Video"}</span>
            </button>
          )}

          <button
            type="button"
            className={styles.actionIconBtn}
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute engine sound" : "Mute audio"}
            title={isMuted ? "Click to hear engine sound" : "Mute audio"}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} style={{ color: "#E50914" }} />}
            <span>{isMuted ? "Sound Off" : "Engine Audio On"}</span>
          </button>

          <button
            type="button"
            className={styles.actionIconBtn}
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            title="Expand Fullscreen"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
