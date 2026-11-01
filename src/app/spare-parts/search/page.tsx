import { Suspense } from "react";
import { Metadata } from "next";
import { db } from "@/lib/db";
import { PartCondition, PartType } from "@/lib/db/types";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "Search Car Spare Parts & Workshop Equipment | WowCars India",
  description:
    "Find car spare parts by part number, brand, category, or vehicle make and model. Verified genuine OEM and OES replacement parts with guaranteed fitment.",
};

type SearchParamsObj = {
  q?: string;
  category?: string;
  brand?: string;
  partType?: string;
  condition?: string;
  make?: string;
  model?: string;
  year?: string;
  inStock?: string;
  sort?: string;
  page?: string;
};

async function SearchContent({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsObj>;
}) {
  const params: SearchParamsObj = searchParams
    ? (((await searchParams.catch(() => ({}))) || {}) as SearchParamsObj)
    : {};

  const q = params.q || undefined;
  const category = params.category || undefined;
  const brand = params.brand || undefined;
  const partType = (params.partType as PartType) || undefined;
  const condition = (params.condition as PartCondition) || undefined;
  const make = params.make || undefined;
  const model = params.model || undefined;
  const year = params.year ? Number(params.year) : undefined;
  const inStockOnly = params.inStock === "true";
  const sort = params.sort || "relevance";
  const page = parseInt(params.page || "1", 10);
  const limit = 24;

  const [categories, searchResult] = await Promise.all([
    db.getPartCategories(),
    db.getPartProducts({
      search: q,
      categorySlug: category,
      brand,
      partType,
      condition,
      make,
      model,
      year,
      inStockOnly,
      status: "PUBLISHED",
      sortBy:
        sort === "price_asc"
          ? "price_asc"
          : sort === "price_desc"
          ? "price_desc"
          : sort === "newest"
          ? "newest"
          : "relevance",
      page,
      limit,
    }),
  ]);

  return (
    <SearchClient
      initialProducts={searchResult.products}
      total={searchResult.total}
      page={searchResult.page ?? 1}
      totalPages={searchResult.totalPages ?? 1}
      categories={categories.filter((c) => c.isActive)}
      currentQuery={q}
      currentCategory={category}
      currentBrand={brand}
      currentPartType={partType}
      currentCondition={condition}
      currentSort={sort}
      currentMake={make}
      currentModel={model}
      currentYear={params.year}
      inStockOnly={inStockOnly}
    />
  );
}

export default function SparePartsSearchPage(props: {
  searchParams?: Promise<SearchParamsObj>;
}) {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh", background: "#0b1120" }} />}>
      <SearchContent searchParams={props.searchParams} />
    </Suspense>
  );
}

