import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true },
    address: { type: String },
    timezone: { type: String, default: "Africa/Lagos" },
  },
  { timestamps: true }
);

export default mongoose.models.Location || mongoose.model("Location", LocationSchema);
