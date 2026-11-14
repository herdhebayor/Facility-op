"use client";
import { ClipboardList, Users, FileText, Clock, MessageSquareText, UserRound } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function BottomNav({ role }) {
  const router = useRouter();
  const pathname = usePathname();

  const items =
    role === "manager"
      ? [
          { href: "/manager", label: "OVERVIEW", icon: ClipboardList },
          { href: "/staff", label: "STAFF", icon: Users },
          { href: "/chat", label: "CHAT", icon: MessageSquareText },
          { href: "/report", label: "REPORTS", icon: FileText },
          { href: "/me", label: "ME", icon: UserRound },
        ]
      : role === "admin"
        ? [
            { href: "/dashboard", label: "DASH", icon: ClipboardList },
            { href: "/staff", label: "STAFF", icon: Users },
            { href: "/chat", label: "CHAT", icon: MessageSquareText },
            { href: "/report", label: "REPORTS", icon: FileText },
            { href: "/me", label: "ME", icon: UserRound },
          ]
        : [
            { href: "/shift", label: "SHIFT", icon: Clock },
            { href: "/chat", label: "CHAT", icon: MessageSquareText },
            { href: "/report", label: "REPORT", icon: FileText },
            { href: "/me", label: "ME", icon: UserRound },
          ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-panel2" style={{ maxWidth: 430, marginInline: "auto" }}>
      <div className="flex">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname.startsWith(it.href);
          return (
            <button
              key={it.href}
              onClick={() => router.push(it.href)}
              className="flex-1 flex flex-col items-center gap-1 py-3 relative"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber" />
              )}
              <Icon size={18} color={active ? "#E8A33D" : "#5B6470"} strokeWidth={2} />
              <span
                className="font-display text-[10px] tracking-wider font-semibold"
                style={{ color: active ? "#E8A33D" : "#5B6470" }}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
