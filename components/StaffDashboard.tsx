"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, CheckCircle2,Circle,AlertTriangle,FileText,Wrench,CircleCheck, Clock3,MoveUpRight, MapPin, ShieldCheck, X } from "lucide-react";

import Link from "next/link";
import {DashboardSkeleton} from "@/components/PageSkeleton"

// Go back to fetching the user from the server, since we need to get the shiftStatus for the current user

type StaffRoutineDepartment = {
  _id: string;
  name: string;
  locationName: string;
  routineJobCount: number;
  completedRoutineJobCount: number;
  routineCompletion: number | null;
  staffCount:number;
};
type userType = {
  shiftStatus : string,
  _id: string,
  name: string,
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("");
}

export default function StaffDashboard() {
  const router = useRouter();
  const [team, setTeam] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [routineDepartment, setRoutineDepartment] = useState<StaffRoutineDepartment | null>(null);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [showStaffOnDuty,setShowSatffOnDuty] = useState(false)
  const [reports, setReports] = useState([])
  const [user, setUser] = useState<userType>(null)
  const [loading, setLoading] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [reportRes,teamRes, jobsRes, departmentsRes, userRes] = await Promise.all([
      fetch("/api/reports"),
      fetch("/api/staff"),
      fetch("/api/jobs?status=open,pending,in_progress"),
      fetch("/api/departments"),
      fetch("/api/auth/me")
    ]);
    const [reportData,teamData, jobsData, departmentsData,userData] = await Promise.all([
      reportRes.json(),
      teamRes.json(),
      jobsRes.json(),
      departmentsRes.json(),
      userRes.json()
    ]);
    const failedResponse = [reportRes, teamRes, jobsRes, departmentsRes,userRes].find((response) => !response.ok);
    if (failedResponse) {
      const failedData = !teamRes.ok ? teamData : !jobsRes.ok ? jobsData : departmentsData;
      throw new Error(failedData.error || "Unable to load your dashboard.");
    }
    setTeam(teamData.staff || []);
    setJobs(jobsData.jobs || []);
    setReports(Array.isArray(reportData.reports) ? reportData.reports : [])
    setRoutineDepartment(departmentsData.departments?.[0] || null);
    setUser(userData.user)
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your dashboard.");
    });
  }, []);

  if (!user) {
    if (error) {
      return (
        <main className="h-full fixed w-full bg-zinc-50 z-100 p-5 flex items-center justify-center text-slate-700">
          <section role="alert" className="max-w-xl rounded-2xl border border-rose-200/40 bg-white p-6 shadow-lg">
            <p className="text-sm text-rose-700">Connection error. check your internent and try again</p>
            <button type="button" onClick={() => { setError(""); void loadAll().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load your dashboard.")); }} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Try again
            </button>
          </section>
        </main>
      );
    }
  }

  async function toggleSelf() {
    if (!user) return;
    setToggling(true);
    setError("");
    try {
      const nextStatus = user.shiftStatus === "on" ? "off" : "on";
      const response = await fetch(`/api/staff/${encodeURIComponent(user._id)}/shift`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to update your shift.");
      }
      await loadAll();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update your shift.");
    } finally {
      setToggling(false);
    }
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

if(loading){
  return <DashboardSkeleton/>
}

  


  const onShiftStaff = team.filter((m) => m.shiftStatus === "on" || m.role === "manager");
  const remaininglength = onShiftStaff.length > 6 ? onShiftStaff.length - 6 : 0
  const onCount = onShiftStaff.length
  const isOff = user?.shiftStatus !== "on";
  const routineCompletion = routineDepartment?.routineCompletion;
  const routineProgress = typeof routineCompletion === "number"
    ? Math.min(100, Math.max(0, routineCompletion))
    : 0;
  const stats = [
    { label: "On shift", value: String(onCount), change: `${team.length} rostered`, icon: CheckCircle2, tone: "from-emerald-500 to-teal-500" },
    { label: "Open tasks", value: String(jobs.length), change: "Needs review", icon: BriefcaseBusiness, tone: "from-indigo-500 to-violet-500" },
    { label: "My shift", value: isOff ? "Off" : "On", change: isOff ? "Punch in" : "Active now", icon: Clock3, tone: "from-cyan-500 to-blue-500" },
    { label: "Team status", value: `${Math.max(0, 100 - (team.length - onCount) * 10)}%`, change: "Coverage good", icon: ShieldCheck, tone: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-100    pb-10 flex flex-col text-slate-600">
      <header className="">
          <div className="flex flex-col p-4 gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className=" text-3xl font-bold tracking-tight md:text-4xl">Staff Overview</h1>
            </div>
            <button
              type="button"
              disabled={toggling}
              onClick={toggleSelf}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold ${isOff ? "bg-emerald-500 text-white hover:bg-emerald-400" : "bg-slate-900 text-white hover:bg-slate-700"}`}
            >
              {toggling ? "Punching you in..." : isOff ? "Punch in" : "Punch out"}
            </button>
          </div>

          {user && error &&<div className=" p-4"> <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Could not complete your request, try again later</p></div>}
          
          <div className='grid grid-cols-2 px-4 items-center gap-4 md:gap-6 w-full'>
            <div className={`rounded-xl col-span-1 shadow-sm w-full min-h-full p-5 ${isOff ? "bg-linear-to-br from-amber-400/60 to-amber-400/50" : "bg-linear-to-br from-emerald-400/60 to-emerald-400/50"}`}>
              <div className="flex gap-4 items-center mb-4">
                <Clock3 className={`h-10 w-10 hidden md:block font-bold ${isOff ? "text-amber-600" : "text-emerald-600"}`}/>
                <div>
                    <p className="text-xs uppercase tracking-[0.25em] ">{user?.name}</p>
                    <p className={`text-xs uppercase font-bold tracking-[0.25em] ${isOff ? "text-amber-600" : "text-emerald-600"}`}>{isOff? "Off Shift" : "On Shift"}</p>
                </div>
              </div>
              {
                isOff ? <p className="text-xs text-slate-700">You're off, you will not be able to carry out any task in your department</p>
                : <p className="text-xs text-slate-700">You're on shift, you are to carry out every pending task in your department</p>
              }

              <div className="mt-3">
                <p className="text-xs text-slate-400 tracking-1.5 uppercase">Staffs on shift</p>
                <div className="flex items-center h-fit mt-1">
                  {onShiftStaff.slice(0,6).map((m, index) => {
                    return (
                      <div key={m._id} className="flex items-center justify-between mt-3">
                        <div className="flex items-center">
                          <div className={`flex h-12 w-12 p-3 items-center justify-start rounded-full text-sm font-semibold relative hover:z-10 duration-200 ease-in-out cursor-pointer text-emerald-400 bg-white shadow-xl shadow-slate-800/10  ${index >= 1 && '-ml-8'}`}>
                            {initials(m.name)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <h2 className='text-2xl font-bold text-slate-800'>
                    {remaininglength === 0 ? '' : `+ ${remaininglength} other(s)` }
                  </h2>
                </div>
              </div>
            </div>

            {/* Department */}
            <div className={`rounded-xl col-span-1 w-full h-full p-5 ${isOff ? "bg-amber-400/60" : "bg-emerald-400/60"}`}>
              
              <div className="flex items-start h-full gap-6">
                <div className="w-fit  hidden bg-emerald-500/30 p-2 rounded-full md:flex items-center justify-center">
                  <Wrench className="w-10 h-10 md:w-15 md:h-15 text-emerald-600"/>
                </div>
                <div className="flex flex-col h-full justify-between gap-2">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-600 capitalize">{routineDepartment?.name}</h3>
                  <p className='text-xs text-slate-7'>{`You and ${routineDepartment?.staffCount} others are in this department`}</p>
                  <Link href={`departments/${routineDepartment?._id}`} className="min-w-fit w-full mt-4 md:px-10 md:py-3 px-3 py-1.5 flex items-center rounded-lg md:rounded-2xl gap-4 justify-center text-emerald-500 bg-white shadow-sm hover:bg-white/90 cursor-pointer text-center">
                    View department <MoveUpRight className="md:w-5 md:h-5 h-4 w-4 font-bold"/>
                  </Link>
                </div>
              </div>
              
            </div>
          </div>
          <div className="grid gap-4 p-4 grid-cols-2 md:grid-cols-4  ">
          {stats.map(({ label, value, change, icon: Icon, tone }) => (
            <div key={label} className="rounded-xl bg-white p-4 shadow-lg">
              <div className="flex items-center gap-2 justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br ${tone}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs text-emerald-500 ">{change}</span>
              </div>

              <div className="mt-6">
                <div className="text-3xl font-bold">{value}</div>
                <div className="mt-1 text-sm text-indigo-500">{label}</div>
              </div>
            </div>
          ))}
        </div>
        </header>
        <section className=" px-4 flex md:flex-row flex-col-reverse justify-between gap-4 ">
          <div className='w-full p-4 shadow-md bg-white rounded-xl max-h-150 overflow-hidden md:w-[58%]'>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="mt-2 text-xl md:text-2xl font-semibold text-slate-800">Department task board</h2>
              </div>
              <button onClick={()=>router.push('/jobs')} className=" p-2 text-xs cursor-pointer outline-0 text-indigo-400 hover:text-indigo-500 ">View all tasks</button>
            </div>

            <div className="flex flex-col gap-4 p-2 max-h-[calc(100%-50px)] overflow-y-scroll">
              {jobs.map((job, i) => (
                <button title="View task" onClick={() => router.push(`/jobs/${job._id}`)} key={job._id} className="rounded-lg hover:border hover:border-indigo-500 cursor-pointer bg-zinc-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {job.status === "open" ?<Circle className="h-6 w-6 text-zinc-200 "/>:<CircleCheck className="w-6 h-6 text-emerald-500"/>}
                  </div>
                  <div className="grid grid-cols-[1.3fr_0.35fr_0.55fr] w-full items-center justify-between gap-4">
                    <div >
                      <h3 className="font-display text-[15px] font-medium text-left leading-snug text-slate-600">
                        {job.title}
                      </h3>
                      <span className="flex mt-1 text-xs items-center gap-0.5 text-slate-400"><MapPin className="w-4 h-4 text-emerald-400"/>{job.area}</span>
                    </div>
                    <p className={` p-1 rounded-xs text-xs capitalize text-center font-bold ${job.priority === 'high'? "text-red-400 " : job.priority === "medium" ? " text-amber-400" : " text-emerald-400"}`}>
                    {job.priority}</p>
                    <div className="text-xs">
                      {
                        job.status === "open" ? <span className="bg-emerald-500 text-white text-center outline-0 rounded-md p-2">
                          Completed
                        </span>:<span className="bg-zinc-200 text-slate-400  p-2">
                          Open
                        </span>
                      }
                    </div>
                  </div>
                  </button>
              ))}
            </div>
          </div>
           {routineDepartment && (
            <div  className=" bg-white p-4 shadow-md rounded-xl w-full md:w-[40%]">
              <div className="flex flex-col p-4 gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Today&apos;s routine </p>
                  <h2 className="mt-2 text-xl md:text-2xl font-semibold text-slate-900">Department checklist progress</h2>
                  <div className="mx-auto mt-3 w-full " role="progressbar" aria-label="Department checklist progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={routineProgress}>
                    <svg viewBox="0 0 200 130" className="block h-auto w-full" aria-hidden="true">
                      <path d="M 25 100 A 75 75 0 0 1 175 100" fill="none" stroke="#e2e8f0" strokeWidth="20" strokeLinecap="round"  />
                      <path
                        d="M 25 100 A 75 75 0 0 1 175 100"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="20"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray="100"
                        strokeDashoffset={100 - routineProgress}
                        className=" -[strokeDashOffset] duration-700 ease-out"
                      />
                      <text x="100" y="100" textAnchor="middle" className="fill-emerald-700 text-[27px] " dominantBaseline="middle">
                        {routineCompletion === null ? "—" : `${routineProgress}%`}
                      </text>
                    </svg>
                  </div>
                  {/* <p className="mt-2 text-xs text-slate-500">{routineDepartment.completedRoutineJobCount} of {routineDepartment.routineJobCount} checks complete · Resets at 6:00 a.m. · {routineDepartment.locationName}</p> */}
                </div>
                <button type="button" onClick={() => router.push("/routines")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 p-4 cursor-pointer text-sm font-semibold text-white   hover:bg-emerald-800"><CheckCircle2 className="h-4 w-4" />Open routine checks</button>
              </div>
            </div>
          )}
        </section>

      <div className=" p-4"> 
        <section className="grid gap-4 xl:grid-cols-[0.85fr_0.55fr_0.55fr]">
          <div className="min-h-50 p-4 bg-white shadow-md rounded-xl md:h-full max-h-110">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="mt-2 text-xl md:text-2xl font-semibold text-slate-800">My Reports</h2>
              </div>
              <button onClick={()=> router.push('/report')} className="rounded-full bg-slate-100 px-3 py-1 cursor-pointer text-xs font-medium text-emerald-600 hover:border hover:border-indigo-400/40   duration-200">view all</button>
            </div>
            <div className=" mt-3 h-[calc(100%-50px)] overflow-y-scroll space-y-4">
              { reports?.length > 0 ? (
              reports.map((report) => {
                return (
                  <article key={report._id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
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
                    </div>
              </article>)})):(
              <div className="h-full flex justify-center items-center">
                <p className="px-4 w-full text-center py-6 rounded-lg">You currently did not have any report yet</p>
              </div>)
              }
            </div>
          </div>
          <div className="p-4 bg-white shadow-md rounded-xl  h-full max-h-110 ">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Current team</p>
                <h2 className="mt-2 text-xl md:text-2xl font-semibold text-slate-800">Shift presence</h2>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">{onCount} active</span>
            </div>

            <div className="space-y-3 overflow-y-scroll h-[calc(100%-130px)] relative">
              {team.map((m) => {
                const isSelf = m._id === user._id;
                const isOn = m.shiftStatus === "on" || m.role === "manager";
                const isManager = m.role === "manager";
                if(!showStaffOnDuty && !isOn) return null;
                return (
                  <div key={m._id} className="flex items-center justify-between rounded-xl hover:border hover:border-indigo-400 cursor-pointer bg-zinc-100 p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${isOn ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-200 text-slate-500"}`}>
                        {initials(m.name)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">{m.name}{isSelf ? " (you)" : isManager ? " (Manager)" :""}</p>
                        <p className="text-xs text-slate-400">{isOn ? `On shift since ${new Date(m.shiftSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` || "always" : "Not on shift"}</p>
                      </div>
                    </div>

                    <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${isOn ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-200 text-slate-500"}`}>
                      {isOn ? "On": "Off"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="w-full left-0 bottom-0 mt-4  static bg-transparent z-10 flex items-center justify-center">
              
              <button onClick={()=> setShowSatffOnDuty(prev => !prev)} className="w-fit px-4 py-2 rounded-xl hover:text-indigo-700 hover:border hover:border-indigo-400 bg-transparent z-10 text-indigo-500 text-xs cursor-pointer text-center outline-0">
                {showStaffOnDuty ? 'Close' : "View all"}
              </button>
            </div>
          </div>

          <div className="p-4 bg-white shadow-md rounded-xl  ">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">Quick actions</p>
                <h2 className="mt-2 text-xl md:text-2xl font-semibold text-slate-800">My tools</h2>
              </div>
              <MapPin className="h-5 w-5 text-indigo-500" />
            </div>

            <div className="mt-5 space-y-3">
              {[
                { label: "View my shift", href: "/shift" },
                { label: "Review location", href: "/location" },
                { label: "Complete daily routine", href: "/routines" },
                { label: "Send a report", href: "/report" },
                { label: "Message team", href: "/chat" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className="flex w-full items-center justify-between rounded-xl hover:border hover:border-indigo-400/40 cursor-pointer px-4 py-3 bg-emerald-50 text-left text-sm text-slate-600 shadow-sm"
                >
                  <span>{item.label}</span>
                  <span className="text-indigo-400">→</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {isOff && (
          <div className="mt-6 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            You are currently off shift. You can still view the board, but you need to punch in before updating tasks.
          </div>
        )}

        
      </div>
      {
        <section className={`w-full max-w-120 h-screen p-4 shadow-xl bg-white fixed ease-in-out duration-300 z-1000 right-0 top-0 ${showStaffOnDuty ? "translate-x-0" : "translate-x-200"}`}>
          <header className="w-full flex justify-between items-center p-4">
            <h2 className="text-2xl uppercase text-slate-400 font-bold">
              Staffs on duty
            </h2>
            <button onClick={()=> setShowSatffOnDuty(false)} className="bg-slate-100 p-3 cursor-pointer rounded-full outline-0 text-slate-400">
              <X className="w-5 h-5"/>
            </button>

          </header>

          <div className="space-y-3 mt-15 overflow-y-scroll max-h-[calc(100%-130px)] min-h-[calc(100%-130px)] p-4">
              {team.map((m) => {
                const isSelf = m._id === user._id;
                const isOn = m.shiftStatus === "on" || m.role === "manager";
                const isManager = m.role === "manager";
                return (
                  <div key={m._id} className="flex items-center justify-between rounded-lg shadow-md bg-zinc-100 p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${isOn ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-200 text-slate-500"}`}>
                        {initials(m.name)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">{m.name}{isSelf ? " (you)" : isManager ? " (Manager)" :""}</p>
                        <p className="text-xs text-slate-400">{isOn ? `On shift since ${new Date(m.shiftSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` || "always" : "Not on shift"}</p>
                      </div>
                    </div>

                    <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${isOn ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-200 text-slate-500"}`}>
                      {isOn ? "On": "Off"}
                    </span>
                  </div>
                );
              })}
            </div>
        </section>
      }
    </div>
  );
}
