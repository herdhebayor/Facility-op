import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", default: null, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    text: { type: String, default: "", trim: true },
    ciphertext: { type: String, default: "" },
    iv: { type: String, default: "" },
    keyEnvelopes: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      wrappedKey: { type: String, required: true },
    }],
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    deletedForEveryone: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    reactions: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      emoji: { type: String, enum: ["👍", "❤️", "😂", "👏"], required: true },
    }],
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1, recipientId: 1, createdAt: 1 });

const existingMessageModel = mongoose.models.Message;
if (existingMessageModel && (!existingMessageModel.schema.path("ciphertext") || !existingMessageModel.schema.path("editedAt"))) {
  mongoose.deleteModel("Message");
}

export default mongoose.models.Message || mongoose.model("Message", MessageSchema);
