import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    staffs: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    locations: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Location",
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Company || mongoose.model("Company", CompanySchema);
