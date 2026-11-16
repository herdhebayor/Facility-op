"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ registrationKey: "", companyName: "", adminName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push(data.user?.role === "admin" ? "/admin/dashboard" : "/dashboard");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: "companyName", label: "Company name", type: "text", placeholder: "Example Facilities Group", icon: Building2 },
    { key: "adminName", label: "Your name", type: "text", placeholder: "Enter your username", icon: UserRound },
    { key: "email", label: "Email", type: "email", placeholder: "you@company.com", icon: Mail },
    { key: "password", label: "Password", type: "password", placeholder: "••••••••", icon: ShieldCheck },
  ] as const;

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 text-slate-900">
      <div className="flex w-full overflow-hidden">
        <section className="hidden min-h-screen w-[42%] flex-col gap-10 bg-gradient-to-br from-indigo-50/70 to-violet-100/40 p-6 md:flex sm:p-8 lg:p-10">
          <div>
            <div className="mb-8 inline-flex items-center gap-3 rounded-lg bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-indigo-400">
              <Building2 className="h-4 w-4" />
              New company
            </div>

            <div className="space-y-5">
              <h1 className="max-w-md text-6xl font-bold tracking-tight ">
                Set up your operations in minutes.
              </h1>
              <p className="max-w-md text-base text-slate-600">
                Create your company profile and start managing teams, jobs, shifts, and service requests from a single modern workspace.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {[
              "Invite your team and assign roles",
              "Track daily operations and maintenance jobs",
              "Launch with secure manager access",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl bg-white p-3 py-4 text-lg shadow-sm text-slate-600">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 ">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen w-full items-center justify-center p-4 sm:p-8 md:w-[58%] lg:p-10">
          <div className="w-full max-w-3xl rounded-[32px] border border-indigo-100 bg-white p-6 shadow-2xl shadow-indigo-950/10 sm:p-10">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-500">Create account</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-800 sm:text-4xl">Register Admin</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-300 text-white shadow-lg shadow-inidgo-500/30">
                <Building2 className="h-5 w-5" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="registrationKey" className="text-sm font-medium text-slate-600">Company registration key</label>
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-indigo-200/40 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/30">
                  <div className="flex w-12 shrink-0 items-center justify-center rounded-l-2xl bg-indigo-50 p-4">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="registrationKey"
                    name="registrationKey"
                    type="password"
                    autoComplete="off"
                    required
                    value={form.registrationKey}
                    onChange={(event) => update("registrationKey", event.target.value)}
                    placeholder="Enter your registration key"
                    className="w-full rounded-r-2xl border-0 px-3 py-4 text-base text-slate-700 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-slate-500">Enter the access key before creating a company account.</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
              {fields.map((field) => {
                const Icon = field.icon;

                return (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">{field.label}</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-indigo-200/40   focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/30">
                      <div className="flex w-12 shrink-0 items-center justify-center rounded-l-2xl bg-indigo-50 p-4">
                        <Icon className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type={field.type}
                        required
                        value={form[field.key]}
                        onChange={(e) => update(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full rounded-r-2xl border-0 px-3 py-4 text-base text-slate-700 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
              </div>

              {error && (
                <div className="px-3 py-2 text-sm text-red-400">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-indigo-600 to-violet-500 p-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/30   hover:brightness-110 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {loading ? "Creating account..." : "Create company"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
