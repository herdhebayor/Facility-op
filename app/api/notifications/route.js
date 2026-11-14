import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireSession } from "@/lib/requireSession";
import Conversation from "@/models/Conversation";
import Department from "@/models/Department";
import Job from "@/models/Job";
import Message from "@/models/Message";
import Report from "@/models/Report";
import User from "@/models/User";

const ACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_NOTIFICATIONS = 60;

function assignedLocationId(user, session) {
  return String(user?.locationId || session.locationId || session.locationIds?.[0] || "");
}

function normalizeId(value) {
  return String(value?._id || value || "");
}

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  await connectDB();
  const currentUser = await User.findOne({
    _id: session.userId,
    companyId: session.companyId,
    role: session.role,
    isActive: { $ne: false },
  }).select("_id role locationId department").lean();
  if (!currentUser) {
    return NextResponse.json({ error: "Your account is unavailable" }, { status: 404 });
  }

  const locationId = assignedLocationId(currentUser, session);
  const activitySince = new Date(Date.now() - ACTIVITY_WINDOW_MS);
  const notifications = [];

  const reportQuery = {
    companyId: session.companyId,
    updatedAt: { $gte: activitySince },
    $or: [
      { userId: session.userId },
      ...(session.role === "staff" ? [] : [{ recipientRole: session.role }]),
    ],
  };
  if (session.role !== "admin") {
    if (!mongoose.isValidObjectId(locationId)) {
      reportQuery.locationId = { $in: [] };
    } else {
      reportQuery.locationId = locationId;
    }
  }
  if (session.role === "staff") reportQuery.userId = session.userId;

  const reportQueryPromise = Report.find(reportQuery)
    .populate("userId", "name")
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  let jobQuery = {
    companyId: session.companyId,
    updatedAt: { $gte: activitySince },
  };
  if (session.role !== "admin") {
    if (!mongoose.isValidObjectId(locationId)) {
      jobQuery.locationId = { $in: [] };
    } else {
      jobQuery.locationId = locationId;
    }
  }

  if (session.role === "staff") {
    const departmentName = typeof currentUser.department === "string" ? currentUser.department.trim() : "";
    if (!departmentName) {
      jobQuery._id = { $in: [] };
    } else {
      const escapedName = departmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const department = await Department.findOne({
        companyId: session.companyId,
        locationId,
        name: { $regex: `^${escapedName}$`, $options: "i" },
        isActive: { $ne: false },
      }).select("_id name").lean();
      if (!department) {
        jobQuery._id = { $in: [] };
      } else {
        const escapedDepartmentName = department.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        jobQuery.$or = [
          { departmentId: department._id },
          { departmentId: null, staffType: { $regex: `^${escapedDepartmentName}$`, $options: "i" } },
        ];
      }
    }
  }

  const conversations = await Conversation.find({
    companyId: session.companyId,
    participants: session.userId,
  }).populate("participants", "_id role locationId").lean();
  const allowedConversationIds = conversations.filter((conversation) => {
    const otherParticipants = conversation.participants
      .filter((participant) => normalizeId(participant) !== String(session.userId));
    if (conversation.type === "group" && conversation.name === "All managers" && session.role === "manager") return true;
    return otherParticipants.every((participant) => {
      if (session.role === "admin") return participant.role === "manager";
      if (session.role === "manager") {
        return participant.role === "admin"
          || (participant.role === "staff" && normalizeId(participant.locationId) === locationId)
          || (participant.role === "manager" && normalizeId(participant.locationId) !== locationId);
      }
      return participant.role === "manager" || participant.role === "staff"
        ? normalizeId(participant.locationId) === locationId
        : false;
    });
  }).map((conversation) => conversation._id);
  const contactQuery = {
    companyId: session.companyId,
    _id: { $ne: session.userId },
    isActive: { $ne: false },
    isSetupComplete: { $ne: false },
  };
  if (session.role === "admin") {
    contactQuery.role = "manager";
  } else if (session.role === "manager") {
    contactQuery.$or = [
      { role: "admin" },
      ...(locationId ? [{ role: "staff", locationId }, { role: "manager", locationId: { $ne: locationId } }] : []),
    ];
  } else if (session.role === "staff" && mongoose.isValidObjectId(locationId)) {
    contactQuery.locationId = locationId;
    contactQuery.role = { $in: ["staff", "manager"] };
  } else {
    contactQuery._id = { $in: [] };
  }
  const allowedContactIds = (await User.find(contactQuery).select("_id").lean()).map((contact) => contact._id);

  const [reports, jobs, unreadMessages, directUnreadMessages] = await Promise.all([
    reportQueryPromise,
    Job.find(jobQuery).populate("createdByUserId", "name").sort({ updatedAt: -1 }).limit(20).lean(),
    allowedConversationIds.length
      ? Message.find({
        companyId: session.companyId,
        conversationId: { $in: allowedConversationIds },
        senderId: { $ne: session.userId },
        seenBy: { $ne: session.userId },
        deletedFor: { $ne: session.userId },
        deletedForEveryone: { $ne: true },
      }).populate("senderId", "name").sort({ createdAt: -1 }).limit(30).lean()
      : Promise.resolve([]),
    allowedContactIds.length
      ? Message.find({
        companyId: session.companyId,
        recipientId: session.userId,
        senderId: { $in: allowedContactIds },
        seenBy: { $ne: session.userId },
        deletedFor: { $ne: session.userId },
        deletedForEveryone: { $ne: true },
      }).populate("senderId", "name").sort({ createdAt: -1 }).limit(30).lean()
      : Promise.resolve([]),
  ]);

  const uniqueUnreadMessages = [...new Map(
    [...unreadMessages, ...directUnreadMessages].map((message) => [String(message._id), message]),
  ).values()];
  for (const message of uniqueUnreadMessages) {
    notifications.push({
      id: `message:${message._id}`,
      kind: "message",
      title: "New message",
      description: `Message from ${message.senderId?.name || "a contact"}`,
      href: "/chat",
      createdAt: message.createdAt,
      actionable: true,
    });
  }

  for (const report of reports) {
    const isActionable = report.recipientRole === session.role && report.status === "open";
    notifications.push({
      id: `report:${report._id}:${new Date(report.updatedAt).getTime()}`,
      kind: "report",
      title: report.userId?.name ? `Report from ${report.userId.name}` : "Report activity",
      description: report.title,
      href: "/report",
      createdAt: report.updatedAt,
      actionable: isActionable,
    });
  }

  for (const job of jobs) {
    notifications.push({
      id: `task:${job._id}:${new Date(job.updatedAt).getTime()}`,
      kind: "task",
      title: job.createdByUserId?.name ? `Task activity by ${job.createdByUserId.name}` : "Task activity",
      description: `${job.title} · ${job.status.replaceAll("_", " ")}`,
      href: "/jobs",
      createdAt: job.updatedAt,
      actionable: job.status !== "closed",
    });
  }

  notifications.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  return NextResponse.json({ notifications: notifications.slice(0, MAX_NOTIFICATIONS) });
}
