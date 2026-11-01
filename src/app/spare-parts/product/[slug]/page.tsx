import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductDetailClient from "./ProductDetailClient";

export async function generateStaticParams() {
  const result = await db.getPartProducts({ limit: 100 });
  return result.products.map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.getPartProductBySlug(slug);

  if (!product) {
    return { title: "Product Not Found | WowCars Spare Parts" };
  }

  const primaryImage = product.images?.[0] || "/parts/image-unavailable.svg";

  const priceVal = product.price ?? product.priceINR ?? 0;

  return {
    title: `${product.title} (${product.brand}) — ₹${priceVal.toLocaleString("en-IN")} | WowCars`,
    description: `${product.description.substring(0, 155)}... Buy online in India with verified fitment and ${product.warrantyMonths} months warranty.`,
    openGraph: {
      title: `${product.title} | WowCars Auto Parts`,
      description: product.description,
      url: `https://wowcars.in/spare-parts/product/${slug}`,
      images: [{ url: primaryImage, width: 800, height: 600, alt: product.title }],
    },
  };
}

async function ProductDetailContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await db.getPartProductBySlug(slug);

  if (!product || product.status === "ARCHIVED" || product.status === "DRAFT") {
    notFound();
  }

  const [category, relatedRes] = await Promise.all([
    product.categorySlug ? db.getPartCategoryBySlug(product.categorySlug) : Promise.resolve(null),
    db.getPartProducts({
      categorySlug: product.categorySlug,
      status: "PUBLISHED",
      limit: 5,
    }),
  ]);

  const related = relatedRes.products.filter((p) => p.id !== product.id);

  // Structured Product JSON-LD Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images,
    description: product.description,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    sku: product.sku || product.partNumber || product.id,
    mpn: product.partNumber || undefined,
    offers: {
      "@type": "Offer",
      url: `https://wowcars.in/spare-parts/product/${product.slug}`,
      priceCurrency: "INR",
      price: product.price,
      itemCondition:
        product.condition === "NEW"
          ? "https://schema.org/NewCondition"
          : product.condition === "REFURBISHED"
          ? "https://schema.org/RefurbishedCondition"
          : "https://schema.org/UsedCondition",
      availability:
        product.stockQuantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "WowCars Marketplace",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient
        product={product}
        category={category}
        relatedProducts={related}
      />
    </>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh", background: "#0b1120" }} />}>
      <ProductDetailContent params={params} />
    </Suspense>
  );
}

