"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MapPin, Menu, X, Moon, Sun, ShoppingCart, User, ChevronDown, Check, Phone } from "lucide-react";
import { useCart } from "@/lib/cart/CartContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { getAssetPath } from "@/lib/assets";
import { useCity, useSavedCars } from "@/lib/listings/storage";
import { CITIES } from "@/lib/listings/listing";
import styles from "./WowCarsHeader.module.css";

const NAV = [
  { href: "/cars", label: "Buy", match: ["/cars", "/dealers"] },
  { href: "/sell", label: "Sell", match: ["/sell"] },
  { href: "/#finance", label: "Finance (EMI)", match: [] as string[] },
  { href: "/service-centres", label: "Service", match: ["/service-centres"] },
  { href: "/spare-parts", label: "Spare Parts", match: ["/spare-parts"] },
];

export default function WowCarsHeader() {
  const pathname = usePathname() || "/";
  const { itemCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { city, setCity } = useCity();
  const { saved } = useSavedCars();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!cityOpen) return;
    const close = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [cityOpen]);

  const path = pathname.replace(/^\/WowCars/, "") || "/";
  const isActive = (m: string[]) => m.some((p) => path === p || path.startsWith(`${p}/`));

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <button
          type="button"
          className={styles.menuBtn}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link href="/" className={styles.logo} aria-label="WowCars home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getAssetPath("/wowcars-logo.png")} alt="WowCars" width={118} height={42} className="theme-logo-dark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getAssetPath("/wowcars-logo-light.png")} alt="WowCars" width={112} height={43} className="theme-logo-light" />
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.label} href={n.href} className={`${styles.navLink} ${isActive(n.match) ? styles.navActive : ""}`}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <div className={styles.cityWrap} ref={cityRef}>
            <button
              type="button"
              className={styles.cityChip}
              aria-haspopup="listbox"
              aria-expanded={cityOpen}
              onClick={() => setCityOpen((v) => !v)}
            >
              <MapPin size={15} />
              <span>{city}</span>
              <ChevronDown size={14} />
            </button>
            {cityOpen && (
              <ul className={styles.cityMenu} role="listbox" aria-label="Choose your city">
                {CITIES.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={c === city}
                      className={styles.cityOption}
                      onClick={() => {
                        setCity(c);
                        setCityOpen(false);
                      }}
                    >
                      {c}
                      {c === city && <Check size={14} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link href="/cars?saved=1" className={styles.iconBtn} aria-label={`Saved cars (${saved.length})`}>
            <Heart size={19} />
            {saved.length > 0 && <span className={styles.count}>{saved.length}</span>}
          </Link>

          <Link href="/spare-parts/cart" className={`${styles.iconBtn} ${styles.hideSm}`} aria-label={`Parts cart (${itemCount})`}>
            <ShoppingCart size={19} />
            {itemCount > 0 && <span className={styles.count}>{itemCount}</span>}
          </Link>

          <button type="button" className={`${styles.iconBtn} ${styles.hideSm}`} onClick={toggleTheme} aria-label="Toggle colour theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link href="/my-account" className={`${styles.iconBtn} ${styles.hideSm}`} aria-label="My account">
            <User size={19} />
          </Link>

          <Link href="/sell" className={`btn btn-primary btn-sm ${styles.sellCta}`}>
            Sell your car
          </Link>
        </div>
      </div>

      {menuOpen && (
        <div className={styles.sheet} role="dialog" aria-label="Menu">
          <nav className={styles.sheetNav} aria-label="Mobile">
            {NAV.map((n) => (
              <Link key={n.label} href={n.href} className={styles.sheetLink} onClick={() => setMenuOpen(false)}>
                {n.label}
              </Link>
            ))}
            <div className={styles.sheetDivider} />
            <Link href="/cars?saved=1" className={styles.sheetLinkSm} onClick={() => setMenuOpen(false)}>
              Saved cars {saved.length > 0 ? `(${saved.length})` : ""}
            </Link>
            <Link href="/my-account" className={styles.sheetLinkSm} onClick={() => setMenuOpen(false)}>My account</Link>
            <Link href="/spare-parts/cart" className={styles.sheetLinkSm} onClick={() => setMenuOpen(false)}>
              Parts cart {itemCount > 0 ? `(${itemCount})` : ""}
            </Link>
            <Link href="/franchise" className={styles.sheetLinkSm} onClick={() => setMenuOpen(false)}>Franchise</Link>
            <Link href="/about" className={styles.sheetLinkSm} onClick={() => setMenuOpen(false)}>About</Link>
            <Link href="/contact" className={styles.sheetLinkSm} onClick={() => setMenuOpen(false)}>Contact</Link>
            <Link href="/seller" className={styles.sheetLinkSm} onClick={() => setMenuOpen(false)}>Seller login</Link>
            <button type="button" className={styles.sheetLinkSm} onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} {theme === "dark" ? "Light" : "Dark"} theme
            </button>
          </nav>
          <div className={styles.sheetFoot}>
            <a href="tel:+919019088160" className="btn btn-secondary btn-full">
              <Phone size={16} /> Call +91 90190 88160
            </a>
            <Link href="/sell" className="btn btn-primary btn-full" onClick={() => setMenuOpen(false)}>
              Sell your car
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
