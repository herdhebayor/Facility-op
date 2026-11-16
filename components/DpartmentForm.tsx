import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";

type DepartmentFormProps = {
  setDepartmentDialogOpen: (open: boolean) => void;
  user: { locationId?: string | { toString(): string } | null } | null;
  locations: Array<{ _id: string; name: string }>;
  onCreated?: () => void | Promise<void>;
};

function DepartmentForm({ setDepartmentDialogOpen, user, locations, onCreated }: DepartmentFormProps) {
    const [departmentName, setDepartmentName] = useState("");
    const [departmentLocationId, setDepartmentLocationId] = useState("");
    const [savingDepartment, setSavingDepartment] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const name = departmentName.trim();
        if (!name) {
            setError("Enter a department name.");
            return;
        }
        if (!departmentLocationId) {
            setError("Select a location for this department.");
            return;
        }
        if (savingDepartment) return;

        setSavingDepartment(true);
        setError("");
        setSuccess(false);
        try {
            const response = await fetch('/api/departments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, locationId: departmentLocationId }),
            });
            const responseText = await response.text();
            let data: { error?: string; department?: { _id: string; name: string } } = {};
            if (responseText.trim()) {
                try {
                    data = JSON.parse(responseText);
                } catch {
                    throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
                }
            }
            if (!response.ok) {
                throw new Error(data.error || `Unable to create department (HTTP ${response.status}).`);
            }
            if (!data.department?._id) {
                throw new Error(`The server did not confirm department creation (HTTP ${response.status}).`);
            }
            setSuccess(true);
            setDepartmentName("");
            await onCreated?.();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Unable to create department.");
        }finally {
            setSavingDepartment(false);
        }
    }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
            <section role="dialog" aria-modal="true" aria-labelledby="department-dialog-title" className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Profile setup</p>
                  <h2 id="department-dialog-title" className="mt-1 text-xl font-semibold text-slate-900">Choose your department</h2>
                  <p className="mt-2 text-sm text-slate-500">Pick an existing department or add a new one.</p>
                </div>
                <button type="button" onClick={() => setDepartmentDialogOpen(false)} aria-label="Close department form" className="rounded-xl  cursor-pointer border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                
                <label className="block text-sm font-medium text-slate-700">
                  New department
                  <input value={departmentName} onChange={(event) => { setDepartmentName(event.target.value); setSuccess(false); }} maxLength={80} placeholder="e.g. Maintenance" required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                  <select value={departmentLocationId} onChange={(event) => { setDepartmentLocationId(event.target.value); setSuccess(false); }} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    <option value="">Select location</option>
                    {user.locationId && <option value={String(user.locationId)}>{locations.find((loc) => loc._id === String(user.locationId))?.name || String(user.locationId)}</option>}
                  </select>
                </label>
                {error && <p className="text-sm text-rose-600">{error}</p>}
                {success && <p className="text-sm text-green-600">Department created successfully!. Add another?</p>}
                <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setDepartmentDialogOpen(false)} className="rounded-xl cursor-pointer border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button> 
                  <button type="submit" disabled={savingDepartment} className="inline-flex items-center justify-center cursor-pointer gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white w-full hover:bg-indigo-700 disabled:opacity-60"><Plus className="h-4 w-4" />{savingDepartment ? "Saving..." : "Save department"}</button>
                </div>
              </form>
            </section>
          </div>
  )
}

export default DepartmentForm
