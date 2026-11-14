import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireSession } from "@/lib/requireSession";
import Report from "@/models/Report";

export async function GET(_req, { params }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  await connectDB();
  const access = session.role === "staff"
    ? { userId: session.userId }
    : {
        $or: [
          { userId: session.userId },
          {
            recipientRole: session.role,
            ...(session.role === "manager" ? { locationId: session.locationId || session.locationIds?.[0] } : {}),
          },
        ],
      };
  const report = await Report.findOne({
    _id: id,
    companyId: session.companyId,
    ...access,
  })
    .populate("userId", "name role staffType")
    .populate("targetUserId", "name role staffType")
    .populate("comments.authorId", "name role")
    .populate("locationId", "name address")
    .lean();

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ report });
}
