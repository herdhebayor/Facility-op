"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { MapPin, Plus, Building2, Clock3, CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LocationUi({user}) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm ,setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: "",
    address: "",
    timezone: "Africa/Lagos",
  });
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const  locRes= await 
          fetch("/api/locations")
        const locationData = await locRes.json();
        setLocations(locationData.locations || []);
      } catch {
        setLocations([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);


  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Location name is required.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim(),
          timezone: form.timezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to save location.");
      }

      setLocations((prev) => [data.location, ...prev]);
      setForm({ name: "", address: "", timezone: "Africa/Lagos" });
      setSuccess("Location created successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to save location.");
    } finally {
      setSaving(false);
    }
  };

  const canManageLocations = user && ["admin", "manager"].includes(user.role || "");

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-600   ">
      <div className="mx-auto w-full space-y-4 ">
        <header className="rounded-xl  bg-white p-4 shadow-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-indigo-600">Operations</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Locations</h1>
            </div>

            <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <MapPin className="h-4 w-4" />
              {locations.length} active locations
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="h-80 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-80 animate-pulse rounded-xl bg-slate-200" />
          </div>
        ) : (
          <div className="">
            <section className="rounded-xl border border-zinc-50/10 bg-white p-4 w-full min-h-120 shadow-lg">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Coverage</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Company locations</h2>
                </div>
                <div className="flex flex-col items-center">
                    <button onClick={()=> setShowForm(true)} className="rounded-full m-auto cursor-pointer bg-emerald-100 p-2 hover:bg-emerald-200  text-emerald-600">
                    <Plus className="h-5 w-5" />
                    </button>
                    <p className="text-sm text-slate-400 text-center">
                        New location
                    </p>
                </div>
                
              </div>

              <div className="space-y-3">
                {locations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                    No locations added yet. Create the first location to attach staff to it.
                  </div>
                ) : (
                  locations.map((location) => (
                    <button key={location._id} onClick={()=> router.push(`/location/${location._id}`)} className="flex w-full hover:border-indigo-500 items-center cursor-pointer justify-between gap-4 rounded-2xl border shadow-sm border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 rounded-xl bg-indigo-100 p-2 text-indigo-600">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold w-fit text-slate-900">{location.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{location.address || "Address not set yet"}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Timezone</div>
                        <div className="mt-1 text-sm font-medium text-slate-700">{location.timezone || "Africa/Lagos"}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className={`${showForm ? 'block absolute' : 'hidden'} top-0 bottom-0 m-auto z-100 min-w-100 left-0 right-0 max-w-100 max-h-fit rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70`}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Admin</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create location</h2>
                </div>
                <button onClick={ ()=>setShowForm(false)} className="rounded-full cursor-pointer bg-zinc-100 hover:bg-zinc-200 p-2 text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!canManageLocations ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  Only admins and facility managers can create locations for this company.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">Location name</label>
                    <input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="North Tower"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none   focus:border-indigo-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="mb-2 block text-sm font-medium text-slate-700">Address</label>
                    <textarea
                      id="address"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      rows={4}
                      placeholder="12 Marina Road, Lagos"
                      className="w-full rounded-2xl border resize-none border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none   focus:border-indigo-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="timezone" className="mb-2 block text-sm font-medium text-slate-700">Timezone</label>
                    <div className="relative">
                      <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="timezone"
                        name="timezone"
                        value={form.timezone}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 outline-none   focus:border-indigo-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
                  ) : null}

                  {success ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      {success}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900 p-4 text-sm font-semibold text-white   hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    {saving ? "Creating..." : "Create location"}
                  </button>
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
