import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { CustomerOTP } from "@/lib/db/types";

function hashOTP(otp: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPhone = String(body.phone || "").trim();
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

    // Validate 10-digit Indian mobile number starting with 6, 7, 8, or 9
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: "Invalid mobile number. Please enter a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    const now = Date.now();
    const latestOTP = await db.getLatestCustomerOTP(cleanPhone);

    // Rate limiting: Cannot request more than once every 45 seconds
    if (latestOTP && !latestOTP.isUsed) {
      const elapsedMs = now - new Date(latestOTP.createdAt).getTime();
      if (elapsedMs < 45000) {
        const waitSec = Math.ceil((45000 - elapsedMs) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSec} seconds before requesting a new OTP.` },
          { status: 429 }
        );
      }
    }

    // Generate secure 6-digit numeric OTP
    const otpValue = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = crypto.randomBytes(8).toString("hex");
    const otpHash = hashOTP(otpValue, salt);

    const otpRecord: CustomerOTP = {
      id: `otp_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      phone: cleanPhone,
      otpHash: `${salt}:${otpHash}`,
      expiresAt: new Date(now + 10 * 60 * 1000).toISOString(), // 10 minutes
      attempts: 0,
      isUsed: false,
      createdAt: new Date(now).toISOString(),
    };

    await db.saveCustomerOTP(otpRecord);

    const isDev = process.env.NODE_ENV !== "production" || !process.env.SMS_GATEWAY_API_KEY;

    return NextResponse.json({
      success: true,
      message: `OTP sent successfully to +91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`,
      ...(isDev ? { demoOtp: otpValue } : {}),
    });
  } catch (error) {
    console.error("Error in send-otp:", error);
    return NextResponse.json(
      { error: "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}
