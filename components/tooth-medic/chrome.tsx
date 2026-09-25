"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, MessageCircle, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLINIC, WA_BOOKING, WA_CHAT } from "@/lib/tooth-medic-content";

const LINKS = [
  { label: "Treatments", href: "#treatments" },
  { label: "About", href: "#about" },
  { label: "Why Us", href: "#why-us" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export function ToothMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <rect width="32" height="32" rx="8" fill="#0C3B38" />
      <path
        d="M10 9c0-1.7 1.3-3 3-3 1.4 0 2 .8 3 2 .9-1.2 1.6-2 3-2 1.7 0 3 1.3 3 3 0 3.5-1.6 5.6-2.2 9.3-.3 1.9-.6 4.3-2 4.3-1.6 0-1.3-3-1.8-5-.2 2-1 3.5-2.5 3.5-1.4 0-2.3-1.5-2.5-3.5-.5 2-.2 5-1.8 5-1.4 0-1.7-2.4-2-4.3C8.6 14.6 10 12.5 10 9z"
        fill="#fff"
      />
    </svg>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open ]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-white/95 backdrop-blur transition-shadow",
        scrolled ? "border-pine-950/10 shadow-[0_2px_16px_rgba(4,47,45,0.08)]" : "border-transparent"
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-pine-900 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="#top" className="flex items-center gap-2.5" aria-label={`${CLINIC.name} — home`}>
          <ToothMark className="h-8 w-8" />
          <span className="leading-tight">
            <span className="block font-display text-[17px] font-bold text-pine-950">Tooth Medic</span>
            <span className="block text-[11px] tracking-wide text-stone-500">Family Dental Care</span>
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-[14.5px] font-medium text-stone-600 transition-colors hover:bg-pine-50 hover:text-pine-950 focus-visible:outline-2 focus-visible:outline-pine-700"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <a
            href={`tel:${CLINIC.phoneIntl}`}
            className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-[14.5px] font-semibold text-pine-900 hover:bg-pine-50 sm:inline-flex"
            aria-label={`Call the clinic at ${CLINIC.phoneDisplay}`}
          >
            <Phone className="h-4 w-4" aria-hidden />
            {CLINIC.phoneDisplay}
          </a>
          <a
            href={WA_BOOKING}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-lg bg-pine-900 px-4 py-2.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-pine-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-700 sm:inline-flex"
          >
            Book Consultation
          </a>
          <button
            className="inline-flex rounded-md p-2 text-pine-950 hover:bg-pine-50 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" className="border-t border-pine-950/10 bg-white px-4 pb-4 pt-2 lg:hidden" aria-label="Mobile">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-2 py-2.5 text-[15px] font-medium text-stone-700 hover:bg-pine-50"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-2 grid gap-2">
            <a
              href={WA_BOOKING}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-pine-900 px-4 py-3 text-center text-[15px] font-semibold text-white"
            >
              Book Consultation
            </a>
            <a
              href={WA_CHAT}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-pine-900/20 px-4 py-3 text-[15px] font-semibold text-pine-900"
            >
              <MessageCircle className="h-4 w-4" aria-hidden /> Chat on WhatsApp
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-pine-700">{eyebrow}</p>
      <h2 className="mt-2 font-display text-[28px] font-bold leading-tight text-pine-950 sm:text-[34px]">{title}</h2>
      {lede && <p className="mt-3 text-[16px] leading-relaxed text-stone-600">{lede}</p>}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-pine-950 text-[14px] text-teal-50/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-[18px] font-bold text-white">{CLINIC.name}</p>
          <p className="mt-2 leading-relaxed">
            {CLINIC.area}, {CLINIC.city}, {CLINIC.region}
          </p>
          <p className="mt-3 space-y-1">
            <a href={`tel:${CLINIC.phoneIntl}`} className="block hover:text-white">
              {CLINIC.phoneDisplay}
            </a>
            <a href={`mailto:${CLINIC.email}`} className="block hover:text-white">
              {CLINIC.email}
            </a>
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="font-semibold text-white">Visit</p>
          <ul className="mt-3 space-y-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="font-semibold text-white">Book</p>
          <ul className="mt-3 space-y-2">
            <li>
              <a href={WA_BOOKING} target="_blank" rel="noreferrer" className="hover:text-white">
                Book a consultation
              </a>
            </li>
            <li>
              <a href={WA_CHAT} target="_blank" rel="noreferrer" className="hover:text-white">
                Chat on WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 text-[12.5px] text-teal-50/60 sm:px-6">
          Demonstration website prepared for {CLINIC.name}. Clinic photos: Bjoertvedt, CC BY-SA 3.0, via
          Wikimedia Commons.
        </div>
      </div>
    </footer>
  );
}

export function MobileCallBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-pine-950/10 bg-white/98 backdrop-blur md:hidden">
      <a
        href={`tel:${CLINIC.phoneIntl}`}
        className="inline-flex items-center justify-center gap-2 bg-pine-900 py-3.5 text-[15px] font-bold text-white"
        aria-label={`Call ${CLINIC.phoneDisplay} now`}
      >
        <Phone className="h-4 w-4" aria-hidden /> Call Now
      </a>
      <a
        href={WA_CHAT}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 bg-[#1FA855] py-3.5 text-[15px] font-bold text-white"
      >
        <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
      </a>
    </div>
  );
}
