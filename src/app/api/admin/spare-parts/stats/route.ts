import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const [productsRes, sellers, orders, enquiries, categories] = await Promise.all([
      db.getPartProducts({ limit: 1000 }),
      db.getPartSellers(),
      db.getPartOrders(),
      db.getPartEnquiries(),
      db.getPartCategories(),
    ]);

    const allProducts = productsRes.products;

    // Real computed metrics
    const publishedProducts = allProducts.filter((p) => p.status === "PUBLISHED").length;
    const pendingModerationProducts = allProducts.filter((p) => p.status === "PENDING_REVIEW").length;
    const draftProducts = allProducts.filter((p) => p.status === "DRAFT").length;
    const lowStockProducts = allProducts.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 5).length;
    const outOfStockProducts = allProducts.filter((p) => p.stockQuantity === 0 || p.status === "OUT_OF_STOCK").length;

    const totalSellers = sellers.length;
    const approvedSellers = sellers.filter((s) => s.status === "APPROVED").length;
    const pendingSellers = sellers.filter((s) => s.status === "APPLICATION_PENDING" || s.status === "UNDER_VERIFICATION").length;
    const suspendedSellers = sellers.filter((s) => s.status === "SUSPENDED").length;

    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => (o.paymentStatus === "PAID" || o.paymentStatus === "CONFIRMED") && o.orderStatus !== "CANCELLED")
      .reduce((acc, o) => acc + (o.totalAmount || o.totalINR || 0), 0);

    const pendingOrders = orders.filter((o) => ["PENDING_PAYMENT", "PAYMENT_CONFIRMED", "PROCESSING"].includes(o.orderStatus)).length;
    const dispatchedOrders = orders.filter((o) => o.orderStatus === "DISPATCHED").length;
    const deliveredOrders = orders.filter((o) => o.orderStatus === "DELIVERED").length;
    const returnsCount = orders.filter((o) => ["RETURN_REQUESTED", "RETURNED", "REFUNDED"].includes(o.orderStatus)).length;
    const openEnquiries = enquiries.filter((e) => e.status === "PENDING" || e.status === "IN_REVIEW").length;

    // Calculate category breakdown from published products
    const categoryCounts: Record<string, number> = {};
    for (const p of allProducts) {
      const slug = p.categorySlug || p.categoryId || "uncategorized";
      categoryCounts[slug] = (categoryCounts[slug] || 0) + 1;
    }

    const categoryStats = categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
      productCount: categoryCounts[cat.slug] || 0,
      isActive: cat.isActive,
    }));

    return NextResponse.json(
      {
        metrics: {
          totalProducts: allProducts.length,
          publishedProducts,
          pendingModerationProducts,
          draftProducts,
          lowStockProducts,
          outOfStockProducts,
          totalSellers,
          approvedSellers,
          pendingSellers,
          suspendedSellers,
          totalOrders,
          totalRevenue,
          pendingOrders,
          dispatchedOrders,
          deliveredOrders,
          returnsCount,
          openEnquiries,
        },
        categoryStats,
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("Admin spare parts stats error:", error);
    return NextResponse.json({ error: "Failed to load marketplace statistics" }, { status: 500 });
  }
}
