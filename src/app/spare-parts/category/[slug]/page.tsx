import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import CategoryDetailClient from "./CategoryDetailClient";

export async function generateStaticParams() {
  const categories = await db.getPartCategories();
  return categories.map((cat) => ({
    slug: cat.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.getPartCategoryBySlug(slug);
  if (!category) {
    return { title: "Category Not Found | WowCars Spare Parts" };
  }

  return {
    title: `${category.name} — Buy Car Spare Parts Online | WowCars India`,
    description: `Shop verified ${category.name} in India. ${category.description} 100% vehicle fitment guarantee, OEM and OES certified parts.`,
    openGraph: {
      title: `${category.name} | WowCars Auto Parts`,
      description: category.description,
      url: `https://wowcars.in/spare-parts/category/${slug}`,
      images: [{ url: category.image || `/parts/categories/${slug}.jpg`, width: 800, height: 600, alt: category.name }],
    },
  };
}

async function CategoryContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const category = await db.getPartCategoryBySlug(slug);
  if (!category || !category.isActive) {
    notFound();
  }

  const productsRes = await db.getPartProducts({
    categorySlug: slug,
    status: "PUBLISHED",
    limit: 100,
  });

  return (
    <CategoryDetailClient
      category={category}
      initialProducts={productsRes.products}
    />
  );
}

export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh", background: "#0b1120" }} />}>
      <CategoryContent params={params} />
    </Suspense>
  );
}

