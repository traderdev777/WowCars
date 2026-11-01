import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ExpansionStatus } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stateId = searchParams.get("stateId") || undefined;
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const expansionStatus = searchParams.get("expansionStatus") as ExpansionStatus | null;

    const districts = await db.getDistricts({
      stateId,
      isActive: activeOnly ? true : undefined,
      expansionStatus: expansionStatus || undefined,
    });

    return NextResponse.json({ districts, total: districts.length });
  } catch (err: unknown) {
    if ((err as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") throw err;
    console.error("GET /api/locations/districts error:", err);
    return NextResponse.json({ error: "Failed to fetch districts" }, { status: 500 });
  }
}
