"use client";

import { usePathname, useRouter } from "next/navigation";
import { MessageSquareText } from "lucide-react";

export default function ChatWidget() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/chat" || pathname.startsWith("/login") || pathname.startsWith("/register")) return null;

  return (
    <button
      type="button"
      onClick={() => router.push("/chat")}
      aria-label="Open secure chat"
      className="fixed bottom-25 -right-20 z-50 inline-flex cursor-pointer h-20 w-25 items-center gap-2 rounded-3xl hover:right-5 bg-indigo-600 justify-center text-sm font-semibold text-white shadow-xl shadow-indigo-900/20   hover:bg-indigo-700"
    >
      <MessageSquareText className="h-4 w-4" />
      Chat
    </button>
  );
}
