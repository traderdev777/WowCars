import { NextResponse } from "next/server";
import { clearCustomerSessionCookie } from "@/lib/auth/customerAuth";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });
  clearCustomerSessionCookie(response);
  return response;
}
