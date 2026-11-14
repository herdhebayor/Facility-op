import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, default: "" },
    type: { type: String, enum: ["direct", "group"], default: "direct" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ConversationSchema.index({ companyId: 1, participants: 1 });
ConversationSchema.index({ companyId: 1, lastMessageAt: -1 });

const existingConversationModel = mongoose.models.Conversation;
if (existingConversationModel && !existingConversationModel.schema.path("participants")) {
  mongoose.deleteModel("Conversation");
}

export default mongoose.models.Conversation || mongoose.model("Conversation", ConversationSchema);
