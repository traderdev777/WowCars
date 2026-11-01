/**
 * WowCars — Administrative Authentication & Session Enforcement
 * Verifies signed session cookies, active user status, and tokenVersion revocation.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SessionPayload } from "./session";
import { db } from "../db";
import { AdminUser } from "../db/types";

export type AdminAuthResult =
  | { authorized: true; session: SessionPayload; admin: AdminUser }
  | { authorized: false; response: NextResponse };

/**
 * Enforce administrator authentication on API routes
 */
export async function authenticateAdmin(req: NextRequest): Promise<AdminAuthResult> {
  const token = req.cookies.get("wowcars_admin_session")?.value;
  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized. Administrative session cookie required." },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      ),
    };
  }

  const session = verifySessionToken(token);
  const adminRoles: string[] = [
    "ADMIN",
    "SUPER_ADMIN",
    "OPERATIONS",
    "DEALER_MANAGER",
    "SUPPORT",
    "VERIFICATION_OFFICER",
    "MODERATOR",
    "CRM_AGENT",
    "MARKETING_MANAGER",
    "PROCUREMENT_MANAGER",
    "OUTLET_MANAGER",
    "TECHNICIAN",
    "FRANCHISE_USER",
  ];
  if (!session || !adminRoles.includes(session.role)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden. Administrative role privileges required." },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      ),
    };
  }

  // Verify against database for user status and token revocation
  const admin = await db.getAdminById(session.userId);
  if (!admin || !admin.isActive) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized. Administrator account is disabled or does not exist." },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      ),
    };
  }

  // Token revocation check: if admin rotated password or logged out of all sessions,
  // admin.tokenVersion will be strictly greater than session.tokenVersion.
  const currentTokenVersion = admin.tokenVersion || 1;
  const sessionTokenVersion = session.tokenVersion || 1;

  if (currentTokenVersion !== sessionTokenVersion) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Session invalidated. Your password was recently changed or sessions were revoked. Please log in again." },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      ),
    };
  }

  return {
    authorized: true,
    session,
    admin,
  };
}
