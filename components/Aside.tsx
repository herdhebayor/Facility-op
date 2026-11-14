'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  ClipboardMinus,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  UserRoundGroup,
  X,
  MapPin,
  BriefcaseBusiness,
  ClipboardCheck,
  UserRound,
  Group,
  Users,
  Settings,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';

type UserRole = 'staff' | 'manager' | 'admin';

interface UserType {
  role: UserRole;
  locationId: string;
  department?: string;
}

interface DepartmentType {
  _id: string;
  name: string;
}

interface UserResponse {
  user: UserType;
}

interface DepartmentsResponse {
  departments: DepartmentType[];
}

interface MenuItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl py-6 bg-slate-300/70 ${className}`} />;
}

function Aside() {
  const pathname = usePathname();
  const router = useRouter();
  const hiddenRoutes = ['/login', '/register'];
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserType >([]);
  const [department, setDepartment] = useState<DepartmentType >([]);
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith('/settings'));

  const fetchUser = async () => {
    setLoading(true);
    try {
      const [userRes, depRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/departments'),
      ]);
      if (!userRes.ok || !depRes.ok) {
        throw new Error('Can not fecth user');
      }
      const userData = (await userRes.json()) as UserResponse;
      const depData = (await depRes.json()) as DepartmentsResponse;
      const userDep = depData.departments.find((dep) => userData.user.department === dep.name) ?? null;
      setUser(userData.user);
      setDepartment(userDep);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'An error occurred while fetching user data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('sidebar-toggle', handleToggle);
    window.addEventListener('sidebar-close', handleClose);

    return () => {
      window.removeEventListener('sidebar-toggle', handleToggle);
      window.removeEventListener('sidebar-close', handleClose);
    };
  }, []);

  if (hiddenRoutes.some((route) => pathname === route || pathname.startsWith(route))) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };


  const role = user?.role;
  const isAdminRoute = role === 'admin';
  const isManagerRoute = role === 'manager'; 
  

  const menuItems = isAdminRoute
    ? [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Manage Locations', path: '/location', icon: MapPin },
        { name: 'Manage Staff', path: '/staff', icon: UserRoundGroup },
        { name: 'Connect', path: '/chat', icon: MessageSquareText },
        { name: 'Reports', path: '/report', icon: ClipboardMinus },
        { name: 'Me', path: '/me', icon: UserRound },
      ]
    : isManagerRoute
      ? [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Staff', path: '/staff', icon: UserRoundGroup },
          { name: 'Location', path: `/location/${user.locationId}`, icon: MapPin },
          { name: 'Departments', path: '/departments', icon: Group },
          { name: 'Connect', path: '/chat', icon: MessageSquareText },
          { name: 'Reports', path: '/report', icon: ClipboardMinus },
          { name: 'Tasks', path: '/jobs', icon: BriefcaseBusiness },
          { name: 'Me', path: '/me', icon: UserRound },
        ]
      : [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Location', path: `/location/${user.locationId}`, icon: MapPin },
          { name: 'Connect', path: '/chat', icon: MessageSquareText },
          { name: 'My department', path: `/departments/${department._id}`, icon: Users },
          { name: 'Reports', path: '/report', icon: ClipboardMinus },
          { name: 'Routine checks', path: '/routines', icon: ClipboardCheck },
          { name: 'Tasks', path: '/jobs', icon: BriefcaseBusiness },
          { name: 'Me', path: '/me', icon: UserRound },
        ];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/50 transition-opacity duration-200 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={[
          'fixed h-screen min-h-155 overflow-hidden max-h-250 inset-y-0 left-0 z-50 w-80 border-r border-slate-50/10 bg-white px-4 py-5 text-slate-800 shadow-xl transition-transform duration-200 md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="mb-8 flex items-center justify-between">
          <div className="inline-flex items-center gap-3 px-1 py-1.5 text-sm font-bold uppercase tracking-[0.2em] text-indigo-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20"><Building2 className="h-4 w-4" /></span>
            Facility Ops
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg border outline-0 border-slate-200 p-2 text-slate-500 md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {
        loading ? (
          <div className="space-y-2">
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-[80%]" />
            <SkeletonBlock className="h-10 w-[50%]" />
            <SkeletonBlock className="h-10 w-[70%]" />
            <SkeletonBlock className="h-10 w-[20%]" />
            <SkeletonBlock className="h-10 w-[30%]" />
          </div>
        ) : (
          <>
        <nav className="flex max-h-[calc(100vh-9rem)] flex-col gap-2 overflow-y-auto pb-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.path || pathname.startsWith(item.path);

            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={[
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition outline-0',
                  active ? 'bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-600 hover:text-white hover:bg-slate-900',
                ].join(' ')}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <div>
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
              className={`flex w-full items-center gap-3 rounded-xl cursor-pointer px-4 py-3 text-left text-base font-medium transition outline-0 ${pathname.startsWith('/settings') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-white hover:bg-slate-900'}`}
            >
              <Settings size={18} />
              <span className="flex-1">Settings</span>
              <ChevronDown size={16} className={`transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
            </button>
            {settingsOpen && <div className="ml-5 mt-1 flex flex-col gap-1 border-l border-slate-200 pl-3">
              <Link
                href="/settings/profile"
                onClick={() => setIsOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm transition ${pathname === '/settings/profile' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-900 hover:text-white'}`}
              >
                Profile settings
              </Link>
              <Link
                href="/settings/preferences"
                onClick={() => setIsOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm transition ${pathname === '/settings/preferences' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-900 hover:text-white'}`}
              >
                Site preferences
              </Link>
            </div>}
          </div>
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium cursor-pointer text-slate-600 transition hover:border-indigo-400/40 "
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
        </>
        )}
      </aside>
    </>
  );
}

export default Aside;
