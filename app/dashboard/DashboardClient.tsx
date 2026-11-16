"use client";


import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";

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

  

  return (
    <main className="min-h-screen bg-zinc-50  text-slate-600 ">
      <div className="mx-auto w-full space-y-6">
        {error && (
          <section role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-lg bg-rose-600 px-3 py-2 text-xs cursor-pointer font-semibold text-white hover:bg-rose-700">Try again</button>
          </section>
        )}

        {user.role === "manager" ? (
          <ManagerOverview/>
        ) : (
          <StaffDashboard />
        )}

        
      </div>
    </main>
  );
}
