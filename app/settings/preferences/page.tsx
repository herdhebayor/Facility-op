"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { setSiteTheme, useSiteTheme, type SiteTheme } from "@/components/ThemeProvider";

const choices: { value: SiteTheme; label: string; description: string; icon: typeof Monitor }[] = [
  { value: "system", label: "On device settings", description: "Follow your device’s light or dark appearance.", icon: Monitor },
  { value: "light", label: "Light mode", description: "Always use the light appearance.", icon: Sun },
  { value: "dark", label: "Dark mode", description: "Use a darker appearance across the app.", icon: Moon },
];

export default function SitePreferencesPage() {
  const theme = useSiteTheme();

  return (
    <main className="min-h-full bg-zinc-50 p-4 text-slate-700 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Settings</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Site preferences</h1>
          <p className="mt-2 text-sm text-slate-500">Choose how Facility Ops appears on this device.</p>
        </header>
        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
          <p className="text-sm text-slate-500">Your choice is saved on this device and applies throughout the app.</p>
          <div className="mt-4 space-y-2">
            {choices.map(({ value, label, description, icon: Icon }) => (
              <label key={value} className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4   ${theme === value ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <input type="radio" name="site-theme" value={value} checked={theme === value} onChange={() => setSiteTheme(value)} className="h-4 w-4 accent-indigo-600" />
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
