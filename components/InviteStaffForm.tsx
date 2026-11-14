import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Plus, UserRoundPlus, X } from "lucide-react";

export type InviteLocationOption = {
  _id: string;
  name: string;
};

export type InviteDepartmentOption = {
  _id: string;
  name: string;
  locationId?: string;
};

export type InviteStaffFormValues = {
  name: string;
  email: string;
  phoneNumber: string;
  role: "staff" | "manager";
  staffType: string;
  locationId: string;
  department: string;
  password: string;
};

type InviteStaffFormProps = {
  form: InviteStaffFormValues;
  setForm: Dispatch<SetStateAction<InviteStaffFormValues>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  creating: boolean;
  locations: InviteLocationOption[];
  staffTypes: string[];
  departments: InviteDepartmentOption[];
  onCreateDepartment: (name: string) => Promise<InviteDepartmentOption | null>;
  error: string;
  onClose: () => void;
  fixedLocation?: InviteLocationOption | null;
};

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) return { label: "No password", color: "bg-slate-400", width: "0%" };
  if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "25%" };
  if (score === 2) return { label: "Fair", color: "bg-orange-500", width: "50%" };
  if (score === 3) return { label: "Good", color: "bg-yellow-500", width: "75%" };
  return { label: "Strong", color: "bg-emerald-500", width: "100%" };
}

export default function InviteStaffForm({
  form,
  setForm,
  onSubmit,
  creating,
  locations,
  staffTypes,
  departments,
  onCreateDepartment,
  error,
  onClose,
  fixedLocation,
}: InviteStaffFormProps) {
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const passwordStrength = getPasswordStrength(form.password);

  async function handleCreateDepartment() {
    const name = newDepartmentName.trim();
    if (!name || isCreatingDepartment) return;

    setIsCreatingDepartment(true);
    try {
      const department = await onCreateDepartment(name);
      if (department) {
        setForm((current) => ({ ...current, department: department.name }));
        setNewDepartmentName("");
      }
    } finally {
      setIsCreatingDepartment(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/20 px-4 py-6 backdrop-blur-sm">
      <div className="my-auto w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserRoundPlus className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Invite staff member</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invite form"
            className="rounded-full border border-zinc-200 p-2 text-slate-500 transition hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-600">
              Full name
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder="Full name"
                autoComplete="name"
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Email address
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder="Email address"
                autoComplete="email"
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Phone number (optional, international format)
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder="+14155552671"
                autoComplete="tel"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Role
              <select
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as InviteStaffFormValues["role"] }))}
                className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-slate-900"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </label>
            <div className="space-y-1 text-sm text-slate-600">
              <label htmlFor="invite-location">Location</label>
              {fixedLocation ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-900">
                  {fixedLocation.name}
                  <span className="ml-2 text-xs font-normal text-emerald-700">Current location</span>
                </div>
              ) : (
                <select
                  id="invite-location"
                  value={form.locationId}
                  onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value, department: "" }))}
                  className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-slate-900"
                  required
                >
                  <option value="">Select location</option>
                  {locations.map((location) => (
                    <option key={location._id} value={location._id}>{location.name}</option>
                  ))}
                </select>
              )}
            </div>
            <label className="space-y-1 text-sm text-slate-600">
              Employment type
              <select
                value={form.staffType}
                onChange={(event) => setForm((current) => ({ ...current, staffType: event.target.value }))}
                className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-slate-900"
              >
                {staffTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="invite-department" className="block text-sm font-medium text-slate-700">Choose or add a department</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  id="invite-department"
                  value={form.department}
                  onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
                  className="min-w-0 flex-1 cursor-pointer rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  required
                >
                  <option value="">Select department</option>
                  {departments.filter((department) => !department.locationId || department.locationId === form.locationId).map((department) => (
                    <option key={department._id} value={department.name}>{department.name}</option>
                  ))}
                </select>
                <input
                  value={newDepartmentName}
                  onChange={(event) => setNewDepartmentName(event.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 sm:max-w-48"
                  placeholder="Add new department"
                  aria-label="New department name"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateDepartment()}
                  disabled={!newDepartmentName.trim() || isCreatingDepartment}
                  className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingDepartment ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </div>

          {!fixedLocation && locations.length === 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Add a location first before assigning staff.
            </div>
          )}

          <div>
            <label htmlFor="invite-password" className="mb-2 block text-sm text-slate-600">Temporary password</label>
            <input
              id="invite-password"
              type="text"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder="Optional: create a custom temporary password"
            />
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Password strength</span>
                <span>{passwordStrength.label}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                <div className={`h-full rounded-full transition-all ${passwordStrength.color}`} style={{ width: passwordStrength.width }} />
              </div>
            </div>
          </div>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-zinc-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || (!fixedLocation && locations.length === 0)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {creating ? "Inviting..." : "Create invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
