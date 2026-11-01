/**
 * WowCars — Dealer Portal Authentication & Multi-Tenancy Guard
 * Enforces dealer account isolation: a dealer may only access their own
 * vehicles, profile, and assigned buyer test drive inquiries.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SessionPayload } from "./session";
import { db } from "../db";
import { Dealer } from "../db/types";

export type DealerAuthResult =
  | { authorized: true; session: SessionPayload; dealer: Dealer }
  | { authorized: false; response: NextResponse };

/**
 * Enforces authenticated dealer session scoped strictly to their dealerId
 */
export async function authenticateDealer(req: NextRequest): Promise<DealerAuthResult> {
  const token = req.cookies.get("wowcars_admin_session")?.value;
  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized. Dealer session required." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      ),
    };
  }

  const session = verifySessionToken(token);
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized. Invalid or expired session." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      ),
    };
  }

  // Handle both DEALER role and ADMIN acting on behalf if needed
  if (session.role !== "DEALER" || !session.dealerId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden. Scoped dealer account required." },
        {
          status: 403,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      ),
    };
  }

  const dealer = await db.getDealerById(session.dealerId);
  if (!dealer) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized. Dealer profile not found." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      ),
    };
  }

  if (dealer.approvalStatus === "SUSPENDED" || dealer.accountStatus === "SUSPENDED") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Account suspended. Please contact WowCars Partner Operations." },
        {
          status: 403,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      ),
    };
  }

  return {
    authorized: true,
    session,
    dealer,
  };
}
