import mongoose from "mongoose";

const RoutineTaskCompletionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true, index: true },
    routineId: { type: mongoose.Schema.Types.ObjectId, ref: "DepartmentRoutine", required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, required: true },
    dayKey: { type: String, required: true },
    completedAt: { type: Date, default: null },
    completedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    issueReport: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

RoutineTaskCompletionSchema.index(
  { routineId: 1, taskId: 1, dayKey: 1 },
  { unique: true },
);

export default mongoose.models.RoutineTaskCompletion || mongoose.model("RoutineTaskCompletion", RoutineTaskCompletionSchema);
