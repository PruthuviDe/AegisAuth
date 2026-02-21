// =============================================================================
// Next.js Middleware — Route Protection
// =============================================================================
// WHY middleware: Runs on the Edge before the page renders.
// Redirects unauthenticated users to /login and authenticated users away
// from auth pages — no flicker, no client-side redirect.
// NOTE: We check the refresh token cookie existence as a hint.
// The actual token validity is verified by the API.
// =============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAMES } from "./lib/constants";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasRefreshToken = request.cookies.has(COOKIE_NAMES.REFRESH_TOKEN);
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Redirect authenticated users away from auth pages
  if (hasRefreshToken && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to login
  if (!hasRefreshToken && !isPublicRoute && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
