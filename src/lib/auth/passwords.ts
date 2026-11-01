/**
 * WowCars — Zero-Dependency Secure Password Hashing
 * Built on Node.js native crypto (PBKDF2-HMAC-SHA512 with 100,000 rounds)
 * NIST SP 800-132 compliant, timing-safe verification, zero external binary dependencies.
 */

import crypto from "crypto";

const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

/**
 * Hash a plaintext password with a cryptographically secure random salt
 * Stored format: iterations$salt$derivedKey (hex)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return `${ITERATIONS}$${salt}$${derivedKey}`;
}

/**
 * Timing-safe password verification preventing timing-attack side channels
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;

    const iterations = parseInt(parts[0], 10);
    const salt = parts[1];
    const originalHash = Buffer.from(parts[2], "hex");

    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, originalHash.length, DIGEST);
    return crypto.timingSafeEqual(originalHash, derivedKey);
  } catch {
    return false;
  }
}
