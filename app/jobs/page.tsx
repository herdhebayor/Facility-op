"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Activity, BriefcaseBusiness, Circle, SquarePen, ClipboardCheck, MapPin, Plus, RotateCw, Save, Trash2 } from "lucide-react";

type RoutineTask = { _id: string; title: string; area?: string };
type RoutineCompletion = {
  taskId: string;
  completedAt?: string | null;
  completedByUserId?: { name: string } | null;
};
type Routine = {
  _id: string;
  name: string;
  tasks: RoutineTask[];
  completions: RoutineCompletion[];
};
type Department = {
  _id: string;
  name: string;
  locationId: string;
  locationName: string;
  staffCount: number;
  routineJobCount: number;
  completedRoutineJobCount: number;
  routineCompletion: number | null;
  routines: Routine[];
};
type Task = {
  _id: string;
  title: string;
  area?: string;
  departmentId?: string;
  locationId: string;
  staffType?: string;
  priority: string;
  status: string;
  createdAt: string;
  closedAt?: string | null;
  createdByUserId?: { name: string } | null;
  closedByUserId?: { name: string } | null;
};
type EditRoutine = {
  departmentId: string;
  routineId: string;
  name: string;
  tasks: { _id?: string; title: string; area: string }[];
};

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Complete" },
];

