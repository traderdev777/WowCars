"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Heart, Camera, MessageCircle, ShieldCheck, ArrowDown, Star } from "lucide-react";
import { generateWhatsAppLink } from "@/lib/formatters";
import { WHATSAPP_CONCIERGE_PHONE } from "@/lib/mockData";
import { getAssetPath } from "@/lib/assets";
import {
  carHref, emiFor, listingTitle, priceDrop, priceShort, rupees, specParts, type Listing,
} from "@/lib/listings/listing";
import { useSavedCars } from "@/lib/listings/storage";
import DealBadge from "./DealBadge";
import styles from "./CarCard.module.css";

interface CarCardProps {
  car: Listing;
  layout?: "grid" | "list";
}

export default function CarCard({ car, layout = "grid" }: CarCardProps) {
  const { isSaved, toggle } = useSavedCars();
  const saved = isSaved(car.listingCode);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [slide, setSlide] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const images = (car.images || []).filter(Boolean);
  const href = carHref(car);
  const title = listingTitle(car);
  const drop = priceDrop(car);
  const isDealer = car.sellerType === "Verified Dealer";

  const waLink = generateWhatsAppLink(WHATSAPP_CONCIERGE_PHONE, {
    listingCode: car.listingCode,
    title: `${title} ${car.variant}`,
    priceLakhs: priceShort(car.priceINR),
    url: `https://wowcars.in${href}`,
  });

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setSlide(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };

  return (
    <article className={`${styles.card} ${layout === "list" ? styles.list : ""}`}>
      <div className={styles.media}>
        <div className={styles.track} ref={trackRef} onScroll={images.length > 1 ? onScroll : undefined}>
          {images.length === 0 || images.every((_, i) => failed[i]) ? (
            <Link href={href} className={styles.slide} aria-label={title}>
              <span className={styles.noPhoto}>Photos coming soon</span>
            </Link>
          ) : (
            images.map((src, i) =>
              failed[i] ? null : (
                <Link href={href} className={styles.slide} key={src + i} aria-label={i === 0 ? title : `${title} photo ${i + 1}`} tabIndex={i === 0 ? 0 : -1}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getAssetPath(src)}
                    alt={i === 0 ? `${title} ${car.variant}` : ""}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={480}
                    onError={() => setFailed((f) => ({ ...f, [i]: true }))}
                  />
                </Link>
              ),
            )
          )}
        </div>

        <div className={styles.overlayTop}>
          {drop > 0 && <span className={styles.pill}>Price drop</span>}
          {car.inspectedByWowCars && (
            <span className={styles.pill}>
              <ShieldCheck size={12} /> Inspected
            </span>
          )}
        </div>

        <button
          type="button"
          className={`${styles.heart} ${saved ? styles.heartOn : ""}`}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${title} from saved cars` : `Save ${title}`}
          onClick={() => toggle(car.listingCode)}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>

        {images.length > 0 && (
          <span className={styles.photoCount}>
            <Camera size={12} /> {images.length > 1 ? `${slide + 1}/${images.length}` : "1 photo"}
          </span>
        )}
        {images.length > 1 && (
          <span className={styles.dots} aria-hidden="true">
            {images.slice(0, 6).map((_, i) => (
              <i key={i} className={i === slide ? styles.dotOn : ""} />
            ))}
          </span>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link href={href}>{title}</Link>
        </h3>
        <p className={styles.variant}>{car.variant}</p>

        <div className={styles.priceRow}>
          <div>
            <div className={styles.price}>{priceShort(car.priceINR)}</div>
            <div className={styles.emi}>
              <span className="tnum">{rupees(emiFor(car.priceINR))}/mo*</span>
            </div>
          </div>
          <DealBadge car={car} align="right" />
        </div>

        {drop > 0 && car.previousPriceINR && (
          <p className={styles.drop}>
            <span className={styles.dropAmt}>
              <ArrowDown size={13} /> {rupees(drop)}
            </span>
            <s>{priceShort(car.previousPriceINR)}</s>
          </p>
        )}

        <p className={styles.spec}>
          {specParts(car).map((part, i) => (
            <span key={i}>{i > 0 ? " · " : ""}<span className={styles.nowrap}>{part}</span></span>
          ))}
        </p>

        <p className={styles.seller}>
          <span>
            {isDealer ? (
              <>
                {car.dealerName || "Verified dealer"}
                {car.dealerRating ? (
                  <span className={styles.rating}>
                    <Star size={11} fill="currentColor" /> {car.dealerRating.toFixed(1)}
                  </span>
                ) : null}
              </>
            ) : (
              <>Individual{car.idVerified ? " · ID verified" : ""}</>
            )}
          </span>
          <span className={styles.loc}>{car.locality}, {car.city}</span>
        </p>
        {car.isSeedData && <p className={styles.sample}>Sample listing · {car.listingCode}</p>}

        <div className={styles.actions}>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-sm"
            aria-label={`WhatsApp about ${title}`}
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
          <Link href={href} className="btn btn-secondary btn-sm">
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}
