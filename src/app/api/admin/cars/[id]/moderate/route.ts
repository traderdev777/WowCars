import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { validateCsrf } from "@/lib/auth/csrf";
import { ModerationAction } from "@/lib/db/types";



export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid && csrf.response) {
      return csrf.response;
    }

    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Car ID is required." }, { status: 400 });
    }

    const body = await req.json();
    const action = body.action as ModerationAction;
    const reason = body.reason || "";

    const validActions: ModerationAction[] = [
      "APPROVED",
      "REJECTED",
      "MARKED_SOLD",
      "RESTORED",
      "REQUEST_CHANGES",
      "SUSPEND"
    ];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Invalid moderation action: "${action}"` }, { status: 400 });
    }

    if ((action === "REJECTED" || action === "REQUEST_CHANGES") && !reason.trim()) {
      return NextResponse.json({ error: `Reason is required when ${action === "REJECTED" ? "rejecting" : "requesting changes on"} a listing.` }, { status: 400 });
    }

    const updated = await db.updateCarStatus(id, action, auth.session.userId, auth.session.username, reason);
    if (!updated) {
      return NextResponse.json({ error: "Car not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        car: updated,
        action,
        message: `Listing ${updated.listingCode} successfully ${action.toLowerCase()}.`,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Moderation action error:", error);
    return NextResponse.json({ error: "Failed to process moderation action." }, { status: 500 });
  }
}