function completionTone(value: number | null) {
  if (value === null) return "bg-slate-300";
  if (value >= 80) return "bg-emerald-500";
  if (value >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function statusTone(status: string) {
  if (status === "closed") return "bg-emerald-50 text-emerald-700";
  if (status === "in_progress") return "bg-blue-50 text-blue-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function TasksPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [role, setRole] = useState("");
  const [shiftStatus, setShiftStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskArea, setTaskArea] = useState("");
  const [taskDepartmentId, setTaskDepartmentId] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [creatingTask, setCreatingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState("");
  const [routineDepartmentId, setRoutineDepartmentId] = useState("");
  const [routineName, setRoutineName] = useState("");
  const [routineTasks, setRoutineTasks] = useState([""]);
  const [creatingRoutine, setCreatingRoutine] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<EditRoutine | null>(null);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [deletingRoutineId, setDeletingRoutineId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [meResponse, departmentsResponse, tasksResponse] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/departments", { cache: "no-store" }),
        fetch("/api/jobs", { cache: "no-store" }),
      ]);
      const [meData, departmentsData, tasksData] = await Promise.all([
        meResponse.json(),
        departmentsResponse.json(),
        tasksResponse.json(),
      ]);
      const failed = !meResponse.ok ? meData : !departmentsResponse.ok ? departmentsData : !tasksResponse.ok ? tasksData : null;
      if (failed) throw new Error(failed.error || "Unable to load tasks.");
      const nextDepartments = Array.isArray(departmentsData.departments) ? departmentsData.departments : [];
      setRole(meData.user?.role || "");
      setShiftStatus(meData.user?.shiftStatus || "");
      setDepartments(nextDepartments);
      setTasks(Array.isArray(tasksData.jobs) ? tasksData.jobs : []);
      setTaskDepartmentId((current) => current || nextDepartments[0]?._id || "");
      setRoutineDepartmentId((current) => current || nextDepartments[0]?._id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load tasks. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The initial load is an asynchronous fetch that synchronizes page state with the APIs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const isManager = role === "manager";
  const isStaff = role === "staff";
  const canCreateTask = isManager;
  const filteredTasks = useMemo(
    () => statusFilter === "all" ? tasks : tasks.filter((task) => task.status === statusFilter),
    [statusFilter, tasks],
  );
  const tasksByDepartment = useMemo(() => {
    const taskDepartment = (task: Task) => task.departmentId
      ? departments.find((department) => department._id === task.departmentId)
      : departments.find((department) => department.name.toLowerCase() === String(task.staffType || "").toLowerCase()
        && department.locationId === task.locationId);
    return departments.map((department) => ({
      department,
      tasks: filteredTasks.filter((task) => taskDepartment(task)?._id === department._id),
    })).filter(({ tasks: departmentTasks }) => departmentTasks.length > 0 || !isStaff);
  }, [departments, filteredTasks, isStaff]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingTask) return;
    setCreatingTask(true);
    setError("");
    setSuccess("");
    try {
      const department = departments.find((item) => item._id === taskDepartmentId);
      if (!department) throw new Error("Select a department for this task.");
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
      setTasks((current) => [data.job, ...current]);
      setTaskTitle("");
      setTaskArea("");
      setSuccess("Task created and assigned to its department.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create task.");
    } finally {
      setCreatingTask(false);
    }
  }

  async function updateTaskStatus(task: Task, status: string) {
    setUpdatingTaskId(task._id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(task._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update task status.");
      setTasks((current) => current.map((item) => item._id === task._id ? data.job : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update task status.");
    } finally {
      setUpdatingTaskId("");
    }
  }

  async function createRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingRoutine) return;
    const tasksInRoutine = routineTasks.map((title) => title.trim()).filter(Boolean);
    const department = departments.find((item) => item._id === routineDepartmentId);
    if (!department) {
      setError("Select a department for this routine.");
      return;
    }
    if (!tasksInRoutine.length) {
      setError("Add at least one checklist task.");
      return;
    }
    setCreatingRoutine(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/departments/${encodeURIComponent(department._id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: routineName.trim(), tasks: tasksInRoutine.map((title) => ({ title })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create routine.");
      const newRoutine: Routine = { ...data.routine, completions: [] };
      setDepartments((current) => current.map((item) => {
        if (item._id !== department._id) return item;
        const routines = [newRoutine, ...(item.routines || [])];
        const routineJobCount = routines.reduce((total, routine) => total + routine.tasks.length, 0);
        return {
          ...item,
          routines,
          routineJobCount,
          routineCompletion: routineJobCount
            ? Math.round(item.completedRoutineJobCount / routineJobCount * 100)
            : null,
        };
      }));
      setRoutineName("");
      setRoutineTasks([""]);
      setSuccess("Daily routine created for the selected department.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create routine.");
    } finally {
      setCreatingRoutine(false);
    }
  }

  function beginEditRoutine(departmentId: string, routine: Routine) {
    setEditingRoutine({
      departmentId,
      routineId: routine._id,
      name: routine.name,
      tasks: routine.tasks.map((task) => ({ _id: task._id, title: task.title, area: task.area || "" })),
    });
  }

  async function saveRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRoutine || savingRoutine) return;
    const tasks = editingRoutine.tasks.filter((task) => task.title.trim());
    if (!tasks.length) {
      setError("A routine must contain at least one task.");
      return;
    }
    setSavingRoutine(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/departments/${encodeURIComponent(editingRoutine.departmentId)}/routines/${encodeURIComponent(editingRoutine.routineId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingRoutine.name.trim(), tasks }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save routine changes.");
      setDepartments((current) => current.map((department) => {
        if (department._id !== editingRoutine.departmentId) return department;
        const routines = department.routines.map((routine) => routine._id === editingRoutine.routineId
          ? { ...data.routine, completions: routine.completions.filter((completion) => tasks.some((task) => task._id === completion.taskId)) }
          : routine);
        const routineJobCount = routines.reduce((total, routine) => total + routine.tasks.length, 0);
        const completedRoutineJobCount = routines.reduce((total, routine) => total + routine.completions.filter((completion) => completion.completedAt).length, 0);
        return {
          ...department,
          routines,
          routineJobCount,
          completedRoutineJobCount,
          routineCompletion: routineJobCount
            ? Math.round(completedRoutineJobCount / routineJobCount * 100)
            : null,
        };
      }));
      setEditingRoutine(null);
      setSuccess("Routine updated. Removed checklist items and their completion history were deleted.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save routine changes.");
    } finally {
      setSavingRoutine(false);
    }
  }

  async function deleteRoutine(departmentId: string, routine: Routine) {
    if (!window.confirm(`Delete "${routine.name}" and its checklist history?`)) return;
    setDeletingRoutineId(routine._id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/departments/${encodeURIComponent(departmentId)}/routines/${encodeURIComponent(routine._id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete routine.");
      setDepartments((current) => current.map((department) => {
        if (department._id !== departmentId) return department;
        const routines = department.routines.filter((item) => item._id !== routine._id);
        const routineJobCount = routines.reduce((total, item) => total + item.tasks.length, 0);
        const completedRoutineJobCount = routines.reduce((total, item) => total + item.completions.filter((completion) => completion.completedAt).length, 0);
        return {
          ...department,
          routines,
          routineJobCount,
          completedRoutineJobCount,
          routineCompletion: routineJobCount
            ? Math.round(completedRoutineJobCount / routineJobCount * 100)
            : null,
        };
      }));
      setSuccess("Routine deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete routine.");
    } finally {
      setDeletingRoutineId("");
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-100 pb-10 p-4   " aria-busy="true">
              <div className="space-y-4 ">
                <div className="rounded-xl space-y-2 p-4 bg-white" >
                  <div className="h-10 w-60 animate-pulse rounded-xl bg-slate-200" />
                  <div className="h-5 w-100 animate-pulse rounded-xl bg-slate-200" />
                </div>
                <div className="space-y-2 p-4 bg-white rounded-xl shadow-md">
                  <p className="h-5 w-50 animate-pulse rounded bg-slate-200" />
                  <p className="h-5 w-60 animate-pulse rounded bg-slate-200" />
                  <p className="h-40 w-80 animate-pulse rounded-lg bg-slate-200" />
                </div>
                <div className="space-y-2 p-4 bg-white rounded-xl shadow-md">
                  <p className="h-5 w-50 mb-2 animate-pulse rounded-xl bg-cyan-700" />
                  <p className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                  <p className="h-5 w-50 animate-pulse rounded bg-slate-200" />
                  <div className="flex py-3 border-b border-slate-400/20 mt-3 flex-col md:flex-row justify-between items-center" >
                    <p className="h-5 w-50 animate-pulse rounded bg-slate-200" />
                    <div className="flex gap-2 mt-2 md:mt-0">
                      {[...Array(6)].map((_, index) => (
                        <p key={index} className="h-5 w-15  animate-pulse rounded bg-slate-200" />
                      ))}
                    </div>
                  </div>
                  <div className="h-5 w-30 animate-pulse rounded bg-slate-200" />
                  <div className="h-5 w-30 animate-pulse rounded bg-slate-200" />
                  <div className="h-25 mt-5 w-full rounded-lg animate-pulse bg-slate-200" />
                  <div className="h-25 mt-5 w-full rounded-lg animate-pulse bg-slate-200" />
                </div>
              </div>
            </main>;
  }

  const openTaskCount = tasks.filter((task) => task.status !== "closed").length;
  const completeTaskCount = tasks.length - openTaskCount;

  return (
    <main className="min-h-screen bg-slate-100 pb-10    text-slate-600">
      <div className="mx-auto">
        <div className="p-4">
          <header className="rounded-xl bg-linear-to-br from-indigo-950 via-indigo-800 to-violet-600 p-4 text-white shadow-lg ">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200">{isStaff ? "My department" : "Team operations"}</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Tasks &amp; routines</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">{isStaff ? "View and update tasks assigned to your department." : "Track department workload, daily routines, and task completion across your location."}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><p className="text-xs text-indigo-100">Open tasks</p><p className="mt-1 text-2xl font-bold">{openTaskCount}</p></div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><p className="text-xs text-indigo-100">Completed</p><p className="mt-1 text-2xl font-bold">{completeTaskCount}</p></div>
              </div>
            </div>
          </header>
        </div>

        {error && <section role="alert" className="flex items-center justify-between gap-3w-full absolute right-0 z-10 min-h-30 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => void load()} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"><RotateCw className="h-4 w-4" />Retry</button></section>}
        {success && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>}

        <section className="px-4">
          <div className="p-4 bg-white rounded-xl shadow-md">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Daily routine status</p><h2 className="mt-1 text-xl font-bold text-slate-900">Department checklists</h2><p className="mt-1 text-sm text-slate-500">Completion resets at 6:00 a.m. in each location&apos;s timezone.</p></div>
              <ClipboardCheck className="hidden h-6 w-6 text-emerald-600 sm:block" />
            </div>
            {departments.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {departments.map((department) => (
                  <article key={department._id} className="rounded-xl border border-slate-200/20 p-4   bg-white shadow-sm hover:border-indigo-400/40">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" onClick={() => router.push(`/departments/${encodeURIComponent(department._id)}`)} className="min-w-0 text-left"><h3 className="truncate font-semibold text-slate-900">{department.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{department.locationName}</p></button>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-800">{department.routineCompletion === null ? "—" : `${department.routineCompletion}%`}</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full  -all ${completionTone(department.routineCompletion)}`} style={{ width: `${department.routineCompletion || 0}%` }} /></div>
                    <p className="mt-2 text-xs text-slate-500">{department.routineJobCount ? `${department.completedRoutineJobCount} of ${department.routineJobCount} checklist items complete today` : "No routines set up yet"} · {department.routines?.length || 0} routines</p>
                  </article>
                ))}
              </div>
            ) : <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No departments are assigned to your account.</p>}
          </div>
        </section>

        {canCreateTask && (
          <div className="p-4 ">
          <section className=" bg-white p-4 rounded-xl shadow-md ">
            <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">New task</p><h2 className="mt-1 text-xl font-bold text-slate-900">{isStaff ? "Create a task for your department" : "Assign a task to a department"}</h2></div>
            <form onSubmit={createTask} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1.2fr_1fr_1fr_auto]">
              <label className="text-xs font-semibold text-slate-700">Task title
                <input required maxLength={160} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="What needs to be done?" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="text-xs font-semibold text-slate-700">Area
                <input maxLength={120} value={taskArea} onChange={(event) => setTaskArea(event.target.value)} placeholder="e.g. Floor 2" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="text-xs font-semibold text-slate-700">Department
                <select required disabled={isStaff || !departments.length} value={taskDepartmentId} onChange={(event) => setTaskDepartmentId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-400 focus:bg-white">
                  {departments.map((department) => <option key={department._id} value={department._id}>{department.name} · {department.locationName}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">Priority
                <select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-400 focus:bg-white"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
              </label>
              <button type="submit" disabled={creatingTask || !departments.length} className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white   hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />{creatingTask ? "Creating..." : "Create task"}</button>
            </form>
          </section>
          </div>
        )}

        {isManager && <section className="px-4">
          <div className="bg-white p-4 shadow-md rounded-xl">
            <div className=""><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Routine setup</p><h2 className="mt-1 text-xl font-bold text-slate-900">Create a department checklist</h2><p className="mt-1 text-sm text-slate-500">Add several items at once, one checklist task per line.</p></div>
            <form onSubmit={createRoutine} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1.6fr_auto] mt-3">
              <label className="text-xs font-semibold text-slate-700">Department
                <select required value={routineDepartmentId} onChange={(event) => setRoutineDepartmentId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-400 focus:bg-white">{departments.map((department) => <option key={department._id} value={department._id}>{department.name} · {department.locationName}</option>)}</select>
              </label>
              <label className="text-xs font-semibold text-slate-700">Routine name
                <input required maxLength={120} value={routineName} onChange={(event) => setRoutineName(event.target.value)} placeholder="Opening checklist" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-400 focus:bg-white" />
              </label>
              <fieldset className="space-y-2 text-xs font-semibold text-slate-700">
                <legend>Checklist items</legend>
                {routineTasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-right text-slate-400">{index + 1}.</span>
                    <input required maxLength={160} value={task} onChange={(event) => setRoutineTasks((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Checklist item ${index + 1}`} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-400 focus:bg-white" />
                    {routineTasks.length > 1 && <button type="button" aria-label={`Remove checklist item ${index + 1}`} onClick={() => setRoutineTasks((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                ))}
                <button type="button" onClick={() => setRoutineTasks((current) => [...current, ""])} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-700   hover:bg-emerald-50"><Plus className="h-4 w-4" />Add checklist item</button>
              </fieldset>
              <button type="submit" disabled={creatingRoutine || !departments.length} className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white   hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />{creatingRoutine ? "Creating..." : "Create routine"}</button>
            </form>
          </div>
        </section>}

        {isManager && <section className=" p-4 ">
          <div className="bg-white p-4 shadow-md rounded-xl">
            <div className=" bg-white"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Manage checklists</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Edit department routines</h2></div>
            <div className="grid gap-4 xl:grid-cols-2 ">
              {departments.flatMap((department) => (department.routines || []).map((routine) => (
                <article key={routine._id} className="">
                  {editingRoutine?.routineId === routine._id ? (
                    <form onSubmit={saveRoutine} className="space-y-3">
                      <label className="block text-xs font-semibold text-slate-700">Routine name
                        <input required maxLength={120} value={editingRoutine.name} onChange={(event) => setEditingRoutine({ ...editingRoutine, name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" />
                      </label>
                      <div className="space-y-2">
                        {editingRoutine.tasks.map((task, index) => <div key={task._id || `new-${index}`} className="flex gap-2">
                          <input aria-label="Checklist item title" value={task.title} onChange={(event) => setEditingRoutine({ ...editingRoutine, tasks: editingRoutine.tasks.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                          <input aria-label="Checklist item area" value={task.area} onChange={(event) => setEditingRoutine({ ...editingRoutine, tasks: editingRoutine.tasks.map((item, itemIndex) => itemIndex === index ? { ...item, area: event.target.value } : item) })} placeholder="Area" className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                          <button type="button" aria-label="Remove checklist item" onClick={() => setEditingRoutine({ ...editingRoutine, tasks: editingRoutine.tasks.filter((_, itemIndex) => itemIndex !== index) })} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                        </div>)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setEditingRoutine({ ...editingRoutine, tasks: [...editingRoutine.tasks, { title: "", area: "" }] })} className="rounded-lg border cursor-pointer border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Add checklist item</button>
                        <button type="submit" disabled={savingRoutine} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"><Save className="h-3.5 w-3.5" />{savingRoutine ? "Saving..." : "Save changes"}</button>
                        <button type="button" onClick={() => setEditingRoutine(null)} className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer text-slate-600 hover:bg-slate-100">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3 w-full">
                      <div className="flex items-start justify-between mb-1 pb-1 border-b w-full border-slate-200/30 gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900">{routine.name}</h3>
                          <p className="mt-1 text-xs text-slate-500">{department.name} · {department.locationName} · {routine.completions.filter((completion) => completion.completedAt).length}/{routine.tasks.length} complete today</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" onClick={() => beginEditRoutine(department._id, routine)} className="cursor-pointer px-3 text-xs font-semibold inline-flex gap-1 text-indigo-700 items-center hover:bg-indigo-50"><SquarePen className="w-4 h-4"/> edit</button>
                          <button type="button" disabled={deletingRoutineId === routine._id} onClick={() => void deleteRoutine(department._id, routine)} aria-label={`Delete ${routine.name}`} className="rounded-lg px-3 cursor-pointer inline-flex gap-1 items-center text-red-600 hover:text-red-300 disabled:opacity-50"><Trash2 className="h-4 w-4" /> delete</button>
                        </div>
                      </div>
                      <ul className="space-y-2">{routine.tasks.map((task) => <li key={task._id} className="flex items-center gap-2 text-sm text-slate-600"><Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />{task.title}{task.area && <span className="text-xs text-slate-400">· {task.area}</span>}</li>)}</ul>
                    </div>
                  )}
                </article>
              )))}
              {departments.every((department) => !(department.routines || []).length) && <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 xl:col-span-2">No department routines to edit yet.</p>}
            </div>
          </div>
        </section>}

        <section className="overflow-hidden px-4 ">
          <div className="p-4 bg-white rounded-lg shadow-md">
            <div className="flex flex-col gap-4 border-b border-slate-100 md:py-5 md:flex-row md:items-end md:justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Department work queues</p><h2 className="mt-1 text-xl font-bold text-slate-900">Tasks by department</h2><p className="mt-1 text-sm text-slate-500">{filteredTasks.length} tasks shown · each task is tagged to a department and location.</p></div>
              <div className="flex flex-wrap gap-2" aria-label="Filter tasks by status">
                {[{ value: "all", label: "All" }, ...statusOptions].map((option) => <button key={option.value} type="button" onClick={() => setStatusFilter(option.value)} className={`rounded-full px-3 py-2 text-xs cursor-pointer duration-200 hover:text-indigo-500 font-semibold   ${statusFilter === option.value ? "text-indigo-600 underline underline-offset-5 " : "text-slate-600 "}`}>{option.label}</button>)}
              </div>
            </div>
            {tasksByDepartment.length ? <div className="space-y-5 mt-3 ">
              {tasksByDepartment.map(({ department, tasks: departmentTasks }) => (
                <section key={department._id} className="overflow-hidden bg-slate-100 p-4 rounded-lg shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3  p-4">
                    <div><h3 className="font-semibold text-slate-900">{department.name}</h3><p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{department.locationName}</p></div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{departmentTasks.length} tasks</span>
                  </div>
                  {departmentTasks.length ? <div className="">
                    {departmentTasks.map((task) => (
                      <article onClick={()=> router.push(`/jobs/${task._id}`)} key={task._id} className="grid gap-3 p-4 my-2 rounded-md cursor-pointer hover:border hover:border-indigo-400 bg-white md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-slate-900">{task.title}</h4><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${task.priority === "high" ? "bg-rose-50 text-rose-700" : task.priority === "medium" || task.priority === "routine" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{task.priority === "routine" ? "Medium" : task.priority}</span></div>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500"><span>{task.area || "Area not specified"}</span><span>·</span><span>Created {formatDate(task.createdAt)} by {task.createdByUserId?.name || "Team member"}</span>{task.status === "closed" && <><span>·</span><span>Completed {formatDate(task.closedAt)} by {task.closedByUserId?.name || "Team member"}</span></>}</p>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <span className="sr-only">Task status</span>
                          {isStaff && <Activity className="h-4 w-4 text-indigo-500" />}
                          <select value={task.status} disabled={Boolean(updatingTaskId) || (isStaff && shiftStatus !== "on")} onChange={(event) => void updateTaskStatus(task, event.target.value)} className={`rounded-xl border-0 px-3 py-2 text-xs font-semibold capitalize outline-none disabled:cursor-not-allowed disabled:opacity-60 ${statusTone(task.status)}`}>
                            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                          {updatingTaskId === task._id && <span className="text-xs text-slate-400">Saving…</span>}
                        </label>
                      </article>
                    ))}
                  </div> : <p className="px-4 py-6 text-center bg-white rounded-md text-sm text-slate-500">No tasks match this filter.</p>}
              </section>
              ))}
            </div> : <div className="px-5 py-14 text-center"><BriefcaseBusiness className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-3 font-semibold text-slate-800">{tasks.length ? "No tasks match this status" : "No tasks yet"}</h3><p className="mt-1 text-sm text-slate-500">{isStaff ? "Tasks assigned to your department will appear here." : "Create a task and assign it to a department to get started."}</p></div>}
            {isStaff && shiftStatus !== "on" && <p className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-800">Punch in to change task statuses. You can still view the department task list.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
