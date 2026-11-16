"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {fetchStaffs} from '@/lib/staffService'
import {fetchDepartments} from "@/lib/departmentService"
import {fetchReports} from "@/lib/reportService"
import {fetchJobs} from "@/lib/jobService"
import {
  Circle,
  Users,
  CalendarCheck2,
  ArrowUpRight,
  ClipboardCheck,
  UserGroup,
  BriefcaseBusiness,
  LoaderCircle
} from "lucide-react";
import { ManagerSkeleton } from "@/components/PageSkeleton";

type DashboardTask = {
  _id: string;
  title: string;
  area?: string;
  status: string;
  priority: string;
  departmentId?: string;
  staffType?: string;
  locationId: string;
};

async function fetchAll(){
  const {departments, staffs, tasks, reports} = await Promise.all([
    fetchDepartments(),
    fetchStaffs(),
    fetchJobs(),
    fetchReports()
  ])

  return {departments, staffs, tasks, reports}
}

export default function ManagerOverview() {
  const router = useRouter();
  
  const [departments, setDepartments] = useState([]);
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [departmentError, setDepartmentError] = useState("");
  const [staffs, setStaffs] = useState([])
  const [reports,setReports] = useState([])
  const [loading , setLoading] = useState(false)
  const [locations, setLocations] = useState([])

  useEffect(() => {
    let active = true;
    setLoading(true)
    async function loadDepartments() {
      try {
        const [response, tasksResponse,staffResponse,reportRes,locRes] = await Promise.all([
          fetch("/api/departments", { cache: "no-store" }),
          fetch("/api/jobs?status=open,pending,in_progress", { cache: "no-store" }),
          fetch("api/staff"),
          fetch("api/reports"),
          fetch("api/locations")
        ]);
        const [data, tasksData,staffData,reportData,locData] = await Promise.all([response.json(), tasksResponse.json(),staffResponse.json(),reportRes.json(),locRes.json()]);
        if (!response.ok || !tasksResponse.ok || !staffResponse.ok || !locRes.ok) throw new Error(data.error || tasksData.error || "Unable to load department tasks.");
        if (active) {
          setDepartments(Array.isArray(data.departments) ? data.departments : []);
          setTasks(Array.isArray(tasksData.jobs) ? tasksData.jobs : []);
          setStaffs(Array.isArray(staffData.staff) ? staffData.staff : []);
          setReports(Array.isArray(reportData) ? reportData : []);
          setLocations(Array.isArray(locData.locations) ? locData.locations : []);
          
        }
      } catch (loadError) {
        if (active) setDepartmentError(loadError instanceof Error ? loadError.message : "Unable to load departments.");
      }finally{
        setLoading(false)
      }
    }
    void loadDepartments();
    return () => { active = false; };
  }, []);
  
const stats = [
    {
      label: "Total staffs",
      value: String(staffs.length || 0),
      change: "+2 this week",
      icon: UserGroup,
      tone: "from-indigo-500/50 to-violet-500/50",
    },
    {
      label: "Staffs on shift",
      value: staffs.filter(member => member.shiftStatus === 'on').length || 0,
      change: "+9 new hires",
      icon: Users,
      tone: "from-emerald-500/50 to-teal-500/50",
    },
    {
      label: "Pending tasks",
      value: String(tasks.length || 0),
      change: `${tasks.length} require review`,
      icon: BriefcaseBusiness,
      tone: "from-cyan-500/50 to-blue-500/50",
    },
    {
      label: "Routine checks",
      value: "96%",
      change: "On target",
      icon: LoaderCircle,
      tone: "from-amber-500/50 to-orange-500/50",
    },
  ];

  

   function initials(name:String) {
  return name.split(" ").map((n) => n[0]).join("");
}

  if (loading) {
    return <ManagerSkeleton />;
  }

  const activity = [
    { name: "Nina Lewis", action: "submitted maintenance report", time: "12 mins ago" },
    { name: "Operations team", action: "shift handoff updated", time: "36 mins ago" },
    { name: "A. Bassey", action: "cleared high-priority ticket", time: "1 hour ago" },
  ];


  return (
    <main className="h-screen overflow-y-scroll bg-slate-100 pb-20 md:px-8 text-slate-600">
      <div className="h-full w-full ">
        <header className="overflow-hidden space-y-4 p-4">
          <div className="flex flex-col gap-6 p-4 bg-white rounded-xl shadow-md sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-500">Facility Manager</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Dashboard</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-400">Manage your team, check availability, and view individual staff profiles.</p>
            </div>
          </div>
          <section className="grid gap-4 grid-cols-2  xl:grid-cols-4">
          {stats.map(({ label, value, change, icon: Icon, tone }) => (
            <div key={label} className="rounded-xl   bg-white p-4 shadow-md ">
              <div className="flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br ${tone}`}>
                  <Icon className="h-5 w-5 " />
                </div>
                <span className="text-xs text-emerald-300">{change}</span>
              </div>

              <div className="mt-6">
                <div className="text-3xl font-bold ">{value}</div>
                <div className="mt-1 text-sm text-slate-400">{label}</div>
              </div>
            </div>
          ))}
        </section>
          
        </header>
        <section className="xl:grid flex flex-col-reverse px-4 gap-4 xl:grid-cols-[1.2fr_0.8fr] ">
          <div className=" max-h-130 overflow-hidden rounded-xl bg-white p-4 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Pending Tasks</h2>
              </div>
              <button onClick={()=> router.push('/jobs')} className="rounded-full px-3 py-1 text-xs font-bold hover:border-zinc-50/50 bg-zinc-100 hover:border   duration-150 cursor-pointer text-indigo-500">View all</button>
            </div>

            <div className="font-bold h-full">
              <div className="grid grid-cols-6 text-sm gap-3 items-center">
                <p className="col-span-3">Tasks/Location</p> 
                <p className="col-span-1 text-center">Department</p> 
                <p className="col-span-1 text-center">Priority</p> 
                <p className="col-span-1 text-center">Status</p> 
                
              </div>
              <div className=' w-full text-sm space-y-4 overflow-y-scroll h-[calc(100%-70px)]'>
              {tasks.map((task) => {
                const department = departments.find((item) => String(item._id) === String(task.departmentId))
                  || departments.find((item) => item.name?.toLowerCase() === String(task.staffType || "").toLowerCase() && String(item.locationId) === String(task.locationId));
                return <button onClick={()=> router.push(`/tickets/${encodeURIComponent(task._id)}`)} key={task._id} className="my-2 rounded-lg bg-zinc-100 cursor-pointer  hover:bg-zinc-200 duration-150   w-full py-2 px-3">
                  <div className="grid grid-cols-6 w-full items-center gap-3">
                    <div className="col-span-3 flex items-center text-left gap-3">
                      <Circle className="h-5 w-5" />
                      <div>
                      <div className="line-clamp-1">{task.title}</div>
                      <div className=" text-slate-400 text-xs">{department?.locationName || "Location"}</div>
                      </div>
                    </div>
                    <div className="col-span-1 line-clamp-1">{department?.name || task.staffType || "Department"}</div>
                    <div className={`rounded-md col-span-1 px-2.5 py-1 text-xs ${task.priority === 'high'?'bg-red-300 text-red-700':task.priority === 'medium' || task.priority === 'routine'?'text-amber-700 bg-amber-300':'text-green-700 bg-green-300'}`}>{task.priority === "routine" ? "Medium" : task.priority === "high" ? "High" : task.priority === "low" ? "Low" : "Medium"}</div>
                    <div className={`rounded-md cols-span-1 px-2.5 py-1 text-xs ${task.status === 'pending'?'bg-amber-300 text-amber-700': task.status === 'in_progress' ? 'text-blue-700 bg-blue-300' : 'text-cyan-700 bg-cyan-300'}`}>
                  {task.status.replaceAll("_", " ")}
                  </div>
                  </div>
                </button>;
              })}
              </div>
            </div>
          </div>

          <div className="overflow-hidden max-h-130 bg-white p-4 rounded-xl shadow-md ">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold ">Department Overview</h2>
                <button onClick={() => router.push('/departments')} className="rounded-full px-3 py-1 text-xs font-bold hover:border-zinc-50/50 bg-zinc-100 hover:border   duration-150 cursor-pointer text-indigo-500">
                    View all
                </button>
              </div>
              <div className="w-full mt-4 h-full font-bold">
                <div className="grid grid-cols-5 gap-2 items-center mt-2 w-full text-sm">
                  <p className="col-span-2">Departments</p>
                  <p className="col-span-1">On shift/Total</p>
                  <p className="col-span-2 text-center">Routine task</p>
                </div>
                {departmentError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{departmentError}</p>}
                {departments.length === 0 && !departmentError && <p className="rounded-xl bg-zinc-50 px-3 py-5 text-center text-xs text-slate-500">No departments found for your locations.</p>}
                <div className="overflow-y-scroll h-[calc(100%-70px)] w-full space-y-4">
                  {
                    departments.map((dep)=>(
                      <button onClick={()=>router.push(`/departments/${encodeURIComponent(dep._id)}`)} key={dep._id} className="grid hover:border-indigo-400 cursor-pointer my-2 bg-zinc-100 rounded-lg w-full grid-cols-5 items-center py-2 px-3">
                        <div className="flex items-center gap-2 col-span-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Circle className="h-4 w-4" /></div>
                          <span className="truncate text-left">{dep.name}</span>
                        </div>
                        <p className="col-span-1">{`${dep.onShiftCount}/${dep.staffCount}`}</p>
                        <div className="h-2.5 overflow-hidden rounded-full bg-zinc-300 w-full col-span-2">
                      <div className={`h-full rounded-full ${dep.routineCompletion === null ? 'bg-slate-300' : dep.routineCompletion >=80 ? 'bg-green-600': dep.routineCompletion >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${dep.routineCompletion || 0}%` }} />
                    </div>
                        {/* <span className="col-span-5 mt-1 text-right text-[10px] text-slate-400">{dep.routineCompletion === null ? "No routines yet" : `${dep.routineCompletion}% complete today`} · {dep.locationName}</span> */}
                      </button>
                    ))
                  }
                </div>
              </div>
          </div>

        </section>
        <section className="p-4">
        <div className=" bg-white shadow-md rounded-xl p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Daily routine reviews</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Staff submissions</h2>
            </div>
            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
          </div>
          {departments.some((department) => department.routineSubmissions?.length) ? (
            <div className="grid gap-3 md:grid-cols-2">
              {departments.flatMap((department) => (department.routineSubmissions || []).map((submission) => (
                <div key={submission._id} className="rounded-lg bg-slate-100 p-4   hover:bg-emerald-50/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{submission.routineName}</p>
                      <p className="mt-1 text-xs text-slate-500">{department.name} · {department.locationName}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{submission.completedTaskCount}/{submission.totalTaskCount}</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-600">Submitted by {submission.submittedByUserId?.name || "Staff member"} · {new Date(submission.submittedAt).toLocaleString()}</p>
                  {submission.issueReports?.length > 0 && <div className="mt-3 space-y-1.5 border-t border-amber-200 pt-2">{submission.issueReports.map((issue) => <p key={issue.taskId} className="text-xs text-amber-900"><strong>{issue.taskTitle}:</strong> {issue.issueReport}</p>)}</div>}
                  <button type="button" onClick={() => router.push(`/departments/${encodeURIComponent(department._id)}`)} className="mt-3 text-xs font-semibold text-indigo-700 hover:text-indigo-900">Review department routine →</button>
                </div>
              )))}
            </div>
          ) : <p className="rounded-lg bg-slate-100 p-4 text-center text-sm text-slate-500">No routines have been submitted today.</p>}
        </div>
        </section>
        <section className="grid gap-4 grid-cols-1 px-4 lg:grid-cols-2 lg:grid-rows-2 xl:grid-cols-[1.2fr_1fr_1fr]">
          <div className="rounded-lg w-full min-h-80 shadow-lg bg-white p-4 ">
            <div className="h-full">
              <div>
                <h2 className="mt-2 text-2xl font-semibold">Staff on shift</h2>
              </div>
              
              <div className="min-h-[calc(100%-50px)] mt-4 space-y-3 overflow-y-scroll">
                {staffs.filter(st => st.shiftStatus === "on").map((s) => {
                  const isManager = s.role === "manager";
                  return <article key={s._id} onClick={() => router.push(`/staff/${s._id}`)} className={`rounded-lg cursor-pointer bg-slate-100 px-3 py-3   hover:border hover:border-indigo-400 sm:px-4 `}>
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className={`flex h-12 w-12 uppercase shrink-0 items-center justify-center rounded-lg text-sm shadow-sm font-bold ${isManager ? "bg-violet-50 text-vi0let-700" : "bg-indigo-50 text-indigo-700"}`}>
                            {initials(s.name)}
                          </div>
                          <div className="min-w-fit">
                            <div className="space-y-0">
                              <h3 className="truncate font-semibold text-slate-900">{s.name}</h3>
                              <span className="text-xs text-slate-600 capitalize">{s.department === 'Manager' ? "Facility Manager" : s.department || "Department unassigned"}</span>
                            </div>
                          </div>
                        </div>
                        </div>
                    </article>;
                  })}
              </div>
            </div>
          </div>

          <div className="rounded-lg  w-full  bg-white p-4  shadow-lg">
            <div className="mb-4">
              <h2 className="mt-2 text-2xl font-semibold">Recent Reports</h2>
            </div>

            <div className="space-y-4 h-[calc(100%-55px)] oveflow-y-scroll">
              { reports.length > 0 ? (reports.map((report, index) => (
                <div key={index} className="rounded-lg border border-zinc-50/10 bg-zinc-100 p-4">
                  <div className="flex items-center gap-2">
                    <div className="font-medium flex items-center justify-center w-8 h-8">
                      <Circle className="w-5 h-5" />
                    </div>
                    <div className="w-full flex justify-between items-center">
                      <div>
                        <p>{report.department }</p>
                        <p>{report.task}</p>
                        <p className="text-xs text-slate-400">{report.time}</p>
                      </div>
                      <p className={`${report.priority === "High" ? "bg-red-500/10 text-red-500" : report.priority === "Medium" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"} p- px-2 rounded-md`}>{report.priority }</p>
                    </div>
                  </div>
                </div>
              ))):(<p className="w-full p-4 rounded-lg text-center bg-slate-100 text-slate-600 text-xs">There are currently no report yet</p>)}
            </div>
          </div>
              {/* Manager Route */}
          <div className="rounded-lg w-full bg-white p-4 shadow-lg ">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="mt-2 text-2xl font-semibold ">Quick Links</h2>
              </div>
              <CalendarCheck2 className="h-5 w-5 text-indigo-400" />
            </div>

            <div className="mt-5 space-y-4">
              {[
                { label: "Create new department", href: "/location" },
                { label: "Check unresolved tasks", href: "/jobs" },
                { label: "Authorize overtime requests", href: "/report" },
                { label: "Prepare your report", href: "/report" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className="flex w-full items-center cursor-pointer justify-between rounded-lg bg-slate-100 p-4 text-left text-sm hover:border hover:border-indigo-400"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="h-4 w-4 text-indigo-400" />
                </button>
              ))}
            </div>
          </div> 
        </section>
      </div>
    </main>
  );
}
