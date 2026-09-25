"use client";
import { useMemo, useState } from "react";
import type { Lead } from "@/lib/types";
import { generatePitch } from "@/lib/ai";
import { Check, Copy, Mail, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PitchChannel = "whatsapp" | "email";

export default function AIPitchModal({ lead, onClose, onSent }: {
  lead: Lead | null; onClose: () => void; onSent: (lead: Lead, channel: PitchChannel) => void;
}) {
  const [channel, setChannel] = useState<PitchChannel>("whatsapp");
  const [copied, setCopied] = useState(false);
  const pitch = useMemo(() => (lead ? generatePitch(lead, channel) : null), [lead, channel]);
  if (!lead || !pitch) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${pitch.subject}\n\n${pitch.body}`); } catch { /* clipboard unavailable */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-[#27272A] bg-[#121215] p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">AI Pitch — {lead.name}</h3>
          <button onClick={onClose} title="Close" className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"><X size={16} /></button>
        </div>
        <p title="Pitch inputs: business name, city, category, rating and review volume" className="mb-3 cursor-help text-[11px] text-zinc-500">
          Tailored to {lead.category} · {lead.city} · {lead.rating?.toFixed(1) ?? "—"}★ · {lead.reviewCount ?? 0} reviews
        </p>
        <div className="mb-3 flex gap-1 rounded-lg bg-[#09090B] p-1">
          {(["whatsapp", "email"] as const).map((c) => (
            <button key={c} onClick={() => setChannel(c)}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium capitalize",
                channel === c ? "bg-[#27272A] text-zinc-50" : "text-zinc-500 hover:text-zinc-300")}>
              {c === "whatsapp" ? <MessageCircle size={13} /> : <Mail size={13} />}{c}
            </button>
          ))}
        </div>
        <p className="text-xs font-medium text-zinc-400">{pitch.subject}</p>
        <p className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[#27272A] bg-[#09090B] p-2.5 text-[13px] leading-relaxed text-zinc-200">{pitch.body}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={copy} title="Copy pitch to clipboard"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#27272A] py-2 text-xs text-zinc-300 hover:bg-white/5">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={() => { onSent(lead, channel); onClose(); }}
            title={channel === "whatsapp" ? "Open WhatsApp with prefilled pitch, log activity, increment Messages Sent" : "Open email draft with prefilled pitch, log activity, increment Messages Sent"}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500">
            {channel === "whatsapp" ? <MessageCircle size={14} /> : <Mail size={14} />}
            Send via {channel === "whatsapp" ? "WhatsApp" : "Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
