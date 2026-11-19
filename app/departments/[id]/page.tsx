"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, CalendarClock, CheckCircle2, ClipboardList, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";

type DepartmentDetail = {
  _id: string;
  name: string;
  locationId: string;
  locationName: string;
  locationAddress: string;
  timezone: string;
};
type DepartmentStaff = {
  _id: string;
  name: string;
  email: string;
  role: string;
  staffType?: string;
  shiftStatus?: string;
  shiftSince?: string;
  isActive?: boolean;
};
type userType = {
  _id:string,
  role: string,
  name:string
};
type DepartmentJob = {
  _id: string;
  title: string;
  area?: string;
  status: string;
  priority: string;
  createdAt: string;
  closedAt?: string | null;
  updatedAt: string;
  createdByUserId?: { name: string } | null;
  closedByUserId?: { name: string } | null;
};
type RoutineCompletion = {
  taskId: string;
  completedAt?: string | null;
  completedByUserId?: { name: string } | null;
  issueReport?: string;
};
type DepartmentRoutine = {
  _id: string;
  name: string;
  tasks: { _id: string; title: string; area?: string }[];
  completions: RoutineCompletion[];
};
type RoutineSubmission = {
  _id: string;
  submittedAt: string;
  submittedByUserId?: { name: string } | null;
  completedTaskCount: number;
  totalTaskCount: number;
  routineId: string;
  routineName?: string;
  issueReports?: { taskId: string; taskTitle: string; issueReport: string }[];
};
type DepartmentReport = {
  _id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  userId?: { name: string } | null;
};
type DepartmentShift = {
  _id: string;
  userId: string;
  startTime: string;
  endTime?: string | null;
  status: string;
};

function readableStatus(value: string) {
  return value.replaceAll("_", " ");
}



