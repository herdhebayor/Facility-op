import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Department from "@/models/Department";
import Job from "@/models/Job";
import User from "@/models/User";
import { requireSession } from "@/lib/requireSession";

export async function GET(_req, { params }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await connectDB();
  const currentUser = await User.findOne({
    _id: session.userId,
    companyId: session.companyId,
  }).select("role locationId department").lean();
  if (!currentUser) return NextResponse.json({ error: "Your account could not be found" }, { status: 404 });
  if (currentUser.role !== session.role) {
    return NextResponse.json({ error: "Your account role has changed. Please sign in again." }, { status: 403 });
  }
  const job = await Job.findOne({ _id: id, companyId: session.companyId })
    .populate("createdByUserId", "name")
    .populate("closedByUserId", "name")
    .populate("leftByUserId", "name")
    .lean();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (session.role !== "admin") {
    const locationId = String(currentUser.locationId || session.locationId || session.locationIds?.[0] || "");
    if (locationId !== String(job.locationId)) {
      return NextResponse.json({ error: "Not authorized to view this task" }, { status: 403 });
    }
    if (session.role === "staff") {
      const department = job.departmentId
        ? await Department.findOne({
          _id: job.departmentId,
          companyId: session.companyId,
          locationId,
          isActive: { $ne: false },
        }).select("name").lean()
        : await Department.findOne({
          companyId: session.companyId,
          locationId,
          name: { $regex: `^${String(job.staffType || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
          isActive: { $ne: false },
        }).select("name").lean();
      if (
        !department
        || String(currentUser.department || "").trim().toLowerCase() !== department.name.trim().toLowerCase()
      ) {
        return NextResponse.json({ error: "Not authorized to view this task" }, { status: 403 });
      }
    }
  }
  return NextResponse.json({ job });
}

// PATCH /api/jobs/:id  { status?, handoffNote? }
// Staff can only act (close a job, add a note) while they're on shift.
// Viewing (GET above) is always allowed - only mutation is gated.
export async function PATCH(req, { params }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await connectDB();

  const me = await User.findOne({ _id: session.userId, companyId: session.companyId })
    .select("role locationId department shiftStatus").lean();
  if (!me || me.role !== session.role) {
    return NextResponse.json({ error: "Your account could not be found or your role has changed" }, { status: 403 });
  }
  if (session.role === "staff") {
    const currentUser = me;
    if (currentUser.shiftStatus !== "on") {
      return NextResponse.json(
        { error: "You're off shift. Punch in before you can update tasks." },
        { status: 403 }
      );
    }
  }

  const job = await Job.findOne({ _id: id, companyId: session.companyId });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (session.role !== "admin") {
    const locationId = String(me.locationId || session.locationId || session.locationIds?.[0] || "");
    if (locationId !== String(job.locationId)) {
      return NextResponse.json({ error: "Not authorized to update this task" }, { status: 403 });
    }
    if (session.role === "staff") {
      const departmentName = typeof me.department === "string" ? me.department.trim() : "";
      const department = departmentName ? await Department.findOne({
        companyId: session.companyId,
        locationId,
        name: { $regex: `^${departmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
        isActive: { $ne: false },
      }).select("_id name").lean() : null;
      const belongsToDepartment = department && (
        job.departmentId
          ? String(job.departmentId) === String(department._id)
          : String(job.staffType || "").trim().toLowerCase() === department.name.trim().toLowerCase()
      );
      if (!belongsToDepartment) {
        return NextResponse.json({ error: "You can only update tasks assigned to your department" }, { status: 403 });
      }
    }
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (body?.status) {
    if (!["open", "pending", "in_progress", "closed"].includes(body.status)) {
      return NextResponse.json({ error: "Task status is invalid" }, { status: 400 });
    }
    job.status = body.status;
    if (body.status === "closed") {
      job.closedByUserId = session.userId;
      job.closedAt = new Date();
    } else {
      job.closedByUserId = null;
      job.closedAt = null;
    }
  }

  if (typeof body?.handoffNote === "string") {
    job.handoffNote = body.handoffNote;
    job.leftByUserId = session.userId;
    job.leftAt = new Date();
  }

  await job.save();

  const populatedJob = await Job.findById(job._id)
    .populate("createdByUserId", "name")
    .populate("closedByUserId", "name")
    .lean();
  return NextResponse.json({ job: populatedJob });
}
