import mongoose from "mongoose";

const ShiftSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    status: { type: String, enum: ["active", "completed"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.Shift || mongoose.model("Shift", ShiftSchema);
