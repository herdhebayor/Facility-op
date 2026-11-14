import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Location from "@/models/Location";
import User from "@/models/User";
import { requireSession } from "@/lib/requireSession";
import { hashPassword } from "@/lib/auth";

const allowedStaffTypes = ["part time", "full time", "contract"];

// Generates a one-time password for a newly invited staff member.
function generateTemporaryPassword() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `Facility@${suffix}`;
}

// GET /api/staff
//   - manager/admin: full roster for the company (optionally ?locationId=)
//   - staff: everyone assigned to their location, including themselves
export async function GET(req) {
  const { session, error } = await requireSession();
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");

  let query = { companyId: session.companyId };

  if (session.role === "staff") {
    const currentUser = await User.findOne({ _id: session.userId, companyId: session.companyId }).select("locationId").lean();
    if (!currentUser?.locationId) return NextResponse.json({ staff: [] });
    query.locationId = currentUser.locationId;
  } else if (session.role === "manager") {
    const manager = await User.findOne({ _id: session.userId, companyId: session.companyId }).select("locationId").lean();
    const assignedLocationId = String(manager?.locationId || session.locationId || session.locationIds?.[0] || "");

    if (locationId) {
      if (assignedLocationId !== String(locationId)) {
        return NextResponse.json({ error: "You can only view staff from your assigned locations" }, { status: 403 });
      }
      query.locationId = locationId;
    } else {
      if (!assignedLocationId) return NextResponse.json({ staff: [] });
      query.locationId = assignedLocationId;
    }
  } else if (locationId) {
    query.locationId = locationId;
  }

  if(session.role === "admin"){
    const staff = await User.find({ companyId: session.companyId })
    .select("name email phoneNumber role staffType department shiftStatus shiftSince locationId isSetupComplete isActive")
      .sort({ staffType: 1, name: 1 })
      .lean();

    return NextResponse.json({ staff });
  }

  const staff = await User.find(query)
    .select("name email phoneNumber role staffType department shiftStatus shiftSince locationId isSetupComplete isActive")
    .sort({ staffType: 1, name: 1 })
    .lean();

  return NextResponse.json({ staff }); 
}

