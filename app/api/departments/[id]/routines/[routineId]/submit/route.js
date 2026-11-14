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

export async function POST(_request, { params }) {
  const { session, error } = await requireSession(["staff"]);
  if (error) return error;

  const { id, routineId } = await params;
  if (![id, routineId].every(mongoose.isValidObjectId)) {
    return NextResponse.json({ error: "Department or routine not found" }, { status: 404 });
  }

  await connectDB();
  const [user, department] = await Promise.all([
    User.findOne({ _id: session.userId, companyId: session.companyId, role: "staff" })
      .select("locationId department shiftStatus").lean(),
    Department.findOne({ _id: id, companyId: session.companyId, isActive: { $ne: false } })
      .select("_id name locationId").lean(),
  ]);
  if (!user) return NextResponse.json({ error: "Your account could not be found" }, { status: 404 });
  if (!department) return NextResponse.json({ error: "Department not found" }, { status: 404 });
  if (
    String(user.locationId) !== String(department.locationId)
    || user.department?.trim().toLowerCase() !== department.name.trim().toLowerCase()
  ) {
    return NextResponse.json({ error: "Not authorized to submit this routine" }, { status: 403 });
  }
  if (user.shiftStatus !== "on") {
    return NextResponse.json({ error: "Punch in before submitting your routine" }, { status: 403 });
  }

  const routine = await DepartmentRoutine.findOne({
    _id: routineId,
    companyId: session.companyId,
    locationId: department.locationId,
    departmentId: department._id,
  }).select("tasks").lean();
  if (!routine) return NextResponse.json({ error: "Routine not found" }, { status: 404 });
  if (!routine.tasks.length) return NextResponse.json({ error: "This routine has no checklist items" }, { status: 400 });

  const location = await Location.findOne({ _id: department.locationId, companyId: session.companyId })
    .select("timezone").lean();
  const dayKey = getRoutineDayKey(location?.timezone);
  const completedTaskCount = await RoutineTaskCompletion.countDocuments({
    companyId: session.companyId,
    locationId: department.locationId,
    departmentId: department._id,
    routineId: routine._id,
    dayKey,
    completedAt: { $ne: null },
  });
  if (completedTaskCount < routine.tasks.length) {
    return NextResponse.json({
      error: `Complete all checklist items before submitting (${completedTaskCount}/${routine.tasks.length} complete)`,
    }, { status: 400 });
  }

  const filter = {
    routineId: routine._id,
    dayKey,
    submittedByUserId: session.userId,
  };
  const submission = await RoutineSubmission.findOneAndUpdate(
    filter,
    {
      $set: {
        companyId: session.companyId,
        locationId: department.locationId,
        departmentId: department._id,
        submittedAt: new Date(),
        completedTaskCount: routine.tasks.length,
        totalTaskCount: routine.tasks.length,
      },
      $setOnInsert: { submittedByUserId: session.userId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).populate("submittedByUserId", "name").lean();

  return NextResponse.json({ success: true, submission });
}
