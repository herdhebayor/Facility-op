import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Department from "@/models/Department";
import Job from "@/models/Job";
import User from "@/models/User";
import { requireSession } from "@/lib/requireSession";

export async function GET(req) {
  const { session, error } = await requireSession();
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const requestedLocationId = searchParams.get("locationId");
  const status = searchParams.get("status")?.split(",").filter((value) =>
    ["open", "pending", "in_progress", "closed"].includes(value),
  );
  let query = { companyId: session.companyId };

  if (session.role !== "admin") {
    const currentUser = await User.findOne({
      _id: session.userId,
      companyId: session.companyId,
      role: session.role,
    }).select("locationId department").lean();
    if (!currentUser) {
      return NextResponse.json({ error: "Your account could not be found" }, { status: 404 });
    }

    const locationId = String(currentUser.locationId || session.locationId || session.locationIds?.[0] || "");
    if (!mongoose.isValidObjectId(locationId)) return NextResponse.json({ jobs: [] });
    if (requestedLocationId && String(requestedLocationId) !== locationId) {
      return NextResponse.json({ error: "You can only view tasks at your assigned location" }, { status: 403 });
    }
    query.locationId = locationId;

    if (session.role === "staff") {
      const departmentName = typeof currentUser.department === "string" ? currentUser.department.trim() : "";
      if (!departmentName) return NextResponse.json({ jobs: [] });
      const escapedName = departmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const department = await Department.findOne({
        companyId: session.companyId,
        locationId,
        name: { $regex: `^${escapedName}$`, $options: "i" },
        isActive: { $ne: false },
      }).select("_id name").lean();
      if (!department) return NextResponse.json({ jobs: [] });
      const escapedDepartmentName = department.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { departmentId: department._id },
        { departmentId: null, staffType: { $regex: `^${escapedDepartmentName}$`, $options: "i" } },
      ];
    }
  } else if (requestedLocationId) {
    if (!mongoose.isValidObjectId(requestedLocationId)) {
      return NextResponse.json({ error: "Location is invalid" }, { status: 400 });
    }
    query.locationId = requestedLocationId;
  }

  if (status?.length) {
    query.status = { $in: status };
  }

  const jobs = await Job.find(query)
    .populate("createdByUserId", "name")
    .populate("closedByUserId", "name")
    .populate("leftByUserId", "name")
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  return NextResponse.json({ jobs });
}

// POST /api/jobs - create a new work order
export async function POST(req) {
  const { session, error } = await requireSession();
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const { title, area, locationId, priority, departmentId } = body || {};

  if (typeof title !== "string" || !title.trim() || title.trim().length > 160 || !mongoose.isValidObjectId(departmentId)) {
    return NextResponse.json({ error: "A task title and valid department are required" }, { status: 400 });
  }

  await connectDB();
  const currentUser = await User.findOne({
    _id: session.userId,
    companyId: session.companyId,
  }).select("role locationId department").lean();
  if (!currentUser) {
    return NextResponse.json({ error: "Your account could not be found" }, { status: 404 });
  }
  if (currentUser.role !== session.role) {
    return NextResponse.json({ error: "Your account role has changed. Please sign in again." }, { status: 403 });
  }

  const department = await Department.findOne({
    _id: departmentId,
    companyId: session.companyId,
    isActive: { $ne: false },
  }).select("_id name locationId").lean();
  if (!department) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  const assignedLocationId = String(currentUser.locationId || session.locationId || session.locationIds?.[0] || "");
  if (session.role !== "admin" && assignedLocationId !== String(department.locationId)) {
    return NextResponse.json({ error: "You can only create tasks at your assigned location" }, { status: 403 });
  }
  if (session.role === "staff" && (
    typeof currentUser.department !== "string"
    || currentUser.department.trim().toLowerCase() !== department.name.trim().toLowerCase()
  )) {
    return NextResponse.json({ error: "You can only create tasks for your assigned department" }, { status: 403 });
  }

  if (locationId && String(locationId) !== String(department.locationId)) {
    return NextResponse.json({ error: "The department does not belong to the selected location" }, { status: 400 });
  }
  if (typeof area === "string" && area.trim().length > 120) {
    return NextResponse.json({ error: "Area must be 120 characters or fewer" }, { status: 400 });
  }
  const taskPriority = priority || "medium";
  if (!["high", "medium", "low"].includes(taskPriority)) {
    return NextResponse.json({ error: "Task priority is invalid" }, { status: 400 });
  }

  const job = await Job.create({
    companyId: session.companyId,
    locationId: department.locationId,
    departmentId: department._id,
    title: title.trim(),
    area: typeof area === "string" ? area.trim() : "",
    staffType: department.name,
    priority: taskPriority,
    createdByUserId: session.userId,
    status: "open",
  });

  const populatedJob = await Job.findById(job._id)
    .populate("createdByUserId", "name")
    .populate("closedByUserId", "name")
    .lean();
  return NextResponse.json({ job: populatedJob }, { status: 201 });
}
