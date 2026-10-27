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

      {/* Results */}
      <div className={styles.results}>
        <div className={styles.emiDisplay}>
          <IndianRupee size={20} className={styles.rupeeIcon} />
          <span className={styles.emiAmount}>
            {monthlyEMI.toLocaleString("en-IN")}
          </span>
          <span className={styles.emiLabel}>/month</span>
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
        </div>
      </div>

      <p className={styles.disclaimer}>
        * EMI is indicative based on reducing balance formula. Actual rate depends on your bank, credit score & terms.
        Contact us for bank loan assistance — <strong>+91 901 908 8160</strong>
      </p>
    </div>
  );
}
