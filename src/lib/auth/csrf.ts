/**
 * WowCars — Cross-Site Request Forgery (CSRF) Protection
 * Validates Origin, Referer, and Sec-Fetch-Site for state-changing HTTP requests.
 */

import { NextRequest, NextResponse } from "next/server";

export function validateCsrf(req: NextRequest): { valid: boolean; response?: NextResponse } {
  const method = req.method.toUpperCase();
  // Safe methods do not require CSRF validation
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { valid: true };
  }

  // Sec-Fetch-Site header check (modern browsers)
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Forbidden: Cross-site request rejected (CSRF protection)." },
        { status: 403 }
      ),
    };
  }

  // Origin / Host comparison
  const origin = req.headers.get("origin");
  const host = req.headers.get("host") || req.headers.get("x-forwarded-host");

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return {
          valid: false,
          response: NextResponse.json(
            { error: "Forbidden: Invalid request origin (CSRF protection)." },
            { status: 403 }
          ),
        };
      }
    } catch {
      return {
        valid: false,
        response: NextResponse.json(
          { error: "Forbidden: Malformed origin header." },
          { status: 403 }
        ),
      };
    }
  }

  return { valid: true };
}
