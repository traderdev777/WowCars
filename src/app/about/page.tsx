import { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/common/PageHero";
import TrustIndicators from "@/components/common/TrustIndicators";
import StaffBrandingImage from "@/components/common/StaffBrandingImage";
import CTASection from "@/components/common/CTASection";
import styles from "./About.module.css";
import {
  ShieldCheck, Award, Wrench, Zap, CheckCircle2,
  MapPin, Clock, FileCheck, Users, Sparkles
} from "lucide-react";

export const metadata: Metadata = {
  title: "About WowCars India — Engineering Trust in Automotive Commerce",
  description:
    "Learn about WowCars, India's managed automotive platform. Discover our 140-point certification standard, master multi-brand workshops, genuine spare parts marketplace, and leadership team.",
};

export default function AboutPage() {
  return (
    <div className={styles.pageWrapper}>
      <Navbar />

      <PageHero
        badge="About WowCars India"
        title="Engineering Trust in Pre-Owned Automotive Commerce"
        subtitle="India's first fully-managed automotive platform combining rigorous 140-point vehicle certification, verified multi-brand garage networks, and genuine OEM/OES spare parts."
        stats={[
          { label: "Quality Checks", value: "140 Points" },
          { label: "Customer Rating", value: "4.9 / 5.0" },
          { label: "Network Garages", value: "2 Flagships" },
          { label: "Genuine Spares", value: "10,000+" },
        ]}
        staffImage="/images/staff-representative.jpg"
        staffName="Arjun Sharma"
        staffRole="Chief Inspector & Automotive Specialist"
        staffContext="Leading 140-Point Quality Certification & Customer Delivery"
        primaryAction={{
          label: "Browse Certified Cars",
          href: "/cars",
        }}
        secondaryAction={{
          label: "Locate Service Hubs",
          href: "/service-centres",
        }}
      />

      <TrustIndicators />

      {/* SECTION 1: THE WOWCARS STORY & TECHNICAL INSPECTION */}
      <section className={styles.contentSection}>
        <div className="container">
          <div className={styles.storyGrid}>
            <div className={styles.storyText}>
              <div className={styles.sectionBadge}>
                <Award size={14} /> The WowCars Quality Guarantee
              </div>
              <h3>Why We Inspect What Others Overlook</h3>
              <p>
                Founded on the belief that buying a pre-owned car should feel every bit as rewarding and predictable as driving off a showroom floor, WowCars removes the uncertainty from automotive commerce.
              </p>
              <p>
                Unlike unverified classifieds or broker networks, every single vehicle listed on WowCars undergoes our proprietary 140-Point Digital Inspection conducted by certified specialists. From structural apron integrity and hydraulic brake pressures to high-voltage EV battery pack state-of-health, we reject up to 60% of cars that fail our strict parameters.
              </p>

              <div className={styles.storyHighlights}>
                <div className={styles.highlightCard}>
                  <strong>Non-Accidental Guarantee</strong>
                  <span>Zero structural chassis damage, apron welding, or compromised crumple zones.</span>
                </div>
                <div className={styles.highlightCard}>
                  <strong>Flood-Free Certified</strong>
                  <span>Exhaustive cabin wiring, seat rail, and carpet underlay immersion checks.</span>
                </div>
                <div className={styles.highlightCard}>
                  <strong>EV Battery Health Verification</strong>
                  <span>High-voltage diagnostic scan for cell degradation, BMS health, and thermal stability.</span>
                </div>
                <div className={styles.highlightCard}>
                  <strong>Clean RTO Documentation</strong>
                  <span>100% verified single/dual owner title deeds with zero hypothecation surprises.</span>
                </div>
              </div>
            </div>

            <div>
              <StaffBrandingImage
                imageSrc="/images/staff-sell-car.jpg"
                alt="Arjun Sharma conducting engine bay inspection"
                caption="Arjun Sharma conducting rigorous engine bay diagnostic scan"
                badgeText="Master Certified Inspector"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: CORE PILLARS */}
      <section className={styles.altSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionBadge}>
              <ShieldCheck size={14} /> Our 4 Pillars of Excellence
            </div>
            <h2 className={styles.sectionTitle}>
              Built on Complete <span>Transparency</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Every service, car, and component is backed by institutional guarantees, verified technical data, and fixed price cards.
            </p>
          </div>

          <div className={styles.pillarsGrid}>
            <div className={styles.pillarCard}>
              <div className={styles.pillarIconBox}>
                <FileCheck size={24} />
              </div>
              <h4>140-Point Digital Checklist</h4>
              <p>
                Every listing includes the full, unedited inspection report with high-resolution imagery of engine bays, tire treads, and OBD-II diagnostics.
              </p>
            </div>

            <div className={styles.pillarCard}>
              <div className={styles.pillarIconBox}>
                <Award size={24} />
              </div>
              <h4>₹0 Buyer Convenience Fee</h4>
              <p>
                What you see is what you pay. No hidden broker commissions, transfer markups, or documentation surprise fees at the time of delivery.
              </p>
            </div>

            <div className={styles.pillarCard}>
              <div className={styles.pillarIconBox}>
                <Wrench size={24} />
              </div>
              <h4>Authorized Workshop Network</h4>
              <p>
                Integrated multi-brand service centres in Koramangala and Mysuru offering transparent labour rates and 6-month workmanship warranties.
              </p>
            </div>

            <div className={styles.pillarCard}>
              <div className={styles.pillarIconBox}>
                <Zap size={24} />
              </div>
              <h4>EV High-Voltage Certified</h4>
              <p>
                Dedicated electric vehicle service bays staffed by technicians trained in 400V–800V DC architectures, inverter safety, and battery pack isolation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: PHYSICAL HUBS & INFRASTRUCTURE */}
      <section className={styles.contentSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionBadge}>
              <MapPin size={14} /> Experience Centres & Workshops
            </div>
            <h2 className={styles.sectionTitle}>
              Visit Our <span>State-of-the-Art Hubs</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Experience our modern automotive facilities with climate-controlled customer lounges, computerized diagnostic bays, and express service counters.
            </p>
          </div>

          <div className={styles.hubsGrid}>
            <div className={styles.hubCard}>
              <div className={styles.hubImageWrap}>
                <img
                  src="/images/workshop-koramangala.jpg"
                  alt="WowCars Koramangala Flagship Hub"
                  className={styles.hubImage}
                />
                <span className={styles.hubPill}>Bengaluru Flagship</span>
              </div>
              <div className={styles.hubBody}>
                <h4>Koramangala Automotive Hub & Service Centre</h4>
                <p className={styles.hubAddress}>
                  Plot 42, 80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034
                </p>
                <div className={styles.hubFeatures}>
                  <div className={styles.hubFeatureItem}>
                    <CheckCircle2 size={16} /> 6 Computerized Hydraulic Car Bays + 2 Rapid Bike Bays
                  </div>
                  <div className={styles.hubFeatureItem}>
                    <CheckCircle2 size={16} /> EV High-Voltage Diagnostic & DC Fast-Charging Suite
                  </div>
                  <div className={styles.hubFeatureItem}>
                    <Clock size={16} /> Open Daily: 8:00 AM – 8:00 PM
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.hubCard}>
              <div className={styles.hubImageWrap}>
                <img
                  src="/images/workshop-mysuru.jpg"
                  alt="WowCars Mysuru Express Garage"
                  className={styles.hubImage}
                />
                <span className={styles.hubPill}>Mysuru Express</span>
              </div>
              <div className={styles.hubBody}>
                <h4>Hebbal Express Garage & Spares Distribution Store</h4>
                <p className={styles.hubAddress}>
                  Near Columbia Asia Junction, Ring Road, Hebbal, Mysuru, Karnataka 570016
                </p>
                <div className={styles.hubFeatures}>
                  <div className={styles.hubFeatureItem}>
                    <CheckCircle2 size={16} /> 3 Rapid Maintenance Bays + Parts Wholesale Counter
                  </div>
                  <div className={styles.hubFeatureItem}>
                    <CheckCircle2 size={16} /> Same-day delivery for 5,000+ OEM/OES components
                  </div>
                  <div className={styles.hubFeatureItem}>
                    <Clock size={16} /> Mon–Sat: 8:30 AM – 7:30 PM
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <CTASection
        title="Ready to Buy, Sell, or Service Your Car?"
        subtitle="Speak to our dedicated automotive concierge or explore our 140-point certified inventory today."
        primaryAction={{
          label: "Explore Certified Cars",
          href: "/cars",
        }}
        secondaryAction={{
          label: "Book Service Appointment",
          href: "/service-centres",
        }}
        variant="red"
      />

      <Footer />
    </div>
  );
}
