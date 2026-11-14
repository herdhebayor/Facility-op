"use client";
import { ChevronLeft } from "lucide-react";

export default function TopBar({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-indigo-100 bg-gradient-to-r from-white via-white to-indigo-50/60 px-5 pb-4 pt-6 shadow-sm">
      <div className="flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="mr-1 p-1 -ml-1">
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-[20px] font-semibold leading-none tracking-wide text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 font-mono text-[12px] text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
