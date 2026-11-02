"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import type { Listing } from "@/lib/listings/listing";
import { regStateOf } from "@/lib/listings/listing";
import {
  allFacetCounts, bucketsFor, BODY_OPTIONS, DEAL_OPTIONS, FUEL_OPTIONS, KM_OPTIONS, OWNER_OPTIONS,
  SELLER_OPTIONS, TRANSMISSION_OPTIONS, YEAR_OPTIONS, type SearchFilters,
} from "@/lib/listings/filters";
import styles from "./FilterPanel.module.css";

interface Props {
  cars: Listing[];
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
}

type ListKey = "makes" | "models" | "fuels" | "transmissions" | "bodies" | "owners" | "regStates" | "deals" | "sellerTypes" | "cities";

export default function FilterPanel({ cars, filters: f, onChange }: Props) {
  const counts = useMemo(() => allFacetCounts(cars, f), [cars, f]);

  const toggle = (key: ListKey, id: string) => {
    const cur = f[key] as string[];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    const update: SearchFilters = { ...f, [key]: next } as SearchFilters;
    // Dropping a make also drops its models.
    if (key === "makes" && cur.includes(id)) {
      const modelsOfMake = new Set(cars.filter((c) => c.make === id).map((c) => c.model));
      update.models = f.models.filter((m) => !modelsOfMake.has(m));
    }
    onChange(update);
  };

  const makes = uniq(cars.map((c) => c.make)).sort();
  const models = uniq(cars.filter((c) => !f.makes.length || f.makes.includes(c.make)).map((c) => c.model)).sort();
  const states = uniq(cars.map((c) => regStateOf(c))).sort();
  const cities = uniq(cars.map((c) => c.city)).sort();
  const buckets = bucketsFor(f.budgetMode);

  const checkList = (key: ListKey, options: { id: string; label: string }[], countMap: Record<string, number>) => (
    <ul className={styles.options}>
      {options.map((o) => {
        const checked = (f[key] as string[]).includes(o.id);
        const n = countMap[o.id] || 0;
        return (
          <li key={o.id}>
            <label className={`${styles.option} ${!checked && n === 0 ? styles.optionEmpty : ""}`}>
              <input type="checkbox" checked={checked} onChange={() => toggle(key, o.id)} />
              <span className={styles.optLabel}>{o.label}</span>
              <span className={styles.optCount}>{n}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );

  const radioList = (
    name: string,
    value: string,
    options: { id: string; label: string }[],
    countMap: Record<string, number>,
    set: (v: string) => void,
  ) => (
    <ul className={styles.options}>
      {options.map((o) => {
        const n = countMap[o.id] || 0;
        return (
          <li key={o.id}>
            <label className={`${styles.option} ${value !== o.id && n === 0 ? styles.optionEmpty : ""}`}>
              <input type="radio" name={name} checked={value === o.id} onChange={() => set(o.id)} onClick={() => value === o.id && set("")} />
              <span className={styles.optLabel}>{o.label}</span>
              <span className={styles.optCount}>{n}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className={styles.panel}>
      <Section title="Make & model" open badge={f.makes.length + f.models.length}>
        {checkList("makes", makes.map((m) => ({ id: m, label: m })), counts.makes)}
        {f.makes.length > 0 && (
          <>
            <p className={styles.sub}>Model</p>
            {checkList("models", models.map((m) => ({ id: m, label: m })), counts.models)}
          </>
        )}
      </Section>

      <Section title="Budget" open badge={f.budget ? 1 : 0}>
        <div className={styles.toggle} role="group" aria-label="Budget type">
          <button type="button" aria-pressed={f.budgetMode === "price"} onClick={() => onChange({ ...f, budgetMode: "price", budget: "" })}>
            Price
          </button>
          <button type="button" aria-pressed={f.budgetMode === "emi"} onClick={() => onChange({ ...f, budgetMode: "emi", budget: "" })}>
            EMI / month
          </button>
        </div>
        {radioList("budget", f.budget, buckets, counts.budget, (v) => onChange({ ...f, budget: v }))}
        {f.budgetMode === "emi" && <p className={styles.note}>EMI at 20% down, 10% p.a., 60 months.</p>}
      </Section>

      <Section title="Year" badge={f.year ? 1 : 0}>
        {radioList("year", f.year, YEAR_OPTIONS, counts.year, (v) => onChange({ ...f, year: v }))}
      </Section>

      <Section title="Kilometres driven" badge={f.km ? 1 : 0}>
        {radioList("km", f.km, KM_OPTIONS, counts.km, (v) => onChange({ ...f, km: v }))}
      </Section>

      <Section title="Fuel" open badge={f.fuels.length}>
        {checkList("fuels", FUEL_OPTIONS, counts.fuels)}
      </Section>

      <Section title="Transmission" open badge={f.transmissions.length}>
        {checkList("transmissions", TRANSMISSION_OPTIONS, counts.transmissions)}
      </Section>

      <Section title="Body type" badge={f.bodies.length}>
        {checkList("bodies", BODY_OPTIONS, counts.bodies)}
      </Section>

      <Section title="Owners" badge={f.owners.length}>
        {checkList("owners", OWNER_OPTIONS, counts.owners)}
      </Section>

      <Section title="Registration state" badge={f.regStates.length}>
        {checkList("regStates", states.map((s) => ({ id: s, label: s })), counts.regStates)}
        <p className={styles.note}>Cars registered in another state need an NOC and re-registration.</p>
      </Section>

      <Section title="WowPrice rating" badge={f.deals.length}>
        {checkList("deals", DEAL_OPTIONS, counts.deals)}
        <p className={styles.note}>An estimate vs. similar cars. Sellers can&apos;t buy or change it.</p>
      </Section>

      <Section title="Seller" badge={f.sellerTypes.length + (f.inspected ? 1 : 0)}>
        {checkList("sellerTypes", SELLER_OPTIONS, counts.sellerTypes)}
        <label className={`${styles.option} ${styles.switchRow}`}>
          <input type="checkbox" checked={f.inspected} onChange={() => onChange({ ...f, inspected: !f.inspected })} />
          <span className={styles.optLabel}>WowCars-inspected only</span>
          <span className={styles.optCount}>{counts.inspected.yes || 0}</span>
        </label>
      </Section>

      <Section title="City" badge={f.cities.length}>
        {checkList("cities", cities.map((c) => ({ id: c, label: c })), counts.cities)}
      </Section>
    </div>
  );
}

function Section({ title, children, open, badge }: { title: string; children: React.ReactNode; open?: boolean; badge?: number }) {
  return (
    <details className={styles.section} open={open}>
      <summary className={styles.summary}>
        <span>
          {title}
          {badge ? <span className={styles.badge}>{badge}</span> : null}
        </span>
        <ChevronDown size={16} className={styles.chev} />
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}

function uniq<T>(a: T[]): T[] {
  return Array.from(new Set(a));
}
