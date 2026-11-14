import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Shift from "@/models/Shift";
import { requireSession } from "@/lib/requireSession";

// PATCH /api/staff/:id/shift  { status: "on" | "off" }
// A staff member can only toggle their own shift status - never a teammate's.
export async function PATCH(req, { params }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (session.role === "staff" && String(session.userId) !== String(id)) {
    return NextResponse.json(
      { error: "You can only change your own shift status" },
      { status: 403 }
    );
  }

  const { status } = await req.json();
  if (!["on", "off"].includes(status)) {
    return NextResponse.json({ error: "status must be 'on' or 'off'" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ _id: id, companyId: session.companyId });
  if (!user || user.companyId.toString() !== session.companyId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const now = new Date();

  if (status === "on" && user.shiftStatus !== "on") {
    user.shiftStatus = "on";
    user.shiftSince = now;
    await Shift.create({
      companyId: user.companyId,
      locationId: user.locationId,
      userId: user._id,
      startTime: now,
      status: "active",
    });
  } else if (status === "off" && user.shiftStatus !== "off") {
    user.shiftStatus = "off";
    user.shiftSince = null;
    await Shift.findOneAndUpdate(
      { userId: user._id, status: "active" },
      { endTime: now, status: "completed" },
      { sort: { startTime: -1 } }
    );
  }

  await user.save();

  return NextResponse.json({
    staff: {
      id: user._id,
      shiftStatus: user.shiftStatus,
      shiftSince: user.shiftSince,
    },
  });
}
