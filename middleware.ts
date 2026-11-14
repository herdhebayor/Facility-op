import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "facility_session";
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret");

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

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return res;

  const payload = await verifySessionToken(cookie);
  if (!payload) {
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  const { iat, exp, nbf, ...userData } = payload as Record<string, unknown>;
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

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};