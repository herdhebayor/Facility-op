import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { createSessionToken, hashPassword, verifyPassword, setSessionCookie } from "@/lib/auth";
import { requireSession } from "@/lib/requireSession";
import User from "@/models/User";

export async function PATCH(req) {
  const { session, error } = await requireSession();
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const changesPassword = Boolean(currentPassword || newPassword || confirmPassword);

  if (name && (name.length < 2 || name.length > 80)) {
    return NextResponse.json({ error: "Name must be between 2 and 80 characters" }, { status: 400 });
  }
  if (!name && !changesPassword) {
    return NextResponse.json({ error: "Enter a new display name or complete the password fields" }, { status: 400 });
  }
  if (changesPassword) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "Current password, new password, and confirmation are required" }, { status: 400 });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: "New password must be between 8 and 128 characters" }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New password confirmation does not match" }, { status: 400 });
    }
  }

  await connectDB();
  const user = await User.findOne({
    _id: session.userId,
    companyId: session.companyId,
    role: session.role,
    isActive: { $ne: false },
  });
  if (!user) {
    return NextResponse.json({ error: "Your account could not be found" }, { status: 404 });
  }

  if (changesPassword && !(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Your current password is incorrect" }, { status: 403 });
  }

  if (name) user.name = name;
  if (changesPassword) user.passwordHash = await hashPassword(newPassword);
  await user.save();

  if (name && name !== session.name) {
    const token = await createSessionToken({
      userId: user._id.toString(),
      companyId: user.companyId.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      shiftStatus: user.shiftStatus || null,
      staffType: user.staffType || null,
      locationId: user.locationId?.toString() || null,
    });
    await setSessionCookie(token);
  }

  return NextResponse.json({
    user: { name: user.name, email: user.email },
    passwordChanged: changesPassword,
  });
}
