import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null, index: true },

    title: { type: String, required: true },
    area: { type: String }, // e.g. "Roof", "Floor 3"
    staffType: { type: String }, // which team this belongs to, e.g. "Cleaning"

    status: {
      type: String,
      enum: ["open", "pending", "in_progress", "closed"],
      default: "open",
    },
    priority: { type: String, enum: ["routine", "high", "medium", "low"], default: "medium" },

    // Handoff note left by whoever worked the previous shift.
    handoffNote: { type: String, default: "" },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    leftByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    leftAt: { type: Date, default: null },

    photoUrls: [{ type: String }],

    closedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const existingJobModel = mongoose.models.Job;
const priorityValues = JobSchema.path("priority").enumValues;
const existingPriorityValues = existingJobModel?.schema.path("priority")?.enumValues || [];

if (existingJobModel && !priorityValues.every((value) => existingPriorityValues.includes(value))) {
  mongoose.deleteModel("Job");
}

export default mongoose.models.Job || mongoose.model("Job", JobSchema);
