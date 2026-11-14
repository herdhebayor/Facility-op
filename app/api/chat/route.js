import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireSession } from "@/lib/requireSession";
import User from "@/models/User";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

const EDIT_WINDOW_MS = 60 * 60 * 1000;
const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "👏"];

function assignedLocationId(user, session) {
  return String(user?.locationId || session.locationId || session.locationIds?.[0] || "");
}

function targetIsAllowed(session, currentUser, target) {
  if (!target || String(target._id) === String(session.userId)) return false;
  if (target.companyId && String(target.companyId) !== String(session.companyId)) return false;

  const myLocation = assignedLocationId(currentUser, session);
  const theirLocation = String(target.locationId || "");

  if (session.role === "admin") return target.role === "manager";
  if (session.role === "manager") {
    return target.role === "admin"
      || (target.role === "staff" && Boolean(myLocation) && theirLocation === myLocation)
      || (target.role === "manager" && Boolean(myLocation) && Boolean(theirLocation) && theirLocation !== myLocation);
  }
  return session.role === "staff"
    && (target.role === "staff" || target.role === "manager")
    && Boolean(myLocation)
    && theirLocation === myLocation;
}

function normalizeId(value) {
  return String(value?._id || value || "");
}

async function getActiveUser(session) {
  return User.findOne({
    _id: session.userId,
    companyId: session.companyId,
    role: session.role,
    isActive: { $ne: false },
  }).select("_id companyId role locationId").lean();
}

async function loadConversation(conversationId, session) {
  if (!mongoose.isValidObjectId(conversationId)) return null;
  return Conversation.findOne({
    _id: conversationId,
    companyId: session.companyId,
    participants: session.userId,
  });
}

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  await connectDB();
  const currentUser = await getActiveUser(session);
  if (!currentUser) return NextResponse.json({ error: "Your account is unavailable" }, { status: 404 });

  const locationId = assignedLocationId(currentUser, session);
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
  } else if (session.role === "staff") {
    if (locationId) {
      contactQuery.locationId = locationId;
      contactQuery.role = { $in: ["staff", "manager"] };
    } else {
      contactQuery._id = { $in: [] };
    }
  } else {
    return NextResponse.json({ error: "Your role cannot use chat" }, { status: 403 });
  }

  const [contacts, loadedConversations] = await Promise.all([
    User.find(contactQuery)
      .select("_id name role locationId")
      .sort({ name: 1 })
      .lean(),
    Conversation.find({ companyId: session.companyId, participants: session.userId })
      .populate("participants", "_id name role locationId")
      .sort({ lastMessageAt: -1 })
      .lean(),
  ]);
  const allowedContactIds = new Set(contacts.map((contact) => String(contact._id)));
  const conversations = loadedConversations.filter((conversation) => {
    if (conversation.type === "group" && conversation.name === "All managers" && session.role === "manager") return true;
    return conversation.participants
      .filter((participant) => normalizeId(participant) !== String(session.userId))
      .every((participant) => allowedContactIds.has(normalizeId(participant)));
  });
  const conversationIds = conversations.map((conversation) => conversation._id);
  const loadedMessages = await Message.find({
    companyId: session.companyId,
    deletedFor: { $ne: session.userId },
    $or: [
      { senderId: session.userId },
      { recipientId: session.userId },
      { conversationId: { $in: conversationIds } },
    ],
  })
    .populate("senderId", "_id name role")
    .sort({ createdAt: 1 })
    .lean();
  const visibleConversationIds = new Set(conversationIds.map(String));
  const messages = loadedMessages.filter((message) => {
    if (message.conversationId) return visibleConversationIds.has(String(message.conversationId));
    const senderId = normalizeId(message.senderId);
    const recipientId = normalizeId(message.recipientId);
    const otherUserId = senderId === String(session.userId) ? recipientId : senderId;
    return allowedContactIds.has(otherUserId);
  });

  return NextResponse.json({
    me: {
      _id: currentUser._id,
      role: currentUser.role,
      sessionExpiresAt: Number.isFinite(Number(session.exp)) ? Number(session.exp) * 1000 : null,
    },
    contacts,
    conversations,
    messages,
  });
}

