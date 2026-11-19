import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "facility_session";
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET
);

async function createSessionToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}


export default async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/unauthorize") ||
    pathname.startsWith("/error") 
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) {
    return isPublicRoute ? res : NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = await verifySessionToken(cookie);
  if (!payload) {
    res.cookies.delete(COOKIE_NAME);
    return isPublicRoute ? res : NextResponse.redirect(new URL("/login", req.url));
  }

  const userData = Object.fromEntries(
    Object.entries(payload).filter(([key]) => !["iat", "exp", "nbf"].includes(key))
  );
  const refreshToken = await createSessionToken(userData);

  res.cookies.set({
    name: COOKIE_NAME,
    value: refreshToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  if (isPublicRoute) return res;

  const role = payload.role;
  if (typeof payload.userId !== "string" || typeof role !== "string") {
    res.cookies.delete(COOKIE_NAME);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/settings") && role === "admin") {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};