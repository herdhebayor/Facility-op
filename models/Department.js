import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DepartmentSchema.index({ locationId: 1, name: 1 }, { unique: true });

export default mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
