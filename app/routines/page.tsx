"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardCheck, Clock3, MapPin, Send } from "lucide-react";

type RoutineCompletion = {
  taskId: string;
  completedAt?: string | null;
  completedByUserId?: { name: string } | null;
  issueReport?: string;
};
type RoutineTask = { _id: string; title: string; area?: string };
type RoutineSubmission = { submittedByUserId?: string | { _id: string; name: string }; submittedAt: string };
type Routine = {
  _id: string;
  name: string;
  tasks: RoutineTask[];
  completions: RoutineCompletion[];
  routineSubmissions?: RoutineSubmission[];
};
type Department = {
  _id: string;
  name: string;
  locationName: string;
  locationTimezone: string;
  routineDayKey: string;
  routines: Routine[];
};

export default function RoutineChecksPage() {
  const router = useRouter();
  const [department, setDepartment] = useState<Department | null>(null);
  const [userId, setUserId] = useState("");
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [savingTask, setSavingTask] = useState("");
  const [submittingRoutine, setSubmittingRoutine] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    const [meResponse, departmentsResponse] = await Promise.all([
      fetch("/api/auth/me", { cache: "no-store" }),
      fetch("/api/departments", { cache: "no-store" }),
    ]);
    const [meData, departmentsData] = await Promise.all([meResponse.json(), departmentsResponse.json()]);
    if (!meResponse.ok || !departmentsResponse.ok) {
      throw new Error(meData.error || departmentsData.error || "Unable to load your routine checks.");
    }
    if (meData.user?.role !== "staff") {
      router.replace("/dashboard");
      return;
    }
    setUserId(meData.user._id);
    const nextDepartment = departmentsData.departments?.[0] || null;
    setDepartment(nextDepartment);
    const nextIssues: Record<string, string> = {};
    for (const routine of nextDepartment?.routines || []) {
      for (const completion of routine.completions || []) {
        if (completion.issueReport) nextIssues[`${routine._id}:${completion.taskId}`] = completion.issueReport;
      }
    }
    setIssues(nextIssues);
  }, [router]);

  useEffect(() => {
    // The initial fetch synchronizes the routine board with the daily server state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load your routine checks."))
      .finally(() => setLoading(false));
  }, [load]);

  const totals = useMemo(() => {
    const tasks = (department?.routines || []).flatMap((routine) => routine.tasks.map((task) => ({
      routine,
      task,
      completion: routine.completions.find((entry) => entry.taskId === task._id),
    })));
    return { completed: tasks.filter(({ completion }) => Boolean(completion?.completedAt)).length, total: tasks.length };
  }, [department]);

  async function updateTask(routine: Routine, task: RoutineTask, changes: { completed?: boolean; issueReport?: string }) {
    const updateKey = `${routine._id}:${task._id}`;
    setSavingTask(updateKey);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/departments/${encodeURIComponent(department!._id)}/routines/${encodeURIComponent(routine._id)}/${encodeURIComponent(task._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save this checklist item.");
      setDepartment((current) => current && ({
        ...current,
        routines: current.routines.map((entry) => entry._id !== routine._id ? entry : {
          ...entry,
          completions: [
            ...entry.completions.filter((completion) => completion.taskId !== task._id),
            ...(data.completion ? [data.completion] : []),
          ],
          ...(changes.completed !== undefined ? { routineSubmissions: [] } : {}),
        }),
      }));
      setNotice(changes.issueReport !== undefined ? "Issue report saved." : "");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to save this checklist item.");
    } finally {
      setSavingTask("");
    }
  }

  async function submitRoutine(routine: Routine) {
    setSubmittingRoutine(routine._id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/departments/${encodeURIComponent(department!._id)}/routines/${encodeURIComponent(routine._id)}/submit`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit this routine.");
      setDepartment((current) => current && ({
        ...current,
        routines: current.routines.map((entry) => entry._id !== routine._id ? entry : {
          ...entry,
          routineSubmissions: [
            ...(entry.routineSubmissions || []).filter((submission) => {
              const submitterId = typeof submission.submittedByUserId === "string"
                ? submission.submittedByUserId
                : submission.submittedByUserId?._id;
              return submitterId !== userId;
            }),
            data.submission,
          ],
        }),
      }));
      setNotice(`${routine.name} submitted to your manager.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit this routine.");
    } finally {
      setSubmittingRoutine("");
    }
  }

  if (loading) return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-4xl animate-pulse rounded-3xl bg-white p-8 text-slate-400">Loading today&apos;s routine checks…</div></main>;
  if (!department) return <main className="min-h-screen bg-slate-50 p-6"><section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-center"><ClipboardCheck className="mx-auto h-10 w-10 text-indigo-500" /><h1 className="mt-3 text-xl font-bold text-slate-900">No department routine found</h1><p className="mt-2 text-sm text-slate-500">Ask your manager to add a daily checklist for your department.</p><button onClick={() => router.push("/dashboard")} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Back to dashboard</button></section></main>;

  return (
    <main className="min-h-screen bg-slate-100 pb-10    text-slate-600">
      <div className="mx-auto w-full space-y-4 p-4">
        <header className="overflow-hidden rounded-xl bg-linear-to-br from-emerald-700 via-teal-650 to-emerald-600 p-6 text-white shadow-lg   ">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">Daily routine check</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{department.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-emerald-50"><MapPin className="h-4 w-4" />{department.locationName}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-2 flex justify-between text-xs text-emerald-50"><span>Today&apos;s progress</span><span>{totals.completed}/{totals.total} complete</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white  -all" style={{ width: `${totals.total ? totals.completed / totals.total * 100 : 0}%` }} /></div>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-emerald-50"><Clock3 className="h-3.5 w-3.5" />Daily reset at 6:00 a.m. · {department.locationTimezone}</p>
          </div>
        </header>

        {error && <p role="alert" className="rounded-lg w-[calc(100%-100px)] mx-auto border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg w-[calc(100%-100px)] mx-auto border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        {department.routines.map((routine) => {
          const completed = routine.tasks.filter((task) => routine.completions.some((entry) => entry.taskId === task._id && entry.completedAt)).length;
          const submitted = (routine.routineSubmissions || []).find((entry) => {
            const submitterId = typeof entry.submittedByUserId === "string" ? entry.submittedByUserId : entry.submittedByUserId?._id;
            return submitterId === userId;
          });
          return (
            <section key={routine._id} className=" p-4 bg-white rounded-xl shadow-md">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-xl font-bold text-slate-900">{routine.name}</h2><p className="mt-1 text-sm text-slate-500">Record each check and note any issue for your manager.</p></div>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">{completed} / {routine.tasks.length} complete</span>
              </div>
              <ol className="space-y-3">
                {routine.tasks.map((task, index) => {
                  const completion = routine.completions.find((entry) => entry.taskId === task._id);
                  const updateKey = `${routine._id}:${task._id}`;
                  const checked = Boolean(completion?.completedAt);
                  return (
                    <li key={task._id} className={`rounded-xl  p-4   ${checked ? "bg-emerald-500/70" : "border-slate-200 border-b bg-slate-100"}`}>
                      <div className="flex items-start gap-3">
                        <button type="button" disabled={savingTask === updateKey} onClick={() => void updateTask(routine, task, { completed: !checked })} aria-label={checked ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`} className={`mt-0.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border   ${checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-transparent hover:border-emerald-500"} disabled:opacity-50`}>
                          <Check className="h-4 w-4" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold ${checked ? "text-emerald-900" : "text-slate-800"}`}><span className="mr-2 text-xs text-slate-400">{index + 1}.</span>{task.title}</p>
                          {task.area && <p className="mt-1 text-xs text-slate-500">{task.area}</p>}
                          {checked && completion?.completedAt && <p className="mt-1 text-xs text-emerald-700">Completed by {completion.completedByUserId?.name || "Team member"} · {new Date(completion.completedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>}
                          {
                            checked && completion?.completedAt ?(
                          <p className="text-xs text-slate-400">{completion?.issueReport || "No issue repoted for this task"}</p>
                        ) :(<>
                            <label className="mt-3 block text-xs font-semibold text-slate-600" htmlFor={`issue-${updateKey}`}>Issue or notes <span className="font-normal text-slate-400">(optional, 500 characters max)</span></label>
                          <textarea id={`issue-${updateKey}`} maxLength={500} rows={2} value={issues[updateKey] ?? completion?.issueReport ?? ""} onChange={(event) => setIssues((current) => ({ ...current, [updateKey]: event.target.value }))} onBlur={(event) => {
                            const value = event.currentTarget.value;
                            if (value !== (completion?.issueReport || "")) void updateTask(routine, task, { issueReport: value });
                          }} placeholder="Briefly describe a problem, damage, or follow-up needed…" className="mt-1.5 w-full resize-none overflow-y-scroll rounded-lg border border-slate-200/20 bg-slate-100/10 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                        </>)}
                        </div>
                        {savingTask === updateKey && <span className="text-xs text-slate-400">Saving…</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 ">
                <p className="text-xs text-slate-500">{submitted ? `Submitted ${new Date(submitted.submittedAt).toLocaleString()}` : "Submit once every checklist item is complete."}</p>
                <button type="button" disabled={completed !== routine.tasks.length || Boolean(submitted) || Boolean(savingTask) || submittingRoutine === routine._id} onClick={() => void submitRoutine(routine)} className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-emerald-700 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white   hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                  {submitted ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}{submittingRoutine === routine._id ? "Submitting…" : submitted ? "Submitted to manager" : "Submit routine"}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
