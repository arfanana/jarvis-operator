"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { whatsappFor, type SitePreset } from "@/lib/site-templates";
import { cn } from "@/lib/utils";

/** Booking dialog: collects name/phone/service, then opens WhatsApp.
 *  No fake backend — the message is composed transparently in front of the user. */
export function BookDialog({
  preset,
  triggerLabel = "Book Now",
  triggerClassName,
}: {
  preset: SitePreset;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState(preset.services[0]?.name ?? "General enquiry");
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    if (name.trim().length < 2) { setErr("Please add your name."); return; }
    if (phone.replace(/\D/g, "").length < 8) { setErr("Please add a valid phone number."); return; }
    setErr(null);
    const msg = `Hi ${preset.business}, I'm ${name.trim()} (${phone.trim()}). I'd like to enquire about: ${service}. Please call me back.`;
    window.open(whatsappFor(preset, msg), "_blank", "noopener");
    setOpen(false);
  };

  const input =
    "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-[14.5px] text-stone-900 outline-none focus:border-current";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={cn("bg-[var(--site-accent)] hover:brightness-95", triggerClassName)}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a booking — {preset.shortName}</DialogTitle>
          <DialogDescription>
            Fill this in and it opens WhatsApp with your message ready to send. Nothing is booked until you send it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1 text-[13.5px] font-semibold text-stone-700">
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Full name" className={input} />
          </label>
          <label className="grid gap-1 text-[13.5px] font-semibold text-stone-700">
            Phone number
            <input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="+91 …" className={input} />
          </label>
          <label className="grid gap-1 text-[13.5px] font-semibold text-stone-700">
            Service
            <select value={service} onChange={(e) => setService(e.target.value)} className={input}>
              {preset.services.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
              <option value="General enquiry">General enquiry</option>
            </select>
          </label>
          {err && <p role="alert" className="text-[13.5px] font-medium text-red-700">{err}</p>}
          <Button onClick={submit} className="mt-1 w-full bg-[#1FA855] hover:bg-[#178a45]">
            <MessageCircle className="h-4 w-4" aria-hidden /> Continue on WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
