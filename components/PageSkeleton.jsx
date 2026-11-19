function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-300/70 ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <main className="min-h-screen  px-4 py-5 bg-slate-100 md:px-6 xl:px-8">
      <div className="mx-auto w-full space-y-6">
        <header className="rounded-xl bg-white shadow-md backdrop-blur-sm p-4">
          <div className="flex gap-6 items-center w-full ">
            <div className="space-y-3 min-h-28 bg-emerald-400 w-full p-4    rounded-xl">
              <SkeletonBlock className="h-3 w-[calc(100%-60px)] max-w-28" />
              <SkeletonBlock className="h-10 w-[calc(100%-60px)] max-w-72" />
              <SkeletonBlock className="h-7 w-[calc(100%-60px)] max-w-72" />
            </div>
            <div className="space-y-3 min-h-28 bg-emerald-400 w-full p-4 md-px-8 rounded-xl">
              <SkeletonBlock className="h-3 w-[calc(100%-60px)] max-w-28" />
              <SkeletonBlock className="h-10 w-[calc(100%-60px)] max-w-72" />
              <SkeletonBlock className="h-7 w-[calc(100%-60px)] max-w-72" />
            </div>
            
          </div>
        </header>

        <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl  bg-white shadow-lg p-4">
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-11 w-11 rounded-2xl" />
                <SkeletonBlock className="h-4 w-12" />
              </div>
              <div className="mt-6 space-y-3">
                <SkeletonBlock className="h-8 w-16" />
                <SkeletonBlock className="h-4 w-28" />
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4 rounded-xl  bg-white shadow-lg p-4">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-8 w-40" />
            <div className="space-y-3 pt-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-zinc-100 bg-zinc-50 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-11 w-11 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <SkeletonBlock className="h-4 w-2/3" />
                      <SkeletonBlock className="h-3 w-1/2" />
                    </div>
                    <SkeletonBlock className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl  bg-white p-5 shadow-lg ">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-3 h-8 w-36" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-12 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function ManagerSkeleton() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-100    xl:px-8">
      <div className=" space-y-6">
        <header className="rounded-xl bg-white p-5 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-10 w-72" />
            </div>
            <SkeletonBlock className="h-12 w-40 rounded-2xl" />
          </div>
        </header>

        <section className="grid gap-4  md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl bg-white p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-11 w-11 rounded-2xl" />
                <SkeletonBlock className="h-4 w-12" />
              </div>
              <div className="mt-6 space-y-3">
                <SkeletonBlock className="h-8 w-16" />
                <SkeletonBlock className="h-4 w-28" />
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl  bg-white p-5">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-3 h-8 w-40" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between rounded-xl  bg-slate-100 p-4">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-11 w-11 rounded-xl" />
                    <div className="space-y-2">
                      <SkeletonBlock className="h-4 w-36" />
                      <SkeletonBlock className="h-3 w-24" />
                    </div>
                  </div>
                  <SkeletonBlock className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl  bg-white p-5">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-3 h-8 w-36" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-12 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function ChatSkeleton() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-5 text-slate-400 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row">
        <aside className="w-full rounded-[28px] border border-zinc-100 bg-white shadow-sm p-4 lg:max-w-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-7 w-28" />
            </div>
            <SkeletonBlock className="h-10 w-10 rounded-xl" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-zinc-100 bg-white p-3">
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-2/3" />
                    <SkeletonBlock className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="flex min-h-155 flex-1 flex-col rounded-[28px] border border-zinc-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 p-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-6 w-40" />
            </div>
            <SkeletonBlock className="h-10 w-28 rounded-full" />
          </div>
          <div className="flex-1 space-y-4 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={index % 2 === 0 ? "flex justify-start" : "flex justify-end"}>
                <SkeletonBlock className={`h-16 ${index % 2 === 0 ? "w-52" : "w-44"} rounded-2xl`} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export function StaffSkeleton() {
  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <div className="px-5 md:px-12 pt-5">
        <SkeletonBlock className="h-12 w-36 rounded-xl" />
        <div className="mt-6 space-y-6 bg-white rounded-xl p-5 shadow-lg">
          {Array.from({ length: 3 }).map((_, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              <SkeletonBlock className="h-4 w-32" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between gap-3 rounded-md bg-slate-100 p-3 ">
                    <div className="flex items-center gap-3">
                      <SkeletonBlock className="h-8 w-8 rounded-full" />
                      <div className="space-y-2">
                        <SkeletonBlock className="h-4 w-28" />
                        <SkeletonBlock className="h-3 w-20" />
                      </div>
                    </div>
                    <SkeletonBlock className="h-8 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function ShiftSkeleton() {
  return (
    <div className="min-h-screen pb-24 bg-ink px-5 pt-5">
      <div className="space-y-4">
        <SkeletonBlock className="h-10 w-40 rounded-xl" />
        <SkeletonBlock className="h-5 w-60" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between border border-border bg-panel px-3 py-2.5">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-8 w-8 rounded-full" />
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-3 w-20" />
                </div>
              </div>
              <SkeletonBlock className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TicketSkeleton() {
  return (
    <div className="min-h-screen bg-ink pb-24 px-5 pt-5">
      <div className="space-y-4 rounded-3xl border border-white/10 bg-paper p-5">
        <SkeletonBlock className="h-7 w-36" />
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-2">
          <SkeletonBlock className="h-12 w-full rounded-xl" />
          <SkeletonBlock className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
