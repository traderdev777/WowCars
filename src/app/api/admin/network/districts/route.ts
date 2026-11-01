import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { ExpansionStatus } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const stateId = searchParams.get("stateId") || undefined;
    const uncoveredOnly = searchParams.get("uncoveredOnly") === "true";
    const format = searchParams.get("format");

    let metrics = await db.getDistrictCoverageMetrics(stateId);

    if (uncoveredOnly) {
      metrics = metrics.filter((m) => m.networkStatus === "Uncovered");
    }

    // CSV Export support
    if (format === "csv") {
      const headers = [
        "District ID",
        "District Name",
        "State ID",
        "State Name",
        "Network Status",
        "Total Dealers",
        "Active Approved Dealers",
        "Pending Applications",
        "Active Listings",
        "Buyer Enquiries",
        "Expansion Status",
        "Expansion Owner",
        "Follow Up Date",
        "Latest Registration",
      ];

      const csvRows = [headers.join(",")];
      for (const m of metrics) {
        const row = [
          `"${m.districtId}"`,
          `"${(m.districtName || "").replace(/"/g, '""')}"`,
          `"${m.stateId}"`,
          `"${(m.stateName || "").replace(/"/g, '""')}"`,
          `"${m.networkStatus}"`,
          m.totalDealers,
          m.activeApprovedDealers,
          m.pendingApplications,
          m.activeVehicleListings,
          m.buyerEnquiries,
          `"${m.expansionStatus}"`,
          `"${(m.expansionOwner || "Unassigned").replace(/"/g, '""')}"`,
          `"${m.followUpDate || "Not set"}"`,
          `"${m.latestRegistrationDate || "None"}"`,
        ];
        csvRows.push(row.join(","));
      }

      const csvContent = csvRows.join("\n");
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="wowcars-dealer-network-${stateId || "pan-india"}-${Date.now()}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(
      { success: true, districts: metrics, total: metrics.length },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;
    console.error("GET /api/admin/network/districts error:", error);
    return NextResponse.json({ error: "Failed to retrieve district coverage metrics." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();
    const { districtId, expansionStatus, expansionOwner, expansionNotes, followUpDate, isActive, name } = body;

    if (!districtId) {
      return NextResponse.json({ error: "districtId is required." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (expansionStatus !== undefined) {
      const validStatuses: ExpansionStatus[] = ["NOT_STARTED", "OUTREACH", "APPLICATIONS_RECEIVED", "ONBOARDING", "COVERED"];
      if (!validStatuses.includes(expansionStatus)) {
        return NextResponse.json({ error: `Invalid expansionStatus. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
      }
      updates.expansionStatus = expansionStatus;
    }

    if (expansionOwner !== undefined) updates.expansionOwner = expansionOwner ? String(expansionOwner).trim() : null;
    if (expansionNotes !== undefined) updates.expansionNotes = expansionNotes ? String(expansionNotes).trim() : null;
    if (followUpDate !== undefined) updates.followUpDate = followUpDate ? String(followUpDate).trim() : null;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (name !== undefined) updates.name = String(name).trim();

    const updated = await db.updateDistrict(districtId, updates);
    if (!updated) {
      return NextResponse.json({ error: "District not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      district: updated,
      message: `District "${updated.name}" updated successfully.`,
    });
  } catch (error: unknown) {
    console.error("PATCH /api/admin/network/districts error:", error);
    return NextResponse.json({ error: "Failed to update district." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();
    const { stateId, name } = body;

    if (!stateId || !name) {
      return NextResponse.json({ error: "stateId and name are required." }, { status: 400 });
    }

    const state = await db.getStateById(stateId);
    if (!state) {
      return NextResponse.json({ error: `State with ID ${stateId} does not exist.` }, { status: 400 });
    }

    const created = await db.createDistrict({
      stateId: state.id,
      stateCode: state.code,
      stateName: state.name,
      name: name.trim(),
      slug: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-"),
      isActive: true,
      expansionStatus: "NOT_STARTED",
    });

    return NextResponse.json({
      success: true,
      district: created,
      message: `District "${created.name}" created under ${state.name}.`,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/admin/network/districts error:", error);
    return NextResponse.json({ error: "Failed to create district." }, { status: 500 });
  }
}
