"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Copy,
  FileText,
  KeyRound,
  Mail,
  MapPin,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  UserRound,
  XCircle,
} from "lucide-react";

type Person = { _id: string; name: string; role?: string };
type StaffProfile = {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: string;
  staffType?: string;
  department?: string;
  locationId?: string | null;
  shiftStatus?: string;
  shiftSince?: string;
  isSetupComplete?: boolean;
  passwordResetRequired?: boolean;
  isActive?: boolean;
  suspendedAt?: string;
  suspensionReason?: string;
  createdAt?: string;
  temporaryPassword?: string;
};
type JobRecord = {
  _id: string;
  title: string;
  area?: string;
  status: string;
  priority?: string;
  handoffNote?: string;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string;
  leftAt?: string;
  createdByUserId?: Person | null;
  closedByUserId?: Person | null;
  leftByUserId?: Person | null;
};
type ReportRecord = {
  _id: string;
  title: string;
  details?: string;
  type: string;
  status: string;
  createdAt?: string;
  userId?: Person | null;
  targetUserId?: Person | null;
};
type ShiftRecord = {
  _id: string;
  startTime: string;
  endTime?: string | null;
  status: string;
};
type LocationOption = { _id: string; name: string };
type DepartmentOption = { _id: string; name: string; locationId?: string | { _id?: string } };

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizeLocationId(value: string | { _id?: string } | null | undefined) {
  return String(typeof value === "object" && value !== null ? value._id ?? "" : value ?? "");
}

function statusStyle(status: string) {
  if (status === "closed" || status === "resolved" || status === "completed") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "in_progress" || status === "reviewed" || status === "active") {
    return "bg-blue-50 text-blue-700";
  }
  return "bg-amber-50 text-amber-700";
}

