"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  ShoppingCart,
  Wrench,
  AlertCircle,
  ChevronRight,
  HelpCircle,
  Clock,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PartImageGallery from "@/components/parts/PartImageGallery";
import PinCodeChecker from "@/components/parts/PinCodeChecker";
import FitmentEnquiryModal from "@/components/parts/FitmentEnquiryModal";
import ProductCard from "@/components/parts/ProductCard";
import { PartProduct, PartCategory } from "@/lib/db/types";
import { useCart } from "@/lib/cart/CartContext";
import styles from "./ProductDetail.module.css";

interface ProductDetailClientProps {
  product: PartProduct;
  category?: PartCategory | null;
  relatedProducts: PartProduct[];
}

export default function ProductDetailClient({
  product,
  category,
  relatedProducts,
}: ProductDetailClientProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);

  const inStock = product.stockQuantity > 0 && product.status === "PUBLISHED";

  const handleAddToCart = () => {
    if (!inStock) return;
    const effectivePrice = product.price || product.priceINR || 0;
    const effectiveMrp = product.mrp || product.mrpINR;

    addItem({
      productId: product.id,
      quantity,
      product: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        brand: product.brand,
        price: effectivePrice,
        mrp: effectiveMrp,
        partNumber: product.partNumber,
        images: product.images,
        stockQuantity: product.stockQuantity,
        partType: product.partType,
        warrantyMonths: product.warrantyMonths,
      },
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const getPartTypeBadgeClass = () => {
    switch (product.partType) {
      case "GENUINE_OEM":
        return styles.badgeOem;
      case "OES":
        return styles.badgeOes;
      default:
        return styles.badgeAftermarket;
    }
  };

  const getPartTypeLabel = () => {
    switch (product.partType) {
      case "GENUINE_OEM":
        return "Genuine OEM";
      case "OES":
        return "OES Quality";
      default:
        return "Aftermarket";
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
          {category && (
            <>
              <Link href={`/spare-parts/category/${category.slug}`}>{category.name}</Link>
              <ChevronRight size={14} />
            </>
          )}
          <span>{product.title}</span>
        </nav>

        {/* Product Overview Section */}
        <div className={styles.productLayout}>
          {/* Left Column: Image Gallery */}
          <div className={styles.galleryCol}>
            <PartImageGallery images={product.images} title={product.title} />

            {/* Guaranteed Trust Badges */}
            <div className={styles.guaranteeBox}>
              <div className={styles.guaranteeItem}>
                <ShieldCheck size={20} className={styles.trustGreen} />
                <div>
                  <strong>{product.warrantyMonths} Months Warranty</strong>
                  <p>Manufacturer warranty backed by authorized distribution</p>
                </div>
              </div>
              <div className={styles.guaranteeItem}>
                <RotateCcw size={20} className={styles.trustGreen} />
                <div>
                  <strong>{product.returnPolicyDays} Days Return Policy</strong>
                  <p>Full refund on uninstalled parts with intact packaging</p>
                </div>
              </div>
              <div className={styles.guaranteeItem}>
                <MapPin size={20} className={styles.trustRed} />
                <div>
                  <strong>
                    Dispatched from{" "}
                    {typeof product.dispatchLocation === "string"
                      ? product.dispatchLocation
                      : `${product.dispatchLocation.city}, ${product.dispatchLocation.state}`}
                  </strong>
                  <p>Insured surface and express courier delivery</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Product Purchasing Details */}
          <div className={styles.detailsCol}>
            {/* Brand & Part Classification */}
            <div className={styles.classificationRow}>
              <span className={styles.brandTag}>{product.brand}</span>
              <span className={`${styles.typeBadge} ${getPartTypeBadgeClass()}`}>
                {getPartTypeLabel()}
              </span>
              <span className={styles.conditionTag}>Condition: {product.condition}</span>
            </div>

            {/* Title */}
            <h1 className={styles.title}>{product.title}</h1>

            {/* Part Numbers Metadata */}
            <div className={styles.partNumbersBar}>
              {product.partNumber && (
                <div className={styles.partNoBox}>
                  <span className={styles.partNoLabel}>Part Number:</span>
                  <span className={styles.partNoValue}>{product.partNumber}</span>
                </div>
              )}
              {product.oemPartNumber && (
                <div className={styles.partNoBox}>
                  <span className={styles.partNoLabel}>OEM Reference:</span>
                  <span className={styles.partNoValue}>{product.oemPartNumber}</span>
                </div>
              )}
              {product.sku && (
                <div className={styles.partNoBox}>
                  <span className={styles.partNoLabel}>SKU:</span>
                  <span className={styles.partNoValue}>{product.sku}</span>
                </div>
              )}
            </div>

            {/* Pricing Card */}
            <div className={styles.priceCard}>
              <div className={styles.priceRow}>
                <span className={styles.sellingPrice}>₹{(product.price || product.priceINR).toLocaleString("en-IN")}</span>
                {(product.mrp || product.mrpINR) && (product.mrp || product.mrpINR)! > (product.price || product.priceINR) && (
                  <>
                    <span className={styles.mrp}>MRP ₹{(product.mrp || product.mrpINR)!.toLocaleString("en-IN")}</span>
                    <span className={styles.discountPill}>{product.discountPercent}% OFF</span>
                  </>
                )}
              </div>
              <span className={styles.taxInclusive}>Inclusive of all taxes</span>

              <div className={styles.priceVerifiedBadge}>
                <CheckCircle2 size={13} />
                <span>
                  Verified market price (Updated {new Date(product.priceVerifiedAt).toLocaleDateString("en-IN")})
                </span>
              </div>
            </div>

            {/* Stock and Purchase Actions */}
            <div className={styles.purchaseSection}>
              {inStock ? (
                <>
                  <div className={styles.stockNotice}>
                    <span className={styles.inStockDot} />
                    <strong>In Stock</strong> ({product.stockQuantity} units available)
                  </div>

                  <div className={styles.actionRow}>
                    <div className={styles.quantityPicker}>
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span>{quantity}</span>
                      <button
                        onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                        disabled={quantity >= product.stockQuantity}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={handleAddToCart}
                      className={`${styles.addToCartBtn} ${added ? styles.cartAdded : ""}`}
                      disabled={added}
                    >
                      {added ? (
                        <>
                          <Check size={18} /> Added to Cart!
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={18} /> Add to Cart (₹{((product.price || product.priceINR) * quantity).toLocaleString("en-IN")})
                        </>
                      )}
                    </button>

                    <Link href="/spare-parts/cart" className={styles.viewCartBtn}>
                      View Cart
                    </Link>
                  </div>
                </>
              ) : (
                <div className={styles.outOfStockCard}>
                  <AlertCircle size={20} className={styles.outOfStockIcon} />
                  <div>
                    <strong>Currently Out of Stock</strong>
                    <p>We can check verified supplier warehouses and arrange immediate backorder for you.</p>
                  </div>
                  <button onClick={() => setIsEnquiryOpen(true)} className={styles.notifyBtn}>
                    Notify / Request Quote
                  </button>
                </div>
              )}
            </div>

            {/* PIN Code Delivery Serviceability Checker */}
            <div className={styles.deliveryCheckCard}>
              <div className={styles.deliveryCheckTitle}>
                <Truck size={16} />
                <span>Delivery & Serviceability Check</span>
              </div>
              <PinCodeChecker />
            </div>

            {/* Description */}
            <div className={styles.descriptionSection}>
              <h3>Product Description</h3>
              <p>{product.description}</p>
            </div>
          </div>
        </div>

        {/* Vehicle Compatibility Section */}
        <section className={styles.compatibilitySection}>
          <div className={styles.sectionTitleRow}>
            <div className={styles.titleWithIcon}>
              <Wrench size={22} className={styles.sectionIcon} />
              <h2>Verified Vehicle Fitment</h2>
            </div>
            <button onClick={() => setIsEnquiryOpen(true)} className={styles.askFitmentBtn}>
              <HelpCircle size={14} /> Uncertain? Request EPC Verification
            </button>
          </div>

          <div className={styles.compatibilityCard}>
            {product.compatibleVehicles?.[0]?.make === "Universal" ? (
              <div className={styles.universalNotice}>
                <ShieldCheck size={24} className={styles.trustGreen} />
                <div>
                  <h4>Universal Automotive Compatibility</h4>
                  <p>This item is engineered as universal equipment or consumable suitable for all car models and workshops.</p>
                </div>
              </div>
            ) : (
              <div className={styles.fitmentTableWrapper}>
                <table className={styles.fitmentTable}>
                  <thead>
                    <tr>
                      <th>Make</th>
                      <th>Model</th>
                      <th>Applicable Years</th>
                      <th>Fuel / Engine / Variants</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.compatibleVehicles?.map((veh, idx) => (
                      <tr key={idx}>
                        <td><strong>{veh.make}</strong></td>
                        <td>{veh.model}</td>
                        <td>
                          {veh.startYear} - {veh.endYear ? veh.endYear : "Present"}
                        </td>
                        <td>
                          {veh.fuelTypes?.join(", ") || "All Fuel Types"}
                          {veh.variants && veh.variants.length > 0 ? ` (${veh.variants.join(", ")})` : ""}
                          {veh.engines && veh.engines.length > 0 ? ` [${veh.engines.join(", ")}]` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {product.compatibilityNotes && (
              <div className={styles.fitmentNotes}>
                <strong>Fitment Notes:</strong> {product.compatibilityNotes}
              </div>
            )}
          </div>
        </section>

        {/* Technical Specifications */}
        {((product.specifications && Object.keys(product.specifications).length > 0) ||
          (product.technicalSpecs && Object.keys(product.technicalSpecs).length > 0)) && (
          <section className={styles.specsSection}>
            <h2>Technical Specifications</h2>
            <div className={styles.specsGrid}>
              {Object.entries(product.specifications || product.technicalSpecs || {}).map(([key, val]) => (
                <div key={key} className={styles.specItem}>
                  <span className={styles.specKey}>{key}</span>
                  <span className={styles.specVal}>{String(val)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <section className={styles.relatedSection}>
            <div className={styles.sectionTitleRow}>
              <h2>Related & Complementary Parts</h2>
              <Link href={`/spare-parts/category/${product.categorySlug || product.categoryId}`} className={styles.viewMoreLink}>
                View More in {category?.name || "Category"} →
              </Link>
            </div>
            <div className={styles.relatedGrid}>
              {relatedProducts.slice(0, 4).map((rp) => (
                <ProductCard key={rp.id} product={rp} />
              ))}
            </div>
          </section>
        )}
      </main>

      <FitmentEnquiryModal
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
        product={{
          id: product.id,
          title: product.title,
          partNumber: product.partNumber,
        }}
      />

      <Footer />
    </div>
  );
}
