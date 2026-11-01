import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { db } from "@/lib/db";
import { PartStatus } from "@/lib/db/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const product = await db.getPartProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status, moderationReason } = body;

    const validStatuses: PartStatus[] = [
      "DRAFT",
      "PENDING_REVIEW",
      "PUBLISHED",
      "REJECTED",
      "OUT_OF_STOCK",
      "ARCHIVED",
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status provided" }, { status: 400 });
    }

    const updated = await db.updatePartProduct(id, {
      status,
      // Record moderation note in specifications or internal log if desired
    });

    return NextResponse.json({
      success: true,
      message: `Product ${product.title} status updated to ${status}`,
      product: updated,
    });
  } catch (error) {
    console.error("Admin product moderation error:", error);
    return NextResponse.json({ error: "Failed to update product status" }, { status: 500 });
  }
}
