"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, User, ArrowLeft, Pencil } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import InviteStaffForm, { type InviteDepartmentOption, type InviteStaffFormValues } from "@/components/InviteStaffForm";

type LocationSummary = {
  _id: string;
  name: string;
  address?: string;
};

type StaffMember = {
  _id: string;
  name: string;
  email: string;
  role: "staff" | "manager" | "admin";
  department?: string;
  staffType?: string;
  locationId?: string | { _id?: string };
};

type LocationJob = {
  _id: string;
  createdAt?: string;
  closedAt?: string | null;
};

type MonthlyTaskCount = {
  key: string;
  label: string;
  created: number;
  completed: number;
};

function normalizeId(value: string | { _id?: string } | null | undefined) {
  return String(typeof value === "object" && value !== null ? value._id ?? "" : value ?? "");
}

function getMonthlyTaskCounts(jobs: LocationJob[], now = new Date()): MonthlyTaskCount[] {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date),
      month: date.getMonth(),
      created: 0,
      completed: 0,
    };
  });
  const monthByKey = new Map(months.map((month) => [month.key, month]));

  for (const job of jobs) {
    if (job.createdAt) {
      const createdAt = new Date(job.createdAt);
      if (!Number.isNaN(createdAt.getTime())) {
        const month = monthByKey.get(`${createdAt.getFullYear()}-${createdAt.getMonth()}`);
        if (month) month.created += 1;
      }
    }
    if (job.closedAt) {
      const closedAt = new Date(job.closedAt);
      if (!Number.isNaN(closedAt.getTime())) {
        const month = monthByKey.get(`${closedAt.getFullYear()}-${closedAt.getMonth()}`);
        if (month) month.completed += 1;
      }
    }
  }

  return months.map(({ key, label, created, completed }) => ({ key, label, created, completed }));
}

