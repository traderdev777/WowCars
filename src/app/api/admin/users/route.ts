import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth/adminAuth";
import { validateCsrf } from "@/lib/auth/csrf";
import { hashPassword } from "@/lib/auth/passwords";
import { AdminRole } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const admins = await db.getAdmins();
    // Sanitize: Never expose passwordHash or tokenVersion
    const sanitized = admins.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));

    return NextResponse.json(
      { users: sanitized },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Admin users fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrf = validateCsrf(req);
    if (!csrf.valid && csrf.response) {
      return csrf.response;
    }

    const auth = await authenticateAdmin(req);
    if (!auth.authorized) {
      return auth.response;
    }

    // Only Super Admin or Admin role can provision new staff accounts
    if (auth.session.role !== "SUPER_ADMIN" && auth.session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can provision staff accounts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, password, fullName, email, role } = body;

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    const validRoles: AdminRole[] = ["SUPER_ADMIN", "OPERATIONS", "DEALER_MANAGER", "SUPPORT", "ADMIN"];
    const targetRole: AdminRole = validRoles.includes(role) ? role : "SUPPORT";

    // Check duplicate username
    const existing = await db.getAdminByUsername(username.trim());
    if (existing) {
      return NextResponse.json({ error: "An admin account with this username already exists." }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const created = await db.createAdmin({
      username: username.toLowerCase().trim(),
      email: email ? email.toLowerCase().trim() : `${username.toLowerCase().trim()}@wowcars.in`,
      fullName: fullName.trim(),
      passwordHash,
      role: targetRole,
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: created.id,
          username: created.username,
          email: created.email,
          fullName: created.fullName,
          role: created.role,
          isActive: created.isActive,
          createdAt: created.createdAt,
        },
        message: `Admin user @${created.username} created successfully with role ${created.role}.`,
      },
      { status: 201 }
    );
  } catch (error) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Admin user creation error:", error);
    return NextResponse.json({ error: "Failed to create staff account." }, { status: 500 });
  }
}
