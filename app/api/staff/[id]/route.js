import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireSession } from "@/lib/requireSession";
import Department from "@/models/Department";
import Job from "@/models/Job";
import Location from "@/models/Location";
import Report from "@/models/Report";
import Shift from "@/models/Shift";
import User from "@/models/User";

export async function GET(_req, { params }) {
  const { session, error } = await requireSession();
  if (error) return error;
  

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  await connectDB();
  const staffFields = session.role === "admin"
    ? "name email phoneNumber temporaryPassword role staffType department locationId shiftStatus shiftSince isSetupComplete passwordResetRequired isActive suspendedAt suspensionReason createdAt"
    : "name email phoneNumber role staffType department locationId shiftStatus shiftSince isSetupComplete isActive suspendedAt suspensionReason createdAt";
  const staff = await User.findOne({
    _id: id,
    companyId: session.companyId,
    role: { $in: ["staff", "manager"] },
  })
    .select(staffFields)
    .lean();

  if (!staff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }
  if (session.role !== "admin") {
    const assignedLocationId = String(session.locationId || session.locationIds?.[0] || "");
    const hasSharedLocation = assignedLocationId && String(staff.locationId || "") === assignedLocationId;
    if (!hasSharedLocation) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }
  const locationId = staff.locationId;
  const historyLocationScope = session.role === "admin" ? {} : { locationId: locationId || null };
  const [jobs, reports, shifts] = await Promise.all([
    Job.find({
      companyId: session.companyId,
      ...historyLocationScope,
      $or: [
        { createdByUserId: staff._id },
        { closedByUserId: staff._id },
        { leftByUserId: staff._id },
      ],
    })
      .populate("createdByUserId", "name")
      .populate("closedByUserId", "name")
      .populate("leftByUserId", "name")
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean(),
    Report.find({
      companyId: session.companyId,
      ...historyLocationScope,
      $or: [{ userId: staff._id }, { targetUserId: staff._id }],
    })
      .populate("userId", "name role")
      .populate("targetUserId", "name role")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
    Shift.find({
      companyId: session.companyId,
      userId: staff._id,
      ...historyLocationScope,
    })
      .sort({ startTime: -1 })
      .limit(10)
      .lean(),
  ]);

  return NextResponse.json({ staff, jobs, reports, shifts, viewerRole: session.role });
}

export async function PATCH(req, { params }) {
  const { session, error } = await requireSession(["admin"]);
  if (error) return error;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
  const role = body.role;
  const staffType = typeof body.staffType === "string" ? body.staffType.trim() : "";
  const department = typeof body.department === "string" ? body.department.trim() : "";
  const locationId = typeof body.locationId === "string" ? body.locationId.trim() : "";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (phoneNumber && !/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    return NextResponse.json({ error: "Phone number must use international E.164 format" }, { status: 400 });
  }
  if (!["staff", "manager"].includes(role) || !["part time", "full time", "contract"].includes(staffType)) {
    return NextResponse.json({ error: "Role or employment type is invalid" }, { status: 400 });
  }
  if (!department || department.length > 100 || !mongoose.isValidObjectId(locationId)) {
    return NextResponse.json({ error: "Select a valid location and department" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({
    _id: id,
    companyId: session.companyId,
    role: { $in: ["staff", "manager"] },
  });
  if (!user) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

  const duplicateEmail = await User.findOne({
    _id: { $ne: user._id },
    companyId: session.companyId,
    email,
  }).select("_id").lean();
  if (duplicateEmail) return NextResponse.json({ error: "This email is already in use for this company" }, { status: 409 });
  if (phoneNumber) {
    const duplicatePhone = await User.findOne({
      _id: { $ne: user._id },
      phoneNumber,
    }).select("_id").lean();
    if (duplicatePhone) return NextResponse.json({ error: "This phone number is already assigned to another account" }, { status: 409 });
  }

  const [location, departmentRecord] = await Promise.all([
    Location.findOne({ _id: locationId, companyId: session.companyId }).select("_id").lean(),
    Department.findOne({ companyId: session.companyId, locationId, name: department, isActive: { $ne: false } }).select("_id").lean(),
  ]);
  if (!location || !departmentRecord) {
    return NextResponse.json({ error: "The selected department must belong to the selected location" }, { status: 400 });
  }

  user.email = email;
  if (phoneNumber !== user.phoneNumber) user.phoneNumber = phoneNumber;
  user.role = role;
  user.staffType = staffType;
  user.department = department;
  user.locationId = locationId;
  await user.save();
  return NextResponse.json({
    staff: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      staffType: user.staffType,
      department: user.department,
      locationId: user.locationId,
    },
  });
}
