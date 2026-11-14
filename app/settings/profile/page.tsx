"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, UserRound } from "lucide-react";

type Profile = { name: string; email: string };

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<Profile>({ name: "", email: "" });
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.user) throw new Error(data.error || "Unable to load your profile.");
        if (active) {
          setProfile({
            name: data.user.name || "",
            email: data.user.email || "",
          });
          setName(data.user.name || "");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load your profile.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update your profile.");
      setProfile(data.user);
      setName(data.user.name);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(data.passwordChanged ? "Profile and password updated." : "Display name updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-full bg-zinc-50 p-4 text-slate-700 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Settings</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Profile settings</h1>
          <p className="mt-2 text-sm text-slate-500">Update your display name and account password.</p>
        </header>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <form onSubmit={saveProfile} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <section>
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Personal information</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Display name
                <input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} disabled={loading} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="text-sm font-medium text-slate-700">Email
                <input value={profile.email} readOnly className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500" />
              </label>
            </div>
          </section>
          <section className="border-t border-slate-100 pt-5">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
                <p className="text-xs text-slate-500">Leave these fields blank if you only want to change your name.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">Current password
                <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="text-sm font-medium text-slate-700">New password
                <input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="text-sm font-medium text-slate-700">Confirm new password
                <input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </label>
            </div>
          </section>
          <button type="submit" disabled={saving || loading} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </main>
  );
}