function LocationPageSkeleton() {
  return (
    <main className="min-h-screen bg-zinc-50 px-0 md:px-4 py-6"  aria-busy="true" aria-label="Loading location">
      <div className="mx-auto w-full space-y-6 ">
        <header className="flex flex-col gap-4 rounded-xl p-4 bg-slate-100 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-12 w-40 animate-pulse rounded-2xl bg-emerald-100" />
        </header>
        <section className="min-h-120 rounded-lg  bg-white p-4 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-7 w-36 animate-pulse rounded-lg bg-slate-200" />
            </div>
            <div className="h-12 w-20 animate-pulse rounded-xl bg-slate-200" />
          </div>
          <div className="space-y-6">
            {[0, 1].map((group) => (
              <div key={group} className="space-y-3">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                {[0, 1].map((row) => (
                  <div key={row} className="flex items-center gap-3 rounded-2xl border border-zinc-50/10 p-4">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
                    </div>
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LocationUi() {
  const params = useParams<{ id: string }>();
  const locationId = normalizeId(params.id);
  const router = useRouter();
  const [location, setLocation] = useState<LocationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [jobs, setJobs] = useState<LocationJob[]>([]);
  const [jobsError, setJobsError] = useState("");
  const [user, setUser] = useState<{ role?: string } | null>(null);
  const [departments, setDepartments] = useState<InviteDepartmentOption[]>([]);
  const [form, setForm] = useState<InviteStaffFormValues>({
    name: "",
    email: "",
    phoneNumber: "",
    role: "staff",
    staffType: "full time",
    locationId,
    department: "",
    password: "",
  });
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationNameDraft, setLocationNameDraft] = useState("");
  const [locationAddressDraft, setLocationAddressDraft] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const staffTypes = ["part time", "full time", "contract"];
  const monthlyTasks = getMonthlyTaskCounts(jobs);
  const maxMonthlyTasks = Math.max(1, ...monthlyTasks.flatMap(({ created, completed }) => [created, completed]));
  const totalCreatedTasks = monthlyTasks.reduce((total, month) => total + month.created, 0);
  const totalCompletedTasks = monthlyTasks.reduce((total, month) => total + month.completed, 0);
  const managers = staff
    .filter((member) => member.role === "manager")
    .sort((a, b) => a.name.localeCompare(b.name));

    const locDepts = departments
    const deptStaffs = (dept)=>{
      const staffs = staff.filter(s => s.department === dept.name)
    }

  const staffGroups = Array.from(
    staff
      .filter((member) => member.role === "staff")
      .reduce((groups, member) => {
        const department = member.department?.trim() || "Unassigned";
        const key = department.toLocaleLowerCase();
        const group = groups.get(key) ?? { name: department, members: [] as StaffMember[] };
        group.members.push(member);
        groups.set(key, group);
        return groups;
      }, new Map<string, { name: string; members: StaffMember[] }>()),
  )
    .map(([, group]) => ({
      ...group,
      members: group.members.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    async function load() {
      try {
        const [locRes, staffRes, meRes, departmentsRes] = await Promise.all([
          fetch("/api/locations"),
          fetch(`/api/staff?locationId=${encodeURIComponent(locationId)}`),
          fetch("/api/auth/me"),
          fetch("/api/departments"),
        ]);

        if (!locRes.ok || !staffRes.ok || !meRes.ok || !departmentsRes.ok) {
          throw new Error("Unable to load location details");
        }

        const locationData = await locRes.json();
        const staffData = await staffRes.json();
        const meData = await meRes.json();
        const departmentsData = await departmentsRes.json();
        
        const matchingLocation = Array.isArray(locationData.locations)
          ? locationData.locations.find((item: LocationSummary) => normalizeId(item._id) === locationId)
          : null;
        setLocation(matchingLocation ?? null);
        setUser(meData.user ?? null);
        setDepartments(Array.isArray(departmentsData.departments) ? departmentsData.departments : []);

        const locationStaff = (Array.isArray(staffData.staff) ? staffData.staff : []).filter(
          (staffMember: StaffMember) =>
            normalizeId(staffMember.locationId) === locationId
        );
        setStaff(locationStaff);

        try {
          const jobsRes = await fetch(`/api/jobs?locationId=${encodeURIComponent(locationId)}`);
          const jobsData = await jobsRes.json();
          if (!jobsRes.ok) {
            throw new Error(jobsData.error || "Unable to load task performance.");
          }
          setJobs(Array.isArray(jobsData.jobs) ? jobsData.jobs : []);
          setJobsError("");
        } catch (jobsLoadError) {
          setJobsError(jobsLoadError instanceof Error ? jobsLoadError.message : "Unable to load task performance.");
        }
      } catch {
        setLocation(null);
        setStaff([]);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [locationId]);

  async function handleCreateDepartment(name: string): Promise<InviteDepartmentOption | null> {
    setError("");
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to create department.");
        return null;
      }

      const department: InviteDepartmentOption = data.department;
      setDepartments((current) => [...current, department].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((current) => ({ ...current, department: department.name }));
      setMessage(`Department "${department.name}" was created.`);
      return department;
    } catch {
      setError("Unable to create department. Check your connection and try again.");
      return null;
    }
  }

  async function saveLocationDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!location || savingLocation) return;
    setSavingLocation(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, name: locationNameDraft, address: locationAddressDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update location details.");
      setLocation(data.location);
      setEditingLocation(false);
      setMessage("Location details updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update location details.");
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleCreateStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const selectedDepartment = form.department.trim();
    if (!locationId || !location || normalizeId(location._id) !== locationId) {
      setError("This location could not be verified. Refresh the page and try again.");
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !selectedDepartment) {
      setError("Name, email, and department are required.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          email: form.email.trim(),
          locationId,
          department: selectedDepartment,
          staffType: form.staffType || "full time",
          password: form.password.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to create account.");
        return;
      }

      setForm({ name: "", email: "", phoneNumber: "", role: "staff", staffType: "full time", locationId, department: departments[0]?.name || "", password: "" });
      setIsInviteOpen(false);
      setMessage(`Staff invited successfully. Temporary password: ${data.user.temporaryPassword}`);
      const staffRes = await fetch(`/api/staff?locationId=${encodeURIComponent(locationId)}`);
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        const locationStaff = (Array.isArray(staffData.staff) ? staffData.staff : []).filter(
          (staffMember: StaffMember) => normalizeId(staffMember.locationId) === locationId,
        );
        setStaff(locationStaff);
      }
    } catch {
      setError("Unable to create account. Check your connection and try again.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <LocationPageSkeleton />;
  }

  return (
    <main className="min-h-screen bg-white relative py-6 text-slate-600">
      <div className="mx-auto w-full space-y-6">
       {user.role === "admin" && <button onClick={()=> router.push('/location')} className="inline-flex items-center gap-2 rounded-full border cursor-pointer border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900">
            <ArrowLeft className="w-6 h-6"/> Back to locations
        </button>}
        <header className=" px-4 md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              {editingLocation && user?.role === "admin" ? (
                <form onSubmit={saveLocationDetails} className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">Location name
                    <input required maxLength={120} value={locationNameDraft} onChange={(event) => setLocationNameDraft(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">Address
                    <input maxLength={240} value={locationAddressDraft} onChange={(event) => setLocationAddressDraft(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <button disabled={savingLocation} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{savingLocation ? "Saving..." : "Save location"}</button>
                    <button type="button" onClick={() => setEditingLocation(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>
                  </div>
                </form>
              ) : (
                <>
              <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{location?.name ?? "Location not found"}</h1>
              <p className="text-xs uppercase tracking-[0.35em] text-indigo-600">{location?.address || "Address not set"}</p>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {user?.role === "admin" && !editingLocation && (
                <button type="button" onClick={() => {
                  setLocationNameDraft(location?.name || "");
                  setLocationAddressDraft(location?.address || "");
                  setEditingLocation(true);
                }} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><Pencil className="h-4 w-4" />Edit location</button>
              )}
              <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <User className="h-4 w-4" />
                {staff.length} active staff
              </div>
            </div>
          </div>
        </header>

        <section className="bg-s p-4 md:p-8" aria-labelledby="location-performance-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Task activity</p>
              <h2 id="location-performance-heading" className="mt-1 text-xl font-semibold text-slate-900">Monthly performance</h2>
              <p className="mt-1 text-sm text-slate-600">Tasks created and completed over the last six months.</p>
            </header>
            <div className="flex gap-3">
              <div className="rounded-2xl bg-indigo-50 px-4 py-3">
                <p className="text-xs font-medium text-indigo-600">Created</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-indigo-950">{totalCreatedTasks}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                <p className="text-xs font-medium text-emerald-700">Completed</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-emerald-950">{totalCompletedTasks}</p>
              </div>
            </div>
          </div>

          {jobsError ? (
            <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{jobsError}</p>
          ) : (
            <>
              <div className="mt-6 flex items-center gap-5 text-xs font-medium text-slate-600" aria-hidden="true">
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />Created</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Completed</span>
              </div>
              {jobs.length === 0 ? (
                <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No task activity is available for this location yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <div
                    role="img"
                    aria-label={`Monthly task counts for the last six months: ${monthlyTasks.map((month) => `${month.label}: ${month.created} created and ${month.completed} completed`).join("; ")}`}
                    className="w-screen"
                  >
                    <div className="relative h-52 border-b border-slate-200">
                      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                        {[0, 1, 2, 3].map((line) => <span key={line} className="border-t border-slate-100" />)}
                      </div>
                      <div className="absolute inset-0 grid grid-cols-6 gap-3 px-3">
                        {monthlyTasks.map((month) => (
                          <div key={month.key} className="flex items-end justify-center">
                            {[
                              { label: "Created", count: month.created, color: "bg-indigo-500" },
                              { label: "Completed", count: month.completed, color: "bg-emerald-500/80" },
                            ].map((bar) => (
                              <div key={bar.label} className="group relative flex h-full w-10 items-end">
                                <div
                                  className={`w-full ${bar.color} transition-[height] duration-500`}
                                  style={{ height: `${bar.count ? Math.max(5, (bar.count / maxMonthlyTasks) * 100) : 0}%` }}
                                />
                                <span
                                  className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                                  style={{ bottom: `${Math.min(bar.count ? Math.max(5, (bar.count / maxMonthlyTasks) * 100) + 2 : 2, 90)}%` }}
                                >
                                  {bar.label}: {bar.count}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-6 gap-3 px-3 text-center text-xs font-medium text-slate-500">
                      {monthlyTasks.map((month) => <span key={month.key}>{month.label}</span>)}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
 
        <div className="flex flex-wrap gap-4 items-center">
            <section className="w-full min-w-120 min-h-120 md:px-8 p-4 ">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Coverage</p>
                  <div className="flex items-center gap-6">
                    <div className="mt-2 text-lg  text-slate-900">
                      <p className="font-semibold">Staff member : <span>{staff.length}</span></p>
                      
                    </div>
                    <div className="mt-2 text-lg  text-slate-900">
                      <p className="font-semibold">Departments :  <span>{departments.length}</span></p>
                      
                    </div>
                  </div>
                  
                </div>
                {user.role === 'admin' && (<div className="flex flex-col items-center">
                  <button type="button" onClick={() => { setError(""); setIsInviteOpen(true); }} className="rounded-full m-auto cursor-pointer bg-emerald-100 p-2 hover:bg-emerald-200 text-emerald-600" aria-label="Invite staff to this location">
                    <Plus className="h-5 w-5" />
                    </button>
                    <p className="text-sm text-slate-400 text-center">
                        New staff
                    </p>
                </div>)}
                
              </div>

              {message && <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
              {error && !isInviteOpen && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <div className="space-y-6">
                {managers.length === 0 && staffGroups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-50 bg-slate-100 p-6 text-sm text-slate-500">
                    No staff members added yet.
                  </div>
                ) : (
                  <>
                    {managers.length > 0 && (
                      <section aria-labelledby="location-managers-heading">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 id="location-managers-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
                            Facility Managers <span className="ml-1 text-violet-400">{managers.length}</span>
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {managers.map((manager) => (
                            <button key={manager._id} onClick={() => router.push(`/staff/${encodeURIComponent(manager._id)}?locationId=${encodeURIComponent(locationId)}`)} aria-label={`View ${manager.name}'s staff profile`} className="flex items-center cursor-pointer justify-between gap-4 rounded-xl w-full bg-slate-100 p-4 py-3 transition">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                                  <User className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-slate-900">{manager.name}</div>
                                  <div className="mt-1 truncate text-sm text-slate-600">{manager.email}</div>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">Facility Manager</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    {departments.map((dept) => { 
                      const deptStaff = staff.filter(s => s.department === dept.name)
                      return (
                      <section key={dept.name.toLocaleLowerCase()} aria-labelledby={`department-${dept.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                        <div className="mb-3 flex items-center gap-6 border-b border-zinc-50/10 pb-2">
                          <h3 id={`department-${dept.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {dept.name}s :
                          </h3>
                          <span className="tabular-nums text-slate-400 uppercase">{deptStaff.length} staff(s)</span>
                        </div>
                        <div className="space-y-2">
                          {deptStaff.length >= 1 ? (deptStaff.map((employee) => (
                            <button key={employee._id} onClick={() => router.push(`/staff/${encodeURIComponent(employee._id)}?locationId=${encodeURIComponent(locationId)}`)} aria-label={`View ${employee.name}'s staff profile`} className="flex items-center w-full cursor-pointer justify-between gap-4 rounded-xl  bg-slate-100 p-4 py-3 hover:bg-slate-200 shadow-sm transition">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                                  <User className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-slate-900 text-left">{employee.name}</div>
                                  <div className="mt-1 truncate text-sm text-slate-500 text-left">{employee.email}</div>
                                </div>
                              </div>
                              <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">{employee.staffType}</span>
                            </button>
                          ))):( <div className="w-full p-4 rounded-xl bg-zinc-100 shadow-sm text-slate-400 flex items-center">
                            <p>You currently have no staff registered in this Department</p>
                          </div>)
                          }
                        </div>
                      </section>
                    )})}
                  </>
                )} 
              </div>
            </section>

            {/* <section className={` min-w-fit w-full  rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70`}>
              <div className="mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Overview</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Departments</h2>
                </div>
                <div className="flex w-fit flex-col">
                  {departments.length > 0 && departments.map((department) => (
                    <div key={department._id} className="my-2 py-1 text-left text-sm">
                      <p className="text-sm text-emerald-700">{department.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section> */}
        </div>
      </div>
      {isInviteOpen && location && (
        <InviteStaffForm
          form={form}
          setForm={setForm}
          onSubmit={handleCreateStaff}
          creating={creating}
          locations={[location]}
          fixedLocation={location}
          staffTypes={staffTypes}
          departments={departments}
          onCreateDepartment={handleCreateDepartment}
          error={error}
          onClose={() => setIsInviteOpen(false)}
        />
      )}
    </main>
  );
}
