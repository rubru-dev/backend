import { NextRequest, NextResponse } from "next/server";

/**
 * Route protection middleware.
 *
 * Strategy:
 *  - /login  → redirect to /dashboard if already authenticated
 *  - /dashboard/* and other protected routes → redirect to /login if not authenticated
 *
 * Auth state is checked via the "auth-storage" key that Zustand persist
 * writes to localStorage (not accessible in middleware, which runs on the Edge).
 * We use a lightweight httpOnly cookie ("is_authed") set on login to signal
 * authentication to the middleware without exposing tokens.
 *
 * Alternatively, we read the Zustand persisted state from the cookie (if SSR
 * is not needed, a simple cookie flag is the cleanest approach).
 */

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/bd", "/content", "/leads", "/telemarketing", "/desain", "/sales", "/projek", "/finance", "/pic", "/admin", "/absen", "/karyawan"];

// Routes accessible only when NOT authenticated
const AUTH_ROUTES = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthed = request.cookies.has("is_authed");

  // Redirect authenticated users away from login
  if (AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    if (isAuthed) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protect dashboard and feature routes
  if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) {
    if (!isAuthed) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
