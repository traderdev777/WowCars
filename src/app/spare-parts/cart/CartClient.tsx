"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  ShoppingCart,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PinCodeChecker from "@/components/parts/PinCodeChecker";
import { useCart } from "@/lib/cart/CartContext";
import styles from "./Cart.module.css";

export default function CartClient() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const [isValidating, setIsValidating] = useState(false);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [deliveryPinEligible, setDeliveryPinEligible] = useState<boolean>(true);
  const [pinCode, setPinCode] = useState<string>("560064"); // default Bengaluru

  // Revalidate live prices & inventory with the backend API
  const handleProceedToCheckout = async () => {
    if (items.length === 0) return;
    setIsValidating(true);
    setValidationIssues([]);

    try {
      const res = await fetch("/api/spare-parts/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to validate cart");
      }

      if (data.issues && data.issues.length > 0) {
        setValidationIssues(data.issues);
        setIsValidating(false);
        return;
      }

      // If valid, navigate to checkout
      router.push(`/spare-parts/checkout?pin=${pinCode}`);
    } catch (err: any) {
      setValidationIssues([err.message || "Could not revalidate inventory with server. Please try again."]);
    } finally {
      setIsValidating(false);
    }
  };

  const shippingEstimate = subtotal > 1500 ? 0 : 150;
  const estimatedTotal = subtotal + shippingEstimate;

  return (
    <div className={styles.pageWrapper}>
      <Navbar />

      <main className="container" style={{ paddingTop: "calc(var(--nav-height, 68px) + 2rem)", paddingBottom: "4rem" }}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight size={14} />
          <Link href="/spare-parts">Spare Parts</Link>
          <ChevronRight size={14} />
          <span>Shopping Cart</span>
        </nav>

        <h1 className={styles.title}>Your Shopping Cart</h1>

        {items.length === 0 ? (
          <div className={styles.emptyCartCard}>
            <ShoppingCart size={48} className={styles.emptyIcon} />
            <h2>Your cart is currently empty</h2>
            <p>Explore our genuine automotive spare parts, replacement filters, and workshop tools with verified compatibility.</p>
            <Link href="/spare-parts" className={styles.exploreBtn}>
              Browse Spare Parts Store
            </Link>
          </div>
        ) : (
          <div className={styles.cartLayout}>
            {/* Items List */}
            <div className={styles.itemsCol}>
              {validationIssues.length > 0 && (
                <div className={styles.warningBox}>
                  <AlertTriangle size={18} className={styles.warnIcon} />
                  <div>
                    <strong>Inventory or Price Notification:</strong>
                    <ul>
                      {validationIssues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className={styles.tableHeader}>
                <span>Product Item</span>
                <span>Price</span>
                <span>Quantity</span>
                <span>Subtotal</span>
              </div>

              <div className={styles.itemsList}>
                {items.map((item) => {
                  const prod = item.product;
                  const itemPrice = prod?.price || 0;
                  const itemSubtotal = itemPrice * item.quantity;
                  const maxStock = prod?.stockQuantity || 10;

                  return (
                    <div key={item.productId} className={styles.cartItemRow}>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemImageWrapper}>
                          <Image
                            src={prod?.images?.[0] || "/parts/image-unavailable.svg"}
                            alt={prod?.title || "Auto Part"}
                            width={100}
                            height={75}
                            className={styles.itemImage}
                          />
                        </div>
                        <div className={styles.itemDetails}>
                          <span className={styles.itemBrand}>{prod?.brand}</span>
                          <h3 className={styles.itemTitle}>
                            <Link href={`/spare-parts/product/${prod?.slug || item.productId}`}>
                              {prod?.title || "Spare Part"}
                            </Link>
                          </h3>
                          {prod?.partNumber && (
                            <span className={styles.itemPartNo}>PN: {prod.partNumber}</span>
                          )}
                          <button
                            onClick={() => removeItem(item.productId)}
                            className={styles.removeBtn}
                            aria-label="Remove item from cart"
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      </div>

                      <div className={styles.itemPrice}>
                        ₹{itemPrice.toLocaleString("en-IN")}
                      </div>

                      <div className={styles.itemQty}>
                        <div className={styles.qtyPicker}>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= maxStock}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className={styles.itemTotal}>
                        ₹{itemSubtotal.toLocaleString("en-IN")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Pin Validation */}
              <div className={styles.pinBox}>
                <h3 className={styles.pinBoxTitle}>
                  <Truck size={16} /> Check Delivery Serviceability & Shipping Cost
                </h3>
                <PinCodeChecker
                  defaultPin={pinCode}
                  onValidated={(pin, ok) => {
                    setPinCode(pin);
                    setDeliveryPinEligible(ok);
                  }}
                />
              </div>

              {/* Clear Cart Button */}
              <button onClick={clearCart} className={styles.clearCartBtn}>
                Clear All Items
              </button>
            </div>

            {/* Summary Column */}
            <div className={styles.summaryCol}>
              <div className={styles.summaryCard}>
                <h2 className={styles.summaryTitle}>Order Summary</h2>

                <div className={styles.summaryRow}>
                  <span>Item Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                <div className={styles.summaryRow}>
                  <span>Estimated Shipping</span>
                  <span>
                    {shippingEstimate === 0 ? (
                      <span className={styles.freeShipping}>FREE</span>
                    ) : (
                      `₹${shippingEstimate}`
                    )}
                  </span>
                </div>

                {subtotal < 1500 && (
                  <p className={styles.shippingTip}>
                    Add ₹{(1500 - subtotal).toLocaleString("en-IN")} more to qualify for <strong>FREE Shipping</strong>!
                  </p>
                )}

                <div className={styles.divider} />

                <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                  <span>Estimated Total</span>
                  <span className={styles.totalPrice}>₹{estimatedTotal.toLocaleString("en-IN")}</span>
                </div>
                <span className={styles.taxNote}>Inclusive of all GST & taxes</span>

                <button
                  onClick={handleProceedToCheckout}
                  disabled={isValidating || !deliveryPinEligible}
                  className={styles.checkoutBtn}
                >
                  {isValidating ? "Revalidating Stock..." : "Proceed to Checkout"}
                  <ArrowRight size={16} />
                </button>

                {/* Trust Highlights */}
                <div className={styles.summaryTrust}>
                  <div className={styles.trustItem}>
                    <ShieldCheck size={16} className={styles.trustIcon} />
                    <span>Real-time stock reservation</span>
                  </div>
                  <div className={styles.trustItem}>
                    <RotateCcw size={16} className={styles.trustIcon} />
                    <span>7 to 10 days return policy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
