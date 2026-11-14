"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Application page error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-12">
      <section className="w-full max-w-lg rounded-[28px] border border-rose-100 bg-white p-8 text-center shadow-xl shadow-rose-950/5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><AlertTriangle className="h-7 w-7" /></div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">We couldn’t load this page</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Your work is safe. Try loading the page again, or return to the dashboard.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={()=>window.location.reload()} className="inline-flex items-center cursor-pointer justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"><RotateCcw className="h-4 w-4" />Try again</button>
          <Link href="/dashboard" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Go to dashboard</Link>
        </div>
      </section>
    </main>
  );
}
