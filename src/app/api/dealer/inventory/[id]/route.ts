import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateDealer } from "@/lib/auth/dealerAuth";
import { validateCsrf } from "@/lib/auth/csrf";
import { canDealerList } from "@/lib/db/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid && csrf.response) {
      return csrf.response;
    }

    const auth = await authenticateDealer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    // Explicit listing permission check: dealer must be approved and listingEnabled
    if (!canDealerList(auth.dealer)) {
      return NextResponse.json(
        {
          error: "Listing permission required. Your dealership account must be approved and authorized for vehicle listings by WowCars administrators before modifying listings.",
          approvalStatus: auth.dealer.approvalStatus,
          listingEnabled: Boolean(auth.dealer.listingEnabled),
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Vehicle ID is required." }, { status: 400 });
    }

    const car = await db.getCarById(id);
    if (!car) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }

    // Ownership check on server:
    // A dealer CANNOT edit another dealer's vehicle by changing the ID in the request!
    if (car.dealerId !== auth.session.dealerId) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to modify this vehicle." },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Security invariant: Dealer can NEVER self-approve or activate a listing!
    if (body.status === "ACTIVE" || body.status === "APPROVED") {
      return NextResponse.json(
        { error: "Forbidden: Dealers cannot approve or activate listings directly. Listings must pass WowCars moderation." },
        { status: 403 }
      );
    }

    const allowedStatusTransitions = ["SOLD", "UNAVAILABLE", "PENDING_APPROVAL", "PENDING_REVIEW", "DRAFT"];
    if (body.status && !allowedStatusTransitions.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status transition: "${body.status}". Permitted actions: SOLD, UNAVAILABLE, PENDING_REVIEW.` },
        { status: 400 }
      );
    }

    const updates: Partial<typeof car> = {};

    if (body.priceINR !== undefined) {
      const p = Number(body.priceINR);
      if (isNaN(p) || p <= 10000) {
        return NextResponse.json({ error: "Invalid price." }, { status: 400 });
      }
      updates.priceINR = Math.round(p);
    }

    if (body.kmDriven !== undefined) {
      const km = Number(body.kmDriven);
      if (isNaN(km) || km < 0 || km > 500000) {
        return NextResponse.json({ error: "Invalid kilometers driven." }, { status: 400 });
      }
      updates.kmDriven = Math.round(km);
    }

    if (body.overview !== undefined) {
      updates.overview = String(body.overview).trim();
    }

    if (body.status !== undefined) {
      updates.status = body.status;
    }

    if (Array.isArray(body.images)) {
      updates.images = body.images.filter(
        (img: unknown) => typeof img === "string" && (img.startsWith("/uploads/") || img.startsWith("/demo/"))
      );
    }

    const updated = await db.updateCar(id, updates);

    return NextResponse.json({
      success: true,
      car: updated,
      message: `Vehicle ${updated?.listingCode || id} updated successfully.`,
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;
    console.error("PATCH /api/dealer/inventory/[id] error:", error);
    return NextResponse.json({ error: "Failed to update vehicle." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid && csrf.response) {
      return csrf.response;
    }

    const auth = await authenticateDealer(req);
    if (!auth.authorized) {
      return auth.response;
    }

    if (!canDealerList(auth.dealer)) {
      return NextResponse.json(
        { error: "Listing permission required. Your dealership account must be approved and authorized." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Vehicle ID is required." }, { status: 400 });
    }

    const car = await db.getCarById(id);
    if (!car) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }

    // Tenancy isolation invariant: Dealer cannot delete another dealer's vehicle
    if (car.dealerId !== auth.session.dealerId) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete this vehicle." },
        { status: 403 }
      );
    }

    // Safely transition status to UNAVAILABLE (preserving history)
    const updated = await db.updateCar(id, { status: "UNAVAILABLE" });

    return NextResponse.json({
      success: true,
      message: `Vehicle ${car.listingCode || id} marked as unavailable.`,
      car: updated,
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;
    console.error("DELETE /api/dealer/inventory/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete vehicle." }, { status: 500 });
  }
}
