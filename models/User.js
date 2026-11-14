import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", default: null, index: true },

    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phoneNumber: { type: String, default: "" },
    passwordHash: { type: String, required: true },

    role: { type: String, enum: ["staff", "manager", "admin"], required: true },
    // Employment type for staff members: "part time", "full time", or "contract".
    // Staff in the same location can see each other and their own roster entry.
    staffType: { type: String },
    department: { type: String },
    chatPublicKey: { type: mongoose.Schema.Types.Mixed, default: null },
    chatPrivateKeyBackup: { type: mongoose.Schema.Types.Mixed, default: null },
    isSetupComplete: { type: Boolean, default: true },
    temporaryPassword: { type: String, default: null },
    passwordResetRequired: { type: Boolean, default: false },
    recoveryPasswordExpiresAt: { type: Date, default: null },

    // Each person's own on/off shift state — independent of teammates.
    shiftStatus: { type: String, enum: ["on", "off","admin"], default: "off" },
    shiftSince: { type: Date, default: null },

    // Administrative controls for staff access and restrictions.
    isActive: { type: Boolean, default: true },
    suspendedAt: { type: Date, default: null },
    suspensionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

UserSchema.index({ companyId: 1, email: 1 }, { unique: true });

const existingUserModel = mongoose.models.User;
if (existingUserModel && (
  !existingUserModel.schema.path("chatPublicKey") ||
  !existingUserModel.schema.path("chatPrivateKeyBackup") ||
  !existingUserModel.schema.path("passwordResetRequired") ||
  !existingUserModel.schema.path("recoveryPasswordExpiresAt")
)) {
  mongoose.deleteModel("User");
}

export default mongoose.models.User || mongoose.model("User", UserSchema);
