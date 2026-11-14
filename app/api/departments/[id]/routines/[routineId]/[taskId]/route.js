import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Department from "@/models/Department";
import DepartmentRoutine from "@/models/DepartmentRoutine";
import Location from "@/models/Location";
import RoutineSubmission from "@/models/RoutineSubmission";
import RoutineTaskCompletion from "@/models/RoutineTaskCompletion";
import User from "@/models/User";
import { requireSession } from "@/lib/requireSession";
import { getRoutineDayKey } from "@/lib/routineDayKey";

export async function PATCH(request, { params }) {
  const { session, error } = await requireSession(["manager", "staff"]);
  if (error) return error;

  const { id, routineId, taskId } = await params;
  if (![id, routineId, taskId].every(mongoose.isValidObjectId)) {
    return NextResponse.json({ error: "Department, routine, or task not found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  if (
    (body?.completed !== undefined && typeof body.completed !== "boolean")
    || (body?.issueReport !== undefined && typeof body.issueReport !== "string")
    || (body?.completed === undefined && body?.issueReport === undefined)
  ) {
    return NextResponse.json({ error: "Provide a valid completion status or issue report" }, { status: 400 });
  }
  if (typeof body.issueReport === "string" && body.issueReport.trim().length > 500) {
    return NextResponse.json({ error: "Issue reports must be 500 characters or fewer" }, { status: 400 });
  }

  await connectDB();
  const [currentUser, department] = await Promise.all([
    User.findOne({
      _id: session.userId,
      companyId: session.companyId,
      role: session.role,
    }).select("locationId department shiftStatus role").lean(),
    Department.findOne({
      _id: id,
      companyId: session.companyId,
      isActive: { $ne: false },
    }).select("_id name locationId").lean(),
  ]);
  if (!currentUser) {
    return NextResponse.json({ error: "Your account could not be found" }, { status: 404 });
  }
  if (currentUser.role !== session.role) {
    return NextResponse.json({ error: "Your account role has changed. Please sign in again." }, { status: 403 });
  }
  if (!department) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  const assignedLocationId = String(currentUser.locationId || session.locationId || session.locationIds?.[0] || "");
  if (assignedLocationId !== String(department.locationId)) {
    return NextResponse.json({ error: "Not authorized to update this department routine" }, { status: 403 });
  }
  if (session.role === "staff") {
    if (
      typeof currentUser.department !== "string"
      || currentUser.department.trim().toLowerCase() !== department.name.trim().toLowerCase()
    ) {
      return NextResponse.json({ error: "Not authorized to update this department routine" }, { status: 403 });
    }
    if (currentUser.shiftStatus !== "on") {
      return NextResponse.json({ error: "Punch in before updating routine tasks" }, { status: 403 });
    }
  }

  const routine = await DepartmentRoutine.findOne({
    _id: routineId,
    companyId: session.companyId,
    locationId: department.locationId,
    departmentId: department._id,
  }).select("tasks");
  if (!routine || !routine.tasks.some((task) => String(task._id) === String(taskId))) {
    return NextResponse.json({ error: "Routine task not found" }, { status: 404 });
  }

  const location = await Location.findOne({
    _id: department.locationId,
    companyId: session.companyId,
  }).select("timezone").lean();
  const completionFilter = {
    companyId: session.companyId,
    locationId: department.locationId,
    departmentId: department._id,
    routineId: routine._id,
    taskId,
    dayKey: getRoutineDayKey(location?.timezone),
  };

  const update = {};
  if (body.completed === true) {
    update.$set = { completedAt: new Date(), completedByUserId: session.userId };
  } else if (body.completed === false) {
    update.$set = { completedAt: null, completedByUserId: null };
  }
  if (typeof body.issueReport === "string") {
    update.$set = { ...(update.$set || {}), issueReport: body.issueReport.trim() };
  }

  let completion = await RoutineTaskCompletion.findOne(completionFilter);
  if (!completion && Object.values(update.$set || {}).every((value) => value === null || value === "")) {
    return NextResponse.json({ success: true, completion: null });
  }
  try {
    completion = await RoutineTaskCompletion.findOneAndUpdate(
      completionFilter,
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).populate("completedByUserId", "name").lean();
  } catch (updateError) {
    if (updateError?.code !== 11000) throw updateError;
    completion = await RoutineTaskCompletion.findOneAndUpdate(
      completionFilter,
      update,
      { new: true },
    ).populate("completedByUserId", "name").lean();
  }

  if (completion && !completion.completedAt && !completion.issueReport) {
    await RoutineTaskCompletion.deleteOne(completionFilter);
    completion = null;
  }
  if (body.completed !== undefined) {
    await RoutineSubmission.deleteMany({
      companyId: session.companyId,
      routineId: routine._id,
      dayKey: completionFilter.dayKey,
    });
  }
  return NextResponse.json({ success: true, completion });
}
