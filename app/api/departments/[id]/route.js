import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Department from "@/models/Department";
import DepartmentRoutine from "@/models/DepartmentRoutine";
import Job from "@/models/Job";
import Location from "@/models/Location";
import Report from "@/models/Report";
import RoutineSubmission from "@/models/RoutineSubmission";
import RoutineTaskCompletion from "@/models/RoutineTaskCompletion";
import Shift from "@/models/Shift";
import User from "@/models/User";
import { requireSession } from "@/lib/requireSession";
import { getRoutineDayKey } from "@/lib/routineDayKey";

async function getDepartmentAccess(session, id) {
  const currentUser = await User.findOne({
    _id: session.userId,
    companyId: session.companyId,
  }).select("department locationId shiftStatus role").lean();
  if (!currentUser) {
    return { error: "Your account could not be found", status: 404 };
  }
  if (currentUser.role !== session.role) {
    return { error: "Your account role has changed. Please sign in again.", status: 403 };
  }

  const department = await Department.findOne({
    _id: id,
    companyId: session.companyId,
    isActive: { $ne: false },
  }).select("_id name locationId").lean();
  if (!department) {
    return { error: "Department not found", status: 404 };
  }

  const assignedLocationId = String(currentUser.locationId || session.locationId || session.locationIds?.[0] || "");
  if (assignedLocationId !== String(department.locationId)) {
    return { error: "Not authorized to access this department", status: 403 };
  }
  if (session.role === "staff" && (
    typeof currentUser.department !== "string"
    || currentUser.department.trim().toLowerCase() !== department.name.trim().toLowerCase()
  )) {
    return { error: "Not authorized to access this department", status: 403 };
  }

  return { currentUser, department };
}

