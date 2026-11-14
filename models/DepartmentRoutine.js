import mongoose from "mongoose";

const RoutineTaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  area: { type: String, default: "", trim: true },
});

const DepartmentRoutineSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true, index: true },
    name: { type: String, required: true, trim: true },
    tasks: { type: [RoutineTaskSchema], validate: (tasks) => tasks.length > 0 },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export default mongoose.models.DepartmentRoutine || mongoose.model("DepartmentRoutine", DepartmentRoutineSchema);
