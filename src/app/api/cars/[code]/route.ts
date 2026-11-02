import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth/session";
import { toPublicCar, toPublicDealer } from "@/lib/db/serializers";



export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ error: "Missing listing identifier" }, { status: 400 });
    }

    const car = await db.getCarByListingCode(code);
    if (!car) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Security invariant: Pending/rejected/draft listings must not leak to anonymous visitors
    if (car.status !== "ACTIVE" && car.status !== "APPROVED") {
      const authCookie = req.cookies.get("wowcars_admin_session")?.value;
      const session = authCookie ? verifySessionToken(authCookie) : null;

      const adminRoles = ["ADMIN", "SUPER_ADMIN", "OPERATIONS", "MODERATOR", "DEALER_MANAGER"];
      const isAdmin = session?.role && adminRoles.includes(session.role);
      const isOwnerDealer = session?.role === "DEALER" && session?.dealerId === car.dealerId;

      if (!isAdmin && !isOwnerDealer) {
        return NextResponse.json(
          { error: "This listing is currently undergoing moderation and is not publicly visible." },
          { status: 404 }
        );
      }
    }

    // Attach sanitized public dealer details if available (zero private contact info)
    let publicDealer = null;
    if (car.dealerId) {
      const rawDealer = await db.getDealerById(car.dealerId);
      publicDealer = toPublicDealer(rawDealer);
    }

    // Fetch related vehicles (same body type or make, active only)
    const relatedResult = await db.getCars({
      status: "ACTIVE",
      bodyType: car.bodyType,
      limit: 4,
    });
    const related = relatedResult.cars
      .filter((c) => c.id !== car.id)
      .map((c) => toPublicCar(c));

    return NextResponse.json({
      success: true,
      car: toPublicCar(car),
      dealer: publicDealer,
      related,
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Error fetching car detail:", error);
    return NextResponse.json({ error: "Failed to retrieve vehicle details." }, { status: 500 });
  }
}
