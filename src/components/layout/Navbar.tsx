"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, Phone } from "lucide-react";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <Link href="/" className={styles.logo} aria-label="WOwCars Home">
          <Image
            src="/wowcars-logo.png"
            alt="WOwCars — Pre-Owned Cars You Can Trust"
            width={140}
            height={48}
            priority
            className={styles.logoImg}
          />
        </Link>

        {/* Desktop Nav */}
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          <Link href="/cars" className={styles.navLink}>Browse Cars</Link>
          <Link href="/dealers" className={styles.navLink}>Dealers</Link>
          <Link href="/sell" className={styles.navLink}>Sell Your Car</Link>
          <Link href="/#services" className={styles.navLink}>Services</Link>
        </nav>

        {/* Desktop Actions */}
        <div className={styles.actions}>
          <a
            href="tel:+919019088160"
            className={`btn btn-ghost btn-sm ${styles.phoneBtn}`}
            aria-label="Call WOwCars"
          >
            <Phone size={14} />
            <span>+91 901 908 8160</span>
          </a>
          <Link href="/sell" className="btn btn-primary btn-sm">
            + List Your Car
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className={styles.mobileMenu} role="dialog" aria-label="Mobile navigation">
          <nav className={styles.mobileNav}>
            <Link href="/cars" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Browse Cars</Link>
            <Link href="/dealers" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Dealers</Link>
            <Link href="/sell"      className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Sell Your Car</Link>
            <Link href="/#services" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Services</Link>
            <hr className="divider" style={{ margin: "0.75rem 0" }} />
            <a
              href="tel:+919019088160"
              className={`btn btn-ghost btn-full`}
              onClick={() => setMenuOpen(false)}
            >
              <Phone size={16} />
              +91 901 908 8160
            </a>
            <Link
              href="/sell"
              className="btn btn-primary btn-full"
              onClick={() => setMenuOpen(false)}
            >
              + List Your Car Free
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
