import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    await connectDB();
  } catch (error) {
    console.error("MongoDB connection failed during email lookup:", error);
    return NextResponse.json(
      {
        error:
          "Database is unavailable right now. Please make sure your MongoDB Atlas IP is whitelisted and the connection string is valid.",
      },
      { status: 503 }
    );
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json(
        { error: "Cannot find user with this email, check with your manager" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      email: user.email,
      success: true,
      requiresSetup: !user.isSetupComplete || user.passwordResetRequired,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("Email lookup failed:", error);
    return NextResponse.json({ error: "Network error, try again" }, { status: 500 });
  }
}
