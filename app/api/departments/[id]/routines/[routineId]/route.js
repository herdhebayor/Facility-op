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

async function managerDepartment(session, departmentId) {
  const manager = await User.findOne({
    _id: session.userId,
    companyId: session.companyId,
    role: "manager",
  }).select("locationId").lean();
  if (!manager) return { error: "Your manager account could not be found", status: 404 };

  const locationId = String(manager.locationId || session.locationId || session.locationIds?.[0] || "");
  const department = await Department.findOne({
    _id: departmentId,
    companyId: session.companyId,
    locationId,
    isActive: { $ne: false },
  }).select("_id locationId").lean();
  if (!department) return { error: "Department not found", status: 404 };
  return { department };
}

export async function PATCH(request, { params }) {
  const { session, error } = await requireSession(["manager"]);
  if (error) return error;

  const { id: departmentId, routineId } = await params;
  if (!mongoose.isValidObjectId(departmentId) || !mongoose.isValidObjectId(routineId)) {
    return NextResponse.json({ error: "Department or routine not found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120 || !Array.isArray(body?.tasks) || !body.tasks.length || body.tasks.length > 100) {
    return NextResponse.json({ error: "A routine name and between 1 and 100 checklist tasks are required" }, { status: 400 });
  }
  const tasks = [];
  for (const task of body.tasks) {
    if (!task || typeof task.title !== "string" || !task.title.trim() || task.title.trim().length > 160) {
      return NextResponse.json({ error: "Each checklist task needs a title of 160 characters or fewer" }, { status: 400 });
    }
    const area = typeof task.area === "string" ? task.area.trim() : "";
    if (area.length > 120) {
      return NextResponse.json({ error: "Task areas must be 120 characters or fewer" }, { status: 400 });
    }
    if (task._id && !mongoose.isValidObjectId(task._id)) {
      return NextResponse.json({ error: "A checklist task ID is invalid" }, { status: 400 });
    }
    tasks.push({ ...(task._id ? { _id: task._id } : {}), title: task.title.trim(), area });
  }

  await connectDB();
  const access = await managerDepartment(session, departmentId);
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

  const routine = await DepartmentRoutine.findOne({
    _id: routineId,
    companyId: session.companyId,
    locationId: access.department.locationId,
    departmentId: access.department._id,
  });
  if (!routine) return NextResponse.json({ error: "Routine not found" }, { status: 404 });

  const currentTaskIds = routine.tasks.map((task) => String(task._id));
  const retainedTaskIds = tasks.filter((task) => task._id).map((task) => String(task._id));
  if (new Set(retainedTaskIds).size !== retainedTaskIds.length) {
    return NextResponse.json({ error: "A checklist task cannot appear more than once" }, { status: 400 });
  }
  if (retainedTaskIds.some((taskId) => !currentTaskIds.includes(taskId))) {
    return NextResponse.json({ error: "A checklist task does not belong to this routine" }, { status: 400 });
  }
  const removedTaskIds = currentTaskIds.filter((taskId) => !retainedTaskIds.includes(taskId));
  const taskListChanged = tasks.length !== routine.tasks.length || tasks.some((task, index) => (
    String(task._id || "") !== String(routine.tasks[index]?._id || "")
    || task.title !== routine.tasks[index]?.title
    || task.area !== routine.tasks[index]?.area
  ));

  routine.name = name;
  routine.tasks = tasks;
  await routine.save();

  if (removedTaskIds.length) {
    await RoutineTaskCompletion.deleteMany({
      companyId: session.companyId,
      departmentId: access.department._id,
      routineId: routine._id,
      taskId: { $in: removedTaskIds },
    });
  }
  if (taskListChanged) {
    const location = await Location.findOne({ _id: access.department.locationId, companyId: session.companyId })
      .select("timezone").lean();
    await RoutineSubmission.deleteMany({
      companyId: session.companyId,
      departmentId: access.department._id,
      routineId: routine._id,
      dayKey: getRoutineDayKey(location?.timezone),
    });
  }
  return NextResponse.json({ routine });
}

export async function DELETE(_request, { params }) {
  const { session, error } = await requireSession(["manager"]);
  if (error) return error;

  const { id: departmentId, routineId } = await params;
  if (!mongoose.isValidObjectId(departmentId) || !mongoose.isValidObjectId(routineId)) {
    return NextResponse.json({ error: "Department or routine not found" }, { status: 404 });
  }

  await connectDB();
  const access = await managerDepartment(session, departmentId);
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

  const routine = await DepartmentRoutine.findOneAndDelete({
    _id: routineId,
    companyId: session.companyId,
    locationId: access.department.locationId,
    departmentId: access.department._id,
  }).select("_id");
  if (!routine) return NextResponse.json({ error: "Routine not found" }, { status: 404 });

  await RoutineTaskCompletion.deleteMany({
    companyId: session.companyId,
    departmentId: access.department._id,
    routineId: routine._id,
  });
  await RoutineSubmission.deleteMany({
    companyId: session.companyId,
    departmentId: access.department._id,
    routineId: routine._id,
  });
  return NextResponse.json({ success: true });
}
