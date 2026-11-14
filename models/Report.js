import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // author
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // reported staff if applicable

    sourceRole: { type: String, enum: ["staff", "manager", "admin"], default: "staff" },
    recipientRole: { type: String, enum: ["admin", "manager", "staff"], default: "manager" },
    type: { type: String, enum: ["routine", "incident", "performance", "staff_issue"], default: "routine" },
    title: { type: String, required: true },
    details: { type: String, default: "" },
    status: { type: String, enum: ["open", "reviewed", "resolved"], default: "open" },
    photoUrls: [{ type: String }],
    comments: [
      {
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        authorRole: { type: String, enum: ["staff", "manager", "admin"], required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Report || mongoose.model("Report", ReportSchema);
