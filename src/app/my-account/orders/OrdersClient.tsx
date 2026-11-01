"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Package,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { PartOrder, PartOrderStatus } from "@/lib/db/types";
import styles from "./Orders.module.css";

export default function OrdersClient() {
  const searchParams = useSearchParams();
  const initialPhone = searchParams?.get("phone") || "";

  const [phone, setPhone] = useState(initialPhone);
  const [orders, setOrders] = useState<PartOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrders = async (lookupPhone: string) => {
    if (!lookupPhone.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/spare-parts/orders?phone=${encodeURIComponent(lookupPhone.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch orders");
      }
      setOrders(data.orders || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to find orders for this phone number.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPhone) {
      fetchOrders(initialPhone);
    }
  }, [initialPhone]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(phone);
  };

  const getStatusColorClass = (status: PartOrderStatus) => {
    switch (status) {
      case "DELIVERED":
        return styles.statusDelivered;
      case "DISPATCHED":
        return styles.statusDispatched;
      case "PROCESSING":
      case "PAYMENT_CONFIRMED":
        return styles.statusProcessing;
      case "CANCELLED":
      case "RETURNED":
      case "REFUNDED":
        return styles.statusCancelled;
      default:
        return styles.statusPending;
    }
  };

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
          <span>My Orders & Tracking</span>
        </nav>

        <div className={styles.header}>
          <Package className={styles.headerIcon} size={28} />
          <div>
            <h1 className={styles.title}>Track Spare Parts Orders</h1>
            <p className={styles.desc}>
              View current fulfillment status, item snapshots, carrier tracking details, and return eligibility for your automotive parts purchases.
            </p>
          </div>
        </div>

        {/* Search by Customer Mobile Phone */}
        <div className={styles.lookupCard}>
          <form onSubmit={handleSearch} className={styles.lookupForm}>
            <div className={styles.inputWrapper}>
              <Search className={styles.searchIcon} size={18} />
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number used at checkout..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={styles.input}
              />
            </div>
            <button type="submit" disabled={loading || !phone.trim()} className={styles.lookupBtn}>
              {loading ? "Searching..." : "Lookup Orders"}
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className={styles.errorAlert}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Orders Results */}
        {searched && (
          <div className={styles.ordersSection}>
            {orders.length > 0 ? (
              <div className={styles.ordersList}>
                {orders.map((order) => (
                  <div key={order.id} className={styles.orderCard}>
                    {/* Header */}
                    <div className={styles.orderCardHeader}>
                      <div>
                        <span className={styles.orderNum}>Order #{order.orderNumber}</span>
                        <span className={styles.orderDate}>
                          Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </span>
                      </div>
                      <div className={styles.headerRight}>
                        <span className={`${styles.statusBadge} ${getStatusColorClass(order.orderStatus)}`}>
                          {order.orderStatus.replace(/_/g, " ")}
                        </span>
                        <span className={styles.orderTotal}>
                          ₹{order.totalAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* Tracking Info if Dispatched */}
                    {order.trackingNumber && (
                      <div className={styles.trackingBanner}>
                        <Truck size={16} />
                        <span>
                          Shipped via <strong>{order.shippingCourier || "Express Logistics"}</strong>. Tracking No: <strong>{order.trackingNumber}</strong>
                        </span>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className={styles.itemsList}>
                      {order.items.map((item, idx) => (
                        <div key={idx} className={styles.itemRow}>
                          <div className={styles.itemImageWrapper}>
                            <Image
                              src={item.image || "/parts/image-unavailable.svg"}
                              alt={item.title}
                              width={60}
                              height={45}
                              className={styles.itemImg}
                            />
                          </div>
                          <div className={styles.itemDetails}>
                            <h4 className={styles.itemTitle}>{item.title}</h4>
                            <span className={styles.itemMeta}>
                              Part No: {item.partNumber || "N/A"} | Brand: {item.brand} | Qty: {item.quantity}
                            </span>
                          </div>
                          <div className={styles.itemPrice}>
                            ₹{item.subtotal.toLocaleString("en-IN")}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Timeline Event History */}
                    {order.history && order.history.length > 0 && (
                      <div className={styles.timelineSection}>
                        <h4 className={styles.timelineTitle}>Fulfillment Timeline</h4>
                        <div className={styles.timelineList}>
                          {order.history.map((evt, i) => (
                            <div key={i} className={styles.timelineItem}>
                              <div className={styles.timelineDot} />
                              <div className={styles.timelineContent}>
                                <div className={styles.timelineTop}>
                                  <strong>{evt.status.replace(/_/g, " ")}</strong>
                                  <span className={styles.timelineTime}>
                                    {new Date(evt.timestamp).toLocaleString("en-IN")}
                                  </span>
                                </div>
                                {evt.notes && <p className={styles.timelineNotes}>{evt.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Destination Address */}
                    <div className={styles.addressBar}>
                      <span>Delivered To: {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pinCode}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Package size={40} className={styles.emptyIcon} />
                <h3>No orders found for {phone}</h3>
                <p>Please double check the phone number entered during checkout.</p>
                <Link href="/spare-parts" className={styles.browseBtn}>
                  Shop Spare Parts
                </Link>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