function CopyableValue({
  value,
  label,
  copied,
  onCopy,
}: {
  value: string;
  label: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <span className="group/copy relative inline-flex min-w-0 items-center">
      <span onClick={onCopy} className="truncate cursor-pointer hover:text-indigo-400 ">{value}</span>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg   group-hover/copy:pointer-events-auto group-hover/copy:opacity-100 group-focus-within/copy:pointer-events-auto group-focus-within/copy:opacity-100"
      >
        {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

export default function StaffDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationId = searchParams.get("locationId");
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [copiedField, setCopiedField] = useState<"email" | "temporaryPassword" | "">("");
  const [copyError, setCopyError] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordExpiresAt, setRecoveryPasswordExpiresAt] = useState("");
  const [generatingRecoveryPassword, setGeneratingRecoveryPassword] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [viewerRole, setViewerRole] = useState("");
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [editForm, setEditForm] = useState({ email: "", phoneNumber: "", role: "staff", staffType: "full time", locationId: "", department: "" });

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch(`/api/staff/${encodeURIComponent(params.id)}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load this staff profile.");
        }
        if (active) {
          setStaff(data.staff);
          setViewerRole(data.viewerRole || "");
          setJobs(Array.isArray(data.jobs) ? data.jobs : []);
          setReports(Array.isArray(data.reports) ? data.reports : []);
          setShifts(Array.isArray(data.shifts) ? data.shifts : []);
          if (data.viewerRole === "admin") {
            try {
              const [locationsResponse, departmentsResponse] = await Promise.all([
                fetch("/api/locations"),
                fetch("/api/departments"),
              ]);
              const [locationsData, departmentsData] = await Promise.all([locationsResponse.json(), departmentsResponse.json()]);
              if (!locationsResponse.ok || !departmentsResponse.ok) {
                throw new Error(locationsData.error || departmentsData.error || "Unable to load staff-edit options.");
              }
              if (active) {
                setLocations(Array.isArray(locationsData.locations) ? locationsData.locations : []);
                setDepartments(Array.isArray(departmentsData.departments) ? departmentsData.departments : []);
              }
            } catch (optionsError) {
              if (active) setDetailsError(optionsError instanceof Error ? optionsError.message : "Unable to load staff-edit options.");
            }
          }
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load this staff profile.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [params.id]);

  const workStats = useMemo(() => ({
    completed: jobs.filter((job) => job.closedByUserId?._id === staff?._id).length,
    created: jobs.filter((job) => job.createdByUserId?._id === staff?._id).length,
  }), [jobs, staff?._id]);

  const backTo = locationId ? `/location/${encodeURIComponent(locationId)}` : "/staff";

  function openDetailsEditor() {
    if (!staff) return;
    setDetailsError("");
    setEditForm({
      email: staff.email,
      phoneNumber: staff.phoneNumber || "",
      role: staff.role,
      staffType: staff.staffType || "full time",
      locationId: staff.locationId ? String(staff.locationId) : "",
      department: staff.department || "",
    });
    setEditingDetails(true);
  }

  async function saveStaffDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!staff || savingDetails) return;
    setSavingDetails(true);
    setDetailsError("");
    try {
      const response = await fetch(`/api/staff/${encodeURIComponent(staff._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update staff details.");
      setStaff((current) => current ? { ...current, ...data.staff } : current);
      setEditingDetails(false);
      setStatusMessage("Staff details updated.");
    } catch (saveError) {
      setDetailsError(saveError instanceof Error ? saveError.message : "Unable to update staff details.");
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleToggleStaffStatus() {
    if (!staff || updatingStatus) return;
    const nextState = staff.isActive === false;
    setStatusError("");
    setStatusMessage("");
    setUpdatingStatus(true);

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-status",
          staffId: staff._id,
          enable: nextState,
          reason: nextState ? "Account reactivated by admin" : "Account suspended by admin",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to update staff status.");
      }

      setStaff((current) => current ? {
        ...current,
        isActive: data.user.isActive,
        suspendedAt: data.user.isActive ? undefined : new Date().toISOString(),
        suspensionReason: data.user.suspensionReason || "",
      } : current);
      setStatusMessage(nextState ? "Staff account reactivated." : "Staff account suspended.");
      return true;
    } catch (statusUpdateError) {
      setStatusError(statusUpdateError instanceof Error ? statusUpdateError.message : "Unable to update staff status.");
      return false;
    } finally {
      setUpdatingStatus(false);
    }
  }
  async function handleCopy(field: "email" | "temporaryPassword", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyError("");
      setCopiedField(field);
      window.setTimeout(() => {
        setCopiedField((current) => current === field ? "" : current);
      }, 2000);
    } catch {
      setCopyError("Could not copy to clipboard. Check your browser permissions and try again.");
    }
  }

  async function generateRecoveryPassword() {
    if (!staff || generatingRecoveryPassword) return;
    setGeneratingRecoveryPassword(true);
    setRecoveryError("");
    setRecoveryPassword("");
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-recovery-password", staffId: staff._id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to generate a recovery password.");
      setRecoveryPassword(data.temporaryPassword);
      setRecoveryPasswordExpiresAt(data.expiresAt);
    } catch (requestError) {
      setRecoveryError(requestError instanceof Error ? requestError.message : "Unable to generate a recovery password.");
    } finally {
      setGeneratingRecoveryPassword(false);
    }
  }

  async function confirmStaffSuspension() {
    const success = await handleToggleStaffStatus();
    if (success) setConfirmSuspend(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-5   " aria-busy="true" aria-label="Loading staff profile">
        <div className="mx-auto space-y-4">
          <div className="h-48 animate-pulse rounded-xl bg-white" />
          <div className="grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-3xl bg-white" />)}
          </div>
          <div className="h-80 animate-pulse rounded-xl bg-white" />
          <div className="h-80 animate-pulse rounded-xl bg-white" />
          <div className="h-80 animate-pulse rounded-xl bg-white" />
        </div>
      </main>
    );
  }

  if (error || !staff) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
        <section className="max-w-120 rounded-[28px] border w-full border-slate-200 bg-white p-8 text-center shadow-sm">
          <XCircle className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Staff profile unavailable</h1>
          <p role="alert" className="mt-2 text-sm text-slate-600">{error || "This staff member could not be found."}</p>
          <button onClick={() => router.push(backTo)} className="mt-6 rounded-xl bg-indigo-500  cursor-pointer px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-600">
            Return to staff list
          </button>
        </section>
      </main>
    );
  }

  const reportsWritten = reports.filter((report) => report.userId?._id === staff._id);
  const reportsAbout = reports.filter((report) => report.targetUserId?._id === staff._id);
  const latestShift = shifts[0];

  return (
    <main className="min-h-screen bg-slate-100 p-4  pb-10 text-slate-600   ">
      <div className="mx-auto w-full space-y-4">
        <button
          onClick={() => router.push(backTo)}
          className="inline-flex items-center gap-2 rounded-full cursor-pointer bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-md   hover:border-slate-300 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to location
        </button>

        <header className="overflow-hidden rounded-xl bg-white shadow-md">
          <div className="h-36 bg-linear-to-br from-slate-950 via-indigo-950 to-indigo-700 md:h-44" />
          <div className="px-5 pb-6   ">
            <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-end gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[26px] border-4 border-emerald-300 bg-emerald-300 text-2xl font-bold text-white shadow-sm">
                  {initials(staff.name)}
                </div>
                <div className="min-w-0 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Staff profile</p>
                  <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{staff.name}</h1>
                </div>
              </div>
             <div className="flex flex-wrap gap-2">
              {viewerRole === "admin" && <button type="button" onClick={openDetailsEditor} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white   hover:bg-white/20">
                <Pencil className="h-4 w-4" />Edit details
              </button>}
              {viewerRole === "admin" && staff.isSetupComplete !== false && staff.isActive !== false && <button
                type="button"
                disabled={generatingRecoveryPassword}
                onClick={() => void generateRecoveryPassword()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white   hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />{generatingRecoveryPassword ? "Generating..." : "Generate recovery password"}
              </button>}
              {viewerRole === "admin" && <button
                type="button"
                disabled={updatingStatus}
                onClick={() => staff.isActive === false ? void handleToggleStaffStatus() : setConfirmSuspend(true)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 cursor-pointer text-sm font-semibold text-white   disabled:cursor-wait disabled:opacity-60 ${
                  staff.isActive === false
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {staff.isActive === false ? <UserRoundCheck className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                {updatingStatus ? "Updating..." : staff.isActive === false ? "Reactivate account" : "Suspend account"}
              </button>}
             </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold capitalize text-indigo-700"><ShieldCheck className="h-3.5 w-3.5" />{staff.role}</span>
                {staff.staffType && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold capitalize text-slate-600">{staff.staffType}</span>}
                {staff.department && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{staff.department}</span>}
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${staff.isActive === false ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {staff.isActive === false ? "Suspended" : "Account active"}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                <span className="inline-flex min-w-0 items-center gap-1.5"><Mail className="h-4 w-4 shrink-0" /><CopyableValue value={staff.email} label="email" copied={copiedField === "email"} onCopy={() => void handleCopy("email", staff.email)} /></span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{staff.locationId ? "1 assigned location" : "No location assigned"}</span>
              </div>
            </div>
          </div>
          {(statusMessage || statusError || copyError) && (
            <p role={statusError || copyError ? "alert" : "status"} className={`border-t px-5 py-3 text-sm md:px-8 ${statusError || copyError ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>
              {statusError || copyError || statusMessage}
            </p>
          )}
          {staff.isActive === false && staff.suspensionReason && (
            <div className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700 md:px-8">
              Account note: {staff.suspensionReason}
            </div>
          )}
        </header>
        {(recoveryPassword || recoveryError) && (
          <section className={`rounded-2xl border p-5 ${recoveryError ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
            {recoveryError ? (
              <p role="alert" className="text-sm text-rose-700">{recoveryError}</p>
            ) : (
              <>
                <h2 className="font-semibold text-amber-900">Share this temporary password directly</h2>
                <p className="mt-1 text-sm text-amber-800">It is shown only once, expires {formatDate(recoveryPasswordExpiresAt)}, and requires the staff member to create a new password at login.</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <code className="rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-sm text-slate-900">{recoveryPassword}</code>
                  <button type="button" onClick={() => void handleCopy("temporaryPassword", recoveryPassword)} className="rounded-lg bg-amber-800 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-900">
                    {copiedField === "temporaryPassword" ? "Copied" : "Copy password"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}
        {editingDetails && viewerRole === "admin" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
            <section role="dialog" aria-modal="true" aria-labelledby="edit-staff-title" className="my-auto w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Administrator controls</p>
                <h2 id="edit-staff-title" className="mt-1 text-xl font-bold text-slate-900">Edit staff details</h2>
                <p className="mt-1 text-sm text-slate-500">Name and password are not editable here. Generate a temporary recovery password from the staff profile when needed.</p>
              </div>
              {detailsError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{detailsError}</p>}
              <form onSubmit={saveStaffDetails} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-600">Email
                    <input type="email" required maxLength={254} value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900" />
                  </label>
                  <label className="text-sm font-medium text-slate-600">Phone number <span className="font-normal text-slate-400">(E.164 format)</span>
                    <input type="tel" value={editForm.phoneNumber} onChange={(event) => setEditForm((current) => ({ ...current, phoneNumber: event.target.value }))} placeholder="+14155552671" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900" />
                  </label>
                  <label className="text-sm font-medium text-slate-600">Role
                    <select value={editForm.role} onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900">
                      <option value="staff">Staff</option><option value="manager">Manager</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-600">Employment type
                    <select value={editForm.staffType} onChange={(event) => setEditForm((current) => ({ ...current, staffType: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900">
                      <option value="full time">Full time</option><option value="part time">Part time</option><option value="contract">Contract</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-600">Location
                    <select required value={editForm.locationId} onChange={(event) => {
                      const locationValue = event.target.value;
                      const firstDepartment = departments.find((item) => normalizeLocationId(item.locationId) === locationValue);
                      setEditForm((current) => ({ ...current, locationId: locationValue, department: firstDepartment?.name || "" }));
                    }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900">
                      <option value="">Select a location</option>{locations.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-600">Department
                    <select required value={editForm.department} onChange={(event) => setEditForm((current) => ({ ...current, department: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900">
                      <option value="">Select a department</option>{departments.filter((item) => normalizeLocationId(item.locationId) === editForm.locationId).map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" disabled={savingDetails} onClick={() => setEditingDetails(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancel</button>
                  <button disabled={savingDetails} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingDetails ? "Saving..." : "Save details"}</button>
                </div>
              </form>
            </section>
          </div>
        )}
        {
          staff.isSetupComplete === false && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-700 shadow-sm">
              <p className="text-xs">This staff member has not completed their account setup yet. They will not be able to sign in until they finish the setup process.</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                <ShieldAlert className="h-4 w-4" />
                {staff.temporaryPassword && <p className="flex items-center gap-1">Temporary password: <CopyableValue value={staff.temporaryPassword} label="temporary password" copied={copiedField === "temporaryPassword"} onCopy={() => void handleCopy("temporaryPassword", staff.temporaryPassword || "")} /></p>}
                <p className="flex items-center gap-1">Email: <CopyableValue value={staff.email} label="email" copied={copiedField === "email"} onCopy={() => void handleCopy("email", staff.email)} /></p>
              </div>
            </div>
          )
        }

        {confirmSuspend && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !updatingStatus) setConfirmSuspend(false);
          }}>
            <section role="alertdialog" aria-modal="true" aria-labelledby="staff-profile-suspend-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><ShieldAlert className="h-6 w-6" /></div>
              <h2 id="staff-profile-suspend-title" className="mt-4 text-lg font-semibold text-slate-900">Suspend {staff.name}?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">They will no longer be able to sign in until an administrator reactivates their account.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={updatingStatus} onClick={() => setConfirmSuspend(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600   hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="button" disabled={updatingStatus} onClick={() => void confirmStaffSuspension()} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white   hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60">
                  {updatingStatus ? "Suspending..." : "Confirm suspension"}
                </button>
              </div>
            </section>
          </div>
        )}

        <section className="grid gap-4 grid-cols-2 lg:grid-cols-4" aria-label="Staff activity summary">
          {[
            { label: "Tasks completed", value: workStats.completed, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
            { label: "Tasks created", value: workStats.created, icon: ClipboardList, color: "text-indigo-600 bg-indigo-50" },
            { label: "Reports written", value: reportsWritten.length, icon: FileText, color: "text-amber-600 bg-amber-50" },
            { label: "Reports about staff", value: reportsAbout.length, icon: ShieldCheck, color: "text-violet-600 bg-violet-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <article key={label} className="rounded-xl bg-white p-4 shadow-md">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></div>
              <p className="mt-4 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </article>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
          <div className="space-y-4">
            <section className="rounded-xl bg-white p-6 shadow-md">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Work history</p>
                  <h2 className="mt-1 text-xl font-semibold">Tasks and handoffs</h2>
                </div>
                <BriefcaseBusiness className="h-5 w-5 text-indigo-500" />
              </div>
              {jobs.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No task activity recorded for this staff member yet.</p>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <article key={job._id} className="rounded-xl border bg-slate-100 border-slate-50/10 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{job.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">{job.area || "Area not specified"} · {job.priority === "routine" ? "Medium" : job.priority ? `${job.priority[0].toUpperCase()}${job.priority.slice(1)}` : "Medium"} priority</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle(job.status)}`}>{job.status.replace("_", " ")}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                        {job.createdByUserId?._id === staff._id && <span>Created · {formatDate(job.createdAt)}</span>}
                        {job.closedByUserId?._id === staff._id && <span>Completed · {formatDate(job.closedAt || job.updatedAt)}</span>}
                        {job.leftByUserId?._id === staff._id && <span>Handoff · {formatDate(job.leftAt)}</span>}
                      </div>
                      {job.handoffNote && job.leftByUserId?._id === staff._id && (
                        <p className="mt-3 rounded-xl border-l-2 border-indigo-300 bg-white px-3 py-2 text-sm text-slate-600">{job.handoffNote}</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-50/10 bg-white p-4 shadow-md">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Reports</p>
                  <h2 className="mt-1 text-xl font-semibold">Report activity</h2>
                </div>
                <FileText className="h-5 w-5 text-amber-500" />
              </div>
              {reports.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-50/10 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No reports written by or about this staff member.</p>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <article key={report._id} className="rounded-xl border border-zinc-50/10 bg-slate-100 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="mb-1 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{report.type.replace("_", " ")}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyle(report.status)}`}>{report.status}</span>
                          </div>
                          <h3 className="font-semibold text-slate-900">{report.title}</h3>
                        </div>
                        <span className="text-xs text-slate-400">{formatDate(report.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{report.details || "No additional details."}</p>
                      <p className="mt-3 text-xs font-medium text-indigo-600">
                        {report.userId?._id === staff._id ? "Written by this staff member" : "Report about this staff member"}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-slate-50/10 bg-white p-4 shadow-md">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><UserRound className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Staff record</p>
                  <h2 className="font-semibold">Profile details</h2>
                </div>
              </div>
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Staff ID</dt><dd className="max-w-[60%] truncate text-right font-mono text-xs text-slate-700" title={staff._id}>{staff._id}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Joined</dt><dd className="text-right font-medium text-slate-700">{formatDate(staff.createdAt)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Account setup</dt><dd className="text-right font-medium capitalize text-slate-700">{staff.isSetupComplete === false ? "Pending" : "Complete"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Shift status</dt><dd className="text-right font-medium capitalize text-slate-700">{staff.shiftStatus || "Unknown"}</dd></div>
                {staff.shiftStatus === "on" && staff.shiftSince && <div className="flex justify-between gap-4"><dt className="text-slate-500">Shift started</dt><dd className="text-right font-medium text-slate-700">{formatDate(staff.shiftSince)}</dd></div>}
              </dl>
            </section>

            <section className="rounded-xl border border-slate-50/10 bg-white p-4 shadow-md">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Activity className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Attendance</p>
                  <h2 className="font-semibold">Recent shifts</h2>
                </div>
              </div>
              {shifts.length === 0 ? (
                <p className="text-sm text-slate-500">No shift history recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {shifts.map((shift) => (
                    <div key={shift._id} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="mt-0.5 text-slate-400"><CalendarDays className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700">{formatDate(shift.startTime)}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3 w-3" />{shift.endTime ? `Ended ${formatDate(shift.endTime)}` : "In progress"}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${statusStyle(shift.status)}`}>{shift.status}</span>
                    </div>
                  ))}
                </div>
              )}
              {latestShift?.status === "active" && (
                <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Currently clocked in</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
