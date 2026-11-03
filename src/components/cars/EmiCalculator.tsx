"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { calculateEMI } from "@/lib/formatters";
import { priceShort, rupees } from "@/lib/listings/listing";
import styles from "./EmiCalculator.module.css";

interface EmiCalculatorProps {
  carPrice: number;
  /** Lets the buyer change the car price too (used on the home page). */
  editablePrice?: boolean;
  title?: string;
}

const TENURES = [12, 24, 36, 48, 60, 72, 84];

export default function EmiCalculator({ carPrice, editablePrice = false, title = "EMI calculator" }: EmiCalculatorProps) {
  const [price, setPrice] = useState(carPrice);
  const [downPct, setDownPct] = useState(20);
  const [tenure, setTenure] = useState(60);
  const [rate, setRate] = useState(10);

  const downPayment = Math.round((price * downPct) / 100);
  const loanAmount = Math.max(0, price - downPayment);
  const monthlyEMI = calculateEMI(loanAmount, rate, tenure);
  const totalInterest = Math.max(0, monthlyEMI * tenure - loanAmount);
  const totalCost = downPayment + monthlyEMI * tenure;
  const interestShare = totalCost > 0 ? Math.round((totalInterest / totalCost) * 100) : 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.note}>Estimate</span>
      </div>

      <div className={styles.result}>
        <span className={styles.emiAmount}>{rupees(monthlyEMI)}</span>
        <span className={styles.emiLabel}>/month for {tenure} months</span>
      </div>

      <div className={styles.grid}>
        {editablePrice && (
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label htmlFor="emi-price" className={styles.label}>Car price</label>
              <span className={styles.value}>{priceShort(price)}</span>
            </div>
            <input id="emi-price" type="range" min={200000} max={3000000} step={25000} value={price}
              onChange={(e) => setPrice(Number(e.target.value))} className={styles.slider} />
          </div>
        )}

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="emi-down" className={styles.label}>Down payment ({downPct}%)</label>
            <span className={styles.value}>{rupees(downPayment)}</span>
          </div>
          <input id="emi-down" type="range" min={0} max={90} step={5} value={downPct}
            onChange={(e) => setDownPct(Number(e.target.value))} className={styles.slider} />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Tenure</span>
          <div className={styles.pills} role="group" aria-label="Loan tenure">
            {TENURES.map((m) => (
              <button key={m} type="button" aria-pressed={tenure === m} onClick={() => setTenure(m)} className={styles.pill}>
                {m / 12} yr
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="emi-rate" className={styles.label}>Interest rate</label>
            <span className={styles.value}>{rate.toFixed(1)}% p.a.</span>
          </div>
          <input id="emi-rate" type="range" min={7} max={18} step={0.25} value={rate}
            onChange={(e) => setRate(Number(e.target.value))} className={styles.slider} />
        </div>
      </div>

      <dl className={styles.breakdown}>
        <div><dt>Loan amount</dt><dd>{rupees(loanAmount)}</dd></div>
        <div><dt>Total interest</dt><dd>{rupees(totalInterest)}</dd></div>
        <div><dt>Total cost of car</dt><dd>{rupees(totalCost)}</dd></div>
      </dl>
      <div className={styles.bar} aria-hidden="true">
        <span style={{ width: `${100 - interestShare}%` }} />
      </div>
      <p className={styles.barLegend}>
        <span>Principal + down payment {100 - interestShare}%</span>
        <span>Interest {interestShare}%</span>
      </p>

      <a
        href={`https://wa.me/919019088160?text=${encodeURIComponent(
          `Hi WowCars! I'd like car-loan options for about ${rupees(monthlyEMI)}/month (${priceShort(price)} car, ${tenure} months).`,
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary btn-full"
      >
        <MessageCircle size={16} /> Get loan offers on WhatsApp
      </a>

      <p className={styles.disclaimer}>
        Indicative, reducing-balance EMI. Your rate depends on the lender and your credit profile. Insurance and RTO transfer fees are extra.
      </p>
    </div>
  );
}