export default function DepartmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [department, setDepartment] = useState<DepartmentDetail | null>(null);
  const [staff, setStaff] = useState<DepartmentStaff[]>([]);
  const [jobs, setJobs] = useState<DepartmentJob[]>([]);
  const [routines, setRoutines] = useState<DepartmentRoutine[]>([]);
  const [routineSubmissions, setRoutineSubmissions] = useState<RoutineSubmission[]>([]);
  const [reports, setReports] = useState<DepartmentReport[]>([]);
  const [shifts, setShifts] = useState<DepartmentShift[]>([]);
  const [routineCompletion, setRoutineCompletion] = useState<number | null>(null);
  const [routineDayKey, setRoutineDayKey] = useState("");
  const [viewerRole, setViewerRole] = useState("");
  const [routineCount, setRoutineCount] = useState(0);
  const [completedRoutineCount, setCompletedRoutineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskArea, setTaskArea] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [creatingTask, setCreatingTask] = useState(false);
  const [routineName, setRoutineName] = useState("");
  const [routineTaskList, setRoutineTaskList] = useState([""]);
  const [creatingRoutine, setCreatingRoutine] = useState(false);
  const [updatingRoutineTask, setUpdatingRoutineTask] = useState("");
  const [editingDepartment, setEditingDepartment] = useState(false);
  const [departmentNameDraft, setDepartmentNameDraft] = useState("");
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [user, setUser] = useState<userType | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDepartment() {
      try {
        const response = await fetch(`/api/departments/${encodeURIComponent(params.id)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load department details.");
        if (!active) return;
        setDepartment(data.department);
        setStaff(Array.isArray(data.staff) ? data.staff : []);
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        setRoutines(Array.isArray(data.routines) ? data.routines : []);
        setRoutineSubmissions(Array.isArray(data.routineSubmissions) ? data.routineSubmissions : []);
        setReports(Array.isArray(data.reports) ? data.reports : []);
        setShifts(Array.isArray(data.shifts) ? data.shifts : []);
        setRoutineCompletion(data.routineCompletion ?? null);
        setRoutineDayKey(data.routineDayKey || "");
        setViewerRole(data.viewerRole || "");
        setRoutineCount(data.routineJobCount || 0);
        setCompletedRoutineCount(data.completedRoutineJobCount || 0);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load department details.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDepartment();
    return () => { active = false; };
  }, [params.id]);

  useEffect(()=>{
    async function loadUser(){
      try{
        const res = await fetch('/api/auth/me')
        if(!res.ok){
          throw new Error('Cannot fetch user')
        }
        const fetchData = await res.json()
        const data = fetchData.user
        setUser(data)
      }catch{
        throw new Error('Cannot fetch user')
      }
    }
    loadUser()
  },[])

  const staffNames = new Map(staff.map((member) => [member._id, member.name]));
  const backPath = viewerRole === "staff" ? "/department" : "/departments";

  if (loading) {
    return <main className="min-h-screen bg-white p-5   " aria-busy="true">
      <div className="mx-auto w-full space-y-5">
        <div className="h-37 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[0, 1, 2,4].map((item) => (<div key={item} className="h-37 animate-pulse rounded-xl bg-slate-200" />))}
        </div>
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      </div>
      </main>;
  }

  if (!department) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
        <section className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Department unavailable</h1>
          <p role="alert" className="mt-2 text-sm text-slate-600">{error || "This department could not be found."}</p>
          <button type="button" onClick={() => router.push(backPath)} className="mt-5 rounded-xl cursor-pointer bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Back to departments</button>
        </section>
      </main>
    );
  }

  const onShiftCount = staff.filter((member) => member.shiftStatus === "on").length;
  const openJobsCount = jobs.filter((job) => job.status !== "closed").length;
  const completionWidth = routineCompletion ?? 0;
  const canCreateDepartmentWork = viewerRole === "manager" ;

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingTask) return;
    setCreatingTask(true);
    setError("");
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          area: taskArea.trim(),
          priority: taskPriority,
          departmentId: department._id,
          locationId: department.locationId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create task.");
      setJobs((current) => [data.job, ...current]);
      setTaskTitle("");
      setTaskArea("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create task.");
    } finally {
      setCreatingTask(false);
    }
  }

  async function createRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingRoutine) return;
    const tasks = routineTaskList.map((title) => title.trim()).filter(Boolean);
    if (!tasks.length) {
      setError("Add at least one checklist task to the routine.");
      return;
    }

    setCreatingRoutine(true);
    setError("");
    try {
      const response = await fetch(`/api/departments/${encodeURIComponent(params.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: routineName.trim(),
          tasks: tasks.map((title) => ({ title })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create routine.");
      setRoutines((current) => [{ ...data.routine, completions: [] }, ...current]);
      setRoutineName("");
      setRoutineTaskList([""]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create routine.");
    } finally {
      setCreatingRoutine(false);
    }
  }

  async function toggleRoutineTask(routine: DepartmentRoutine, taskId: string, completed: boolean) {
    const updateKey = `${routine._id}:${taskId}`;
    if (updatingRoutineTask) return;
    setUpdatingRoutineTask(updateKey);
    setError("");
    try {
      const response = await fetch(
        `/api/departments/${encodeURIComponent(params.id)}/routines/${encodeURIComponent(routine._id)}/${encodeURIComponent(taskId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update routine checklist.");
      setRoutines((current) => current.map((entry) => {
        if (entry._id !== routine._id) return entry;
        const remaining = entry.completions.filter((completion) => completion.taskId !== taskId);
        return {
          ...entry,
          completions: data.completion ? [...remaining, data.completion] : remaining,
        };
      }));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update routine checklist.");
    } finally {
      setUpdatingRoutineTask("");
    }
  }

  async function removeDepartment() {
    if (removing) return;
    setRemoving(true);
    setError("");
    try {
      const response = await fetch(`/api/departments/${encodeURIComponent(params.id)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to remove this department.");
      }
      router.replace("/departments");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove this department.");
      setRemoving(false);
      setConfirmRemove(false);
    }
  }

  async function saveDepartmentName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingDepartment) return;
    setSavingDepartment(true);
    setError("");
    try {
      const response = await fetch(`/api/departments/${encodeURIComponent(params.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: departmentNameDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to rename department.");
      setDepartment((current) => current ? { ...current, name: data.department.name } : current);
      setEditingDepartment(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to rename department.");
    } finally {
      setSavingDepartment(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100    pb-10 text-slate-600">
      <div className="mx-auto  flex flex-col">
        {user?.role === 'manager' || user?.role === 'admin' ? (
          <Link href={backPath} className="inline-flex items-center w-fit gap-2 text-sm px-4 pt-6 font-semibold text-indigo-700 hover:text-indigo-900">
            <ArrowLeft className="h-4 w-4" />
            Back to departments
          </Link>
        ) : null}
        {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50    py-3 text-sm text-rose-700">{error}</p>}
        <div className="p-4">
          <header className="overflow-hidden rounded-xl p-4    bg-linear-to-br from-indigo-950 via-indigo-800 to-violet-600 text-white shadow-xl shadow-indigo-950/10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200">Department overview</p>
                {editingDepartment && viewerRole === "manager" ? (
                  <form onSubmit={saveDepartmentName} className="mt-3 flex max-w-xl flex-wrap items-end gap-2">
                    <label className="min-w-52 flex-1 text-xs font-semibold text-indigo-100">Department name
                      <input autoFocus required maxLength={100} value={departmentNameDraft} onChange={(event) => setDepartmentNameDraft(event.target.value)} className="mt-1 w-full rounded-xl border border-white/30 bg-white/95 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <button disabled={savingDepartment} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-indigo-800 disabled:opacity-50">{savingDepartment ? "Saving..." : "Save"}</button>
                    <button type="button" onClick={() => setEditingDepartment(false)} className="rounded-xl border border-white/30 px-3 py-2 text-sm font-semibold text-white">Cancel</button>
                  </form>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{department.name}</h1>
                    {viewerRole === "manager" && <button type="button" onClick={() => {
                      setDepartmentNameDraft(department.name);
                      setEditingDepartment(true);
                    }} className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10"><Pencil className="h-3.5 w-3.5" />Rename</button>}
                  </div>
                )}
                <p className="mt-2 flex items-center gap-2 text-sm text-indigo-100"><MapPin className="h-4 w-4" />{department.locationName}{department.locationAddress ? ` · ${department.locationAddress}` : ""}</p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                
                <div className="min-w-52 rounded-2xl border border-white/15 bg-white/10 p-4">
                  <div className="flex items-center justify-between gap-3"><span className="text-sm text-indigo-100">Routine completion</span><CheckCircle2 className="h-5 w-5 text-emerald-300" /></div>
                  <p className="mt-2 text-3xl font-bold">{routineCompletion === null ? "—" : `${routineCompletion}%`}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20"><div className={`h-full rounded-full ${completionWidth >= 80 ? "bg-emerald-400" : completionWidth >= 50 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${completionWidth}%` }} /></div>
                  <p className="mt-2 text-xs text-indigo-100">{routineCompletion === null ? "No daily routine tasks yet" : `${completedRoutineCount} of ${routineCount} checklist tasks complete today`}</p>
                </div>
              </div>
            </div>
          </header>
        </div>

        {confirmRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
            <section role="alertdialog" aria-modal="true" aria-labelledby="remove-department-title" className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><Trash2 className="h-6 w-6" /></div>
              <h2 id="remove-department-title" className="mt-4 text-lg font-semibold text-slate-900">Remove {department.name}?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Staff assigned to this department will become unassigned.
                Historical tasks, reports, and shifts will be kept, but department routines and their checklist history will be deleted. This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={removing} onClick={() => setConfirmRemove(false)} className="rounded-xl border cursor-pointer border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600   hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="button" disabled={removing} onClick={() => void removeDepartment()} className="rounded-xl cursor-pointer bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white   hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60">{removing ? "Removing..." : "Remove department"}</button>
              </div>
            </section>
          </div>
        )}

        <section className="grid gap-4 px-4 grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Department staff", value: staff.length, icon: Users, tone: "bg-indigo-50 text-indigo-600" },
            { label: "On shift", value: onShiftCount, icon: CalendarClock, tone: "bg-emerald-50 text-emerald-600" },
            { label: "Open tasks", value: openJobsCount, icon: BriefcaseBusiness, tone: "bg-amber-50 text-amber-600" },
            { label: "Reports", value: reports.length, icon: ClipboardList, tone: "bg-sky-50 text-sky-600" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className="rounded-xl bg-white p-4 shadow-sm">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
                </span><p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
                <p className="mt-1 text-sm text-slate-500">{label}</p>
                </article>
          ))}
        </section>

        <div className="grid gap-4 p-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="bg-white shadow-md rounded-xl p-4">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">The team</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Staff in this department</h2></div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{staff.length} members</span></div>
            {staff.length ? <div className="space-y-3">
              {staff.map((member) => (
                <Link key={member._id} href={`/staff/${encodeURIComponent(member._id)}?locationId=${encodeURIComponent(department.locationId)}`} className="flex items-center justify-between gap-3 rounded-xl hover:border p-3 shadow-sm  hover:border-indigo-400 bg-slate-100">
                  <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-indigo-700">{member.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{member.name}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{member.role}{member.staffType ? ` · ${member.staffType}` : ""}</p></div></div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${member.shiftStatus === "on" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{member.shiftStatus === "on" ? "On shift" : "Off shift"}</span>
                </Link>
              ))}
            </div> : <p className="rounded-xl bg-slate-100 px-4 py-8 text-center text-sm text-slate-500">No staff are assigned to this department yet.</p>}
          </section>

          <section className="p-4 shadow-md rounded-xl bg-white">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Work queue</p><h2 className="mt-1 text-xl font-bold text-slate-900">Tasks assigned to this department</h2></div><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">{jobs.length} tasks</span></div>
            {canCreateDepartmentWork && <form onSubmit={createTask} className="mb-5 grid gap-3 rounded-xl border border-cyan-100 bg-cyan-50/50 p-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Create a department task
                <input required maxLength={160} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Task title" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              </label>
              <label className="text-xs font-semibold text-slate-700">Area
                <input maxLength={120} value={taskArea} onChange={(event) => setTaskArea(event.target.value)} placeholder="e.g. Floor 2, kitchen" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              </label>
              <label className="text-xs font-semibold text-slate-700">Priority
                <select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100">
                  <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                </select>
              </label>
              <div className="flex items-end">
                <button type="submit" disabled={creatingTask} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white   hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-60">
                  <Plus className="h-4 w-4" />{creatingTask ? "Creating..." : `Create for ${department.locationName}`}
                </button>
              </div>
            </form>}
            {jobs.length ? <div className="space-y-3">
              {jobs.map((job) => (
                <Link key={job._id} href={`/jobs/${encodeURIComponent(job._id)}`} className="block rounded-xl hover:border shadow-sm p-4 hover:border-indigo-400 bg-slate-100">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="font-semibold text-slate-800">{job.title}</h3><p className="mt-1 text-xs text-slate-500">{job.area || "No area specified"} · {department.locationName}</p></div><div className="flex shrink-0 gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${job.status === "closed" ? "bg-emerald-50 text-emerald-700" : job.status === "in_progress" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{readableStatus(job.status)}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${job.priority === "high" ? "bg-rose-50 text-rose-700" : job.priority === "medium" || job.priority === "routine" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{job.priority === "routine" ? "Medium" : job.priority}</span></div></div>
                  <div className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                    <p>Created {new Date(job.createdAt).toLocaleString()} · {job.createdByUserId?.name || "Team member"}</p>
                    {job.status === "closed" && <p>Completed {job.closedAt ? new Date(job.closedAt).toLocaleString() : "Time unavailable"} · {job.closedByUserId?.name || "Team member"}</p>}
                  </div>
                </Link>
              ))}
            </div> : <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No tasks are assigned to this department.</p>}
          </section>
        </div>

        <section className="px-4">
          <div className="p-4 rounded-xl bg-white shadow-md">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Daily checklists · {department.locationName}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Department routines</h2>
                <p className="mt-1 text-sm text-slate-500">Checklist completion resets at 6:00 a.m. using this location&apos;s timezone ({department.timezone || "Africa/Lagos"}).{routineDayKey ? ` Today: ${routineDayKey}.` : ""}</p>
              </div>
            </div>
            {viewerRole === "manager" && <form onSubmit={createRoutine} className="mb-6 grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Routine name
                <input required maxLength={120} value={routineName} onChange={(event) => setRoutineName(event.target.value)} placeholder="e.g. Opening checks" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <fieldset className="space-y-2 text-xs font-semibold text-slate-700">
                <legend>Checklist tasks</legend>
                {routineTaskList.map((task, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-right text-slate-400">{index + 1}.</span>
                    <input required maxLength={160} value={task} onChange={(event) => setRoutineTaskList((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Checklist item ${index + 1}`} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                    {routineTaskList.length > 1 && <button type="button" aria-label={`Remove checklist item ${index + 1}`} onClick={() => setRoutineTaskList((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                ))}
                <button type="button" onClick={() => setRoutineTaskList((current) => [...current, ""])} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-700   hover:bg-emerald-50"><Plus className="h-4 w-4" />Add checklist item</button>
              </fieldset>
              <div className="md:col-span-2">
                <button type="submit" disabled={creatingRoutine} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white   hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
                  <Plus className="h-4 w-4" />{creatingRoutine ? "Creating..." : "Create daily routine"}
                </button>
              </div>
            </form>}

            {routines.length ? <div className="grid gap-4 xl:grid-cols-2">
              {routines.map((routine) => {
                const completedTasks = routine.tasks.filter((task) => routine.completions.some((completion) => completion.taskId === task._id && completion.completedAt));
                return (
                  <article key={routine._id} className="py-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">{routine.name}</h3>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{completedTasks.length}/{routine.tasks.length} today</span>
                    </div>
                    <ul className="space-y-3">
                      {routine.tasks.map((task) => {
                        const completion = routine.completions.find((entry) => entry.taskId === task._id);
                        const isComplete = Boolean(completion?.completedAt);
                        const updateKey = `${routine._id}:${task._id}`;
                        return (
                          <li key={task._id} className="flex items-start gap-3 rounded-lg shadow-sm bg-emerald-50 px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={isComplete}
                              disabled={Boolean(updatingRoutineTask)}
                              onChange={(event) => void toggleRoutineTask(routine, task._id, event.target.checked)}
                              aria-label={`${isComplete ? "Mark incomplete" : "Complete"} ${task.title}`}
                              className="mt-0.5 h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-wait"
                            />
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium ${isComplete ? "text-slate-500 line-through" : "text-slate-800"}`}>{task.title}</p>
                              {task.area && <p className="mt-0.5 text-xs text-slate-500">{task.area}</p>}
                              {isComplete && completion?.completedAt && <p className="mt-1 text-xs text-emerald-700">Completed by {completion.completedByUserId?.name || "Team member"} · {new Date(completion.completedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>}
                              {completion?.issueReport && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><strong>Reported issue:</strong> {completion.issueReport}</p>}
                            </div>
                            {updatingRoutineTask === updateKey && <span className="text-xs text-slate-400">Saving…</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </article>
                );
              })}
            </div> : <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No routines have been created for this department yet.</p>}
            {viewerRole === "manager" && <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="mb-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Manager view</p><h3 className="mt-1 text-lg font-bold text-slate-900">Staff routine submissions</h3></div>
              {routineSubmissions.length ? <div className="space-y-2">{routineSubmissions.map((submission) => (
                <div key={submission._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div><p className="text-sm font-semibold text-slate-800">{submission.submittedByUserId?.name || "Staff member"} submitted {submission.routineName || "a routine"}</p><p className="mt-1 text-xs text-slate-500">{new Date(submission.submittedAt).toLocaleString()}</p>
                    {submission.issueReports?.map((issue) => <p key={issue.taskId} className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"><strong>{issue.taskTitle}:</strong> {issue.issueReport}</p>)}
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">{submission.completedTaskCount}/{submission.totalTaskCount} complete</span>
                </div>
              ))}</div> : <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">No staff routine submissions today.</p>}
            </div>}
          </div>
        </section>

        <div className="grid p-4 gap-4 xl:grid-cols-2">
          <section className="p-4 shadow-md rounded-xl bg-white">
            <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Department communication</p><h2 className="mt-1 text-xl font-bold text-slate-900">Recent reports</h2></div>
            {reports.length ? <div className="space-y-3">{reports.map((report) => (
              <Link key={report._id} href={`/report/${encodeURIComponent(report._id)}`} className="flex items-center justify-between gap-3 rounded-lg hover:border p-4   hover:border-indigo-400/40 ">
                <div className="min-w-0"><h3 className="truncate font-semibold text-slate-800">{report.title}</h3><p className="mt-1 text-xs capitalize text-slate-500">{report.userId?.name || "Team member"} · {report.type} · {new Date(report.createdAt).toLocaleDateString()}</p></div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${report.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{report.status}</span>
              </Link>
            ))}</div> : <p className="rounded-lg bg-slate-100 px-4 py-8 text-center text-sm text-slate-500">No reports are linked to this department.</p>}
          </section>

          <section className="p-4 shadow-md rounded-xl bg-white">
            <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Attendance history</p><h2 className="mt-1 text-xl font-bold text-slate-900">Recent shifts</h2></div>
            {shifts.length ? <div className="divide-y divide-slate-100">{shifts.slice(0, 8).map((shift) => (
              <div key={shift._id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="text-sm font-semibold text-slate-800">{staffNames.get(String(shift.userId)) || "Team member"}</p><p className="mt-1 text-xs text-slate-500">{new Date(shift.startTime).toLocaleString()}{shift.endTime ? ` – ${new Date(shift.endTime).toLocaleTimeString()}` : " – Current shift"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${shift.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{shift.status}</span></div>
            ))}</div> : <p className="rounded-lg bg-slate-100 px-4 py-8 text-center text-sm text-slate-500">No shift records for this department yet.</p>}
          </section>
        </div>
      </div>
      {viewerRole === "manager" && (
              <div className="mx-auto w-full p-4">
                <button type="button" onClick={() => setConfirmRemove(true)} className="inline-flex w-full cursor-pointer mt-6 items-center justify-center gap-2 rounded-xl border border-white/20 bg-rose-500/90 p-4 text-sm font-semibold text-white   hover:bg-rose-600">
                  <Trash2 className="h-4 w-4" />Remove department
                </button>
              </div>
              )}
    </main>
  );
}
