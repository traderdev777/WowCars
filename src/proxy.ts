/**
 * WowCars — Staging Access Control, HTTPS Enforcement & Anti-Indexing Middleware
 *
 * Protections:
 * 1. Anti-Indexing: Emits `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` on staging.
 * 2. HTTPS Enforcement: Redirects insecure HTTP requests to HTTPS for authenticated/sensitive paths.
 * 3. HSTS & Security Headers: Enforces Strict-Transport-Security and X-Content-Type-Options.
 * 4. Staging Access Protection: When STAGING_PROTECTION_KEY is set, gates unauthenticated visitors.
 */

import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const host = req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const isProduction = process.env.NODE_ENV === "production";
  const isStaging =
    process.env.IS_STAGING === "true" ||
    process.env.NEXT_PUBLIC_IS_STAGING === "true" ||
    host.startsWith("staging.") ||
    host.includes("staging");

  // 1. HTTPS Enforcement for Production / Staging
  // If request arrives over plain HTTP in production for sensitive or authenticated routes, enforce HTTPS
  const isSensitivePath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/sell");

  if (isProduction && proto === "http" && isSensitivePath) {
    const httpsUrl = new URL(req.url);
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, { status: 308 });
  }

  // 2. Staging Gate: Optional access protection if STAGING_PROTECTION_KEY is set
  const stagingKey = process.env.STAGING_PROTECTION_KEY;
  if (isStaging && stagingKey && !pathname.startsWith("/_next") && !pathname.startsWith("/api/")) {
    const keyParam = searchParams.get("staging_key");
    const stagingCookie = req.cookies.get("wowcars_staging_auth")?.value;

    if (keyParam === stagingKey) {
      // Set cookie and redirect to clean URL
      const cleanUrl = new URL(req.url);
      cleanUrl.searchParams.delete("staging_key");
      const res = NextResponse.redirect(cleanUrl);
      res.cookies.set("wowcars_staging_auth", stagingKey, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return res;
    }

    if (stagingCookie !== stagingKey) {
      return new NextResponse(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Private Staging — WowCars</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0c0d0e; color: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { background: #16181b; padding: 2.5rem; border-radius: 12px; border: 1px solid #2d3139; max-width: 440px; text-align: center; }
    h1 { color: #ffffff; font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #9ca3af; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
    form { display: flex; gap: 0.5rem; }
    input[type="password"] { flex: 1; padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid #374151; background: #0c0d0e; color: #ffffff; font-size: 0.95rem; }
    button { background: #e11d48; color: #ffffff; border: none; padding: 0.75rem 1.25rem; border-radius: 6px; font-weight: 600; cursor: pointer; }
    button:hover { background: #be123c; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Private Staging Access</h1>
    <p>This staging environment is private. Please enter the staging authorization key to preview the marketplace.</p>
    <form method="GET" action="">
      <input type="password" name="staging_key" placeholder="Enter Staging Key" required autofocus>
      <button type="submit">Access</button>
    </form>
  </div>
</body>
</html>`,
        {
          status: 401,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
          },
        }
      );
    }
  }

  // 3. Process Request and Apply Headers
  const response = NextResponse.next();

  // Strict anti-indexing on staging environments
  if (isStaging) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  }

  // Standard Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  if (proto === "https" || isProduction) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images in public
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
