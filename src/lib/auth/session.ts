/**
 * WowCars — Secure Stateless Session Token Engine
 * Zero-dependency, HMAC-SHA256 signed session tokens.
 * Stored exclusively in HttpOnly, Secure, SameSite=Lax cookies.
 */

import crypto from "crypto";
import { AdminRole } from "../db/types";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    console.warn("⚠️ [SECURITY WARNING] SESSION_SECRET / JWT_SECRET is not set in production environment variables! Please configure a 64-byte random secret in cPanel.");
  }
  return "wowcars-platform-hmac-sha256-default-dev-secret-replace-in-production-64bytes";
}

const SESSION_DURATION_HOURS = 24;

export interface SessionPayload {
  userId: string;
  username: string;
  role: AdminRole | "DEALER" | "SELLER";
  dealerId?: string;
  sellerId?: string;
  tokenVersion?: number; // Tracks credential rotation & revocation
  exp: number; // Unix timestamp seconds
}

/**
 * Generate a signed session token: base64Payload.hexSignature
 */
export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const secret = getSessionSecret();
  const exp = Math.floor(Date.now() / 1000) + SESSION_DURATION_HOURS * 3600;
  const fullPayload: SessionPayload = { ...payload, exp };
  const payloadEncoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadEncoded)
    .digest("hex");

  return `${payloadEncoded}.${signature}`;
}

/**
 * Verify and decode session token with timing-safe signature comparison
 */
export function verifySessionToken(token: string): SessionPayload | null {
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

    const payload: SessionPayload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
