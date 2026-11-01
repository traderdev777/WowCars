/**
 * WowCars — Customer Portal Authentication & Multi-Tenancy Guard
 * Enforces customer isolation for My Garage, Service Appointments, Orders, and Support.
 * Uses HMAC-SHA256 signed session tokens stored in HttpOnly SameSite=Lax cookies.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "../db";
import { Customer } from "../db/types";

export const CUSTOMER_COOKIE_NAME = "wowcars_customer_session";
const SESSION_DURATION_DAYS = 30; // Mobile app / customer persistence standard

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  return "wowcars-customer-hmac-sha256-default-secret-production-grade-64bytes";
}

export interface CustomerSessionPayload {
  customerId: string;
  phone: string;
  fullName: string;
  email?: string;
  role: "CUSTOMER";
  exp: number; // Unix timestamp seconds
}

export function createCustomerSessionToken(payload: Omit<CustomerSessionPayload, "exp" | "role">): string {
  const secret = getSessionSecret();
  const exp = Math.floor(Date.now() / 1000) + SESSION_DURATION_DAYS * 86400;
  const fullPayload: CustomerSessionPayload = { ...payload, role: "CUSTOMER", exp };
  const payloadEncoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadEncoded)
    .digest("hex");

  return `${payloadEncoded}.${signature}`;
}

export function verifyCustomerSessionToken(token: string): CustomerSessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadEncoded, signature] = parts;
    if (!payloadEncoded || !signature || signature.length !== 64 || !/^[0-9a-f]{64}$/i.test(signature)) {
      return null;
    }

    const secret = getSessionSecret();
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadEncoded)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payload: CustomerSessionPayload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Expired
    }

    if (payload.role !== "CUSTOMER") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export type CustomerAuthResult =
  | { authorized: true; session: CustomerSessionPayload; customer: Customer }
  | { authorized: false; response: NextResponse };

/**
 * Server-side customer authorization guard for API routes
 */
export async function authenticateCustomer(req: NextRequest): Promise<CustomerAuthResult> {
  const token = req.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication required. Please log in with your mobile OTP or email." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      ),
    };
  }

  const session = verifyCustomerSessionToken(token);
  if (!session || !session.customerId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Session expired or invalid. Please re-authenticate." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      ),
    };
  }

  const customer = await db.getCustomerById(session.customerId);
  if (!customer) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Customer account not found." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      ),
    };
  }

  if (customer.status === "SUSPENDED") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Account access is suspended. Please contact WowCars support." },
        {
          status: 403,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      ),
    };
  }

  return { authorized: true, session, customer };
}

export function setCustomerSessionCookie(res: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookies.set(CUSTOMER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 86400,
  });
}

export function clearCustomerSessionCookie(res: NextResponse): void {
  res.cookies.set(CUSTOMER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
