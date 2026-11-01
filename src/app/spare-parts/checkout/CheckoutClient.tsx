"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CreditCard,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  Check,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/lib/cart/CartContext";
import styles from "./Checkout.module.css";

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, subtotal, clearCart } = useCart();

  const initialPin = searchParams?.get("pin") || "560064";

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [state, setState] = useState("Karnataka");
  const [pinCode, setPinCode] = useState(initialPin);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "NET_BANKING" | "CARD" | "COD">("UPI");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  const shippingFee = subtotal > 1500 ? 0 : 150;
  const grandTotal = subtotal + shippingFee;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    if (!customerName || !customerPhone || !addressLine1 || !city || !state || !pinCode) {
      setErrorMsg("Please complete all required shipping address fields.");
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(pinCode.trim())) {
      setErrorMsg("Please enter a valid 6-digit Indian Postal PIN code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/spare-parts/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          shippingAddress: {
            line1: addressLine1.trim(),
            line2: addressLine2.trim() || undefined,
            city: city.trim(),
            state: state.trim(),
            pinCode: pinCode.trim(),
          },
          paymentMethod,
          paymentSimulation: "SUCCESS",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Order placement failed");
      }

      setCompletedOrder(data.order);
      clearCart();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completedOrder) {
    return (
      <div className={styles.pageWrapper}>
        <Navbar />
        <main className="container" style={{ paddingTop: "calc(var(--nav-height, 68px) + 3rem)", paddingBottom: "5rem" }}>
          <div className={styles.successCard}>
            <div className={styles.successIconCircle}>
              <CheckCircle2 size={54} className={styles.successIcon} />
            </div>
            <h1 className={styles.successTitle}>Order Confirmed & Payment Verified!</h1>
            <p className={styles.orderNumber}>
              Order Number: <strong>{completedOrder.orderNumber}</strong>
            </p>
            <p className={styles.successDesc}>
              Thank you, {completedOrder.customerName}. We have received your order for {completedOrder.items?.length} items. Our regional logistics warehouse has reserved your stock and will initiate dispatch shortly.
            </p>

            <div className={styles.orderDetailsBox}>
              <div className={styles.detailRow}>
                <span>Delivery Destination:</span>
                <span>{completedOrder.shippingAddress?.line1}, {completedOrder.shippingAddress?.city}, {completedOrder.shippingAddress?.state} - {completedOrder.shippingAddress?.pinCode}</span>
              </div>
              <div className={styles.detailRow}>
                <span>Total Amount Paid:</span>
                <strong>₹{completedOrder.totalAmount?.toLocaleString("en-IN")}</strong>
              </div>
              <div className={styles.detailRow}>
                <span>Estimated Delivery:</span>
                <span>{completedOrder.estimatedDelivery || "2 - 4 business days"}</span>
              </div>
            </div>

            <div className={styles.successActions}>
              <Link href={`/my-account/orders?phone=${encodeURIComponent(completedOrder.customerPhone)}`} className={styles.trackBtn}>
                Track Your Order Status
              </Link>
              <Link href="/spare-parts" className={styles.continueBtn}>
                Continue Shopping
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <Navbar />

      <main className="container" style={{ paddingTop: "calc(var(--nav-height, 68px) + 2rem)", paddingBottom: "4rem" }}>
        <h1 className={styles.pageTitle}>Secure Checkout</h1>

        {items.length === 0 ? (
          <div className={styles.emptyCard}>
            <p>Your cart is empty. Please add spare parts before proceeding to checkout.</p>
            <Link href="/spare-parts" className={styles.shopBtn}>
              Browse Spare Parts
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmitOrder} className={styles.checkoutLayout}>
            {/* Left: Shipping & Payment Information */}
            <div className={styles.formCol}>
              {errorMsg && (
                <div className={styles.errorAlert}>
                  <AlertCircle size={18} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Contact & Shipping Details */}
              <div className={styles.sectionCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.stepNum}>1</span>
                  <h2>Shipping Destination & Contact</h2>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.fieldFull}>
                    <label className={styles.label}>Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      className={styles.input}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      className={styles.input}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Email Address (Optional)</label>
                    <input
                      type="email"
                      placeholder="ramesh@example.com"
                      className={styles.input}
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>

                  <div className={styles.fieldFull}>
                    <label className={styles.label}>Street Address / Workshop / Landmark *</label>
                    <input
                      type="text"
                      required
                      placeholder="Flat / House / Garage No., Building, Area"
                      className={styles.input}
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                    />
                  </div>

                  <div className={styles.fieldFull}>
                    <label className={styles.label}>Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      placeholder="Nearby landmark or colony"
                      className={styles.input}
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>City *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bengaluru"
                      className={styles.input}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>State *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Karnataka"
                      className={styles.input}
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>6-Digit PIN Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. 560064"
                      className={styles.input}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Payment Method Simulation */}
              <div className={styles.sectionCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.stepNum}>2</span>
                  <h2>Payment Method (Safe Development Mode)</h2>
                </div>

                <div className={styles.paymentNotice}>
                  <Lock size={16} className={styles.lockIcon} />
                  <span>
                    Zero raw card data is stored. Development mock payments automatically simulate instant bank webhook verification.
                  </span>
                </div>

                <div className={styles.paymentOptions}>
                  <label className={`${styles.paymentTile} ${paymentMethod === "UPI" ? styles.selectedTile : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "UPI"}
                      onChange={() => setPaymentMethod("UPI")}
                    />
                    <div>
                      <strong>UPI Instant Pay</strong>
                      <p>Google Pay, PhonePe, Paytm, BHIM</p>
                    </div>
                  </label>

                  <label className={`${styles.paymentTile} ${paymentMethod === "NET_BANKING" ? styles.selectedTile : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "NET_BANKING"}
                      onChange={() => setPaymentMethod("NET_BANKING")}
                    />
                    <div>
                      <strong>Net Banking</strong>
                      <p>HDFC, ICICI, SBI, Axis, Kotak</p>
                    </div>
                  </label>

                  <label className={`${styles.paymentTile} ${paymentMethod === "CARD" ? styles.selectedTile : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "CARD"}
                      onChange={() => setPaymentMethod("CARD")}
                    />
                    <div>
                      <strong>Credit / Debit Card</strong>
                      <p>Visa, MasterCard, RuPay (3D Secure simulated)</p>
                    </div>
                  </label>

                  <label className={`${styles.paymentTile} ${paymentMethod === "COD" ? styles.selectedTile : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                    />
                    <div>
                      <strong>Cash on Delivery (COD)</strong>
                      <p>Pay when courier delivers to your address</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Order Snapshot & Confirmation */}
            <div className={styles.summaryCol}>
              <div className={styles.summaryCard}>
                <h3 className={styles.summaryTitle}>Order Summary</h3>

                {/* Items Mini-list */}
                <div className={styles.orderItemsList}>
                  {items.map((item) => (
                    <div key={item.productId} className={styles.miniItem}>
                      <div className={styles.miniImageWrapper}>
                        <Image
                          src={item.product?.images?.[0] || "/parts/image-unavailable.svg"}
                          alt={item.product?.title || "Part"}
                          width={48}
                          height={36}
                          className={styles.miniImage}
                        />
                      </div>
                      <div className={styles.miniDetails}>
                        <span className={styles.miniTitle}>{item.product?.title}</span>
                        <span className={styles.miniMeta}>
                          Qty: {item.quantity} × ₹{(item.product?.price || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <span className={styles.miniTotal}>
                        ₹{((item.product?.price || 0) * item.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={styles.divider} />

                <div className={styles.summaryRow}>
                  <span>Item Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                <div className={styles.summaryRow}>
                  <span>Shipping Charges</span>
                  <span>{shippingFee === 0 ? "FREE" : `₹${shippingFee}`}</span>
                </div>

                <div className={styles.divider} />

                <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                  <span>Grand Total</span>
                  <span className={styles.grandPrice}>₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
                <span className={styles.taxNote}>Includes applicable GST & insurance</span>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={styles.confirmBtn}
                >
                  {isSubmitting ? "Processing Order..." : `Confirm & Pay ₹${grandTotal.toLocaleString("en-IN")}`}
                  <ArrowRight size={16} />
                </button>

                <div className={styles.trustFooter}>
                  <div className={styles.trustItem}>
                    <ShieldCheck size={14} className={styles.greenIcon} />
                    <span>Real-time server price & inventory lock</span>
                  </div>
                  <div className={styles.trustItem}>
                    <Truck size={14} className={styles.greenIcon} />
                    <span>Insured nationwide shipping</span>
                  </div>
                  <div className={styles.trustItem}>
                    <RotateCcw size={14} className={styles.greenIcon} />
                    <span>7 to 10 days return guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}
