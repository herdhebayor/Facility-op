import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Location from "@/models/Location";
import { requireSession } from "@/lib/requireSession";
import mongoose from "mongoose";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  await connectDB();
  const locations = await Location.find({ companyId: session.companyId }).sort({ name: 1 }).lean();
  return NextResponse.json({ locations });
}

// POST /api/locations - managers/admins add a location their company manages
export async function POST(req) {
  const { session, error } = await requireSession(["manager", "admin"]);
  if (error) return error;

  const { name, address, timezone } = await req.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  await connectDB();
  const location = await Location.create({
    companyId: session.companyId,
    name,
    address,
    timezone,
  });

  return NextResponse.json({ location }, { status: 201 });
}

export async function PATCH(req) {
  const { session, error } = await requireSession(["admin"]);
  if (error) return error;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const { locationId } = body || {};
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  if (!mongoose.isValidObjectId(locationId) || !name || name.length > 120 || address.length > 240) {
    return NextResponse.json({ error: "A valid location, name, and address are required" }, { status: 400 });
  }
  await connectDB();
  const location = await Location.findOneAndUpdate(
    { _id: locationId, companyId: session.companyId },
    { $set: { name, address } },
    { new: true, runValidators: true },
  ).lean();
  if (!location) return NextResponse.json({ error: "Location not found" }, { status: 404 });
  return NextResponse.json({ location });
}
