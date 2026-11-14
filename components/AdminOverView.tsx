import React,{useState, useEffect} from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp,Gauge,CheckCircle2, 
    CalendarDays,Building2,ArrowUpRight,
    Wrench,Users,FolderKanban,BriefcaseBusiness,
    Mail,MapPin
 } from 'lucide-react'
import Link from 'next/link'
import { DashboardSkeleton } from './PageSkeleton'

function AdminOverView({quickActions, tasks,activity,stats}) {
   const [error, setError] = useState('')
   const [loading, setLoading] = useState(false)
   const [locations,setLocations] = useState([])
   const [jobs,setJobs] = useState([])
   const [staff, setStaff] = useState([])

   const router = useRouter()

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

  function initials(name:String) {
  return name.split(" ").map((n) => n[0]).join("");
}

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-0 md:px-4 space-y-5 py-6">
    <header className="overflow-hidden p-4">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-500">Admin</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Dashboard</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-300">Manage your team, check availability, and view individual staff profiles.</p>
            </div>
            
          </div>
          <section className="grid gap-4 sm:grid-cols-2 mt-4 grid-cols-1 xl:grid-cols-4">
          {stats.map(({ label, value, change, icon: Icon, tone }) => (
            <div key={label} className="rounded-xl bg-slate-100 p-4 shadow-lg ">
              <div className="flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br ${tone}`}>
                  <Icon className="h-5 w-5 " />
                </div>
                <span className="text-xs text-emerald-400">{change}</span>
              </div>

              <div className="mt-6">
                <div className="text-3xl font-bold">{value}</div>
                <div className="mt-1 text-sm text-slate-400">{label}</div>
              </div>
            </div>
          ))}
        </section>
          
      </header>
    
    <section className="grid gap-6 p-4 xl:grid-cols-[1.5fr_1fr]">
    <div className="rounded-xl  bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Performance</p>
                <h2 className="mt-2 text-2xl font-semibold">Facility health</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs text-slate-400">
                <TrendingUp className="h-3.5 w-3.5" />
                +12.4%
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-white shadow-sm border border-zinc-50/10 p-4">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Occupancy</span>
                  <Gauge className="h-4 w-4 text-indigo-400"/>
                </div>
                <div className="mt-5 text-4xl font-bold ">82%</div>
                <div className="mt-2 text-xs text-slate-400">Across 6 active sites</div>
              </div>

              <div className="rounded-xl bg-white shadow-sm border border-zinc-50/10 p-4">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Resolved tasks</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-5 text-4xl font-bold ">186</div>
                <div className="mt-2 text-xs text-slate-400">This month</div>
              </div>

              <div className="rounded-xl bg-white shadow-sm border border-zinc-50/10 p-4">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Shift coverage</span>
                  <CalendarDays className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="mt-5 text-4xl font-bold">94%</div>
                <div className="mt-2 text-xs text-slate-400">Ahead of forecast </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl  bg-white p-5 shadow-lg ">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">Quick actions</p>
                <h2 className="mt-2 text-2xl font-semibold">Admin tools</h2>
              </div>
              <Building2 className="h-5 w-5 text-indigo-400" />
            </div>

            <div className="mt-5 space-y-3">
              {quickActions.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex w-full items-center justify-between rounded-xl cursor-pointer bg-slate-100 px-4 py-3 text-left text-sm text-slate-400 hover:border  hover:border-indigo-400/40"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="h-4 w-4 text-indigo-300" />
                </Link>
              ))}
            </div>
          </div>
          </section>

          <section className="grid gap-6 p-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl  bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Operations</p>
                <h2 className="mt-2 text-2xl font-semibold">Priority tasks</h2>
              </div>
              <button className="rounded-full border border-zinc-100 cursor-pointer hover:border-indigo-400/50 px-3 py-1 text-xs text-slate-400">View all</button>
            </div>

            <div className="space-y-3">
              {staff.filter(st => st.role !== 'admin').map((s) =>{ 

                const isOn = s.shiftStatus === "on";
                    const setupPending = s.isSetupComplete === false;
                    const isManager = s.role === "manager";
                    const isActive = s.isActive !== false;
                return(
                 <article key={s._id} onClick={()=> router.push(`/staff/${s._id}`)} className={`rounded-xl hover:border cursor-pointer bg-slate-100 px-3 py-3 hover:border-indigo-500/40 sm:px-4`}>
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${isManager ? "bg-violet-100 text-violet-700" : "bg-indigo-50 text-indigo-700"}`}>
                            {initials(s.name)}
                          </div>
                          <div className="min-w-fit">
                            <div className="">
                              <h3 className="truncate font-semibold text-slate-900">{s.name}</h3>
                            </div>
                            <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-500"><Mail className="h-3.5 w-3.5 shrink-0" />{s.email}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap min-w-fit items-center gap-x-4 gap-y-2 ">
                          <span className="text-xs text-slate-600 capitalize">{s.department === 'Manager' ? "Facility Manager" : s.department || "Department unassigned"}</span>
                          {s.staffType && <span className="text-xs capitalize text-slate-500">{s.staffType}</span>}
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{s.locationId ? "1 location" : "Admin"}</span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isOn ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isOn ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {isOn ? "On shift" : "Off shift"}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{isActive ? "Active" : "Suspended"}</span>
                          {setupPending && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Setup pending</span>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">

                        </div>
                        </div>
                      </article>
              )})}
            </div>
          </div>

          <div className="rounded-xl  bg-white p-5 shadow-lg">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Live feed</p>
              <h2 className="mt-2 text-2xl font-semibold">Recent activity</h2>
            </div>

            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.name + item.time} className="flex items-start gap-3 rounded-xl border border-zinc-100/60  p-3">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-indigo-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium ">{item.name}</div>
                    <div className="text-sm text-slate-400">{item.action}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 p-4 lg:grid-cols-2">
          <div className="rounded-xl  bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Coverage</p>
                <h2 className="mt-2 text-2xl font-semibold ">Location overview</h2>
              </div>
              <FolderKanban className="h-5 w-5 text-indigo-400" />
            </div>

            <div className="space-y-3">
              {(loading ? Array.from({ length: 3 }) : locations.slice(0, 4)).map((location, index) => (
                <div onClick={()=> router.push(`location/${location._id}`)} key={location?._id || index} className="flex items-center justify-between rounded-xl cursor-pointer bg-slate-100 hover:border hover:border-indigo-400/40 p-3">
                  <div>
                    <div className="font-medium">{location?.name || "Loading location..."}</div>
                    <div className="text-sm text-slate-400">{`${staff.filter(st => st.locationId === location._id).length || 0} staff members`}</div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">Active</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl  bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Workload</p>
                <h2 className="mt-2 text-2xl font-semibold ">Task distribution</h2>
              </div>
              <BriefcaseBusiness className="h-5 w-5 text-violet-300" />
            </div>

            <div className="space-y-4">
              {[
                { label: "Maintenance", value: 68, color: "bg-indigo-500" },
                { label: "Staffing", value: 54, color: "bg-cyan-500" },
                { label: "Cleaning", value: 81, color: "bg-emerald-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-zinc-300">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        </main>
  )
}

export default AdminOverView
