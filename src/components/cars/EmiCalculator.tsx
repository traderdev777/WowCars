"use client";

import { useState } from "react";
import { Calculator, IndianRupee } from "lucide-react";
import { calculateEMI, formatINR, formatLakhs } from "@/lib/formatters";
import styles from "./EmiCalculator.module.css";

interface EmiCalculatorProps {
  carPrice: number;
}

export default function EmiCalculator({ carPrice }: EmiCalculatorProps) {
  const defaultDown = Math.round(carPrice * 0.2);
  const [downPayment, setDownPayment] = useState(defaultDown);
  const [tenure, setTenure] = useState(60); // months
  const [rate, setRate] = useState(9.5);

  const loanAmount = Math.max(0, carPrice - downPayment);
  const monthlyEMI = calculateEMI(loanAmount, rate, tenure);
  const totalPayable = monthlyEMI * tenure + downPayment;
  const totalInterest = totalPayable - carPrice;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Calculator size={18} className={styles.icon} />
        <h3 className={styles.title}>EMI Calculator</h3>
        <span className={styles.note}>Indicative Only</span>
      </div>

      <div className={styles.grid}>
        {/* Down Payment Slider */}
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="down-payment" className={styles.label}>Down Payment</label>
            <span className={styles.value}>{formatLakhs(downPayment)}</span>
          </div>
          <input
            id="down-payment"
            type="range"
            min={0}
            max={carPrice}
            step={10000}
            value={downPayment}
            onChange={(e) => setDownPayment(Number(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.sliderMinMax}>
            <span>₹0</span>
            <span>{formatLakhs(carPrice)}</span>
          </div>
        </div>

        {/* Tenure Slider */}
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="tenure" className={styles.label}>Loan Tenure</label>
            <span className={styles.value}>{tenure} months ({Math.round(tenure / 12)} yrs)</span>
          </div>
          <input
            id="tenure"
            type="range"
            min={12}
            max={84}
            step={12}
            value={tenure}
            onChange={(e) => setTenure(Number(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.sliderMinMax}>
            <span>1 yr</span>
            <span>7 yrs</span>
          </div>

          <div className={styles.tenurePills}>
            {[
              { m: 12, label: "1 Yr" },
              { m: 24, label: "2 Yrs" },
              { m: 36, label: "3 Yrs" },
              { m: 48, label: "4 Yrs" },
              { m: 60, label: "5 Yrs" },
              { m: 84, label: "7 Yrs" },
            ].map((p) => (
              <button
                key={p.m}
                type="button"
                onClick={() => setTenure(p.m)}
                className={`${styles.tenurePillBtn} ${tenure === p.m ? styles.tenurePillBtnActive : ""}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interest Rate Slider */}
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="interest-rate" className={styles.label}>Interest Rate</label>
            <span className={styles.value}>{rate.toFixed(1)}% p.a.</span>
          </div>
          <input
            id="interest-rate"
            type="range"
            min={7}
            max={18}
            step={0.5}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.sliderMinMax}>
            <span>7%</span>
            <span>18%</span>
          </div>
        </div>
      </div>

      {/* Results with Animated Donut Chart */}
      <div className={styles.results}>
        <div className={styles.emiDisplay}>
          <IndianRupee size={24} className={styles.rupeeIcon} />
          <span className={styles.emiAmount}>
            {monthlyEMI.toLocaleString("en-IN")}
          </span>
          <span className={styles.emiLabel}>/month</span>
        </div>

        <div className={styles.chartAndBreakdown}>
          {/* Animated Donut Chart */}
          <div className={styles.chartWrap}>
            <svg viewBox="0 0 100 100" className={styles.svgDonut}>
              {/* Principal Track (Red) */}
              <circle
                cx="50"
                cy="50"
                r="36"
                className={styles.donutBg}
              />
              {/* Interest Arc (Amber) */}
              <circle
                cx="50"
                cy="50"
                r="36"
                className={styles.donutFill}
                style={{
                  strokeDasharray: 226.2,
                  strokeDashoffset: 226.2 * (1 - Math.min(1, Math.max(0, totalInterest / Math.max(1, totalPayable)))),
                }}
              />
            </svg>
          </div>

          <div className={styles.breakdown}>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>Loan Amount</span>
              <span className={styles.breakdownValue}>{formatINR(loanAmount)}</span>
            </div>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>Total Interest</span>
              <span className={styles.breakdownValue} style={{ color: "var(--color-warning-amber)" }}>
                {formatINR(Math.max(0, totalInterest))}
              </span>
            </div>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>Total Payable</span>
              <span className={styles.breakdownValue} style={{ fontWeight: 700 }}>
                {formatINR(Math.max(0, totalPayable))}
              </span>
            </div>

            <div className={styles.chartLegend}>
              <span><span className={styles.legendDot} style={{ background: "var(--color-primary)" }} /> Principal ({Math.round((loanAmount / Math.max(1, totalPayable)) * 100)}%)</span>
              <span><span className={styles.legendDot} style={{ background: "var(--color-warning-amber)" }} /> Interest ({Math.round((totalInterest / Math.max(1, totalPayable)) * 100)}%)</span>
            </div>
          </div>
        </div>

        <div className={styles.loanActionRow}>
          <a
            href={`https://wa.me/919019088160?text=${encodeURIComponent(
              `Hi WOwCars! I am looking for car loan assistance for an estimated EMI of ₹${monthlyEMI.toLocaleString("en-IN")}/mo.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn ${styles.loanBtn}`}
          >
            Check Pre-Approved Bank Loan Rate via WhatsApp
          </a>
        </div>
      </div>

      <p className={styles.disclaimer}>
        * EMI is indicative based on reducing balance formula. Actual rate depends on your bank, credit score & terms.
      </p>
    </div>
  );
}
