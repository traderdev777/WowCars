"use client";

import { ShieldCheck, IndianRupee, Truck, Zap } from "lucide-react";
import styles from "./TrustIndicators.module.css";

export interface TrustItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function TrustIndicators() {
  const items: TrustItem[] = [
    {
      icon: <ShieldCheck size={24} className={styles.icon} />,
      title: "140-Point Inspection",
      description: "Rigorous mechanical, OBD-II & battery diagnostic checks by certified specialists.",
    },
    {
      icon: <IndianRupee size={24} className={styles.icon} />,
      title: "₹0 Buyer Commission",
      description: "Direct transparent pricing from verified sellers with zero hidden middleman fees.",
    },
    {
      icon: <Truck size={24} className={styles.icon} />,
      title: "PAN-India Logistics",
      description: "Fast doorstep delivery across 19,000+ PIN codes with live tracking.",
    },
    {
      icon: <Zap size={24} className={styles.icon} />,
      title: "EV Certified Hubs",
      description: "High-voltage IEC 60900 safety certified facilities for all electric & hybrid models.",
    },
  ];

  return (
    <section className={styles.trustSection}>
      <div className={`container ${styles.container}`}>
        <div className={styles.grid}>
          {items.map((item, idx) => (
            <div key={idx} className={styles.card}>
              <div className={styles.iconBox}>{item.icon}</div>
              <div className={styles.textGroup}>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.description}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
