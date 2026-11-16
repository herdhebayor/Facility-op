"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation"; 
import { Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SessionExpiryGuard() {
  const pathname = usePathname();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [show, setShow] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let active = true;
    async function verifySession() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!active) return;
        if (response.status === 401) {
          setSessionExpired(true);
          setShow(true)
          setConnectionError(false);
        } else if (response.ok) {
          setSessionExpired(false);
          setConnectionError(false);
          setShow(false)
        } else {
          setConnectionError(true);
        }
      } catch {
        if (active) setConnectionError(true);
      }
    }

    if(!show) void verifySession();
    const intervalId = window.setInterval(() => void verifySession(), 60_000);
    window.addEventListener("focus", verifySession);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", verifySession);
    };
  }, [pathname]);

  // if (pathname === "/login" || pathname === "/register") return null;
  if (!sessionExpired && !connectionError && !show) return null;

  if (connectionError && !sessionExpired && !show) {
    return (
      <div role="status" className="fixed bottom-4 right-4 z-100 flex max-w-sm items-center gap-3 rounded-2xl border border-amber-200 bg-white p-4 text-sm text-amber-900 shadow-xl">
        <Clock3 className="h-5 w-5 shrink-0 text-amber-600" />
        <span>Unable to verify your session. Check your connection and try again.</span>
        <button type="button" onClick={() => window.dispatchEvent(new Event("focus"))} className="shrink-0 font-semibold cursor-pointer text-indigo-700 hover:text-indigo-900">Retry</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-zinc-50 px-4 py-6 backdrop-blur-sm">
      <section role="alertdialog" aria-modal="true" aria-labelledby="session-expired-title" className="w-full max-w-md rounded-xl bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Clock3 className="h-7 w-7" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Session ended</p>
        <h2 id="session-expired-title" className="mt-2 text-2xl font-bold text-slate-900">Please sign in again</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Your session has expired for your security. Sign in to continue working.</p>
        <button  onClick={()=> {setSessionExpired(false), setConnectionError(false), setShow(false)}} className="mt-6 cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white   hover:bg-indigo-700">
          Close
        </button>
      </section>
    </div>
  );
}
