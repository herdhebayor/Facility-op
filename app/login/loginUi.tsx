"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [userEmail, setUserEmail] = useState(""); 
  const [name, setName] = useState("");

  

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = requiresSetup
        ? {
            email,
            password,
            newPassword,
            confirmPassword,
            setupMode: true,
          }
        : { email, password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function checkEmail(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setEmailConfirmed(false);
    setRequiresSetup(false);

    try {
      const res = await fetch(`/api/auth/checkEmail?email=${encodeURIComponent(email)}`, {
        method: "GET",
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Could not find any account associated with this email");
        return;
      }

      setUserEmail(data.email);
      setEmailConfirmed(true);
      setName(data.name || "");
      setRequiresSetup(Boolean(data.requiresSetup));
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen w-screen overflow-hidden bg-zinc-50 text-slate-950">
      <div className="flex w-screen h-screen justify-center items-center md:flex-row ">
        
        <section className="flex overflow-y-scroll min-h-screen mx-auto w-full md:max-w-150 items-center justify-center p-4 ">
          <div className="w-full md:max-w-100   p-6 py-12  sm:p-6 lg:p-8">
            
            <div className="">
              <LockKeyhole className="mx-auto mb-4 h-12 w-12 text-indigo-500" />
              <h2 className="mb-12 mt-2 text-center text-3xl font-bold text-indigo-700 sm:text-4xl">{name || "Login"}</h2>
              <p className="mb-8 text-center text-slate-500">{emailConfirmed ? "Secure access to your facility operations" : "Enter your work email to continue to your workspace."}</p>
            </div>
            {emailConfirmed ? (
              <>
                <h2 className="mb-6 mt-2 text-center text-2xl font-bold text-slate-800 sm:text-3xl">
                  {requiresSetup ? "Create a new password" : "Enter your password"}
                </h2>

                <form onSubmit={handleSubmit} className="mx-auto max-w-xl w-full  space-y-5">
                  {requiresSetup ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">Temporary password</label>
                        <div className="flex items-center rounded-2xl border border-zinc-200 bg-indigo-200/40 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/30">
                          <div className="w-12 h-12 flex items-center justify-center rounded-l-2xl bg-white">
                            <LockKeyhole className="h-5 w-5 text-slate-600" />
                          </div>
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Current temporary password"
                            className="w-full rounded-r-2xl border-0 p-3 text-sm text-slate-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">New password</label>
                        <div className="flex items-center rounded-2xl border border-zinc-200 bg-indigo-200/40 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/30">
                          <div className="w-12 h-12 rounded-l-2xl bg-white flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-slate-600" />
                          </div>
                          <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Create a secure password (at least 8 characters)"
                            minLength={8}
                            maxLength={128}
                            className="w-full rounded-r-2xl border-0 p-3 text-sm text-slate-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">Confirm password</label>
                        <div className="flex items-center rounded-2xl border border-zinc-200 bg-indigo-200/40 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/30">
                          <div className="w-12 h-12 flex items-center justify-center rounded-l-2xl bg-white ">
                            <CheckCircle2 className="h-5 w-5 text-slate-600" />
                          </div>
                          <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat your new password"
                            minLength={8}
                            maxLength={128}
                            className="w-full rounded-r-2xl border-0 p-3 text-sm text-slate-600 focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center rounded-2xl border border-zinc-200 bg-indigo-200/40 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/30">
                        <div className="w-12 h-12 flex items-center justify-center rounded-l-2xl bg-white p-4 py-5">
                          <LockKeyhole className="h-5 w-5 text-slate-600" />
                        </div>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="******"
                          className="w-full rounded-r-2xl border-0 p-3 text-sm text-slate-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-indigo-500 to-indigo-400 p-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Please wait..." : requiresSetup ? "Set new password" : "Log in"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
                {!requiresSetup && <p className="mx-auto mt-4 max-w-xl text-right text-sm"><Link href="/forgot-password" className="font-semibold text-indigo-600 hover:text-indigo-800">Forgot password?</Link></p>}
              </>
            ) : (
              <form onSubmit={checkEmail} className="mx-auto w-full max-w-xl space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center rounded-2xl border border-zinc-50/10 bg-indigo-200/40 shadow-xs transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/30">
                    <div className="flex w-12 items-center h-12 justify-center rounded-l-2xl bg-white">
                      <Mail className="h-5 w-5 text-slate-600" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="w-full rounded-r-2xl bg-slate-100 border-0 p-3 text-sm text-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-indigo-500 to-indigo-400 p-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Checking email..." : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
