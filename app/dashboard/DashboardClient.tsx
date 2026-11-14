"use client";


import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  MapPin,
  ShieldCheck,
  Users,
  UserGroup,
  LoaderCircle
} from "lucide-react";
import { DashboardSkeleton } from "@/components/PageSkeleton";
import AdminOverView from '@/components/AdminOverView'
import ManagerOverview from '@/components/ManagerOverview'
import StaffDashboard from "@/components/StaffDashboard";

export default function DashboardClient({ user }) {
  const [locations, setLocations] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([])
  const [error, setError] = useState("");
  const onShiftStaff = staff.filter((member) => member.shiftStatus === 'on').length;

  useEffect(() => {
    async function load() {
      setError("");
      setLoading(true);
      try {
        const [locRes, jobsRes,staffRes] = await Promise.all([
          fetch("/api/locations"),
          fetch("/api/jobs?status=open,pending,in_progress"),
          fetch("/api/staff")
        ]);

        if (!locRes.ok || !jobsRes.ok || !staffRes.ok) {
          const failedResponse = !locRes.ok ? locRes : !jobsRes.ok ? jobsRes : staffRes;
          const failure = await failedResponse.json();
          throw new Error(failure.error || "Unable to load dashboard information.");
        }

        const locData = await locRes.json();
        const jobsData = await jobsRes.json();
        const staffData = await staffRes.json()

        setLocations(locData.locations || []);
        setJobs(jobsData.jobs || []);
        setStaff(staffData.staff || [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard information.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const role = user?.role || "admin";
  const stats = [
    {
      label: "Active locations",
      value: String(locations.length || 0),
      change: "+2 this week",
      icon: MapPin,
      tone: "from-indigo-500/50 to-violet-500/50",
    },
    {
      label: "Open tasks",
      value: String(jobs.length || 0),
      change: `${jobs.length} require review`,
      icon: BriefcaseBusiness,
      tone: "from-cyan-500/50 to-blue-500/50",
    },
    {
      label: "Team members",
      value: String(staff.length || 0),
      change: "+9 new hires",
      icon: Users,
      tone: "from-emerald-500/50 to-teal-500/50",
    },
    {
      label: "Compliance",
      value: "96%",
      change: "On target",
      icon: ShieldCheck,
      tone: "from-amber-500/50 to-orange-500/50",
    },
  ];

  
  const tasks = [
    { title: "Site inspection", location: "North Tower", status: "Due today", accent: "bg-emerald-500/15 text-emerald-400" },
    { title: "HVAC service check", location: "West Campus", status: "Pending", accent: "bg-amber-500/15 text-amber-400" },
    { title: "Guest room deep clean", location: "Harbor Suites", status: "In progress", accent: "bg-indigo-500/15 text-indigo-400" },
  ];

  const quickActions =
    role === "staff"
      ? [
          { label: "View my shift", href: "/shift" },
          { label: "Open staff roster", href: "/staff" },
          { label: "Send a report", href: "/report" },
          { label: "Message team", href: "/chat" },
        ]
      : role === "manager"
        ? [
            { label: "Team overview", href: "/manager" },
            { label: "Assign staffing plan", href: "/staff" },
            { label: "Review flagged issues", href: "/report" },
            { label: "Open chat", href: "/chat" },
          ]
        : [
            { label: "Create new location", href: "/manager" },
            { label: "Assign staffing plan", href: "/staff" },
            { label: "Review flagged issues", href: "/report" },
            { label: "Export weekly report", href: "/report" },
          ];

  const activity = [
    { name: "Aisha Okafor", action: "completed safety briefing", time: "8 mins ago" },
    { name: "Mason Hill", action: "updated maintenance queue", time: "21 mins ago" },
    { name: "Facility Ops", action: "published new roster", time: "1 hour ago" },
  ];

  return (
    <main className="min-h-screen bg-zinc-50  text-slate-600 ">
      <div className="mx-auto w-full space-y-6">
        {error && (
          <section role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-lg bg-rose-600 px-3 py-2 text-xs cursor-pointer font-semibold text-white hover:bg-rose-700">Try again</button>
          </section>
        )}

        {user.role === "admin" ? (
          <AdminOverView
            quickActions={quickActions}
            tasks={tasks}
            activity={activity}
            stats={stats}
          />
        ) : user.role === "manager" ? (
          <ManagerOverview/>
        ) : (
          <StaffDashboard />
        )}

        
      </div>
    </main>
  );
}
