"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  X,
  Phone,
  Wrench,
  ShoppingCart,
  User,
  Zap,
  ChevronDown,
  Car,
  Truck,
  Bike,
  Shield,
  Building2,
  Info,
  HelpCircle,
} from "lucide-react";
import styles from "./WowCarsHeader.module.css";
import { useCart } from "@/lib/cart/CartContext";
import { getAssetPath } from "@/lib/assets";

export default function WowCarsHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [vehiclesDropdownOpen, setVehiclesDropdownOpen] = useState(false);
  const { itemCount } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      {/* Top Utility Announcement Bar */}
      <div className={styles.topBar}>
        <div className={`container ${styles.topBarInner}`}>
          <div className={styles.topBarLeft}>
            <span className={styles.liveDot} />
            <span className={styles.topStatusText}>
              Bengaluru Pilot Hub: Koramangala & Yelahanka Experience Outlets Active
            </span>
          </div>
          <div className={styles.topBarRight}>
            <Link href="/about" className={styles.topLink}>
              About Us
            </Link>
            <span className={styles.divider}>·</span>
            <Link href="/contact" className={styles.topLink}>
              Support & Contact
            </Link>
            <span className={styles.divider}>·</span>
            <Link href="/franchise" className={styles.topLink}>
              Franchise
            </Link>
            <span className={styles.divider}>·</span>
            <Link href="/seller" className={styles.topLink}>
              B2B Portal
            </Link>
            <span className={styles.divider}>·</span>
            <a href="tel:+919019088160" className={`${styles.topLink} ${styles.topPhone}`}>
              <Phone size={11} />
              <span>+91 901 908 8160</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className={`container ${styles.inner}`}>
        {/* Official Brand Logo */}
        <Link href="/" className={styles.logo} aria-label="WowCars Home">
          <Image
            src={getAssetPath("/wowcars-logo.png")}
            alt="WowCars — Pre-Owned Cars You Can Trust"
            width={140}
            height={44}
            priority
            className={styles.logoImg}
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {/* Vehicles Dropdown */}
          <div
            className={styles.navItemDropdown}
            onMouseEnter={() => setVehiclesDropdownOpen(true)}
            onMouseLeave={() => setVehiclesDropdownOpen(false)}
          >
            <Link href="/cars" className={styles.navLink}>
              <span>Browse Cars</span>
              <ChevronDown size={14} className={styles.dropdownChevron} />
            </Link>

            {vehiclesDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <Link
                  href="/cars?category=CAR"
                  className={styles.dropdownItem}
                  onClick={() => setVehiclesDropdownOpen(false)}
                >
                  <div className={styles.dropIcon}>
                    <Car size={16} />
                  </div>
                  <div>
                    <div className={styles.dropTitle}>Passenger Cars</div>
                    <div className={styles.dropDesc}>Hatchbacks, Sedans, Luxury SUVs</div>
                  </div>
                </Link>

                <Link
                  href="/cars?fuel=Electric"
                  className={styles.dropdownItem}
                  onClick={() => setVehiclesDropdownOpen(false)}
                >
                  <div className={`${styles.dropIcon} ${styles.evDropIcon}`}>
                    <Zap size={16} />
                  </div>
                  <div>
                    <div className={styles.dropTitle}>Electric Vehicles</div>
                    <div className={styles.dropDesc}>EV Cars & 2W · Certified Battery SoH</div>
                  </div>
                </Link>

                <Link
                  href="/cars?category=COMMERCIAL"
                  className={styles.dropdownItem}
                  onClick={() => setVehiclesDropdownOpen(false)}
                >
                  <div className={styles.dropIcon}>
                    <Truck size={16} />
                  </div>
                  <div>
                    <div className={styles.dropTitle}>Commercial Vehicles</div>
                    <div className={styles.dropDesc}>Tata Ace, Pickups, Fleet Logistics</div>
                  </div>
                </Link>

                <Link
                  href="/cars?category=TWO_WHEELER"
                  className={styles.dropdownItem}
                  onClick={() => setVehiclesDropdownOpen(false)}
                >
                  <div className={styles.dropIcon}>
                    <Bike size={16} />
                  </div>
                  <div>
                    <div className={styles.dropTitle}>Two-Wheelers</div>
                    <div className={styles.dropDesc}>Bikes & Electric Scooters</div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          <Link href="/sell" className={styles.navLink}>
            Sell Your Car
          </Link>

          <Link href="/spare-parts" className={`${styles.navLink} ${styles.partsHighlightLink}`}>
            <Wrench size={14} />
            <span>Spare Parts</span>
            <span className={styles.navBadge}>PAN-INDIA</span>
          </Link>

          <Link href="/service-centres" className={styles.navLink}>
            Garage Services
          </Link>

          <Link href="/franchise" className={styles.navLink}>
            Franchise
          </Link>
        </nav>

        {/* Action Controls */}
        <div className={styles.actions}>
          {/* Cart */}
          <Link href="/spare-parts/cart" className={styles.cartBtn} aria-label="Shopping Cart">
            <ShoppingCart size={18} />
            {itemCount > 0 && <span className={styles.cartBadge}>{itemCount}</span>}
          </Link>

          {/* Customer Garage */}
          <Link
            href="/my-account"
            className={styles.garageBtn}
            aria-label="My Garage & Account"
          >
            <User size={15} />
            <span>My Garage</span>
          </Link>

          {/* Sell CTA */}
          <Link href="/sell" className={styles.sellBtn}>
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

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className={styles.mobileMenu} role="dialog" aria-label="Mobile navigation">
          <nav className={styles.mobileNav}>
            <div className={styles.mobileGroupTitle}>Vehicles</div>
            <Link href="/cars" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              <Car size={16} /> All Used Cars
            </Link>
            <Link
              href="/cars?fuel=Electric"
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              <Zap size={16} style={{ color: "#34D399" }} /> Electric Vehicles
            </Link>
            <Link
              href="/cars?category=COMMERCIAL"
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              <Truck size={16} /> Commercial & Fleets
            </Link>
            <Link
              href="/cars?category=TWO_WHEELER"
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              <Bike size={16} /> Two-Wheelers
            </Link>
            <Link href="/sell" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              + Sell Your Car Free
            </Link>

            <div className={styles.mobileGroupTitle}>Services & Spares</div>
            <Link
              href="/spare-parts"
              className={`${styles.mobileLink} ${styles.partsHighlightLink}`}
              onClick={() => setMenuOpen(false)}
            >
              <Wrench size={16} />
              <span>Spare Parts & Store</span>
              <span className={styles.navBadge}>PAN-India</span>
            </Link>
            <Link
              href="/service-centres"
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              <Shield size={16} /> Garage Services & Inspection
            </Link>
            <Link href="/franchise" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              <Building2 size={16} /> Franchise & Store Opportunity
            </Link>

            <div className={styles.mobileGroupTitle}>Account & Corporate</div>
            <Link href="/spare-parts/cart" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              <ShoppingCart size={16} /> Cart {itemCount > 0 ? `(${itemCount})` : ""}
            </Link>
            <Link href="/my-account" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              <User size={16} /> My Garage & Appointments
            </Link>
            <Link href="/seller" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              B2B Wholesale & Supplier Portal
            </Link>
            <Link href="/about" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              <Info size={16} /> About WowCars
            </Link>
            <Link href="/contact" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              <HelpCircle size={16} /> Contact & Support
            </Link>

            <hr className="divider" style={{ margin: "0.75rem 0" }} />

            <a
              href="tel:+919019088160"
              className="btn btn-ghost btn-full"
              onClick={() => setMenuOpen(false)}
            >
              <Phone size={16} /> +91 901 908 8160
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
