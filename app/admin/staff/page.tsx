"use client";
import { SetStateAction, useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  ShieldAlert,
  Mail,
  MapPin,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { StaffSkeleton } from "@/components/PageSkeleton";
import InviteStaffForm, { type InviteDepartmentOption, type InviteStaffFormValues } from "@/components/InviteStaffForm";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("");
}

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [locations, setLocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [form, setForm] = useState<InviteStaffFormValues>({ name: "", email: "", phoneNumber: "", role: "staff", staffType: "full time", locationId: "", department: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [resendingId, setResendingId] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState("");
  const [pendingSuspendMember, setPendingSuspendMember] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const staffTypes = ["part time", "full time", "contract"];
  const router = useRouter();

  async function loadData() {
    try {
      const [staffRes, meRes, locationsRes, departmentsRes] = await Promise.all([
        fetch("/api/staff"),
        fetch("/api/auth/me"),
        fetch("/api/locations"),
        fetch("/api/departments"),
      ]);

      const failedResponse = [staffRes, meRes, locationsRes, departmentsRes].find((response) => !response.ok);
      if (failedResponse) {
        const failure = await failedResponse.json();
        throw new Error(failure.error || "Unable to load staff data.");
      }

      const staffData = await staffRes.json();
      const meData = await meRes.json();
      const locationsData = await locationsRes.json();
      const departmentsData = await departmentsRes.json();

      const nextLocations = locationsData.locations || [];
      const nextDepartments = departmentsData.departments || [];
      const firstLocationId = nextLocations[0]?._id ? String(nextLocations[0]._id) : "";

      setStaff(staffData.staff || []);
      setMe(meData.user);
      setLocations(nextLocations);
      setDepartments(nextDepartments);
      setForm((current) => ({
        ...current,
        role: current.role || "staff",
        staffType: current.staffType || "full time",
        locationId: current.locationId || firstLocationId,
        department: current.department || nextDepartments.find((department) => !department.locationId || department.locationId === firstLocationId)?.name || "",
      }));

      if (!nextLocations.length) {
        setError("Create at least one location before inviting staff.");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load staff data. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        await loadData();
      } finally {
        if (!active) {
          return;
        }
      }
    }

    void fetchData();

    return () => {
      active = false;
    };
  }, []);

  async function handleCreateDepartment(name: string): Promise<InviteDepartmentOption | null> {
    const value = name.trim();
    if (!value) {
      setError("Department name is required.");
      return null;
    }

    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value, locationId: form.locationId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to create department.");
        return null;
      }

      const department: InviteDepartmentOption = data.department;
      setDepartments((current) => [...current, department].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((current) => ({ ...current, department: department.name }));
      setMessage(`Department "${department.name}" was created.`);
      return department;
    } catch {
      setError("Unable to create department. Check your connection and try again.");
      return null;
    }
  }

  async function handleCreateStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setCreating(true);

    const selectedLocationId = String(form.locationId || locations[0]?._id || "").trim();
    const selectedDepartment = String(form.department || "").trim();

    if (!form.name.trim() || !form.email.trim() || !form.role || !selectedLocationId || !selectedDepartment) {
      setError("Name, email, role, location, and department are required.");
      setCreating(false);
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      staffType: form.staffType || "full time",
      locationId: selectedLocationId,
      department: selectedDepartment,
      password: form.password.trim(),
    };

    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Unable to create account");
      setCreating(false);
      return;
    }

    setForm({ name: "", email: "", phoneNumber: "", role: "staff", staffType: "full time", locationId: locations[0]?._id || "", department: departments[0]?.name || "", password: "" });
    setIsInviteOpen(false);
    setMessage(`Staff invited successfully. Temporary password: ${data.user.temporaryPassword}`);
    setCreating(false);
    await loadData();
  }

  async function handleResendInvite(staffId: SetStateAction<string>) {
    setError("");
    setMessage("");
    setResendingId(staffId);

    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend-invite", staffId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Unable to resend invite");
      setResendingId("");
      return;
    }

    setMessage(`Invite resent successfully. New temporary password: ${data.user.temporaryPassword}`);
    setResendingId("");
    await loadData();
  }

  async function handleDeleteInvite(staffId: string) {
    setError("");
    setMessage("");

    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-invite", staffId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Unable to delete invite");
      return;
    }

    setPendingDeleteId("");
    setMessage(data.message || "Invite deleted successfully.");
    await loadData();
  }

  async function handleDeleteUser(member: { _id: SetStateAction<string>; }) {
    if (!member || deletingUserId) return;
    setError("");
    setMessage("");
    setDeletingUserId(member._id);

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-user", staffId: member._id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to delete this account.");
        return;
      }

      setStaff((current) => current.filter((staffMember) => String(staffMember._id) !== String(member._id)));
      setPendingDeleteUser(null);
      setMessage(data.message || "Staff account deleted.");
    } catch {
      setError("Unable to delete this account. Check your connection and try again.");
    } finally {
      setDeletingUserId("");
    }
  }

  async function handleToggleStaffStatus(staffId: string, nextState: boolean) {
    setError("");
    setMessage("");
    setUpdatingStatusId(staffId);

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-status", staffId, enable: nextState, reason: nextState ? "Account reactivated by admin" : "Account suspended by admin" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to update staff status");
        return false;
      }

      setStaff((current) => current.map((member) => (
        String(member._id) === String(staffId)
          ? { ...member, isActive: data.user.isActive }
          : member
      )));
      setMessage(nextState ? "Staff account reactivated." : "Staff account suspended.");
      return true;
    } catch {
      setError("Unable to update staff status. Check your connection and try again.");
      return false;
    } finally {
      setUpdatingStatusId("");
    }
  }

  async function confirmSuspendStaff() {
    if (!pendingSuspendMember) return;
    const success = await handleToggleStaffStatus(pendingSuspendMember._id, false);
    if (success) setPendingSuspendMember(null);
  }

  const visibleStaff = staff.filter((member) => member.role !== "admin" && String(member._id) !== String(me?._id));
  const filteredStaff = visibleStaff.filter((member) => {
    const searchText = search.trim().toLowerCase();
    const matchesSearch = !searchText || [member.name, member.email, member.department, member.staffType]
      .some((value) => String(value || "").toLowerCase().includes(searchText));
    const matchesFilter = filter === "all"
      || (filter === "on-shift" && member.shiftStatus === "on")
      || (filter === "suspended" && member.isActive === false)
      || (filter === "managers" && member.role === "manager");
    return matchesSearch && matchesFilter;
  });
  const managers = filteredStaff.filter((member) => member.role === "manager").sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const staffMembers = filteredStaff.filter((member) => member.role === "staff");
  const staffsType = [...new Set(staffMembers.map((member) => member.staffType || "__unassigned"))];
  const rosterGroups = [
    ...(managers.length ? [{ key: "managers", title: "Managers", members: managers }] : []),
    ...staffsType.map((type) => ({
      key: type,
      title: type === "__unassigned" ? "Unassigned" : type,
      members: staffMembers
        .filter((member) => type === "__unassigned" ? !member.staffType : member.staffType === type)
        .sort((a, b) => String(a.name).localeCompare(String(b.name))),
    })),
  ];
  const onShiftTotal = visibleStaff.filter((s) => s.shiftStatus === "on").length;
  const activeTotal = visibleStaff.filter((member) => member.isActive !== false).length;
  const suspendedTotal = visibleStaff.filter((member) => member.isActive === false).length;
  const isAdmin = me?.role === "admin";


  const options = [
  { id: "all", label: "All" },
  { id: "on-shift", label: "On shift" },
  { id: "suspended", label: "Suspended" },
  ...(isAdmin ? [{ id: "managers", label: "Managers" }] : []),
];