// POST /api/staff
// Handles admin-only actions such as creating a staff member, toggling an account status, or resending an invite.
export async function POST(req) {
  const { session, error } = await requireSession(["admin"]);
  if (error) return error;

  const body = await req.json();
  const { action, staffId, name, email, phoneNumber, role, staffType, department, password, locationId, enable, reason } = body || {};

  await connectDB();

  if (action === "generate-recovery-password") {
    if (!mongoose.isValidObjectId(staffId)) {
      return NextResponse.json({ error: "A valid staff ID is required" }, { status: 400 });
    }

    const user = await User.findOne({
      _id: staffId,
      companyId: session.companyId,
      role: { $in: ["staff", "manager"] },
      isActive: { $ne: false },
      isSetupComplete: true,
    });
    if (!user) {
      return NextResponse.json({ error: "Active staff member not found, or account setup is still pending" }, { status: 404 });
    }

    const temporaryPassword = `Recover-${randomBytes(9).toString("base64url")}`;
    user.passwordHash = await hashPassword(temporaryPassword);
    user.passwordResetRequired = true;
    user.recoveryPasswordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.temporaryPassword = null;
    await user.save();

    return NextResponse.json({
      success: true,
      temporaryPassword,
      expiresAt: user.recoveryPasswordExpiresAt,
      message: "Share this password directly with the staff member. It will only be shown once.",
    });
  }

  // toggle-status is used to suspend or reactivate a user account without deleting the record.
  if (action === "toggle-status") {
    if (!staffId) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
    }

    const user = await User.findOne({ _id: staffId, companyId: session.companyId });
    if (!user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const nextState = typeof enable === "boolean" ? enable : !user.isActive;
    user.isActive = nextState;
    user.suspendedAt = nextState ? null : new Date();
    user.suspensionReason = nextState ? "" : String(reason || "Account suspended by admin").trim();
    await user.save();

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        suspensionReason: user.suspensionReason,
      },
    });
  }

  // resend-invite regenerates a temporary password for a user who has not completed setup yet.
  if (action === "resend-invite") {
    if (!staffId) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
    }

    const user = await User.findOne({ _id: staffId, companyId: session.companyId });
    if (!user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (user.isSetupComplete) {
      return NextResponse.json({ error: "This staff member has already completed setup" }, { status: 400 });
    }

    const temporaryPassword = password || generateTemporaryPassword();
    user.passwordHash = await hashPassword(temporaryPassword);
    user.temporaryPassword = temporaryPassword;
    user.isSetupComplete = false;
    await user.save();

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        temporaryPassword,
      },
    });
  }

  // delete-invite removes a pending invite before the user completes setup.
  if (action === "delete-invite") {
    if (!staffId) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
    }

    const user = await User.findOne({ _id: staffId, companyId: session.companyId });
    if (!user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (user.isSetupComplete) {
      return NextResponse.json({ error: "This staff member has already completed setup and cannot be deleted as an invite" }, { status: 400 });
    }

    await User.deleteOne({ _id: user._id, companyId: session.companyId });

    return NextResponse.json({
      success: true,
      deletedId: user._id,
      message: "Invite deleted successfully",
    });
  }

  if (action === "delete-user") {
    if (!mongoose.isValidObjectId(staffId)) {
      return NextResponse.json({ error: "A valid staff ID is required" }, { status: 400 });
    }
    if (String(staffId) === String(session.userId)) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const user = await User.findOne({
      _id: staffId,
      companyId: session.companyId,
      role: { $in: ["staff", "manager"] },
    }).select("_id name");
    if (!user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    await User.deleteOne({ _id: user._id, companyId: session.companyId });
    return NextResponse.json({
      success: true,
      deletedId: user._id,
      message: `${user.name}'s account was deleted. Historical jobs, reports, and shifts were retained.`,
    });
  }

  if (!name || !email || !role) {
    return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
  }

  const cleanDepartment = typeof department === "string" ? department.trim() : "";
  if (!cleanDepartment) {
    return NextResponse.json({ error: "Department is required" }, { status: 400 });
  }

  const assignedLocationId = typeof locationId === "string" ? locationId.trim() : "";
  if (!assignedLocationId) {
    return NextResponse.json({ error: "Please assign this staff member to a location" }, { status: 400 });
  }
  const assignedLocation = await Location.findOne({
    _id: assignedLocationId,
    companyId: session.companyId,
  }).select("_id").lean();
  if (!assignedLocation) {
    return NextResponse.json({ error: "Selected location was not found for this company" }, { status: 400 });
  }

  const allowedRoles = ["staff", "manager"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Role must be staff or manager" }, { status: 400 });
  }

  const normalizedStaffType = typeof staffType === "string" ? staffType.trim() : "";
  if (normalizedStaffType && !allowedStaffTypes.includes(normalizedStaffType)) {
    return NextResponse.json({ error: "Staff type must be part time, full time, or contract" }, { status: 400 });
  }

  const finalStaffType = normalizedStaffType || "full time";

  const normalisedEmail = String(email).trim().toLowerCase();
  const normalizedPhone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";
  if (normalizedPhone && !/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
    return NextResponse.json({ error: "Phone number must use international E.164 format, for example +14155552671" }, { status: 400 });
  }
  const temporaryPassword = password || generateTemporaryPassword();

  const existing = await User.findOne({ companyId: session.companyId, email: normalisedEmail });
  if (existing) {
    return NextResponse.json({ error: "This email is already in use for this company" }, { status: 409 });
  }

  // create a new user record and invite them with a temporary password.
  const newUser = await User.create({
    companyId: session.companyId,
    name: String(name).trim(),
    email: normalisedEmail,
    phoneNumber: normalizedPhone,
    passwordHash: await hashPassword(temporaryPassword),
    role,
    staffType: finalStaffType,
    department: cleanDepartment,
    locationId: assignedLocationId,
    shiftStatus: role === "staff" ? "off" : "admin",
    isSetupComplete: false,
    temporaryPassword,
  });

  return NextResponse.json({
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      staffType: newUser.staffType,
      department: newUser.department,
      temporaryPassword,
    },
  }, { status: 201 });
}
