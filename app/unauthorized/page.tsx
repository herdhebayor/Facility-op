import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getSessionUser } from "@/lib/auth";

export default async  function UnauthorizedPage() {
  const user = await getSessionUser() 
  return (
    <main className="flex min-h-full items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-600">Your account does not have permission to open this page.</p>
        <Link href={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} className="mt-6 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Return to dashboard</Link>
      </section>
    </main>
  );
}
