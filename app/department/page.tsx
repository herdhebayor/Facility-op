"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, MapPin, UserRound, UserRoundCog } from "lucide-react";

type MyDepartment = {
  _id: string;
  name: string;
  locationName: string;
  staffCount: number;
  onShiftCount: number;
  routineCompletion: number | null;
};

export default function MyDepartmentPage() {
  const [departments, setDepartments] = useState<MyDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null)

  useEffect(() => {
    let active = true;
    async function loadDepartment() {
      try {
        const response = await fetch("/api/departments", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load your department.");
        if (active) setDepartments(Array.isArray(data.departments) ? data.departments : []);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load your department.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDepartment();
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 pb-24 text-slate-800 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[30px] bg-linear-to-br from-cyan-800 via-indigo-700 to-violet-600 p-6 text-white shadow-xl shadow-indigo-950/10 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">Your team</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">My department</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">View your department’s people, assigned tasks, routine progress, and recent activity.</p>
        </header>
        {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {loading ? <div className="h-56 animate-pulse rounded-[28px] bg-white" /> : departments.length ? (
          <section className="grid gap-4 md:grid-cols-2">
            {departments.map((department) => (
              <Link key={department._id} href={`/departments/${encodeURIComponent(department._id)}`} className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Building2 className="h-6 w-6" /></span><div><h2 className="text-xl font-bold text-slate-900">{department.name}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" />{department.locationName}</p></div></div>
                  <ArrowRight className="mt-1 h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600" />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4"><UserRound className="h-4 w-4 text-indigo-500" /><p className="mt-3 text-2xl font-bold text-slate-900">{department.staffCount}</p><p className="text-xs text-slate-500">Team members</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><UserRoundCog className="h-4 w-4 text-emerald-500" /><p className="mt-3 text-2xl font-bold text-slate-900">{department.onShiftCount}</p><p className="text-xs text-slate-500">Currently on shift</p></div>
                </div>
                <p className="mt-5 text-sm font-semibold text-indigo-700">View department details <span aria-hidden="true">→</span></p>
              </Link>
            ))}
          </section>
        ) : (
          <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <Building2 className="mx-auto h-10 w-10 text-indigo-300" /><h2 className="mt-4 text-xl font-bold text-slate-900">No department assigned yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Choose your department from your profile to see your team and work here.</p>
            <Link href="/me" className="mt-5 inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Set up my profile</Link>
          </section>
        )}
      </div>
    </main>
  );
}
