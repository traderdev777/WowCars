import { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/common/PageHero";
import TrustIndicators from "@/components/common/TrustIndicators";
import CTASection from "@/components/common/CTASection";
import ContactFormClient from "./ContactFormClient";
import styles from "./Contact.module.css";
import {
  PhoneCall, Mail, MapPin, MessageCircle, Clock,
  ArrowRight, ShieldCheck, Wrench
} from "lucide-react";

export const metadata: Metadata = {
  title: "Contact WowCars India — Automotive Concierge & Service Hubs",
  description:
    "Get in touch with WowCars India. Call our 24x7 automotive helpline, schedule a workshop visit in Koramangala or Mysuru, or submit an inquiry to our concierge.",
};

export default function ContactPage() {
  return (
    <div className={styles.pageWrapper}>
      <Navbar />

      <PageHero
        badge="Get in Touch"
        title="Automotive Support & Hub Concierge"
        subtitle="Connect with our vehicle specialists, book workshop appointments, or inquire about genuine spare parts and franchise opportunities."
        stats={[
          { label: "Response Time", value: "< 15 Mins" },
          { label: "Customer Rating", value: "4.9 / 5.0" },
          { label: "Helpline", value: "24x7 Available" },
          { label: "Flagship Hubs", value: "Bengaluru & Mysuru" },
        ]}
        staffImage="/images/staff-customer-support.jpg"
        staffName="Arjun Sharma"
        staffRole="Customer Concierge Specialist"
        staffContext="Direct Assistance for Vehicle Enquiries & Workshop Visits"
      />

      <TrustIndicators />

      <section className={styles.mainSection}>
        <div className="container">
          <div className={styles.contactGrid}>
            {/* Left Column: Direct Communication Channels & Physical Hubs */}
            <div className={styles.channelsCol}>
              {/* WhatsApp & Instant Calling */}
              <div className={styles.channelCard}>
                <div className={styles.channelHeader}>
                  <div className={styles.iconBox}>
                    <PhoneCall size={22} />
                  </div>
                  <div>
                    <h4 className={styles.channelTitle}>Direct Concierge & Helpline</h4>
                    <p className={styles.channelDesc}>Immediate telephone support with automotive specialists</p>
                  </div>
                </div>
                <div className={styles.channelContent}>
                  <p><strong>Bengaluru Flagship Hub:</strong> +91 98801 23456</p>
                  <p><strong>Mysuru Express Garage:</strong> +91 98450 87654</p>
                  <p style={{ color: "#8E8E93", fontSize: "0.8125rem", margin: "6px 0 0" }}>
                    Toll-free customer assistance available 7 days a week from 8:00 AM to 9:00 PM.
                  </p>
                </div>
                <a href="tel:+919880123456" className={styles.channelAction}>
                  Call Bengaluru Concierge <ArrowRight size={14} />
                </a>
              </div>

              {/* WhatsApp Quick Chat */}
              <div className={styles.channelCard}>
                <div className={styles.channelHeader}>
                  <div className={styles.iconBox} style={{ background: "rgba(37, 211, 102, 0.15)", color: "#25D366" }}>
                    <MessageCircle size={22} />
                  </div>
                  <div>
                    <h4 className={styles.channelTitle}>WhatsApp Verified Desk</h4>
                    <p className={styles.channelDesc}>Instant vehicle photos, inspection PDFs & quotation sharing</p>
                  </div>
                </div>
                <div className={styles.channelContent}>
                  <p>Chat directly with our showroom team on WhatsApp for real-time 140-point inspection sheets and walking video tours of any listed car.</p>
                </div>
                <a
                  href="https://wa.me/919880123456?text=Hi%20WowCars%2C%20I%20would%20like%20to%20inquire%20about%20a%20vehicle%2Fservice"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.channelAction}
                  style={{ color: "#25D366" }}
                >
                  Start WhatsApp Chat <ArrowRight size={14} />
                </a>
              </div>

              {/* Physical Hub: Koramangala */}
              <div className={styles.channelCard}>
                <div className={styles.channelHeader}>
                  <div className={styles.iconBox}>
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h4 className={styles.channelTitle}>Bengaluru Flagship Hub & Workshop</h4>
                    <p className={styles.channelDesc}>Sales showroom, computerized workshop & EV fast-charger</p>
                  </div>
                </div>
                <div className={styles.channelContent}>
                  <p>Plot 42, 80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034</p>
                  <p style={{ color: "#8E8E93", fontSize: "0.8125rem", marginTop: 6 }}>
                    <Clock size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    Open Daily: 8:00 AM – 8:00 PM
                  </p>
                </div>
                <a
                  href="https://maps.google.com/?q=Koramangala+Bengaluru"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.channelAction}
                >
                  Open in Google Maps <ArrowRight size={14} />
                </a>
              </div>

              {/* Physical Hub: Mysuru */}
              <div className={styles.channelCard}>
                <div className={styles.channelHeader}>
                  <div className={styles.iconBox}>
                    <Wrench size={22} />
                  </div>
                  <div>
                    <h4 className={styles.channelTitle}>Mysuru Express Garage & Spares Store</h4>
                    <p className={styles.channelDesc}>Express maintenance, tire & battery balancing, spare parts counter</p>
                  </div>
                </div>
                <div className={styles.channelContent}>
                  <p>Near Columbia Asia Junction, Ring Road, Hebbal, Mysuru, Karnataka 570016</p>
                  <p style={{ color: "#8E8E93", fontSize: "0.8125rem", marginTop: 6 }}>
                    <Clock size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    Mon–Sat: 8:30 AM – 7:30 PM (Sun by appointment)
                  </p>
                </div>
                <a
                  href="https://maps.google.com/?q=Hebbal+Mysuru"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.channelAction}
                >
                  Open in Google Maps <ArrowRight size={14} />
                </a>
              </div>
            </div>

            {/* Right Column: Interactive Form */}
            <div>
              <ContactFormClient />
            </div>
          </div>
        </div>
      </section>

      <CTASection
        title="Visiting Us for a Test Drive or Multi-Point Service?"
        subtitle="We offer complimentary doorstep pickup & drop for all scheduled garage appointments within 15 km of our hubs."
        primaryAction={{
          label: "Schedule Workshop Visit",
          href: "/service-centres",
        }}
        secondaryAction={{
          label: "Browse Certified Inventory",
          href: "/cars",
        }}
        variant="red"
      />

      <Footer />
    </div>
  );
}
