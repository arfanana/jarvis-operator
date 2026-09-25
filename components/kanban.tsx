"use client";
import { useState } from "react";
import type { Lead, LeadStatus } from "@/lib/types";
import { Badge } from "@/components/ui";
import { leadStatusColor } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

const cols: { key: LeadStatus; title: string }[] = [
  { key: "new", title: "New" },
  { key: "contacted", title: "Contacted" },
  { key: "proposal_sent", title: "Proposal Sent" },
  { key: "won", title: "Won" },
  { key: "lost", title: "Lost" },
];

export default function KanbanBoard({ leads, onMove }: { leads: Lead[]; onMove: (id: string, status: LeadStatus) => void }) {
  const [drag, setDrag] = useState<string | null>(null);
  const total = leads.reduce((s, l) => s + ((l.status === "won" ? (l.deal_value ?? 4800) : 0)), 0);
  return (
    <div>
      <p className="mb-3 text-xs text-zinc-500">Pipeline value (won): <span className="font-semibold text-emerald-400">{formatCurrency(total)}</span></p>
      <div className="grid gap-3 md:grid-cols-5">
        {cols.map((c) => {
          const items = leads.filter((l) => l.status === c.key);
          return (
            <div key={c.key} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag) onMove(drag, c.key); setDrag(null); }}
              className="min-h-40 rounded-xl border border-[#27272A] bg-[#121215] p-2">
              <p className="mb-2 px-1 text-xs font-semibold text-zinc-300">{c.title} <span className="ml-1 rounded-full bg-[#27272A] px-1.5 text-[10px]">{items.length}</span></p>
              <div className="space-y-2">
                {items.map((l) => (
                  <div key={l.id} draggable onDragStart={() => setDrag(l.id)}
                    className="cursor-grab rounded-lg border border-[#27272A] bg-[#09090B] p-2 active:cursor-grabbing">
                    <p className="truncate text-[12px] font-medium text-zinc-100">{l.name}</p>
                    <p className="text-[10px] text-zinc-500">{l.category} · {l.city}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">{l.score}</Badge>
                      <span className="text-[10px] text-zinc-500">{Math.round(l.conversion_probability * 100)}%</span>
                    </div>
                    <Badge className={`${leadStatusColor[l.status]} mt-1`}>{l.status.replace("_", " ")}</Badge>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
