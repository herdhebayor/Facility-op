"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LogOut,
  Mail,
  MapPin,
  Plus,
  X,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { InviteDepartmentOption } from "@/components/InviteStaffForm";

type MeRecord = {
  _id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  staffType?: string;
  locationId?: string | { toString(): string } | null;
  shiftStatus?: string;
  shiftSince?: string;
  isActive?: boolean;
  isSetupComplete?: boolean;
  createdAt?: string;
};
type LocationRecord = { _id: string; name: string; address?: string };
type DepartmentOption = InviteDepartmentOption & { locationId: string };
type ReportRecord = { userId?: string | { _id?: string }; recipientRole: string };

function displayDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<MeRecord | null>(null);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [departmentNotice, setDepartmentNotice] = useState("");
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const selectedLocationId = selectedLocation || String(user?.locationId || "");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const [userResponse, locationResponse, reportResponse, departmentResponse] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/locations"),
          fetch("/api/reports"),
          fetch("/api/departments"),
        ]);
        const [userData, locationData, reportData, departmentData] = await Promise.all([
          userResponse.json(),
          locationResponse.json(),
          reportResponse.json(),
          departmentResponse.json(),
        ]);
        if (!userResponse.ok || !locationResponse.ok || !reportResponse.ok || !departmentResponse.ok || !userData.user) {
          throw new Error(userData.error || locationData.error || reportData.error || departmentData.error || "Unable to load your profile.");
        }

        const profile: MeRecord = userData.user;
        const assignedIds = profile.locationId ? [String(profile.locationId)] : [];
        if (active) {
          setUser(profile);
          setLocations((Array.isArray(locationData.locations) ? locationData.locations : []).filter(
            (location: LocationRecord) => assignedIds.includes(String(location._id)),
          ));
          setReports(Array.isArray(reportData.reports) ? reportData.reports : []);
          const availableDepartments: DepartmentOption[] = Array.isArray(departmentData.departments) ? departmentData.departments : [];
          const defaultLocationId = assignedIds[0] || "";
          setDepartments(availableDepartments);
          setSelectedLocation(defaultLocationId);
          setSelectedDepartment(availableDepartments.find((department) => String(department.locationId) === defaultLocationId)?._id || "");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load your profile.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out.");
      router.push("/login");
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Unable to sign out.");
      setLoggingOut(false);
    }
  }

  async function saveDepartment(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || user.role !== "staff" || savingDepartment) return;
    setError("");
    setDepartmentNotice("");
    setSavingDepartment(true);
    try {
      let departmentName = selectedDepartment;
      let departmentLocationId = selectedLocationId;
      const newName = newDepartmentName.trim();
      if (newName) {
        const createResponse = await fetch("/api/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName, locationId: departmentLocationId }),
        });
        const createData = await createResponse.json();
        if (!createResponse.ok && createResponse.status !== 409) {
          throw new Error(createData.error || "Unable to add this department.");
        }
        if (createResponse.ok) {
          const newDepartment: DepartmentOption = createData.department;
          setDepartments((current) => [...current, newDepartment].sort((a, b) => a.name.localeCompare(b.name)));
          departmentName = newDepartment.name;
          departmentLocationId = newDepartment.locationId;
        } else {
          departmentName = newName;
        }
      } else if (selectedDepartment) {
        const selected = departments.find((department) => department._id === selectedDepartment);
        departmentName = selected?.name || "";
        departmentLocationId = selected?.locationId || departmentLocationId;
      }
      if (!departmentName) {
        throw new Error("Choose a department or enter a new department name.");
      }

      const response = await fetch("/api/staff/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department: departmentName, locationId: departmentLocationId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save your department.");
      }

      setUser((current) => current ? { ...current, department: data.department } : current);
      setDepartmentDialogOpen(false);
      setNewDepartmentName("");
      setDepartmentNotice(`Your department is now ${data.department}.`);
    } catch (departmentError) {
      setError(departmentError instanceof Error ? departmentError.message : "Unable to save your department.");
    } finally {
      setSavingDepartment(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-5   " aria-busy="true" aria-label="Loading your profile">
        <div className="space-y-5">
          <div className="h-56 animate-pulse rounded-xl bg-white" />
          <div className="grid gap-4 grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl bg-white" />)}</div>
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl bg-white" />)}
          </section>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen w-full mx-auto max-w-120 items-center justify-center bg-slate-100 px-5">
        <section className="max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <UserRound className="mx-auto h-10 w-10 text-indigo-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Profile unavailable</h1>
          <p role="alert" className="mt-2 text-sm text-slate-600">{"You've been loged out,sign in again to view your profile."}</p>
          <button onClick={() => router.push("/login")} className="mt-5 rounded-xl bg-indigo-600 px-6 cursor-pointer py-3 text-sm font-semibold text-white">Log in</button>
        </section>
      </main>
    );
  }

  const ownReports = reports.filter((report) => {
    const reportUserId = typeof report.userId === "object" && report.userId !== null ? report.userId._id : report.userId;
    return String(reportUserId || "") === String(user._id);
  }).length;
  const inboxCount = user.role === "staff" ? 0 : reports.filter((report) => report.recipientRole === user.role).length;
  const staffLocations = locations.length;

  return (
    <>
    <main className="min-h-screen bg-slate-100    pb-10 text-slate-600">
      <div className="mx-auto w-full">
        <div className="p-4">
          <header className="overflow-hidden rounded-xl bg-white shadow-md">
            <div className="h-36 bg-linear-to-br from-slate-950 via-indigo-950 to-indigo-700 md:h-44" />
            <div className="px-5 pb-6 md:px-8">
              <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[26px] border-4 border-indigo-400 bg-indigo-400 text-2xl font-bold text-indigo-700 shadow-sm">
                    {initials(user.name)}
                  </div>
                  <div className="pb-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">My account</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{user.name}</h1>
                  </div>
                </div>
                <button type="button" onClick={() => void logout()} disabled={loggingOut} className="inline-flex items-center cursor-pointer justify-center gap-2 rounded-xl border border-red-200 bg-red-400 px-4 py-2.5 text-sm font-semibold text-white   hover:border-rose-200 hover:bg-red-300 hover:text-rose-700 disabled:opacity-60">
                  <LogOut className="h-4 w-4" />{loggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold capitalize text-indigo-700"><ShieldCheck className="h-3.5 w-3.5" />{user.role}</span>
                {user.staffType && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold capitalize text-slate-600">{user.staffType}</span>}
                {user.department && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{user.department}</span>}
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${user.isActive === false ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {user.isActive === false ? "Suspended" : "Account active"}
                </span>
              </div>
            </div>
          </header>
        </div>

        {error && <div className="p-4"> <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p></div>}
        {departmentNotice && <div className="p-4"> <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{departmentNotice}</p></div>}

        {departmentDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
            <section role="dialog" aria-modal="true" aria-labelledby="department-dialog-title" className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Profile setup</p>
                  <h2 id="department-dialog-title" className="mt-1 text-xl font-semibold text-slate-900">Choose your department</h2>
                  <p className="mt-2 text-sm text-slate-500">Pick an existing department or add a new one.</p>
                </div>
                <button type="button" onClick={() => setDepartmentDialogOpen(false)} aria-label="Close department form" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={saveDepartment} className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Location
                  <select value={selectedLocationId} onChange={(event) => { setSelectedLocation(event.target.value); setSelectedDepartment(""); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    {locations.map((location) => <option key={location._id} value={location._id}>{location.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Existing department
                  <select value={selectedDepartment} onChange={(event) => { setSelectedDepartment(event.target.value); setNewDepartmentName(""); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    <option value="">Select department</option>
                    {departments.filter((department) => department.locationId === selectedLocationId).map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Or add a department
                  <input value={newDepartmentName} onChange={(event) => { setNewDepartmentName(event.target.value); setSelectedDepartment(""); }} maxLength={80} placeholder="e.g. Maintenance" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setDepartmentDialogOpen(false)} className="rounded-xl cursor-pointer border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={savingDepartment} className="inline-flex items-center justify-center cursor-pointer gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white w-full hover:bg-indigo-700 disabled:opacity-60"><Plus className="h-4 w-4" />{savingDepartment ? "Saving..." : "Save department"}</button>
                </div>
              </form>
            </section>
          </div>
        )}

        <section className="grid gap-4 grid-cols-3 px-4" aria-label="Account overview">
          {[
            { label: "Assigned locations", value: staffLocations, icon: MapPin, color: "bg-sky-50 text-sky-600" },
            { label: "Reports submitted", value: ownReports, icon: FileText, color: "bg-amber-50 text-amber-600" },
            { label: "Reports to review", value: inboxCount, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <article key={label} className="rounded-xl bg-white p-5 shadow-md">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></div>
              <p className="mt-4 text-3xl font-bold tabular-nums">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </article>
          ))}
        </section>

        <section className="grid p-4 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-xl  bg-white p-6 shadow-md md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><UserRound className="h-5 w-5" /></div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Personal information</p><h2 className="text-lg font-semibold">Account details</h2></div>
            </div>
            <dl className="divide-y divide-slate-100">
              <div className="flex items-center gap-3 py-4">
                <Mail className="h-4 w-4 text-slate-400" />
                <div className="min-w-0 flex-1"><dt className="text-xs text-slate-400">Email address</dt><dd className="mt-1 truncate text-sm font-medium text-slate-700">{user.email}</dd></div>
              </div>
              <div className="flex items-center gap-3 py-4">
                <BriefcaseBusiness className="h-4 w-4 text-slate-400" />
                <div className="min-w-0 flex-1"><dt className="text-xs text-slate-400">Role / department</dt><dd className="mt-1 text-sm font-medium capitalize text-slate-700">{user.role}{user.department ? ` · ${user.department}` : " · Not selected"}</dd></div>
              </div>
              {user.role !== "admin" && !user.department && (
                <div className="py-4">
                  <button type="button" onClick={() => setDepartmentDialogOpen(true)} className="inline-flex items-center cursor-pointer gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm   hover:bg-indigo-700"><Plus className="h-4 w-4" />Add my department</button>
                </div>
              )}
              <div className="flex items-center gap-3 py-4">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <div className="min-w-0 flex-1"><dt className="text-xs text-slate-400">Member since</dt><dd className="mt-1 text-sm font-medium text-slate-700">{displayDate(user.createdAt)}</dd></div>
              </div>
              {user.role !== "admin" && (
                <div className="flex items-center gap-3 py-4">
                  <Clock3 className="h-4 w-4 text-slate-400" />
                  <div className="min-w-0 flex-1"><dt className="text-xs text-slate-400">Current shift</dt><dd className="mt-1 text-sm font-medium capitalize text-slate-700">{user.shiftStatus || "Off"}{user.shiftStatus === "on" && user.shiftSince ? ` · since ${new Date(user.shiftSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</dd></div>
                </div>
              )}
              <div className="flex items-center gap-3 py-4">
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                <div className="min-w-0 flex-1"><dt className="text-xs text-slate-400">Setup status</dt><dd className="mt-1 text-sm font-medium text-slate-700">{user.isSetupComplete === false ? "Setup incomplete" : "Complete"}</dd></div>
              </div>
            </dl>
          </article>

          <div className="space-y-4">
            <article className="rounded-xl bg-white p-6 shadow-md">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600"><Building2 className="h-5 w-5" /></div>
                <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Workplaces</p><h2 className="text-lg font-semibold">Assigned locations</h2></div>
              </div>
              {locations.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No locations are assigned to your account.</p>
              ) : (
                <div className="space-y-2">
                  {locations.map((location) => (
                    <button key={location._id} type="button" disabled={user.role !== "admin"} onClick={() => router.push(`/location/${encodeURIComponent(location._id)}`)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left   hover:border-indigo-200 hover:bg-indigo-50/50 disabled:cursor-default disabled:hover:border-slate-100 disabled:hover:bg-white">
                      <MapPin className="h-4 w-4 shrink-0 text-indigo-500" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{location.name}</span><span className="block truncate text-xs text-slate-500">{location.address || "Address not set"}</span></span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-xl bg-linear-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-indigo-900/10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">Need to follow up?</p>
              <h2 className="mt-2 text-xl font-semibold">Your reports, in one place</h2>
              <p className="mt-2 text-sm leading-6 text-indigo-100">Send a report to the right person and keep track of replies.</p>
              <button type="button" onClick={() => router.push("/report")} className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700   hover:bg-indigo-50">
                View reports <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          </div>
        </section>
      </div>
    </main>
    </>
  );
}