export async function GET(_request, { params }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  await connectDB();
  const department = await Department.findOne({
    _id: id,
    companyId: session.companyId,
    isActive: { $ne: false },
  }).lean();
  if (!department) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  const locationId = String(department.locationId);
  const currentUser = await User.findOne({
    _id: session.userId,
    companyId: session.companyId,
  }).select("department locationId role").lean();
  if (!currentUser) {
    return NextResponse.json({ error: "Your account could not be found" }, { status: 404 });
  }
  if (currentUser.role !== session.role) {
    return NextResponse.json({ error: "Your account role has changed. Please sign in again." }, { status: 403 });
  }
  const managerLocationId = String(currentUser.locationId || session.locationId || session.locationIds?.[0] || "");
  if (session.role === "manager" && managerLocationId !== locationId) {
    return NextResponse.json({ error: "Not authorized to view this department" }, { status: 403 });
  }
  if (session.role === "staff") {
    const assignedHere = String(currentUser.locationId || "") === locationId;
    const isOwnDepartment = currentUser.department?.trim().toLowerCase() === department.name.trim().toLowerCase();
    if (!assignedHere || !isOwnDepartment) {
      return NextResponse.json({ error: "Not authorized to view this department" }, { status: 403 });
    }
  }

  const staff = await User.find({
    companyId: session.companyId,
    role: { $in: ["staff", "manager"] },
    department: { $regex: `^${department.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    locationId: department.locationId,
  })
    .select("name email role staffType department locationId shiftStatus shiftSince isActive")
    .sort({ name: 1 })
    .lean();
  const staffIds = staff.map((member) => member._id);
  const [location, jobs, reports, shifts] = await Promise.all([
    Location.findOne({ _id: department.locationId, companyId: session.companyId }).select("name address timezone").lean(),
    Job.find({
      companyId: session.companyId,
      locationId: department.locationId,
      $or: [
        { departmentId: department._id },
        {
          departmentId: null,
          staffType: { $regex: `^${department.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
        },
      ],
    })
      .populate("createdByUserId", "name")
      .populate("closedByUserId", "name")
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean(),
    Report.find({
      companyId: session.companyId,
      locationId: department.locationId,
      $or: [{ userId: { $in: staffIds } }, { targetUserId: { $in: staffIds } }],
    })
      .populate("userId", "name role")
      .populate("targetUserId", "name role")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
    Shift.find({
      companyId: session.companyId,
      locationId: department.locationId,
      userId: { $in: staffIds },
    })
      .sort({ startTime: -1 })
      .limit(100)
      .lean(),
  ]);

  const routines = await DepartmentRoutine.find({
    companyId: session.companyId,
    locationId: department.locationId,
    departmentId: department._id,
  }).sort({ createdAt: -1 }).lean();
  const dayKey = getRoutineDayKey(location?.timezone);
  const [routineCompletions, routineSubmissions] = routines.length
    ? await Promise.all([
      RoutineTaskCompletion.find({
        companyId: session.companyId,
        locationId: department.locationId,
        departmentId: department._id,
        routineId: { $in: routines.map((routine) => routine._id) },
        dayKey,
      }).populate("completedByUserId", "name").lean(),
      session.role === "manager"
        ? RoutineSubmission.find({
          companyId: session.companyId,
          locationId: department.locationId,
          departmentId: department._id,
          routineId: { $in: routines.map((routine) => routine._id) },
          dayKey,
        }).populate("submittedByUserId", "name").sort({ submittedAt: -1 }).lean()
        : Promise.resolve([]),
    ])
    : [[], []];
  const completionsByRoutine = new Map();
  for (const completion of routineCompletions) {
    const routineId = String(completion.routineId);
    const current = completionsByRoutine.get(routineId) || [];
    current.push(completion);
    completionsByRoutine.set(routineId, current);
  }

  const routineTaskCount = routines.reduce((total, routine) => total + routine.tasks.length, 0);
  const completedRoutineTasks = routineCompletions.filter((completion) => completion.completedAt).length;
  return NextResponse.json({
    department: {
      ...department,
      locationName: location?.name || "Location",
      locationAddress: location?.address || "",
      timezone: location?.timezone || "Africa/Lagos",
    },
    staff,
    jobs,
    routines: routines.map((routine) => ({
      ...routine,
      completions: completionsByRoutine.get(String(routine._id)) || [],
      routineSubmissions: routineSubmissions.filter((submission) => String(submission.routineId) === String(routine._id)),
    })),
    routineSubmissions: routineSubmissions.map((submission) => ({
      ...submission,
      routineName: routines.find((routine) => String(routine._id) === String(submission.routineId))?.name || "Routine",
      issueReports: routineCompletions
        .filter((completion) => String(completion.routineId) === String(submission.routineId) && completion.issueReport)
        .map((completion) => ({
          taskId: String(completion.taskId),
          taskTitle: routines.find((routine) => String(routine._id) === String(submission.routineId))
            ?.tasks.find((task) => String(task._id) === String(completion.taskId))?.title || "Checklist item",
          issueReport: completion.issueReport,
        })),
    })),
    routineDayKey: dayKey,
    reports,
    shifts,
    routineJobCount: routineTaskCount,
    completedRoutineJobCount: completedRoutineTasks,
    routineCompletion: routineTaskCount
      ? Math.round((completedRoutineTasks / routineTaskCount) * 100)
      : null,
    viewerRole: session.role,
  });
}

