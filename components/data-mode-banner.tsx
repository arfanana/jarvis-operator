"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { persistenceStatus } from "@/lib/data-mode";

/** Global honesty badge: every screen shows whether data is LIVE, DEMO, or unconfigured. */
export function DataModeBanner() {
  const pathname = usePathname();
  if (pathname?.startsWith("/tooth-medic") || pathname?.startsWith("/sites")) return null;
  const s = persistenceStatus();
  if (s.mode === "supabase") return null;
  const demo = s.mode === "demo";
  return (
    <div role="status" className={`flex items-center gap-2 border-b px-4 py-1.5 text-[11px] ${demo ? "border-amber-800 bg-amber-950 text-amber-200" : "border-rose-800 bg-rose-950 text-rose-200"}`}>
      <span className="font-bold tracking-wide">{s.label}</span>
      <span className="truncate">{s.detail}</span>
      <Link href="/settings" className="ml-auto shrink-0 underline">Settings →</Link>
    </div>
  );
}