export async function POST(req) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    await connectDB();
    const currentUser = await getActiveUser(session);
    if (!currentUser) return NextResponse.json({ error: "Your account is unavailable" }, { status: 404 });

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    if (body.action === "start") {
      let targetUsers;
      let groupName = "";
      let conversationType = "direct";

      if (body.groupType === "all-managers") {
        if (session.role !== "admin") return NextResponse.json({ error: "Only admins can broadcast to all managers" }, { status: 403 });
        targetUsers = await User.find({
          companyId: session.companyId,
          role: "manager",
          isActive: { $ne: false },
          isSetupComplete: { $ne: false },
        }).select("_id companyId role locationId").lean();
        groupName = "All managers";
        conversationType = "group";
      } else {
        if (!Array.isArray(body.recipientIds) || body.recipientIds.length !== 1 || !mongoose.isValidObjectId(body.recipientIds[0])) {
          return NextResponse.json({ error: "Choose one valid chat contact" }, { status: 400 });
        }
        targetUsers = await User.find({
          _id: body.recipientIds[0],
          companyId: session.companyId,
          isActive: { $ne: false },
          isSetupComplete: { $ne: false },
        }).select("_id companyId role locationId").lean();
        if (!targetUsers.length || !targetIsAllowed(session, currentUser, targetUsers[0])) {
          return NextResponse.json({ error: "You are not allowed to chat with this person" }, { status: 403 });
        }
      }

      const participantIds = [...new Set([session.userId, ...targetUsers.map((target) => String(target._id))])];
      if (participantIds.length < 2) {
        return NextResponse.json({ error: "There are no eligible recipients for this chat" }, { status: 400 });
      }

      let conversation = await Conversation.findOne({
        companyId: session.companyId,
        type: conversationType,
        name: groupName,
        participants: { $all: participantIds, $size: participantIds.length },
      });
      if (!conversation) {
        conversation = await Conversation.create({
          companyId: session.companyId,
          name: groupName,
          type: conversationType,
          participants: participantIds,
          createdBy: session.userId,
          lastMessage: "",
          lastMessageAt: new Date(),
        });
      }

      const populatedConversation = await Conversation.findById(conversation._id)
        .populate("participants", "_id name role locationId")
        .lean();
      return NextResponse.json({ conversation: populatedConversation });
    }

    if (body.action === "send") {
      const conversation = await loadConversation(body.conversationId, session);
      if (!conversation) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      if (conversation.type === "group" && session.role !== "admin") {
        return NextResponse.json({ error: "Only admins can post to the manager broadcast" }, { status: 403 });
      }
      if (typeof body.text !== "string" || !body.text.trim() || body.text.trim().length > 8000) {
        return NextResponse.json({ error: "Message must be between 1 and 8000 characters" }, { status: 400 });
      }
      const participants = conversation.participants.map(normalizeId);
      const recipients = participants.filter((participantId) => participantId !== String(session.userId));
      const permittedUsers = await User.find({
        _id: { $in: recipients },
        companyId: session.companyId,
        isActive: { $ne: false },
      }).select("_id companyId role locationId").lean();
      if (permittedUsers.length !== recipients.length || permittedUsers.some((target) => !targetIsAllowed(session, currentUser, target))) {
        return NextResponse.json({ error: "A chat participant is no longer eligible to receive messages" }, { status: 403 });
      }
      const message = await Message.create({
        companyId: session.companyId,
        conversationId: conversation._id,
        senderId: session.userId,
        recipientId: recipients.length === 1 ? recipients[0] : null,
        text: body.text.trim(),
        seenBy: [session.userId],
      });
      conversation.lastMessage = body.text.trim().slice(0, 160);
      conversation.lastMessageAt = new Date();
      await conversation.save();

      const populatedMessage = await Message.findById(message._id).populate("senderId", "_id name role").lean();
      return NextResponse.json({ message: populatedMessage }, { status: 201 });
    }

    if (body.action === "edit" || body.action === "delete-for-everyone" || body.action === "delete-for-me" || body.action === "react") {
      if (!mongoose.isValidObjectId(body.messageId)) return NextResponse.json({ error: "Message not found" }, { status: 404 });
      const message = await Message.findOne({ _id: body.messageId, companyId: session.companyId });
      if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
      const conversation = await loadConversation(message.conversationId, session);
      if (!conversation) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

      if (body.action === "delete-for-me") {
        if (!message.deletedFor.some((userId) => normalizeId(userId) === String(session.userId))) {
          message.deletedFor.push(session.userId);
          await message.save();
        }
        return NextResponse.json({ success: true });
      }

      if (body.action === "react") {
        if (!ALLOWED_REACTIONS.includes(body.emoji)) return NextResponse.json({ error: "Reaction is invalid" }, { status: 400 });
        const alreadyReacted = message.reactions.some((reaction) => (
          normalizeId(reaction.userId) === String(session.userId) && reaction.emoji === body.emoji
        ));
        message.reactions = message.reactions.filter((reaction) => (
          normalizeId(reaction.userId) !== String(session.userId) || reaction.emoji !== body.emoji
        ));
        if (!alreadyReacted) message.reactions.push({ userId: session.userId, emoji: body.emoji });
        await message.save();
        return NextResponse.json({ reactions: message.reactions });
      }

      if (normalizeId(message.senderId) !== String(session.userId)) {
        return NextResponse.json({ error: "Only the sender can change a message for everyone" }, { status: 403 });
      }
      if (body.action === "edit" && message.deletedForEveryone) {
        return NextResponse.json({ error: "A deleted message cannot be edited" }, { status: 409 });
      }
      if (Date.now() - new Date(message.createdAt).getTime() > EDIT_WINDOW_MS) {
        return NextResponse.json({ error: "The one-hour edit and unsend window has expired" }, { status: 403 });
      }
      if (body.action === "delete-for-everyone") {
        message.deletedForEveryone = true;
        message.ciphertext = "";
        message.iv = "";
        message.keyEnvelopes = [];
        message.text = "";
        await message.save();
        return NextResponse.json({ success: true });
      }

      if (typeof body.text !== "string" || !body.text.trim() || body.text.trim().length > 8000) {
        return NextResponse.json({ error: "Message must be between 1 and 8000 characters" }, { status: 400 });
      }
      message.text = body.text.trim();
      message.ciphertext = "";
      message.iv = "";
      message.keyEnvelopes = [];
      message.editedAt = new Date();
      await message.save();
      conversation.lastMessage = message.text.slice(0, 160);
      conversation.lastMessageAt = new Date();
      await conversation.save();
      return NextResponse.json({ message: await Message.findById(message._id).populate("senderId", "_id name role").lean() });
    }

    if (body.action === "mark-seen") {
      const conversation = await loadConversation(body.conversationId, session);
      if (!conversation) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      await Message.updateMany(
        {
          companyId: session.companyId,
          conversationId: conversation._id,
          senderId: { $ne: session.userId },
          seenBy: { $ne: session.userId },
        },
        { $addToSet: { seenBy: session.userId } },
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid chat action" }, { status: 400 });
  } catch (chatError) {
    console.error("Chat API error:", chatError);
    return NextResponse.json({ error: "Unable to complete the chat action. Please try again." }, { status: 500 });
  }
}