export async function POST(request, { params }) {
  const { session, error } = await requireSession(["manager"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const tasks = Array.isArray(body?.tasks)
    ? body.tasks
      .filter((task) => task && typeof task.title === "string" && task.title.trim())
      .map((task) => ({
        title: task.title.trim(),
        area: typeof task.area === "string" ? task.area.trim() : "",
      }))
    : [];
  if (!name || name.length > 120 || !Array.isArray(body?.tasks) || tasks.length !== body.tasks.length || !tasks.length || tasks.length > 100) {
    return NextResponse.json({ error: "A routine name and between 1 and 100 checklist tasks are required" }, { status: 400 });
  }
  if (tasks.some((task) => task.title.length > 160 || task.area.length > 120)) {
    return NextResponse.json({ error: "Routine task titles must be 160 characters or fewer and areas 120 characters or fewer" }, { status: 400 });
  }

  await connectDB();
  const access = await getDepartmentAccess(session, id);
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const routine = await DepartmentRoutine.create({
    companyId: session.companyId,
    locationId: access.department.locationId,
    departmentId: access.department._id,
    name,
    tasks,
    createdByUserId: session.userId,
  });
  return NextResponse.json({ routine }, { status: 201 });
}

export async function PATCH(request, { params }) {
  const { session, error } = await requireSession(["manager"]);
  if (error) return error;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Department not found" }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) {
    return NextResponse.json({ error: "Department name must be between 1 and 100 characters" }, { status: 400 });
  }

  await connectDB();
  const manager = await User.findOne({
    _id: session.userId,
    companyId: session.companyId,
    role: "manager",
  }).select("locationId").lean();
  const managerLocationId = String(manager?.locationId || session.locationId || session.locationIds?.[0] || "");
  const department = await Department.findOne({
    _id: id,
    companyId: session.companyId,
    locationId: managerLocationId,
    isActive: { $ne: false },
  });
  if (!department) return NextResponse.json({ error: "Department not found" }, { status: 404 });

  const duplicate = await Department.findOne({
    _id: { $ne: department._id },
    companyId: session.companyId,
    locationId: department.locationId,
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    isActive: { $ne: false },
  }).select("_id").lean();
  if (duplicate) return NextResponse.json({ error: "A department with this name already exists at the location" }, { status: 409 });

  const previousName = department.name;
  department.name = name;
  try {
    await department.save();
  } catch (saveError) {
    if (saveError?.code === 11000) {
      return NextResponse.json({ error: "A department with this name already exists at the location" }, { status: 409 });
    }
    throw saveError;
  }
  const escapedPreviousName = previousName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await Promise.all([
    User.updateMany(
      { companyId: session.companyId, locationId: department.locationId, role: { $in: ["staff", "manager"] }, department: { $regex: `^${escapedPreviousName}$`, $options: "i" } },
      { $set: { department: name } },
    ),
    Job.updateMany(
      {
        companyId: session.companyId,
        locationId: department.locationId,
        staffType: { $regex: `^${escapedPreviousName}$`, $options: "i" },
        $or: [{ departmentId: department._id }, { departmentId: null }],
      },
      { $set: { staffType: name } },
    ),
  ]);
  return NextResponse.json({ department: { _id: department._id, name: department.name, locationId: department.locationId } });
}

export async function DELETE(_request, { params }) {
  const { session, error } = await requireSession(["manager"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  await connectDB();
  const manager = await User.findOne({
    _id: session.userId,
    companyId: session.companyId,
    role: "manager",
  }).select("locationId").lean();
  if (!manager) {
    return NextResponse.json({ error: "Your manager account could not be found" }, { status: 404 });
  }

  const managerLocationId = String(manager.locationId || session.locationId || session.locationIds?.[0] || "");
  if (!mongoose.isValidObjectId(managerLocationId)) {
    return NextResponse.json({ error: "Your account is not assigned to a valid location" }, { status: 403 });
  }

  const department = await Department.findOne({
    _id: id,
    companyId: session.companyId,
    locationId: managerLocationId,
    isActive: { $ne: false },
  }).select("_id name locationId").lean();
  if (!department) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  const escapedName = department.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await User.updateMany(
    {
      companyId: session.companyId,
      locationId: department.locationId,
      role: { $in: ["staff", "manager"] },
      department: { $regex: `^${escapedName}$`, $options: "i" },
    },
    { $set: { department: "" } },
  );
  const routines = await DepartmentRoutine.find({
    companyId: session.companyId,
    departmentId: department._id,
    locationId: managerLocationId,
  }).select("_id").lean();
  if (routines.length) {
    await RoutineTaskCompletion.deleteMany({
      companyId: session.companyId,
      departmentId: department._id,
      routineId: { $in: routines.map((routine) => routine._id) },
    });
    await DepartmentRoutine.deleteMany({
      companyId: session.companyId,
      departmentId: department._id,
      locationId: managerLocationId,
    });
  }
  await Department.deleteOne({
    _id: department._id,
    companyId: session.companyId,
    locationId: managerLocationId,
  });

  return NextResponse.json({
    success: true,
    message: `Department "${department.name}" was removed. Staff were unassigned, historical jobs/reports/shifts were retained, and its routines were deleted.`,
  });
}
