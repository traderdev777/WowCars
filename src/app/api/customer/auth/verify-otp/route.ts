import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { createCustomerSessionToken, setCustomerSessionCookie } from "@/lib/auth/customerAuth";

function verifyOTPHash(otp: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const computedHash = crypto.createHmac("sha256", salt).update(otp).digest("hex");
    const h1 = Buffer.from(hash, "hex");
    const h2 = Buffer.from(computedHash, "hex");
    return h1.length === h2.length && crypto.timingSafeEqual(h1, h2);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPhone = String(body.phone || "").trim();
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
    const otp = String(body.otp || "").trim();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: "Invalid mobile number." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "OTP must be a 6-digit numeric code." },
        { status: 400 }
      );
    }

    const latestOTP = await db.getLatestCustomerOTP(cleanPhone);
    if (!latestOTP || latestOTP.isUsed) {
      return NextResponse.json(
        { error: "No active OTP request found. Please request a new OTP." },
        { status: 400 }
      );
    }

    const now = Date.now();
    if (new Date(latestOTP.expiresAt).getTime() < now) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (latestOTP.attempts >= 3) {
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new OTP." },
        { status: 429 }
      );
    }

    const isValid = verifyOTPHash(otp, latestOTP.otpHash);
    if (!isValid) {
      latestOTP.attempts += 1;
      return NextResponse.json(
        { error: `Incorrect OTP. ${3 - latestOTP.attempts} attempts remaining.` },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await db.markCustomerOTPUsed(latestOTP.id);

    // Find or create customer
    let customer = await db.getCustomerByPhone(cleanPhone);
    const timestamp = new Date().toISOString();

    if (!customer) {
      customer = await db.createCustomer({
        phone: cleanPhone,
        fullName: fullName || `Customer ${cleanPhone.slice(-4)}`,
        email: email || undefined,
        city: "Bengaluru",
        state: "Karnataka",
        status: "ACTIVE",
        isPhoneVerified: true,
        isEmailVerified: Boolean(email),
        marketingConsent: true,
        lastLoginAt: timestamp,
      });
    } else {
      customer = await db.updateCustomer(customer.id, {
        lastLoginAt: timestamp,
        isPhoneVerified: true,
        ...(fullName && customer.fullName.startsWith("Customer ") ? { fullName } : {}),
        ...(email && !customer.email ? { email, isEmailVerified: true } : {}),
      }) || customer;
    }

    // Create session token
    const token = createCustomerSessionToken({
      customerId: customer.id,
      phone: customer.phone,
      fullName: customer.fullName,
      email: customer.email,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      customer: {
        id: customer.id,
        phone: customer.phone,
        fullName: customer.fullName,
        email: customer.email,
        city: customer.city,
        state: customer.state,
      },
    });

    setCustomerSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Error in verify-otp:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP. Please try again." },
      { status: 500 }
    );
  }
}
