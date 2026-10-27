"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, MapPin, MessageCircle, Shield, ChevronRight } from "lucide-react";
import styles from "./Footer.module.css";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState(2025);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className={styles.footer}>
      <div className="container">
        {/* Top Band */}
        <div className={styles.topBand}>
          <div className={styles.brandCol}>
            <Image
              src="/wowcars-logo.jpg"
              alt="WOwCars"
              width={140}
              height={48}
              className={styles.logo}
            />
            <p className={styles.tagline}>Pre-Owned Cars You Can Trust</p>
            <p className={styles.desc}>
              Bengaluru&apos;s most trusted platform for verified pre-owned cars.
              Direct seller contact, transparent pricing, no middlemen.
            </p>
            <div className={styles.trustBadges}>
              <span className="badge badge-green">
                <Shield size={10} /> Verified Listings
              </span>
              <span className="badge badge-dark">
                ₹0 Buyer Commission
              </span>
            </div>
          </div>

          <div className={styles.linksCol}>
            <h3 className={styles.colTitle}>Browse Cars</h3>
            <ul className={styles.linkList}>
              {["Used Cars in Bengaluru", "SUVs under ₹15 Lakhs", "Hatchbacks under ₹8 Lakhs", "1st Owner Cars", "Automatic Transmissions", "CNG Cars Bengaluru"].map((item) => (
                <li key={item}>
                  <Link href="/cars" className={styles.footerLink}>
                    <ChevronRight size={12} />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.linksCol}>
            <h3 className={styles.colTitle}>Services</h3>
            <ul className={styles.linkList}>
              {["Sell Your Car Free", "Verified Dealer Network", "Car Loan Assistance", "Vehicle Insurance", "150-Point Inspection", "WOwCars City Partner"].map((item) => (
                <li key={item}>
                  <Link href="/#services" className={styles.footerLink}>
                    <ChevronRight size={12} />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.contactCol}>
            <h3 className={styles.colTitle}>Contact WOwCars</h3>
            <div className={styles.contactItems}>
              <a href="tel:+919019088160" className={styles.contactItem}>
                <Phone size={16} className={styles.contactIcon} />
                <div>
                  <div className={styles.contactLabel}>Call / WhatsApp</div>
                  <div className={styles.contactValue}>+91 901 908 8160</div>
                </div>
              </a>
              <div className={styles.contactItem}>
                <MapPin size={16} className={styles.contactIcon} />
                <div>
                  <div className={styles.contactLabel}>Pilot Market</div>
                  <div className={styles.contactValue}>Bengaluru - 64, Karnataka</div>
                </div>
              </div>
            </div>
            <a
              href="https://wa.me/919019088160?text=Hi%20WOwCars!%20I%20need%20help%20finding%20a%20car."
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-full"
              style={{ marginTop: "1rem" }}
            >
              <MessageCircle size={16} />
              Chat with Us on WhatsApp
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            © {currentYear} WOwCars. All Rights Reserved. | Bengaluru, Karnataka, India
          </p>
          <div className={styles.legalLinks}>
            <Link href="/privacy" className={styles.legalLink}>Privacy Policy</Link>
            <span>·</span>
            <Link href="/terms" className={styles.legalLink}>Terms of Use</Link>
            <span>·</span>
            <Link href="/sitemap.xml" className={styles.legalLink}>Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
