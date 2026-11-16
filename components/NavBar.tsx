"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, ChevronDown, ChevronUp, CircleX, ExternalLink, User, Menu, MessageSquareText, ShieldCheck, Users, X } from "lucide-react";

type NotificationItem = {
  id: string;
  kind: "message" | "report" | "task";
  title: string;
  description: string;
  href: string;
  createdAt: string;
  actionable: boolean;
};

function NavBar({ user: initialUser = null }) {
  const pathname = usePathname();
  const router = useRouter();
  const hiddenRoutes = ["/login", "/register"];
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [notificationError, setNotificationError] = useState("");
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const user = initialUser;
  const dismissalStorageKey = `facility-notifications-dismissed:${user?._id || "anonymous"}`;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sidebar-close"));
    setIsDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    let active = true;
    async function loadNotifications() {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load notifications.");
        if (active) {
          let storageReadFailed = false;
          try {
            const savedIds = window.localStorage.getItem(dismissalStorageKey);
            const parsedIds = savedIds ? JSON.parse(savedIds) : [];
            if (Array.isArray(parsedIds)) setDismissedIds(parsedIds.filter((id) => typeof id === "string"));
          } catch {
            storageReadFailed = true;
            setNotificationError("Dismissed notification state could not be loaded.");
          }
          setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
          if (!storageReadFailed) setNotificationError("");
        }
      } catch (loadError) {
        if (active) setNotificationError(loadError instanceof Error ? loadError.message : "Unable to load notifications.");
      }
    }
    void loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [user?._id, dismissalStorageKey]);

  function saveDismissedIds(nextIds: string[]) {
    const boundedIds = [...new Set(nextIds)].slice(-200);
    setDismissedIds(boundedIds);
    try {
      window.localStorage.setItem(dismissalStorageKey, JSON.stringify(boundedIds));
    } catch {
      setNotificationError("Notification dismissal could not be saved on this device.");
    }
  }

  function dismissNotification(id:string) {
    if (!dismissedIds.includes(id)) saveDismissedIds([...dismissedIds, id]);
  }

  function clearAllNotifications() {
    saveDismissedIds([...new Set([...dismissedIds, ...notifications.map((item) => item.id)])]);
  }

 
  if (hiddenRoutes.some((route) => pathname === route || pathname.startsWith(route))) {
    return null;
  }

  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent("sidebar-toggle"));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  const roleLabel = user?.role ? user.role.toUpperCase() : "MEMBER";
  const dashboardLink =
    user?.role === "staff" ? "/shift" : user?.role === "manager" ? "/manager" : "/dashboard";
  const reportLink = "/report";
  const reportLabel = "Reports";
  const dashboardLabel = user?.role === "staff" ? "My shift" : user?.role === "manager" ? "Manager view" : "Dashboard";
  const visibleNotifications = notifications.filter((item) => !dismissedIds.includes(item.id));

  return (
    <div className="sticky left-0 top-0 z-30 h-25 w-full px-6 bg-white shadow-md">
      <div className="flex h-full items-center justify-between gap-3">
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-11 w-11 items-center cursor-pointer justify-center rounded-lg shadow-md bg-zinc-100  text-slate-800  -slate-100"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((open) => !open)}
              className="relative flex cursor-pointer items-center justify-center  text-slate-700 hover:text-indigo-500  "
              aria-label={`Notifications${visibleNotifications.length ? `, ${visibleNotifications.length} new` : ""}`}
              aria-expanded={isNotificationsOpen}
              aria-controls="navbar-notifications"
            >
              <Bell size={30} />
              {visibleNotifications.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{visibleNotifications.length > 99 ? "99+" : visibleNotifications.length}</span>}
            </button>

            {isNotificationsOpen && <section id="navbar-notifications" className="fixed inset-x-0 top-20 z-50 flex max-h-[calc(100dvh-5rem)] flex-col overflow-hidden border-y border-slate-200 bg-white shadow-2xl shadow-slate-900/15 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[min(24rem,calc(100vw-2rem))] sm:max-h-87.5 sm:rounded-2xl sm:border">
              <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
                  <p className="text-xs text-slate-500">{visibleNotifications.length} new activity{visibleNotifications.length === 1 ? "" : " items"}</p>
                </div>
                <button type="button" onClick={() => setIsNotificationsOpen(false)} className="rounded-lg p-2 cursor-pointer text-slate-500 hover:bg-slate-100 sm:hidden" aria-label="Close notifications"><X className="h-5 w-5" /></button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {notificationError && <p role="status" className="px-4 py-3 text-xs text-rose-700">{notificationError}</p>}
                {visibleNotifications.length ? visibleNotifications.map((item) => (
                  <article key={item.id} className="flex gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.actionable ? "bg-indigo-500" : "bg-slate-300"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                          <p className="mt-0.5 wrap-break text-xs text-slate-600">{item.description}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                        <button type="button" onClick={() => dismissNotification(item.id)} aria-label={`Close ${item.title}`} title="Close notification" className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><CircleX className="h-4 w-4" /></button>
                      </div>
                      {item.actionable && <Link href={item.href} onClick={() => setIsNotificationsOpen(false)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">View <ExternalLink className="h-3 w-3" /></Link>}
                    </div>
                  </article>
                )) : !notificationError && <div className="px-4 py-12 text-center">
                  <Check className="mx-auto h-6 w-6 text-emerald-600" />
                  <p className="mt-2 text-sm font-medium text-slate-700">You’re all caught up</p>
                  <p className="mt-1 text-xs text-slate-500">New messages, reports, and task activity will appear here.</p>
                </div>}
              </div>
              <footer className="sticky bottom-0 shrink-0 border-t border-slate-200 bg-white p-3">
                <button type="button" onClick={clearAllNotifications} disabled={!visibleNotifications.length} className="w-full rounded-xl bg-slate-900 cursor-pointer px-3 py-2.5 text-sm font-semibold text-white   hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">Clear all</button>
              </footer>
            </section>}
          </div>

          <button
            type="button"
            className="relative flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1.5 text-left"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
          >
            <div className="relative">
              {/* <Image src="/vercel.svg" alt="User avatar" width={32} height={32} className="rounded-full bg-slate-900" /> */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-100 text-indigo-600">
              <User className='w-6 h-6'/>
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
            </div>
            <div className="hidden text-left text-slate-700 md:block">
              <p className="text-sm font-semibold">{user?.name || "User Name"}</p>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{roleLabel}</span>
            </div>
            {isDropdownOpen ? <ChevronUp size={18} className="text-slate-700" /> : <ChevronDown size={18} className="text-slate-700" />}
          </button>
        </div>
      </div>

      {isDropdownOpen && (
        <div ref={dropdownRef} className="absolute right-4 top-20 z-40 w-72 rounded-xl border border-zinc-50/10 bg-white p-2 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-200 p-3">
            <div className="relative">
              <div className="flex h-10.5 w-10.5 items-center justify-center rounded-full bg-linear-to-br from-indigo-600 to-violet-500 text-white"><User className="h-5 w-5" /></div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{user?.name || "User Name"}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{roleLabel}</p>
            </div>
          </div>

          <div className="space-y-1 p-2">
            <Link href={dashboardLink} onClick={() => setIsDropdownOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-slate-700 text-sm   hover:text-white hover:bg-slate-900">
              <Users className="h-4 w-4 text-slate-500" />
              {dashboardLabel}
            </Link>
            <Link href="/chat" onClick={() => setIsDropdownOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-700   hover:text-white hover:bg-slate-900">
              <MessageSquareText className="h-4 w-4 text-slate-500" />
              Messages
            </Link>
            <Link href={reportLink} onClick={() => setIsDropdownOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-700   hover:text-white hover:bg-slate-900">
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              {reportLabel}
            </Link>
            <button type="button" onClick={handleLogout} className="mt-2 flex w-full items-center gap-3 rounded-xl bg-slate-900 p-3 text-left text-sm font-medium text-white   cursor-pointer hover:bg-red-800">
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NavBar;
