import { auth } from "@/app/(auth)/auth";
import { type NextRequest, NextResponse } from "next/server";
import { guestRegex } from "./lib/constants";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Playwright test endpoint
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Skip auth routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Get the session using the new `auth()` helper
  const session = await auth();

  // Not logged in → redirect to guest login
  if (!session) {
    const redirectUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, request.url)
    );
  }

  const userEmail = session.user?.email ?? "";
  const isGuest = guestRegex.test(userEmail);

  // If authenticated and not a guest, block login/register
  if (!isGuest && ["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",

    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
