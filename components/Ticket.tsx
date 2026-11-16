"use client";
import { MapPin, Camera, AlertTriangle, CheckCircle2, Circle, PlayCircle } from "lucide-react";

const STATUS_META = {
  open: { label: "OPEN", color: "#8B93A1", icon: Circle },
  pending: { label: "PENDING", color: "#E8A33D", icon: AlertTriangle },
  in_progress: { label: "IN PROGRESS", color: "#4C8577", icon: PlayCircle },
  closed: { label: "CLOSED", color: "#5B6470", icon: CheckCircle2 },
};

export function StampBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.open;
  const Icon = meta.icon;
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 border-2 rounded-sm select-none font-display text-[11px] font-semibold"
      style={{ borderColor: meta.color, color: meta.color, transform: "rotate(-6deg)", letterSpacing: "0.08em" }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {meta.label}
    </div>
  );
}

function TicketEdge() { 
  return (
    <div className="relative h-3 overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-paperLine" />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-1">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-ink" />
        ))}
      </div>
    </div>
  );
}

export default function Ticket({ job, onClick, rotate = 0 }) {
  return (
    <button onClick={onClick} className="text-left w-full" style={{ transform: `rotate(${rotate}deg)` }}>
      <div className="bg-paper shadow-md hover:shadow-lg  -shadow">
        <TicketEdge />
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="font-mono text-[11px] tracking-wider text-[#7A7460]">
              {String(job._id || job.id).slice(-6).toUpperCase()}
            </span>
            <StampBadge status={job.status} />
          </div>
          <div className="flex items-start gap-1.5 mb-1">
            <span className={`mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full ${job.priority === "high" ? "bg-rust" : job.priority === "low" ? "bg-[#5B6470]" : "bg-[#E8A33D]"}`} aria-label={`${job.priority === "routine" ? "Medium" : job.priority || "Medium"} priority`} />
            <h3 className="font-display text-[15px] font-medium leading-snug text-[#22201A]">
              {job.title}
            </h3>
          </div>
          <p className="font-mono text-[12px] mb-2 flex items-center gap-1 text-[#5C5642]">
            <MapPin size={11} /> {job.area || "—"}
          </p>
          {job.handoffNote && (
            <div className="mt-2 pl-2 border-l-2 border-paperLine">
              <p className="font-hand text-[15px] leading-tight text-[#3A3626]">"{job.handoffNote}"</p>
              <p className="font-mono text-[10px] mt-0.5 text-[#8A8368]">
                — {job.leftByUserId?.name || "previous shift"}
              </p>
            </div>
          )}
          {job.photoUrls?.length > 0 && (
            <div className="mt-2 flex items-center gap-1 font-mono text-[11px] text-[#7A7460]">
              <Camera size={11} /> {job.photoUrls.length} photo{job.photoUrls.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
