"use client";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium", className)}>{children}</span>;
}

export function Progress({ value, marker }: { value: number; marker?: number }) {
  return (
    <div className="relative h-1.5 w-full overflow-visible rounded-full bg-[#27272A]">
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, value)}%` }} />
      {marker !== undefined && <div className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-zinc-100" style={{ left: `${Math.min(100, marker)}%` }} />}
    </div>
  );
}

export function Tip({ label, content, children }: { label: string; content: ReactNode; children: ReactNode }) {
  return (
    <span className="group relative inline-flex cursor-help">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-[#27272A] bg-[#121215] p-2.5 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        <span className="block text-[11px] font-semibold text-zinc-100">{label}</span>
        <span className="block text-[11px] leading-snug text-zinc-400">{content}</span>
      </span>
    </span>
  );
}

export function SectionTitle({ title, hint, right }: { title: string; hint?: string; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, delta, tooltip }: { label: string; value: string; delta?: string; tooltip?: string }) {
  return (
    <div className="rounded-xl border border-[#27272A] bg-[#121215] p-3">
      <Tip label={label} content={tooltip ?? label}>
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</span>
      </Tip>
      <div className="mt-1 text-xl font-bold text-zinc-50">{value}</div>
      {delta && <div className="text-[11px] text-emerald-400">{delta}</div>}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#27272A] bg-[#121215] p-6 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
