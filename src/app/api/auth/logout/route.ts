import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  // If an active session token is present, invalidate on server-side as well
  const token = req.cookies.get("wowcars_admin_session")?.value;
  if (token) {
    const session = verifySessionToken(token);
    if (session && session.userId) {
      await db.invalidateAdminSessions(session.userId);
    }
  }

  const response = NextResponse.json(
    {
      success: true,
      message: "Logged out successfully. All sessions invalidated.",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );

  response.cookies.set({
    name: "wowcars_admin_session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
