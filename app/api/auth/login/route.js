import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";
import { hashPassword, verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req) {
  const body = await req.json();
  const { email, password, newPassword, confirmPassword, setupMode } = body || {};

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!setupMode && !password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  if (setupMode) {
    if (!password || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "Temporary password, new password, and confirmation are required" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New password confirmation does not match" }, { status: 400 });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: "New password must be between 8 and 128 characters" }, { status: 400 });
    }
  }

  try {
    await connectDB();
  } catch (error) {
    console.error("MongoDB connection failed during login:", error);
    return NextResponse.json(
      {
        error:
          "Database is unavailable right now. Please make sure your MongoDB Atlas IP is whitelisted and the connection string is valid.",
      },
      { status: 503 }
    );
  }

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: "This account has been suspended by the admin." }, { status: 403 });
    }

    if (setupMode) {
      if (user.passwordResetRequired && user.recoveryPasswordExpiresAt && user.recoveryPasswordExpiresAt <= new Date()) {
        user.passwordResetRequired = false;
        user.recoveryPasswordExpiresAt = null;
        await user.save();
        return NextResponse.json({ error: "Your temporary recovery password has expired. Ask an administrator to generate a new one." }, { status: 401 });
      }

      const hasTemporaryCredential = Boolean(user.temporaryPassword || user.passwordResetRequired);
      const tempMatches = hasTemporaryCredential ? await verifyPassword(password, user.passwordHash) : false;

      if (!tempMatches) {
        return NextResponse.json({ error: "Your temporary password is incorrect" }, { status: 401 });
      }

      user.passwordHash = await hashPassword(newPassword);
      user.isSetupComplete = true;
      user.temporaryPassword = null;
      user.passwordResetRequired = false;
      user.recoveryPasswordExpiresAt = null;
      await user.save();

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

      return NextResponse.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          staffType: user.staffType,
          shiftStatus: user.shiftStatus,
        },
      });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

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

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        staffType: user.staffType,
        shiftStatus: user.shiftStatus,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Unable to log in right now." }, { status: 500 });
  }
}
