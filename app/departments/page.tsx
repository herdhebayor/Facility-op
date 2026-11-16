"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight,Plus, Building2, CheckCircle2, ClipboardCheck, Users, RotateCw } from "lucide-react";
import DepartmentForm from "@/components/DpartmentForm";

type DepartmentSummary = {
  _id: string;
  name: string;
  locationName: string;
  staffCount: number;
  onShiftCount: number;
  jobCount: number;
  routineJobCount: number;
  completedRoutineJobCount: number;
  routineCompletion: number | null;
};
type DepartmentPageUser = {
  companyId?: string;
  locationId?: string | { toString(): string } | null;
  role?: string;
};
type DepartmentPageLocation = { _id: string; name: string };

function completionTone(value: number | null) {
  if (value === null) return "bg-slate-300";
  if (value >= 80) return "bg-emerald-500";
  if (value >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<DepartmentPageUser | null>(null);
  const [locations, setLocations] = useState<DepartmentPageLocation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [depRes,meRes,locRes] = await Promise.all([
        fetch("/api/departments", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/locations", { cache: "no-store" }),
      ]) 
      const [departmentData, userData,locationData] = await Promise.all([
        depRes.json(),
        meRes.json(),
        locRes.json(),
    ])
      
      if (!depRes.ok || !meRes.ok || !locRes.ok) {
        throw new Error(departmentData.error || userData.error || locationData.error || "Unable to load departments.");
      }
      setDepartments(Array.isArray(departmentData.departments) ? departmentData.departments : []);
      setUser(userData.user);
      setLocations(Array.isArray(locationData.locations) ? locationData.locations : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load,please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const overview = useMemo(() => {
    const staffCount = departments.reduce((total, department) => total + department.staffCount, 0);
    const onShiftCount = departments.reduce((total, department) => total + department.onShiftCount, 0);
    const routineDepartments = departments.filter((department) => department.routineCompletion !== null);
    const routineAverage = routineDepartments.length
      ? Math.round(routineDepartments.reduce((total, department) => total + (department.routineCompletion || 0), 0) / routineDepartments.length)
      : null;
    return { staffCount, onShiftCount, routineAverage };
  }, [departments]);
 
  return (
    <main className="min-h-screen bg-slate-100 md:px-8 pb-10 text-slate-600">
      <div className="mx-auto w-full space-y-4 p-4">
        <header className="overflow-hidden rounded-xl bg-linear-to-br from-indigo-950 via-indigo-800 to-violet-600 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200">Team operations</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Departments</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">Monitor routine work, shift coverage, and activity across your assigned locations.</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10"><Building2 className="h-7 w-7" /></div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              { label: "Departments", value: departments.length, icon: Building2, color: "bg-violet-400" },
              { label: "Staff on shift", value: `${overview.onShiftCount} / ${overview.staffCount}`, icon: Users, color: "bg-emerald-400" },
              { label: "Routine completion", value: overview.routineAverage === null ? "No routines today" : `${overview.routineAverage}%`, icon: CheckCircle2, color: "bg-amber-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <article key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="flex items-center justify-between"><p className="text-sm text-indigo-100">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color} text-slate-900`}><Icon className="h-4 w-4" /></span></div>
                <p className="mt-3 text-2xl font-bold">{value}</p>
              </article>
            ))}
          </div>
        </header>

        {departmentDialogOpen && <DepartmentForm setDepartmentDialogOpen={setDepartmentDialogOpen} user={user} locations={locations} onCreated={load}/>}
        {error && <section role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button type="button" onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2 font-semibold text-white hover:bg-rose-700"><RotateCw className="h-4 w-4" />Try again</button></section>}

        <section className=" rounded-xl bg-white shadow-md p-4 ">
          <div className="flex gap-2 border-b border-slate-100/10 justify-between ">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Department performance</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Your teams</h2>
                <p className="text-sm text-slate-500">{loading ? "Loading departments…" : `${departments.length} ${departments.length === 1 ? "department" : "departments"}`}</p>
                </div>
                <div className="flex flex-col items-center gap-3">
                <button onClick={()=>setDepartmentDialogOpen(true)} type="button" className="inline-flex items-center justify-center cursor-pointer hover:border hover:border-emerald-200 bg-emerald-400/10 rounded-full w-12 h-12">
                    <Plus className="h-5 w-5 text-emerald-400" />
                </button>
                <p className="text-xs">New Department</p>
                </div>
          </div>
          {loading ? (
            <div className="grid py-4 gap-4">{[0, 1, 2].map((item) => <div key={item} className="h-25 w-full animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : departments.length === 0 ? (
            <div className=" py-16 text-center"><Building2 className="mx-auto h-10 w-10 text-indigo-300" /><h3 className="mt-4 text-lg font-semibold text-slate-900">No departments to show</h3><p className="mt-2 text-sm text-slate-500">Departments will appear here when they are set up for your locations.</p></div>
          ) : (
            <div className="flex flex-col gap-4 mt-4">
              {departments.map((department) => (
                <button type="button" key={department._id} onClick={() => router.push(`/departments/${encodeURIComponent(department._id)}`)} className="group cursor-pointer w-full rounded-xl hover:border items-start flex gap-2 md:gap-3 justify-between hover:border-inidgo-400 bg-slate-100 p-4 text-left shadow-md">
                  <div className="flex items-start justify-between w-full gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <Building2 className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">{department.name}</h3>
                        <p className="mt-1 truncate text-xs text-slate-500">{department.locationName}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-300   group-hover:text-indigo-600" />
                  </div>

                  <div className="flex w-full items-center gap-2 md:gap-3">
                    <div className=""><p className="text-xs text-slate-500">On shift</p><p className=" text-lg font-bold text-slate-900">{department.onShiftCount}<span className="text-sm font-medium text-slate-400"> / {department.staffCount}</span></p></div>
                    <div className=""><p className="text-xs text-slate-500">Tasks</p><p className=" text-lg font-bold text-slate-900">{department.jobCount}</p></div>
                  </div>

                  <div className="w-full">
                    <div className="mb-2 flex flex-col md:flex-row items-start justify-center md:justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                        <ClipboardCheck className="h-3.5 w-3.5 text-indigo-500" />Routine status</span>
                        <span className="font-semibold text-slate-700">{department.routineCompletion === null ? "No routines today" : `${department.routineCompletion}%`}</span>
                    </div>
                    <div className="h-2 overflow-hidden hidden md-block rounded-full bg-slate-100"><div className={`h-full rounded-full bg-emerald-400 ${completionTone(department.routineCompletion)}`} style={{ width: `${department.routineCompletion ?? 0}%` }} /></div>
                    {department.routineCompletion !== null && <p className="mt-2 text- hidden md:block text-slate-400">{department.completedRoutineJobCount} of {department.routineJobCount} tasks complete today</p>}
                  </div>

                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
