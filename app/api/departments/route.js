import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Department from "@/models/Department";
import DepartmentRoutine from "@/models/DepartmentRoutine";
import Job from "@/models/Job";
import Location from "@/models/Location";
import RoutineSubmission from "@/models/RoutineSubmission";
import RoutineTaskCompletion from "@/models/RoutineTaskCompletion";
import User from "@/models/User";
import { requireSession } from "@/lib/requireSession";
import { getRoutineDayKey } from "@/lib/routineDayKey";

export async function GET() {
  let stage = "session";
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    if (!mongoose.isValidObjectId(session.userId) || !mongoose.isValidObjectId(session.companyId)) {
      return NextResponse.json({ error: "Session is invalid. Please sign in again." }, { status: 401 });
    }

    stage = "database connection";
    await connectDB();
    stage = "current user lookup";
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

    const databaseLocationId = currentUser.locationId ? String(currentUser.locationId) : "";
    const assignedLocationId = session.role === "manager"
      ? databaseLocationId || String(session.locationId || "")
      : databaseLocationId;
    const scopedLocationIds = session.role === "admin"
      ? null
      : [assignedLocationId].filter((id) => mongoose.isValidObjectId(id));

    if (session.role === "staff" && !(typeof currentUser.department === "string" && currentUser.department.trim())) {
      return NextResponse.json({ departments: [] });
    }

    stage = "department query";
    const query = { companyId: session.companyId, isActive: { $ne: false } };
    if (scopedLocationIds) query.locationId = { $in: scopedLocationIds };
    if (session.role === "staff" && typeof currentUser.department === "string" && currentUser.department.trim()) {
      const departmentName = currentUser.department.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.name = { $regex: `^${departmentName}$`, $options: "i" };
    }

    const departments = await Department.find(query).sort({ name: 1 }).lean();
    const uniqueLocationIds = [...new Set(
      departments
        .map((department) => String(department.locationId || ""))
        .filter((id) => mongoose.isValidObjectId(id)),
    )];

    stage = "department summary queries";
    const [locations, users, jobs, routines] = await Promise.all([
      Location.find({ _id: { $in: uniqueLocationIds }, companyId: session.companyId }).select("name timezone").lean(),
      User.find({
        companyId: session.companyId,
        role: { $in: ["staff", "manager"] },
        ...(scopedLocationIds ? { locationId: { $in: scopedLocationIds } } : {}),
      }).select("name role department locationId shiftStatus staffType").lean(),
      Job.find({
        companyId: session.companyId,
        locationId: { $in: uniqueLocationIds },
      }).select("status staffType departmentId locationId").lean(),
      DepartmentRoutine.find({
        companyId: session.companyId,
        departmentId: { $in: departments.map((department) => department._id) },
      }).select("departmentId locationId tasks").lean(),
    ]);

    const locationsById = new Map(locations.map((location) => [String(location._id), location]));
    const dailyScopes = departments.map((department) => ({
      departmentId: department._id,
      dayKey: getRoutineDayKey(locationsById.get(String(department.locationId))?.timezone),
    }));
    const [completions, submissions] = routines.length
      ? await Promise.all([
        RoutineTaskCompletion.find({
        companyId: session.companyId,
        $or: dailyScopes.map((scope) => ({
          departmentId: scope.departmentId,
          dayKey: scope.dayKey,
        })),
        }).populate("completedByUserId", "name").lean(),
        RoutineSubmission.find({
          companyId: session.companyId,
          $or: dailyScopes.map((scope) => ({
            departmentId: scope.departmentId,
            dayKey: scope.dayKey,
          })),
        }).populate("submittedByUserId", "name").sort({ submittedAt: -1 }).lean(),
      ])
      : [[], []];
    const summaries = departments.map((department) => {
      const departmentName = typeof department.name === "string" ? department.name.trim().toLowerCase() : "";
      const departmentLocationId = String(department.locationId || "");
      const location = locationsById.get(departmentLocationId);
      const departmentUsers = users.filter((user) =>
        typeof user.department === "string"
        && user.department.trim().toLowerCase() === departmentName
        && String(user.locationId || "") === departmentLocationId
      );
      const departmentJobs = jobs.filter((job) =>
        String(job.locationId) === departmentLocationId
        && (String(job.departmentId || "") === String(department._id)
          || (!job.departmentId
            && typeof job.staffType === "string"
            && job.staffType.trim().toLowerCase() === departmentName))
      );
      const departmentRoutines = routines.filter((routine) =>
        String(routine.departmentId) === String(department._id)
        && String(routine.locationId) === departmentLocationId
      );
      const routineJobCount = departmentRoutines.reduce((total, routine) => total + routine.tasks.length, 0);
      const dayKey = getRoutineDayKey(location?.timezone);
      const departmentCompletions = completions.filter((completion) =>
        String(completion.departmentId) === String(department._id)
        && completion.dayKey === dayKey
        && departmentRoutines.some((routine) => String(routine._id) === String(completion.routineId))
      );
      const completedRoutineJobs = departmentCompletions.filter((completion) => completion.completedAt).length;

      return {
        ...department,
        locationName: location?.name || "Location",
        locationTimezone: location?.timezone || "Africa/Lagos",
        staffCount: departmentUsers.length,
        onShiftCount: departmentUsers.filter((user) => user.shiftStatus === "on").length,
        jobCount: departmentJobs.length,
        routineJobCount,
        completedRoutineJobCount: completedRoutineJobs,
        routineCompletion: routineJobCount
          ? Math.round((completedRoutineJobs / routineJobCount) * 100)
          : null,
        routineDayKey: dayKey,
        routines: departmentRoutines.map((routine) => ({
          ...routine,
          completions: departmentCompletions.filter((completion) => String(completion.routineId) === String(routine._id)),
          routineSubmissions: submissions
            .filter((submission) => String(submission.routineId) === String(routine._id) && submission.dayKey === dayKey),
        })),
        routineSubmissions: submissions
          .filter((submission) => String(submission.departmentId) === String(department._id) && submission.dayKey === dayKey)
          .map((submission) => ({
            ...submission,
            routineName: departmentRoutines.find((routine) => String(routine._id) === String(submission.routineId))?.name || "Routine",
            issueReports: departmentCompletions
              .filter((completion) => String(completion.routineId) === String(submission.routineId) && completion.issueReport)
              .map((completion) => ({
                taskId: String(completion.taskId),
                taskTitle: departmentRoutines.find((routine) => String(routine._id) === String(submission.routineId))
                  ?.tasks.find((task) => String(task._id) === String(completion.taskId))?.title || "Checklist item",
                issueReport: completion.issueReport,
              })),
          })),
      };
    });

    return NextResponse.json({ departments: summaries });
  } catch (error) {
    console.error(`Department list failed during ${stage}:`, error);
    return NextResponse.json(
      { error: "Unable to load departments right now. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const { session, error } = await requireSession(["admin", "manager", "staff"]);
    if (error) return error;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 });
    }

    await connectDB();
    const currentUser = await User.findOne({
      _id: session.userId,
      companyId: session.companyId,
    }).select("locationId").lean();
    if (!currentUser) {
      return NextResponse.json({ error: "Your account could not be found" }, { status: 404 });
    }

    const assignedLocationId = currentUser.locationId ? String(currentUser.locationId) : "";
    const allowedLocationIds = session.role === "admin" ? null : [assignedLocationId].filter(Boolean);
    const requestedLocationId = String(body.locationId || (
      session.role === "staff" ? assignedLocationId : ""
    ));
    if (!mongoose.isValidObjectId(requestedLocationId)) {
      return NextResponse.json({ error: "Select a valid location for this department" }, { status: 400 });
    }
    if (allowedLocationIds && !allowedLocationIds.includes(requestedLocationId)) {
      return NextResponse.json({ error: "You can only manage departments at your assigned locations" }, { status: 403 });
    }

    const location = await Location.findOne({
      _id: requestedLocationId,
      companyId: session.companyId,
    }).select("_id").lean();
    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const existing = await Department.findOne({
      companyId: session.companyId,
      locationId: requestedLocationId,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (existing) {
      return NextResponse.json({ error: "This department already exists at this location" }, { status: 409 });
    }

    const department = await Department.create({
      companyId: session.companyId,
      name,
      locationId: requestedLocationId,
      isActive: true,
    });

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "This department already exists at this location" }, { status: 409 });
    }
    if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ error: "Department details are invalid" }, { status: 400 });
    }

    console.error("Department creation failed:", error);
    return NextResponse.json({ error: "Unable to create department right now. Please try again." }, { status: 500 });
  }
}
