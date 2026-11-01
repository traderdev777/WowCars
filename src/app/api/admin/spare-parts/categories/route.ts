import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const categories = await db.getPartCategories();
    return NextResponse.json({ categories }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Admin categories GET error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { name, slug, description, image, icon, displayOrder, isActive, subcategories } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const created = await db.createPartCategory({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description?.trim() || "",
      image: image || `/parts/categories/${slug.trim().toLowerCase()}.svg`,
      icon: icon || "Settings",
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 10,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      subcategories: Array.isArray(subcategories) ? subcategories : [],
    });

    return NextResponse.json({ success: true, category: created }, { status: 201 });
  } catch (error) {
    console.error("Admin category create error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
