"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Inbox,
  MessageSquareText,
  Plus,
  Send,
} from "lucide-react";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

type LocationRecord = { _id: string; name: string };
type StaffRecord = { _id: string; name: string; role: string; locationId?: string };
type UserRecord = { _id?: string; name: string; role: string; locationId?: string };
type ReportComment = {
  _id?: string;
  text: string;
  authorRole: string;
  authorId?: { _id?: string; name?: string } | null;
  createdAt?: string;
};
type ReportRecord = {
  _id: string;
  title: string;
  details?: string;
  type: string;
  status: string;
  createdAt: string;
  sourceRole: string;
  recipientRole: string;
  locationId: string;
  userId?: { _id?: string; name?: string; role?: string } | null;
  targetUserId?: { _id?: string; name?: string } | null;
  comments?: ReportComment[];
};

function idOf(value: string | { _id?: string } | null | undefined) {
  return String(typeof value === "object" && value !== null ? value._id || "" : value || "");
}

function formatDate(value?: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusClass(status: string) {
  if (status === "resolved") return "bg-emerald-100 text-emerald-800";
  if (status === "reviewed") return "bg-blue-100 text-blue-800";
  return "bg-amber-100 text-amber-800";
}

export default function ReportPage() {
  const router = useRouter();
  const [me, setMe] = useState<UserRecord | null>(null);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [staffRoster, setStaffRoster] = useState<StaffRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [type, setType] = useState("routine");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "inbox" | "sent">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replyingId, setReplyingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const [meResponse, locationResponse, reportResponse] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/locations"),
          fetch("/api/reports"),
        ]);
        const [meData, locationData, reportData] = await Promise.all([
          meResponse.json(),
          locationResponse.json(),
          reportResponse.json(),
        ]);
        if (!meResponse.ok || !locationResponse.ok || !reportResponse.ok) {
          throw new Error(meData.error || locationData.error || reportData.error || "Unable to load reports.");
        }

        const user: UserRecord = meData.user;
        const allLocations: LocationRecord[] = Array.isArray(locationData.locations) ? locationData.locations : [];
        const assignedLocationId = String(user.locationId || "");
        const availableLocations = user.role === "admin"
          ? allLocations
          : allLocations.filter((location) => String(location._id) === assignedLocationId);

        if (!active) return;
        setMe(user);
        setLocations(availableLocations);
        setSelectedLocationId((current) => current || availableLocations[0]?._id || "");
        setReports(Array.isArray(reportData.reports) ? reportData.reports : []);

        if (user.role === "manager") {
          const staffResponse = await fetch("/api/staff");
          const staffData = await staffResponse.json();
          if (!staffResponse.ok) {
            throw new Error(staffData.error || "Unable to load the staff roster.");
          }
          if (active) setStaffRoster(Array.isArray(staffData.staff) ? staffData.staff : []);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPage();
    return () => {
      active = false;
    };
  }, []);

  const incomingReports = useMemo(
    () => reports.filter((report) => me?.role !== "staff" && report.recipientRole === me?.role && idOf(report.userId) !== String(me?._id || "")),
    [me, reports],
  );
  const sentReports = useMemo(
    () => reports.filter((report) => idOf(report.userId) === String(me?._id || "")),
    [me, reports],
  );
  const visibleReports = filter === "inbox" ? incomingReports : filter === "sent" ? sentReports : reports;
  const canReply = (report: ReportRecord) =>
    (me?.role === "admin" || me?.role === "manager") &&
    report.recipientRole === me.role &&
    idOf(report.userId) !== String(me?._id || "");
  const assignedStaff = staffRoster.filter((person) =>
    person.role === "staff" && String(person.locationId || "") === selectedLocationId,
  );
  const allowedTypes = me?.role === "manager"
    ? ["routine", "incident", "performance", "staff_issue"]
    : ["routine", "incident"];
  const audience = me?.role === "staff" ? "Your reports are sent to your manager" : me?.role === "manager" ? "Your reports are sent to an administrator" : "Review and respond to reports sent to you";

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedLocationId) {
      setError("Choose a location assigned to your account before sending a report.");
      return;
    }
    if (!title.trim()) {
      setError("Add a short summary before sending.");
      return;
    }
    if (me?.role === "manager" && type === "staff_issue" && !targetUserId) {
      setError("Select the staff member this report concerns.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          details: details.trim(),
          type,
          locationId: selectedLocationId,
          targetUserId: me?.role === "manager" && type === "staff_issue" ? targetUserId : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to send report.");
      }

      setReports((current) => [data.report, ...current]);
      setTitle("");
      setDetails("");
      setTargetUserId("");
      setNotice(`Report sent to ${me?.role === "staff" ? "your manager" : me?.role === "manager" ? "an administrator" : "the selected recipient"}.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send report.");
    } finally {
      setSaving(false);
    }
  }

  async function submitReply(reportId: string) {
    const commentText = (drafts[reportId] || "").trim();
    if (!commentText) return;
    setError("");
    setNotice("");
    setReplyingId(reportId);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", reportId, commentText, status: "reviewed" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to send your response.");
      }
      setReports((current) => current.map((report) => report._id === reportId ? data.report : report));
      setDrafts((current) => ({ ...current, [reportId]: "" }));
      setNotice("Your response was sent.");
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "Unable to send your response.");
    } finally {
      setReplyingId("");
    }
  }

  function clearAlert() {
    setError("");
    setNotice("");
  }
  useMemo(() => {
    if (error || notice) {
      const timer = setTimeout(clearAlert, 5000);
      return () => clearTimeout(timer);
    }}, [error, notice]);

  return (
    <div className="min-h-screen bg-zinc-50 py-3 text-slate-600">
      
      <main className="mx-auto w-full md:px-8 space-y-5">
        <section className="overflow-hidden md:rounded-xl bg-slate-200 p-4 mt-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-400">Facility operations</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Reports &amp; responses</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{audience}. Incoming reports and replies appear below.</p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/20 px-4 py-3">
                <p className="text-2xl font-bold">{incomingReports.length}</p>
                <p className="text-xs text-slate-400">In your inbox</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/20 px-4 py-3">
                <p className="text-2xl font-bold">{sentReports.length}</p>
                <p className="text-xs text-slate-400">Sent by you</p>
              </div>
            </div>
          </div>
        </section>

        {(error || notice) && (
          <div role={error ? "alert" : "status"} className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {error ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            {error || notice}
          </div>
        )}

        {!loading && me?.role !== "admin" && <section className="p-4 md:px-0 ">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Plus className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">New report</p>
              <h2 className="mt-1 text-xl font-semibold">Share an update or raise an issue</h2>
              <p className="mt-1 text-sm text-slate-500">{audience}.</p>
            </div>
          </div>
          {loading ? (
            <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <form onSubmit={submitReport} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="report-location" className="mb-1.5 block text-sm font-medium text-slate-700">Location</label>
                  <select id="report-location" required value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    <option value="">Choose a location</option>
                    {locations.map((location) => <option key={location._id} value={location._id}>{location.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Report type</label>
                  <div className="flex flex-wrap gap-2">
                    {allowedTypes.map((option) => (
                      <button type="button" key={option} onClick={() => setType(option)} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold capitalize transition ${type === option ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                        {option.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {me?.role === "manager" && type === "staff_issue" && (
                <div className="p-4">
                  <label htmlFor="report-target" className="mb-1.5 block text-sm font-medium text-slate-700">Staff member concerned</label>
                  <select id="report-target" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400">
                    <option value="">Choose a staff member</option>
                    {assignedStaff.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="report-title" className="mb-1.5 block text-sm font-medium text-slate-700">Summary</label>
                <input id="report-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A clear, short summary" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label htmlFor="report-details" className="mb-1.5 block text-sm font-medium text-slate-700">Details</label>
                <textarea id="report-details" rows={4} maxLength={5000} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Add context, actions taken, or any follow-up needed..." className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">This report will be routed to {me?.role === "staff" ? "your location manager" : "an administrator"}.</p>
                <button type="submit" disabled={saving || locations.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Send className="h-4 w-4" />{saving ? "Sending..." : "Send report"}
                </button>
              </div>
            </form>
          )}
        </section>}

        <section className="p-4 md:px-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Inbox className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Report activity</p>
                <h2 className="text-xl font-semibold">Inbox &amp; sent reports</h2>
              </div>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 shadow-md">
              {(["all", "inbox", "sent"] as const).map((option) => (
                <button type="button" key={option} onClick={() => setFilter(option)} className={`rounded-lg px-3 py-2 cursor-pointer text-xs font-semibold capitalize transition ${filter === option ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {option === "inbox" ? `Inbox${incomingReports.length ? ` · ${incomingReports.length}` : ""}` : option === "sent" ? "Sent" : "All"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="mt-5 space-y-3">{[0, 1].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : visibleReports.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-100 bg-slate-50 px-5 py-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">{filter === "inbox" ? "Your inbox is clear" : "No reports yet"}</p>
              <p className="mt-1 text-sm text-slate-500">{filter === "inbox" ? "Reports addressed to you will appear here." : "Reports you send or receive will appear here."}</p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {visibleReports.map((report) => {
                const incoming = canReply(report);
                return (
                  <article key={report._id} className="rounded-2xl bg-white shadow-md p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${report.type === "incident" || report.type === "staff_issue" ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"}`}>
                          {report.type === "incident" || report.type === "staff_issue" ? <AlertTriangle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => router.push(`/report/${encodeURIComponent(report._id)}`)} className="text-left font-semibold text-slate-900 hover:text-indigo-700 hover:underline">{report.title}</button>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${statusClass(report.status)}`}>{report.status}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {report.userId?.name || "Unknown"} · {report.type.replace("_", " ")} · {formatDate(report.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${incoming ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                        {incoming ? <Inbox className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                        {incoming ? "Needs your response" : `To ${report.recipientRole}`}
                      </span>
                    </div>
                    <button type="button" onClick={() => router.push(`/report/${encodeURIComponent(report._id)}`)} className="mt-3 text-xs cursor-pointer font-semibold text-indigo-600 hover:text-indigo-800">
                      Open report and conversation
                    </button>

                    {report.details && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{report.details}</p>}
                    {report.targetUserId?.name && <p className="mt-3 text-xs font-medium text-amber-700">Staff member: {report.targetUserId.name}</p>}

                    {(report.comments || []).length > 0 && (
                      <div className="mt-4 space-y-2 border-l-2 border-indigo-100 pl-3">
                        {(report.comments || []).map((comment, index) => (
                          <div key={comment._id || `${report._id}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-700">{comment.authorId?.name || comment.authorRole} <span className="font-normal capitalize text-slate-400">· {comment.authorRole}</span></p>
                              <time className="text-[10px] text-slate-400">{formatDate(comment.createdAt)}</time>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {incoming && (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={drafts[report._id] || ""}
                          onChange={(event) => setDrafts((current) => ({ ...current, [report._id]: event.target.value }))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              void submitReply(report._id);
                            }
                          }}
                          maxLength={2000}
                          aria-label={`Reply to ${report.title}`}
                          placeholder="Write a response..."
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                        <button type="button" disabled={replyingId === report._id || !(drafts[report._id] || "").trim()} onClick={() => void submitReply(report._id)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                          <MessageSquareText className="h-4 w-4" />{replyingId === report._id ? "Sending..." : "Reply"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
