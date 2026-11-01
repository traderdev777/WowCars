import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { verifySessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("wowcars_admin_session")?.value;
    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    }

    const session = verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    }

    if (session.role === "DEALER" && session.dealerId) {
      const dealer = await db.getDealerById(session.dealerId);
      if (!dealer) {
        return NextResponse.json(
          { authenticated: false },
          { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
        );
      }
      return NextResponse.json(
        {
          authenticated: true,
          role: "DEALER",
          dealer: {
            id: dealer.id,
            name: dealer.name,
            slug: dealer.slug,
            locality: dealer.locality,
            cityName: dealer.cityName,
            approvalStatus: dealer.approvalStatus,
          },
        },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    }

    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { authenticated: false },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        role: auth.admin.role,
        admin: {
          id: auth.admin.id,
          username: auth.admin.username,
          fullName: auth.admin.fullName,
          email: auth.admin.email,
          role: auth.admin.role,
        },
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
    console.error("Auth check error:", error);
    return NextResponse.json(
      { authenticated: false },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
