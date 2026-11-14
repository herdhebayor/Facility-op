import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Department from "@/models/Department";
import User from "@/models/User";
import { requireSession } from "@/lib/requireSession";

export async function PATCH(req) {
  const { session, error } = await requireSession(["staff"]);
  if (error) return error;

  const body = await req.json();
  const departmentName = typeof body.department === "string" ? body.department.trim() : "";
  if (!departmentName) {
    return NextResponse.json({ error: "Choose a department before saving" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ _id: session.userId, companyId: session.companyId });
  if (!user) {
    return NextResponse.json({ error: "Your account could not be found" }, { status: 404 });
  }
  if (user.department?.trim()) {
    return NextResponse.json({ error: "Your department is already set. Contact an administrator to change it." }, { status: 409 });
  }
  const locationId = String(body.locationId || "");
  if (!locationId || String(user.locationId || "") !== locationId) {
    return NextResponse.json({ error: "Choose one of your assigned locations" }, { status: 400 });
  }

  const department = await Department.findOne({
    companyId: session.companyId,
    locationId,
    name: departmentName,
    isActive: true,
  }).select("name").lean();
  if (!department) {
    return NextResponse.json({ error: "Select an active department at your assigned location" }, { status: 400 });
  }

  user.department = department.name;
  await user.save();
  return NextResponse.json({ department: user.department });
}
