"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { MapPin, Camera, Lock } from "lucide-react";
import TopBar from "@/components/TopBar";
import { StampBadge } from "@/components/Ticket";
import { TicketSkeleton } from "@/components/PageSkeleton";

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [job, setJob] = useState(null);
  const [me, setMe] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [jobRes, meRes] = await Promise.all([
        fetch(`/api/jobs/${params.id}`),
        fetch("/api/auth/me"),
      ]);
      const jobData = await jobRes.json();
      const meData = await meRes.json();
      setJob(jobData.job);
      setMe(meData.user);
    }
    load();
  }, [params.id]);

  const locked = me?.role === "staff" && me?.shiftStatus !== "on";

  async function markDone() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/jobs/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setJob(data.job);
  }

  if (!job) {
    return <TicketSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <TopBar title={String(job._id).slice(-6).toUpperCase()} subtitle="Task details" onBack={() => router.back()} />
      <div className="mx-auto max-w-4xl px-5 pt-6">
        <div className="rounded-[28px] border border-slate-200 bg-white px-5 pb-6 pt-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="font-display text-[19px] font-semibold leading-snug text-[#22201A]">{job.title}</h2>
            <StampBadge status={job.status} />
          </div>
          <p className="font-mono text-[12px] flex items-center gap-1 mb-4 text-[#5C5642]">
            <MapPin size={12} /> {job.area || "—"}
          </p>

          {job.handoffNote && (
            <div className="mb-5 pl-3 border-l-2 border-paperLine">
              <p className="font-display text-[10px] uppercase tracking-wider mb-1 text-[#8A8368]">
                Handoff note
              </p>
              <p className="font-hand text-[18px] leading-tight text-[#3A3626]">&quot;{job.handoffNote}&quot;</p>
              <p className="font-mono text-[11px] mt-1 text-[#8A8368]">
                — {job.leftByUserId?.name || "previous shift"}
              </p>
            </div>
          )}

          {job.photoUrls?.length > 0 && (
            <div className="flex gap-2 mb-5">
              {job.photoUrls.map((_, i) => (
                <div key={i} className="w-16 h-16 flex items-center justify-center border border-paperLine bg-[#D9D2BC]">
                  <Camera size={18} color="#8A8368" />
                </div>
              ))}
            </div>
          )}

          {error && <p className="font-mono text-[11px] mb-3 text-rust">{error}</p>}

          {job.status === "closed" ? (
            <p className="font-mono text-[12px] text-[#5C5642]">This task is complete.</p>
          ) : locked ? (
            <div className="flex items-center gap-2 px-3 py-3 border-2 border-dashed" style={{ borderColor: "#B8AF92" }}>
              <Lock size={14} color="#8A8368" />
              <p className="font-mono text-[11px] text-[#7A7460]">
                You&apos;re off shift. Punch in from My Shift to add notes or mark this done.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button className="py-2.5 font-display text-[12px] font-semibold border border-[#22201A] text-[#22201A]">
                ADD NOTE
              </button>
              <button
                onClick={markDone}
                disabled={saving}
                className="py-2.5 font-display text-[12px] font-semibold bg-teal text-paper disabled:opacity-60"
              >
                {saving ? "SAVING…" : "MARK DONE"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
