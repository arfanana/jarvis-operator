import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const fmtMoney = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const fmtDate = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso.length <= 10 ? iso + "T00:00:00Z" : iso); return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); };
export const daysSince = (iso: string | null) => { if (!iso) return 0; return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); };
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}
export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([toCSV(rows)], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}
export const pct = (actual: number, target: number) => Math.min(100, Math.round((actual / Math.max(1, target)) * 100));
export const formatCurrency = fmtMoney;
export const exportToCsv = (rows: Record<string, unknown>[] | any[], filename = "jarvis-leads.csv") => downloadCSV(filename, rows as Record<string, unknown>[]);
export const timeAgo = (iso: string) => { const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000); if (s < 60) return s + "s ago"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago"; return Math.floor(s / 86400) + "d ago"; };
export const leadStatusColor: Record<string, string> = {
  new: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  contacted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  proposal_sent: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  proposal: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  replied: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  won: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  lost: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};
