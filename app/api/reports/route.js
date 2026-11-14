import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Location from "@/models/Location";
import Report from "@/models/Report";
import User from "@/models/User";
import { requireSession } from "@/lib/requireSession";

function locationScope(session, requestedLocationId) {
  if (session.role === "admin") {
    return requestedLocationId ? requestedLocationId : null;
  }

  const assignedLocationId = String(session.locationId || session.locationIds?.[0] || "");
  if (requestedLocationId) {
    return assignedLocationId === String(requestedLocationId) ? requestedLocationId : false;
  }
  return assignedLocationId || false;
}

export async function GET(req) {
  const { session, error } = await requireSession();
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const requestedLocationId = searchParams.get("locationId");
  const scopedLocation = locationScope(session, requestedLocationId);

  if (scopedLocation === false) {
    return NextResponse.json({ error: "You can only view reports from your assigned locations" }, { status: 403 });
  }

  const query = {
    companyId: session.companyId,
    $or: [
      { userId: session.userId },
      ...(session.role === "staff" ? [] : [{ recipientRole: session.role }]),
    ],
  };

  if (scopedLocation) query.locationId = scopedLocation;
  if (session.role === "staff") query.userId = session.userId;

  const reports = await Report.find(query)
    .populate("userId", "name role staffType")
    .populate("targetUserId", "name role staffType")
    .populate("comments.authorId", "name role")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({ reports });
}

export async function POST(req) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const {
    action,
    reportId,
    title,
    details,
    type,
    locationId,
    photoUrls,
    targetUserId,
    commentText,
    status,
    reason,
  } = body || {};

  await connectDB();

  if (action === "comment") {
    if (!reportId || !commentText || !String(commentText).trim()) {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

    if (session.role === "staff") {
      return NextResponse.json({ error: "Staff members cannot respond to reports" }, { status: 403 });
    }

    const scopedLocation = locationScope(session, null);
    const report = await Report.findOne({
      _id: reportId,
      companyId: session.companyId,
      recipientRole: session.role,
      ...(scopedLocation ? { locationId: scopedLocation } : {}),
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found or not assigned to your inbox" }, { status: 404 });
    }

    report.comments.push({
      authorId: session.userId,
      authorRole: session.role,
      text: String(commentText).trim(),
    });

    if (status === "resolved" || status === "reviewed") {
      report.status = status;
    } else if (report.status === "open") {
      report.status = "reviewed";
    }
    await report.save();

    const populated = await Report.findById(report._id)
      .populate("userId", "name role staffType")
      .populate("targetUserId", "name role staffType")
      .populate("comments.authorId", "name role")
      .lean();

    return NextResponse.json({ report: populated });
  }

  if (action === "suspend-user") {
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Only admins can suspend staff" }, { status: 403 });
    }

    if (!targetUserId || !reason) {
      return NextResponse.json({ error: "Target user and suspension reason are required" }, { status: 400 });
    }

    const targetUser = await User.findOne({ _id: targetUserId, companyId: session.companyId });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    targetUser.isActive = false;
    targetUser.suspendedAt = new Date();
    targetUser.suspensionReason = String(reason).trim();
    await targetUser.save();

    return NextResponse.json({ user: { id: targetUser._id, isActive: false, suspensionReason: targetUser.suspensionReason } });
  }

  if (session.role === "admin") {
    return NextResponse.json({ error: "Admins can respond to reports but cannot create them" }, { status: 403 });
  }

  if (!title || !String(title).trim() || !locationId) {
    return NextResponse.json({ error: "title and locationId are required" }, { status: 400 });
  }

  const requestedLocation = await Location.findOne({ _id: locationId, companyId: session.companyId }).select("_id").lean();
  if (!requestedLocation) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  if (session.role !== "admin" && String(session.locationId || session.locationIds?.[0] || "") !== String(locationId)) {
    return NextResponse.json({ error: "You can only send reports from your assigned locations" }, { status: 403 });
  }

  const safeType = ["routine", "incident", "performance", "staff_issue"].includes(type) ? type : "routine";
  const safeRecipientRole = session.role === "staff" ? "manager" : "admin";

  if (targetUserId && (session.role !== "manager" || safeType !== "staff_issue")) {
    return NextResponse.json({ error: "Only managers can report a staff member" }, { status: 403 });
  }
  if (session.role === "manager" && safeType === "staff_issue" && !targetUserId) {
    return NextResponse.json({ error: "Select the staff member this report concerns" }, { status: 400 });
  }

  if (targetUserId) {
    const targetUser = await User.findOne({
      _id: targetUserId,
      companyId: session.companyId,
      role: "staff",
      locationId,
    }).select("_id").lean();
    if (!targetUser) {
      return NextResponse.json({ error: "Reported staff member must be assigned to this location" }, { status: 400 });
    }
  }

  const report = await Report.create({
    companyId: session.companyId,
    locationId,
    userId: session.userId,
    targetUserId: targetUserId || null,
    sourceRole: session.role,
    recipientRole: safeRecipientRole,
    type: safeType,
    title: String(title).trim(),
    details: typeof details === "string" ? details.trim() : "",
    photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
  });

  const populated = await Report.findById(report._id)
    .populate("userId", "name role staffType")
    .populate("targetUserId", "name role staffType")
    .populate("comments.authorId", "name role")
    .lean();

  return NextResponse.json({ report: populated }, { status: 201 });
}