const activeIndex = options.findIndex((opt) => opt.id === filter);
const totalOptions = options.length;

  if (loading) {
    return <StaffSkeleton />;
  }

  return (
    <>
    <main className="h-screen overflow-y-scroll bg-slate-100  pb-10 text-slate-600   ">
      <div className="mx-auto w-full p-4">
        <header className="">
          <div className="">
            <div className="flex flex-col gap-6 md:flex-row md:items-end bg-white shadow-md p-4 rounded-xl justify-between">
              <div >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-500">People &amp; operations</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Staff directory</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-400">Manage your team, check availability, and view individual staff profiles.</p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => { setError(""); setIsInviteOpen(true); }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 cursor-pointer px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400"
                >
                  <UserRoundPlus className="h-4 w-4" />
                  Invite staff
                </button>
              )}
            </div>
          </div>
          <div className="grid py-4 grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Team members", value: visibleStaff.length, icon: Users, tone:"violet-500" },
              { label: "On shift", value: onShiftTotal, icon: Clock3, tone:"emerald-500" },
              { label: "Active accounts", value: activeTotal, icon: ShieldCheck, tone:"indigo-500" },
              { label: "Suspended", value: suspendedTotal, icon: UserRoundPlus, tone:"amber-500" },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="rounded-xl bg-white p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold tabular-nums">{value}</p>
                  <Icon className={`h-5 w-5 text-${tone}`}  />
                </div>
                <p className="mt-1 text-xs ">{label}</p>
              </div>
            ))}
          </div>
        </header>

        {isInviteOpen && isAdmin && (
          <InviteStaffForm
            form={form}
            setForm={setForm}
            onSubmit={handleCreateStaff}
            creating={creating}
            locations={locations}
            staffTypes={staffTypes}
            departments={departments}
            onCreateDepartment={handleCreateDepartment}
            error={error}
            onClose={() => setIsInviteOpen(false)}
          />
        )}

        {pendingDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-slate-900">Delete pending invite?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This permanently removes the invitation. The staff member will no longer be able to sign in with it.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setPendingDeleteId("")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={() => handleDeleteInvite(pendingDeleteId)} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white cursor-pointer hover:bg-rose-700">Delete invite</button>
              </div>
            </div>
          </div>
        )}

        {pendingDeleteUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
            <section role="alertdialog" aria-modal="true" aria-labelledby="delete-staff-title" className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><Trash2 className="h-6 w-6" /></div>
              <h2 id="delete-staff-title" className="mt-4 text-lg font-semibold text-slate-900">Delete {pendingDeleteUser.name}&apos;s account?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">This permanently removes their account and prevents them from signing in. Historical tasks, reports, and shifts will be retained.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={deletingUserId === pendingDeleteUser._id} onClick={() => setPendingDeleteUser(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="button" disabled={deletingUserId === pendingDeleteUser._id} onClick={() => void handleDeleteUser(pendingDeleteUser)} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white cursor-pointer hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60">
                  {deletingUserId === pendingDeleteUser._id ? "Deleting..." : "Delete account"}
                </button>
              </div>
            </section>
          </div>
        )}

        {pendingSuspendMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm" onMouseDown={(event) => {
            if (event.target === event.currentTarget && updatingStatusId !== pendingSuspendMember._id) setPendingSuspendMember(null);
          }}>
            <section role="alertdialog" aria-modal="true" aria-labelledby="suspend-staff-title" className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><ShieldAlert className="h-6 w-6" /></div>
              <h2 id="suspend-staff-title" className="mt-4 text-lg font-semibold text-slate-900">Suspend {pendingSuspendMember.name}?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">They will no longer be able to sign in until an administrator reactivates their account.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={updatingStatusId === pendingSuspendMember._id} onClick={() => setPendingSuspendMember(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="button" disabled={updatingStatusId === pendingSuspendMember._id} onClick={() => void confirmSuspendStaff()} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white cursor-pointer hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60">
                  {updatingStatusId === pendingSuspendMember._id ? "Suspending..." : "Confirm suspension"}
                </button>
              </div>
            </section>
          </div>
        )}

        {(message || error) && (
          <div role={error ? "alert" : "status"} className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {error ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            {error || message}
          </div>
        )}

        <section >
          <div className="flex flex-col rounded-xl shadow-md bg-white p-4 gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Your roster</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">People ({filteredStaff.length})</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row w-full">
              <label className="relative block w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, team..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none   focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
              </label>
              <div className="relative flex justify-between w-full items-center gap-1 rounded-xl p-1 px-2 bg-zinc-50">
                <div className="absolute top-1 bottom-1 left-0 bg-slate-100 rounded-lg shadow-sm  -all duration-300 ease-out"
                  style={{
                    width: `calc((100% - ${(totalOptions - 1) * 4}px) / ${totalOptions})`, 
                    transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 4}px))`,
                  }}/>
                  {options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFilter(option.id)}
                      className={`flex-1 rounded-lg cursor-pointer py-2 text-xs font-semibold relative z-10  -colors duration-300 ${
                        filter === option.id ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
        </section>
        <section className="space-y-4 bg-white p-4 mt-5 shadow-sm rounded-lg min-h-100">
        {rosterGroups.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <Users className="mx-auto h-9 w-9 text-slate-300" />
            <h2 className="mt-4 font-semibold text-slate-800">{visibleStaff.length ? "No matching team members" : "Your roster is empty"}</h2>
            <p className="mt-1 text-sm text-slate-500">{visibleStaff.length ? "Try adjusting your search or filter." : "Invite your first staff member to get started."}</p>
            {isAdmin && !visibleStaff.length && <button type="button" onClick={() => setIsInviteOpen(true)} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Invite staff</button>}
          </section>
        ) : (
          rosterGroups.map((group) => {
            const members = group.members;
            const onCount = members.filter((member) => member.shiftStatus === "on").length;
            const isManagerGroup = group.key === "managers";

            return (
              <section key={group.key} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">{group.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">{members.length} members · {onCount} on shift</p>
                  </div>
                  {isManagerGroup && <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">Leadership</span>}
                </div>
                <div className="space-y-2">
                  {members.map((member) => {
                    const isOn = member.shiftStatus === "on";
                    const setupPending = member.isSetupComplete === false;
                    const isManager = member.role === "manager";
                    const isActive = member.isActive !== false;

                    return (
                      <article key={member._id} onClick={()=> router.push(`/staff/${member._id}`)} className={`rounded-lg border shadow-md cursor-pointer bg-slate-100 px-3 py-3   hover:border-indigo-400 sm:px-4 ${isManager ? "border-violet-200/20" : "border-slate-200/10"}`}>
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${isManager ? "bg-violet-800 text-violet-400" : "bg-indigo-800 text-indigo-400"}`}>
                            {initials(member.name)}
                          </div>
                          <div className="min-w-fit">
                            <div className="">
                              <h3 className="truncate font-semibold text-slate-900">{member.name}</h3>
                            </div>
                            <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-500"><Mail className="h-3.5 w-3.5 shrink-0" />{member.email}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap min-w-fit items-center gap-x-4 gap-y-2 ">
                          <span className="text-xs text-slate-600">{member.department || "Department unassigned"}</span>
                          {member.staffType && <span className="text-xs capitalize text-slate-500">{member.staffType}</span>}
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{member.locationId ? "1 location" : "No location"}</span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isOn ? " text-emerald-500" : " text-slate-500"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isOn ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {isOn ? "On shift" : "Off shift"}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isActive ? "bg-emerald-50 text-emerald-400" : "bg-red-50 text-red-400"}`}>{isActive ? "Active" : "Suspended"}</span>
                          {setupPending && <div className="flex gap-4 items-center"> 
                            <div>
                            <span className="text-amber-100 rounded-md p-1 bg-amber-300 text-xs font-medium">Setup pending</span>
                            
                            </div>
                            {
                              isAdmin &&  <div className="flex gap-2 items-center ">
                                <button type="button" disabled={resendingId === member._id} onClick={() => handleResendInvite(member._id)} className="inline-flex items-center gap-1 text-slate-400 p-1 text-xs font-medium disabled:opacity-50">
                                  <RefreshCcw className="h-3.5 w-3.5 text-indigo-500" />{resendingId === member._id ? "sending..." : "resend invite"}
                                </button>
                                <button type="button" onClick={() => setPendingDeleteId(member._id)} className="inline-flex items-center gap-1 cursor-pointer p-1 text-xs font-medium text-slate-400 ">
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />delete invite
                                </button>
                              </div>
                            }
                          </div>}
                          {isOn && member.shiftSince && <span className="text-xs text-slate-400">{new Date(member.shiftSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                          {/* <button type="button" onClick={() => router.push(`/staff/${encodeURIComponent(member._id)}`)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-700   hover:bg-indigo-50">
                            Profile <ChevronRight className="h-4 w-4" />
                        </button> */}

                        {isAdmin && (
                          <>
                            {!setupPending && (
                              <button type="button" onClick={(event) => { event.stopPropagation(); setPendingDeleteUser(member); }} className="inline-flex items-center gap-1 rounded-lg border cursor-pointer border-red-400 bg-red-400  px-2 py-1 text-xs font-semibold text-red-100 hover:bg-red-300">
                                <Trash2 className="h-3.5 w-3.5" />Delete account
                              </button>
                            )}
                            <button type="button" disabled={updatingStatusId === member._id} onClick={() => isActive ? setPendingSuspendMember(member) : void handleToggleStaffStatus(member._id, true)} className={`rounded-lg border px-2 py-1 text-xs font-semibold cursor-pointer disabled:opacity-50 ${isActive ? "border-amber-400 bg-amber-400 text-amber-100 hover:bg-amber-300" : "border-emerald-400 bg-emerald-400 text-emerald-100 hover:bg-emerald-300"}`}>
                              {updatingStatusId === member._id ? "Updating..." : isActive ? "Suspend account" : "Reactivate account"}
                            </button>
                          </>
                        )}
                        </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
        </section>
      </div>
    </main>
    </>
  );
}
