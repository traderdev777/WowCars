import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { validateCsrf } from "@/lib/auth/csrf";
import { hasPermission } from "@/lib/auth/permissions";
import { DealerApprovalStatus, ModerationAction } from "@/lib/db/types";
import { validateIndianPincode, validateLocationHierarchy } from "@/lib/locations/indiaLocations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid && csrf.response) {
      return csrf.response;
    }

    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    // Role-based least-privilege check: only authorized verification officers/operations/super-admin
    if (
      !hasPermission(auth.admin.role, "dealers:approve") &&
      !hasPermission(auth.admin.role, "dealers:suspend") &&
      !hasPermission(auth.admin.role, "dealers:verify")
    ) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions for dealer moderation." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const {
      action,
      approvalStatus,
      isVerified,
      stateId,
      districtId,
      cityId,
      cityName,
      pincode,
      rejectionReason,
      legalBusinessName,
      gstin,
      pan,
      authorizedSignatory,
      contactEmail,
      kycStatus,
      accountStatus,
    } = body;

    const existingDealer = await db.getDealerById(id);
    if (!existingDealer) {
      return NextResponse.json({ error: "Dealership not found." }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    // 1. Approval status update (Supporting explicit account & listing permissions)
    let targetStatus: DealerApprovalStatus | undefined;
    if (approvalStatus) {
      targetStatus = approvalStatus;
    } else if (action === "APPROVE_ENABLE_LISTING") {
      targetStatus = "APPROVED_LISTING_ENABLED";
      updates.listingEnabled = true;
    } else if (action === "APPROVE" || action === "VERIFY") {
      targetStatus = "APPROVED";
      // If action is simple APPROVE, check if listingEnabled is specified, otherwise keep current or default
      if (body.listingEnabled !== undefined) {
        updates.listingEnabled = Boolean(body.listingEnabled);
      }
    } else if (action === "ENABLE_LISTING") {
      updates.listingEnabled = true;
      if (existingDealer.approvalStatus === "APPROVED") {
        targetStatus = "APPROVED_LISTING_ENABLED";
      }
    } else if (action === "DISABLE_LISTING") {
      updates.listingEnabled = false;
      if (existingDealer.approvalStatus === "APPROVED_LISTING_ENABLED") {
        targetStatus = "APPROVED";
      }
    } else if (action === "REACTIVATE") {
      targetStatus = "APPROVED";
      updates.accountStatus = "ACTIVE";
      if (body.listingEnabled !== undefined) {
        updates.listingEnabled = Boolean(body.listingEnabled);
      }
    } else if (action === "REJECT") {
      targetStatus = "REJECTED";
      updates.listingEnabled = false;
    } else if (action === "SUSPEND" || action === "REVOKE") {
      targetStatus = "SUSPENDED";
      updates.listingEnabled = false;
    } else if (action === "UNDER_VERIFICATION") {
      targetStatus = "UNDER_VERIFICATION";
      updates.listingEnabled = false;
    } else if (action === "INACTIVE" || action === "DEACTIVATE") {
      targetStatus = "INACTIVE";
      updates.listingEnabled = false;
    } else if (action === "APPLICATION_RECEIVED" || action === "APPLICATION_PENDING") {
      targetStatus = "APPLICATION_PENDING";
      updates.listingEnabled = false;
    }

    if (body.listingEnabled !== undefined) {
      updates.listingEnabled = Boolean(body.listingEnabled);
    }

    if (targetStatus) {
      updates.approvalStatus = targetStatus;
      updates.isVerified = targetStatus === "APPROVED" || targetStatus === "APPROVED_LISTING_ENABLED";
      updates.accountStatus = (targetStatus === "APPROVED" || targetStatus === "APPROVED_LISTING_ENABLED")
        ? "ACTIVE"
        : (accountStatus || (targetStatus === "INACTIVE" || targetStatus === "SUSPENDED" ? "SUSPENDED" : "PENDING"));
      updates.reviewedBy = auth.admin.username;
      updates.reviewedAt = new Date().toISOString();
      if (rejectionReason) updates.rejectionReason = rejectionReason;

      // When dealer is approved, update their district expansion status to COVERED
      if ((targetStatus === "APPROVED" || targetStatus === "APPROVED_LISTING_ENABLED") && existingDealer.districtId) {
        await db.updateDistrict(existingDealer.districtId, { expansionStatus: "COVERED" });
      }

      // Visibility Policy on Suspension:
      // When a dealer is suspended, automatically hide their active vehicles from public search
      // while strictly preserving all inventory records and lead history.
      if (targetStatus === "SUSPENDED") {
        updates.listingEnabled = false;
        try {
          const activeDealerCars = await db.getCars({ dealerId: id, status: "ACTIVE", limit: 500 });
          for (const car of activeDealerCars.cars) {
            await db.updateCar(car.id, { status: "SUSPENDED" });
          }
        } catch (suspErr) {
          console.warn("Failed to suspend dealer vehicles:", suspErr);
        }
      }

      // When reactivating/approving a previously suspended dealer, optionally restore listings
      if ((targetStatus === "APPROVED" || targetStatus === "APPROVED_LISTING_ENABLED") && existingDealer.approvalStatus === "SUSPENDED") {
        try {
          const suspendedDealerCars = await db.getCars({ dealerId: id, status: "SUSPENDED", limit: 500 });
          for (const car of suspendedDealerCars.cars) {
            await db.updateCar(car.id, { status: "ACTIVE" });
          }
        } catch (resErr) {
          console.warn("Failed to restore suspended dealer vehicles:", resErr);
        }
      }
    } else if (typeof isVerified === "boolean") {
      updates.isVerified = isVerified;
      updates.approvalStatus = isVerified ? "APPROVED" : "APPLICATION_PENDING";
    }

    // Legal and KYC fields
    if (legalBusinessName) updates.legalBusinessName = legalBusinessName;
    if (gstin) updates.gstin = gstin;
    if (pan) updates.pan = pan;
    if (authorizedSignatory) updates.authorizedSignatory = authorizedSignatory;
    if (contactEmail) updates.contactEmail = contactEmail;
    if (kycStatus) updates.kycStatus = kycStatus;
    if (accountStatus) updates.accountStatus = accountStatus;

    // 2. Location Assignment Update
    if (stateId && districtId) {
      const [allStates, allDistricts, allCities] = await Promise.all([
        db.getStates(),
        db.getDistricts(),
        db.getCities(),
      ]);

      const validation = validateLocationHierarchy(
        stateId,
        districtId,
        allStates,
        allDistricts,
        allCities,
        cityId || cityName
      );

      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || "Invalid location hierarchy." },
          { status: 400 }
        );
      }

      const pinCheck = pincode ? validateIndianPincode(pincode) : null;
      if (pinCheck && !pinCheck.valid) {
        return NextResponse.json(
          { error: pinCheck.error || "Invalid PIN code. Must be a 6-digit Indian PIN code." },
          { status: 400 }
        );
      }

      const state = allStates.find((s) => s.id === stateId);
      const district = allDistricts.find((d) => d.id === districtId);

      updates.stateId = state?.id;
      updates.stateName = state?.name;
      updates.districtId = district?.id;
      updates.districtName = district?.name;
      if (cityId) updates.cityId = cityId;
      if (cityName || validation.city?.name) updates.cityName = cityName || validation.city?.name;
      if (pincode) updates.pincode = pincode.trim();
    }

    const updated = await db.updateDealer(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Failed to update dealer." }, { status: 500 });
    }

    // Log tamper-evident audit event for all dealer approval/rejection/status changes
    try {
      await db.createModerationEvent({
        carId: "",
        carListingCode: `DEALER:${existingDealer.id}`,
        adminId: auth.admin.id,
        adminName: auth.admin.username,
        action: (
          action === "ENABLE_LISTING" ? "DEALER_ENABLE_LISTING" :
          action === "DISABLE_LISTING" ? "DEALER_DISABLE_LISTING" :
          action === "APPROVE_ENABLE_LISTING" ? "DEALER_APPROVED_LISTING_ENABLED" :
          targetStatus ? `DEALER_${targetStatus}` : "DEALER_MODERATION"
        ) as unknown as ModerationAction,
        reason: rejectionReason || body.notes || `Dealer status changed: ${existingDealer.approvalStatus} -> ${targetStatus || (updates.approvalStatus as string) || "UPDATED"}, listingEnabled: ${updates.listingEnabled !== undefined ? updates.listingEnabled : existingDealer.listingEnabled}`,
        entityType: "DEALER",
        previousStatus: existingDealer.approvalStatus,
        newStatus: targetStatus || (updates.approvalStatus as string) || existingDealer.approvalStatus,
      });
    } catch (auditErr) {
      console.warn("Audit event logging notice:", auditErr);
    }

    return NextResponse.json(
      {
        success: true,
        dealer: updated,
        message: `Dealership "${updated.name}" updated by ${auth.admin.username}.`,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err: unknown) {
    console.error("POST /api/admin/dealers/[id]/moderate error:", err);
    return NextResponse.json(
      { error: "Failed to update dealership status or location." },
      { status: 500 }
    );
  }
}
