import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 text-slate-700">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-700"><ArrowLeft className="h-4 w-4" />Back to sign in</Link>
        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><KeyRound className="h-5 w-5" /></span>
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Account recovery</p><h1 className="text-2xl font-bold text-slate-900">Reset password</h1></div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">Password recovery is handled by an administrator. Ask your admin to generate a temporary recovery password, then return to sign in and use it to create a new password.</p>
        <Link href="/login" className="mt-5 inline-flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Back to sign in</Link>
      </section>
    </main>
  );
}
