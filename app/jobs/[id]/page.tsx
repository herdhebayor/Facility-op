"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, MapPin, Save, ShieldAlert } from "lucide-react";

type NamedReference = { _id: string; name: string } | string | null;
type Job = {
  _id: string;
  title: string;
  area?: string;
  status: "open" | "pending" | "in_progress" | "closed";
  priority: string;
  staffType?: string;
  handoffNote?: string;
  createdAt: string;
  closedAt?: string | null;
  leftAt?: string | null;
  locationId?: NamedReference;
  departmentId?: NamedReference;
  createdByUserId?: { name: string } | null;
  closedByUserId?: { name: string } | null;
  leftByUserId?: { name: string } | null;
};

const statusLabels: Record<Job["status"], string> = {
  open: "Open",
  pending: "Pending",
  in_progress: "In progress",
  closed: "Complete",
};

function referenceName(reference?: NamedReference) {
  return typeof reference === "object" && reference ? reference.name : "";
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [viewerRole, setViewerRole] = useState("");
  const [shiftStatus, setShiftStatus] = useState("");
  const [status, setStatus] = useState<Job["status"]>("open");
  const [handoffNote, setHandoffNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function loadJob() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load this task.");
        if (active) {
          setJob(data.job);
          setStatus(data.job.status);
          setHandoffNote(data.job.handoffNote || "");
          setViewerRole(data.viewerRole || "");
          setShiftStatus(data.shiftStatus || "");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load this task.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadJob();
    return () => { active = false; };
  }, [id]);

  async function updateTask(payload: { status?: Job["status"]; handoffNote?: string }) {
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to update this task.");
    setJob(data.job);
    setStatus(data.job.status);
    setHandoffNote(data.job.handoffNote || "");
  }

  async function saveStatus(nextStatus: Job["status"]) {
    if (!job || savingStatus || (viewerRole === "staff" && shiftStatus !== "on")) return;
    setSavingStatus(true);
    setError("");
    setNotice("");
    try {
      await updateTask({ status: nextStatus });
      setNotice("Task status updated.");
    } catch (saveError) {
      setStatus(job.status);
      setError(saveError instanceof Error ? saveError.message : "Unable to update task status.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveHandoffNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job || savingNote || !handoffNote.trim()) return;
    setSavingNote(true);
    setError("");
    setNotice("");
    try {
      await updateTask({ handoffNote: handoffNote.trim() });
      setNotice("Handoff note saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the handoff note.");
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) {
    return <main className="min-h-full bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl animate-pulse space-y-4">
        <div className="h-8 w-40 rounded bg-white" />
        <div className="h-48 rounded-2xl bg-white" />
        </div>
      </main>;
  }

  if (!job) {
    return <main className="min-h-full bg-slate-50 p-6">
      <section className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-white p-6">
        <h1 className="text-xl font-bold text-slate-900">Task unavailable</h1><p role="alert" className="mt-2 text-sm text-rose-700">{error || "This task could not be found."}</p><Link href="/jobs" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><ArrowLeft className="h-4 w-4" />Back to tasks</Link></section></main>;
  }

  const statusLocked = viewerRole === "staff" && shiftStatus !== "on";

  return (
    <main className="min-h-full bg-slate-100 p-4 text-slate-600   ">
      <div className=" space-y-5">
        <Link href="/jobs" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-indigo-700"><ArrowLeft className="h-4 w-4" />Back to tasks</Link>
        {(error || notice) && <p role={error ? "alert" : "status"} className={`rounded-xl border p-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || notice}</p>}

        <section className="overflow-hidden p-4 bg-white rounded-xl shadow-md">
          <div className=" p-6 text-white sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Task details</p>
                <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{job.title}</h1>
                <p className="mt-2 text-sm text-indigo-100">Task ID: <span className="font-mono">{job._id}</span></p>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold capitalize">{statusLabels[job.status]}</span>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-8">
            <div className="space-y-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Assignment</h2>
                <dl className="mt-3 space-y-3 text-sm">
                  <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-indigo-500" /><div><dt className="text-xs text-slate-400">Location</dt><dd className="font-medium text-slate-800">{referenceName(job.locationId) || "Not specified"}</dd></div></div>
                  <div><dt className="text-xs text-slate-400">Department</dt><dd className="font-medium text-slate-800">{referenceName(job.departmentId) || job.staffType || "Not specified"}</dd></div>
                  <div><dt className="text-xs text-slate-400">Area</dt><dd className="font-medium text-slate-800">{job.area || "Not specified"}</dd></div>
                  <div><dt className="text-xs text-slate-400">Priority</dt><dd className="font-medium capitalize text-slate-800">{job.priority === "routine" ? "Medium" : job.priority}</dd></div>
                </dl>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Activity</h2>
                <dl className="mt-3 space-y-3 text-sm">
                  <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 text-indigo-500" /><div><dt className="text-xs text-slate-400">Created</dt><dd className="font-medium text-slate-800">{formatDate(job.createdAt)} by {job.createdByUserId?.name || "Team member"}</dd></div></div>
                  {job.status === "closed" && <div><dt className="text-xs text-slate-400">Completed</dt><dd className="font-medium text-slate-800">{formatDate(job.closedAt)} by {job.closedByUserId?.name || "Team member"}</dd></div>}
                </dl>
              </div>
            </div>

            <div className="space-y-5 bg-slate-100 rounded-xl border border-slate-200 p-4">
              <section className="">
                <label htmlFor="task-status" className="text-sm font-semibold text-slate-800">Update status</label>
                <select id="task-status" value={status} disabled={savingStatus || statusLocked} onChange={(event) => void saveStatus(event.target.value as Job["status"])} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium disabled:opacity-60">
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {statusLocked && <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700"><ShieldAlert className="h-3.5 w-3.5" />Punch in to update task status.</p>}
                {savingStatus && <p className="mt-2 text-xs text-slate-500">Saving status…</p>}
              </section>

              <form onSubmit={saveHandoffNote} className="rounded-2xl bg-slate-50 p-4">
                <label htmlFor="handoff-note" className="text-sm font-semibold text-slate-800">Shift handoff note</label>
                {job.handoffNote && <div className="mt-2 rounded-xl bg-white p-3 text-sm leading-6 text-slate-700"><p className="whitespace-pre-wrap">{job.handoffNote}</p><p className="mt-2 text-xs text-slate-400">Left {formatDate(job.leftAt)} by {job.leftByUserId?.name || "Team member"}</p></div>}
                <textarea id="handoff-note" value={handoffNote} onChange={(event) => setHandoffNote(event.target.value)} maxLength={2000} rows={4} placeholder="Add an update for the next shift…" className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                <button type="submit" disabled={savingNote || !handoffNote.trim() || (viewerRole === "staff" && shiftStatus !== "on")} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{savingNote ? "Saving…" : "Save handoff note"}</button>
                {viewerRole === "staff" && shiftStatus !== "on" && <p className="mt-2 text-xs text-amber-700">Punch in to leave a handoff note.</p>}
              </form>

              <div className="flex items-center gap-2 text-xs text-slate-400"><BriefcaseBusiness className="h-4 w-4" />Task record for your assigned facility team.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}