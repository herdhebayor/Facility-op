import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";
import { requireSession } from "@/lib/requireSession";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

// POST /api/companies - register a new company + its first manager account.
// This is the entry point for the "different companies can register" flow.
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const { registrationKey, companyName, adminName, email, password } = body || {};

  const expectedKey = process.env.COMPANY_REGISTRATION_KEY;
  if (!expectedKey) {
    console.error("Company registration is disabled because COMPANY_REGISTRATION_KEY is not configured.");
    return NextResponse.json({ error: "Company registration is not configured." }, { status: 503 });
  }
  const providedKey = typeof registrationKey === "string" ? registrationKey : "";
  const expectedDigest = createHash("sha256").update(expectedKey).digest();
  const providedDigest = createHash("sha256").update(providedKey).digest();
  if (providedKey.length > 1024 || !timingSafeEqual(expectedDigest, providedDigest)) {
    return NextResponse.json({ error: "Invalid company registration key" }, { status: 403 });
  }

  if (!companyName || !adminName || !email || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  await connectDB();

  const existing = await Company.exists({});
  if (existing) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 409 });
  }


  const passwordHash = await hashPassword(password);
  const company = await Company.create({
    name: companyName,
    email: email.toLowerCase().trim(),
    locations: [],
    staffs:[]
  });

  const user = await User.create({
    companyId: company._id,
    name: adminName,
    department: "admin",
    isSetupComplete: true,
    email: email.toLowerCase().trim(),
    passwordHash,
    role: "admin",
    staffType: "admin",
    shiftStatus: "admin",
    locationId: null,
  });


  const token = await createSessionToken({
    userId: user._id.toString(),
    companyId: company._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    staffType: user.staffType,
    locationId: user.locationId?.toString() || null,
  });
  await setSessionCookie(token);

  return NextResponse.json(
    {user, user: { id: user._id, adminName: user.adminName, name: user.name, email: user.email, role: user.role } },
    { status: 201 }
  );
}

async function GET(req) { 
 const { session, error } = await requireSession();
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  if (session.companyId !== companyId) {
    return NextResponse.json({ error: "Unauthorized access to this company" }, { status: 403 });
  }

  const company = await Company.findById(companyId).lean();
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ company });
}

export { GET };
