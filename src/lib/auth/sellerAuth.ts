/**
 * WowCars — Spare Parts Seller Portal Authentication & Multi-Tenancy Guard
 * Enforces seller account isolation: a seller may only access their own
 * products, profile, inventory, and assigned marketplace orders.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SessionPayload } from "./session";
import { db } from "../db";
import { PartSeller } from "../db/types";

export type SellerAuthResult =
  | { authorized: true; session: SessionPayload; seller: PartSeller }
  | { authorized: false; response: NextResponse };

/**
 * Enforces authenticated seller session scoped strictly to their sellerId
 */
export async function authenticateSeller(req: NextRequest): Promise<SellerAuthResult> {
  const token = req.cookies.get("wowcars_admin_session")?.value;
  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized. Seller session required." },
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

  // Handle SELLER role
  if (session.role !== "SELLER" || !session.sellerId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden. Scoped seller account required." },
        {
          status: 403,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      ),
    };
  }

  const seller = await db.getPartSellerById(session.sellerId);
  if (!seller) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized. Seller profile not found." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      ),
    };
  }

  if (seller.status === "SUSPENDED") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Account suspended. Please contact WowCars Marketplace Operations." },
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
    seller,
  };
}
