import mongoose from "mongoose";

const RoutineSubmissionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true, index: true },
    routineId: { type: mongoose.Schema.Types.ObjectId, ref: "DepartmentRoutine", required: true, index: true },
    dayKey: { type: String, required: true, index: true },
    submittedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    submittedAt: { type: Date, required: true, default: Date.now },
    completedTaskCount: { type: Number, required: true, min: 0 },
    totalTaskCount: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

RoutineSubmissionSchema.index(
  { routineId: 1, dayKey: 1, submittedByUserId: 1 },
  { unique: true },
);

export default mongoose.models.RoutineSubmission || mongoose.model("RoutineSubmission", RoutineSubmissionSchema);
