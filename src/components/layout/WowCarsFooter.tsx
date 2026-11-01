"use client";

import Link from "next/link";
import Image from "next/image";
import { Phone, MapPin, MessageCircle, ShieldCheck, ChevronRight, Zap } from "lucide-react";
import styles from "./WowCarsFooter.module.css";
import { getAssetPath } from "@/lib/assets";

export default function WowCarsFooter() {
  const currentYear = 2026;

  return (
    <footer className={styles.footer}>
      <div className="container">
        {/* Top Brand & Links Grid */}
        <div className={styles.topGrid}>
          {/* Brand Intro Column */}
          <div className={styles.brandCol}>
            <Image
              src={getAssetPath("/wowcars-logo.png")}
              alt="WowCars — Pre-Owned Cars You Can Trust"
              width={140}
              height={50}
              className={styles.logo}
            />
            <p className={styles.tagline}>Pre-Owned Cars You Can Trust</p>
            <p className={styles.desc}>
              India&apos;s premier hybrid automotive ecosystem — verified pre-owned cars,
              high-voltage EV diagnostic hubs, genuine spare parts marketplace, and authorized
              franchise workshops across Bengaluru and PAN-India.
            </p>
            <div className={styles.trustBadges}>
              <span className={styles.trustBadge}>
                <ShieldCheck size={13} className={styles.badgeRed} />
                <span>140-Point Inspection</span>
              </span>
              <span className={styles.trustBadge}>
                <Zap size={13} className={styles.badgeGreen} />
                <span>EV Safety Certified</span>
              </span>
            </div>
          </div>

          {/* Column 1: Buy Vehicles */}
          <div className={styles.linksCol}>
            <h3 className={styles.colTitle}>Vehicles Catalog</h3>
            <ul className={styles.linkList}>
              {[
                { title: "Browse All Used Cars", href: "/cars" },
                { title: "Electric Vehicles (EV)", href: "/cars?fuel=Electric" },
                { title: "Commercial Vehicles & Vans", href: "/cars?category=COMMERCIAL" },
                { title: "Two-Wheelers & Scooters", href: "/cars?category=TWO_WHEELER" },
                { title: "Verified Dealer Network", href: "/dealers" },
                { title: "Sell Your Car Free", href: "/sell" },
              ].map((item) => (
                <li key={item.title}>
                  <Link href={item.href} className={styles.footerLink}>
                    <ChevronRight size={12} className={styles.linkChevron} />
                    <span>{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Service & Spares */}
          <div className={styles.linksCol}>
            <h3 className={styles.colTitle}>Service & Spare Parts</h3>
            <ul className={styles.linkList}>
              {[
                { title: "Service Centres & Garages", href: "/service-centres" },
                { title: "High-Voltage EV Diagnostics", href: "/service-centres?filter=ev" },
                { title: "PAN-India Spare Parts", href: "/spare-parts" },
                { title: "Brakes & Suspension", href: "/spare-parts/category/brakes-and-suspension" },
                { title: "Engine & Maintenance", href: "/spare-parts/category/engine-and-maintenance" },
                { title: "Track Spare Part Orders", href: "/my-account/orders" },
              ].map((item) => (
                <li key={item.title}>
                  <Link href={item.href} className={styles.footerLink}>
                    <ChevronRight size={12} className={styles.linkChevron} />
                    <span>{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Corporate & Contact */}
          <div className={styles.contactCol}>
            <h3 className={styles.colTitle}>Bengaluru Hub & Contact</h3>
            <div className={styles.contactItems}>
              <a href="tel:+919019088160" className={styles.contactItem}>
                <Phone size={15} className={styles.contactIcon} />
                <div>
                  <div className={styles.contactLabel}>Direct Hotline</div>
                  <div className={styles.contactValue}>+91 901 908 8160</div>
                </div>
              </a>
              <div className={styles.contactItem}>
                <MapPin size={15} className={styles.contactIcon} />
                <div>
                  <div className={styles.contactLabel}>Operating Hub</div>
                  <div className={styles.contactValue}>Bengaluru - 560064, Karnataka</div>
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/919019088160?text=Hi%20WowCars!%20I%20would%20like%20to%20enquire."
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-full"
              style={{ marginTop: "1rem" }}
            >
              <MessageCircle size={16} />
              <span>WhatsApp Direct Concierge</span>
            </a>

            <div className={styles.extraLinks}>
              <Link href="/franchise" className={styles.extraLink}>
                Franchise Opportunity
              </Link>
              <span>·</span>
              <Link href="/seller" className={styles.extraLink}>
                B2B Seller Portal
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            © {currentYear} WowCars Automotive Platforms. All Rights Reserved. | Pilot Hub: Bengaluru, Karnataka, India
          </p>
          <div className={styles.legalLinks}>
            <Link href="/about" className={styles.legalLink}>About Us</Link>
            <span>·</span>
            <Link href="/contact" className={styles.legalLink}>Contact</Link>
            <span>·</span>
            <Link href="/privacy" className={styles.legalLink}>Privacy Policy</Link>
            <span>·</span>
            <Link href="/terms" className={styles.legalLink}>Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
