
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import User from "@/models/User";
import { connectDB } from "@/lib/mongodb";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
export const COOKIE_NAME = "facility_session";

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Payload: { userId, companyId, role, locationId }
export async function createSessionToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h, matches token expiry
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Server-side helper: read + verify the current session from the request cookies.
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSessionUser() {
  const session = await getSession();
  if (!session) return null;

  if (session.name && session.email) {
    return {
      userId: session.userId || null,
      companyId: session.companyId || null,
      name: session.name || null,
      email: session.email || null,
      role: session.role || null,
      shiftStatus: session.shiftStatus || 'admin',
      staffType: session.staffType || null,
      locationId: session.locationId || session.locationIds?.[0] || null,
    };
  }

  try {
    await connectDB();
    const user = await User.findById(session.userId).select("-passwordHash").lean();

    if (!user) return null;

    return {
      userId: user._id?.toString?.() || session.userId || null,
      companyId: user.companyId?.toString?.() || session.companyId || null,
      name: user.name || null,
      email: user.email || null,
      role: user.role || session.role || null,
      shiftStatus: user.shiftStatus || session.shiftStatus || null,
      staffType: user.staffType || session.staffType || null,
      locationId: user.locationId?.toString() || session.locationId || session.locationIds?.[0] || null,
    };
  } catch {
    return {
      userId: session.userId || null,
      companyId: session.companyId || null,
      name: session.name || null,
      email: session.email || null,
      role: session.role || null,
      staffType: session.staffType || null,
      shiftStatus: session.shiftStatus || null,
      locationId: session.locationId || session.locationIds?.[0] || null,
    };
  }
}

export { COOKIE_NAME };
