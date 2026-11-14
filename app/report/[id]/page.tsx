"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  MessageSquareText,
  Send,
  UserRound,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

type Person = { _id?: string; name?: string; role?: string };
type Comment = {
  _id?: string;
  authorId?: Person | null;
  authorRole: string;
  text: string;
  createdAt?: string;
};
type ReportDetail = {
  _id: string;
  title: string;
  details?: string;
  type: string;
  status: string;
  sourceRole: string;
  recipientRole: string;
  createdAt: string;
  userId?: Person | null;
  targetUserId?: Person | null;
  locationId?: { name?: string; address?: string } | string;
  comments?: Comment[];
};
type CurrentUser = { _id?: string; role: string };

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

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        const [reportResponse, userResponse] = await Promise.all([
          fetch(`/api/reports/${encodeURIComponent(params.id)}`),
          fetch("/api/auth/me"),
        ]);
        const [reportData, userData] = await Promise.all([reportResponse.json(), userResponse.json()]);
        if (!reportResponse.ok || !userResponse.ok) {
          throw new Error(reportData.error || userData.error || "Unable to load this report.");
        }
        if (active) {
          setReport(reportData.report);
          setUser(userData.user);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load this report.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReport();
    return () => {
      active = false;
    };
  }, [params.id]);

  const canRespond = Boolean(
    report &&
    user &&
    (user.role === "admin" || user.role === "manager") &&
    report.recipientRole === user.role &&
    report.userId?._id !== user._id,
  );
  const locationName = typeof report?.locationId === "object" ? report.locationId?.name : undefined;

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const commentText = reply.trim();
    if (!commentText || !report) return;

    setError("");
    setNotice("");
    setSending(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", reportId: report._id, commentText, status: "reviewed" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to send your response.");
      }
      setReport(data.report);
      setReply("");
      setNotice("Your response has been added to the report.");
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "Unable to send your response.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-5 md:p-8" aria-busy="true" aria-label="Loading report">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="h-48 animate-pulse rounded-[28px] bg-white" />
          <div className="h-72 animate-pulse rounded-[28px] bg-white" />
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
        <section className="max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Report unavailable</h1>
          <p role="alert" className="mt-2 text-sm text-slate-600">{error || "This report could not be found."}</p>
          <button onClick={() => router.push("/report")} className="mt-6 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Back to reports</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 pb-24 text-slate-900 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <button type="button" onClick={() => router.push("/report")} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to reports
        </button>

        {(error || notice) && (
          <p role={error ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {error || notice}
          </p>
        )}

        <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className={`h-2 ${report.type === "incident" || report.type === "staff_issue" ? "bg-rose-500" : "bg-indigo-500"}`} />
          <div className="p-5 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">{report.type.replace("_", " ")}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(report.status)}`}>{report.status}</span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">To {report.recipientRole}</span>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{report.title}</h1>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4" />{report.userId?.name || "Unknown author"} <span className="capitalize">({report.sourceRole})</span></span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{formatDate(report.createdAt)}</span>
              {locationName && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{locationName}</span>}
            </div>
            {report.targetUserId?.name && (
              <p className="mt-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">Staff member concerned: <span className="font-semibold">{report.targetUserId.name}</span></p>
            )}
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"><FileText className="h-4 w-4" />Report details</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{report.details || "No additional details were provided."}</p>
            </div>
          </div>
        </article>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><MessageSquareText className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Conversation</p>
              <h2 className="text-xl font-semibold">Responses <span className="text-sm font-normal text-slate-400">({report.comments?.length || 0})</span></h2>
            </div>
          </div>

          {!report.comments?.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
              <MessageSquareText className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">No responses yet</p>
              <p className="mt-1 text-xs text-slate-500">Responses from the report recipient will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {report.comments.map((comment, index) => {
                const isRecipientReply = comment.authorRole === report.recipientRole;
                return (
                  <article key={comment._id || `${report._id}-${index}`} className={`max-w-[95%] rounded-2xl border p-4 sm:max-w-[85%] ${isRecipientReply ? "ml-auto border-indigo-100 bg-indigo-50/60" : "border-slate-100 bg-slate-50"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{comment.authorId?.name || comment.authorRole} <span className="ml-1 text-xs font-normal capitalize text-slate-400">· {comment.authorRole}</span></p>
                      <time className="text-xs text-slate-400">{formatDate(comment.createdAt)}</time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.text}</p>
                  </article>
                );
              })}
            </div>
          )}

          {canRespond ? (
            <form onSubmit={submitReply} className="mt-6 border-t border-slate-100 pt-5">
              <label htmlFor="report-reply" className="mb-2 block text-sm font-semibold text-slate-700">Write a response</label>
              <textarea id="report-reply" required maxLength={2000} rows={4} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Add a response or next steps..." className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">Your reply will be visible to the report author.</p>
                <button type="submit" disabled={sending || !reply.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Send className="h-4 w-4" />{sending ? "Sending..." : "Send response"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              This report is read-only for your account. Replies are available to the report recipient.
            </div>
          )}
        </section>
      </div>
      {user && <BottomNav role={user.role} />}
    </main>
  );
}
