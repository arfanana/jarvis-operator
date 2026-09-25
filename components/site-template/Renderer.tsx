"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  Clock,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  X,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/tooth-medic/Reveal";
import { whatsappFor, type SitePreset } from "@/lib/site-templates";
import { cn } from "@/lib/utils";
import { BookDialog } from "./BookDialog";

function vars(p: SitePreset): React.CSSProperties {
  return { "--site-accent": p.theme.accent } as React.CSSProperties;
}

const NAV = [
  { label: "Services", href: "#services" },
  { label: "Why Us", href: "#why-us" },
  { label: "Reviews", href: "#reviews" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export function SiteNavbar({ preset }: { preset: SitePreset }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open ]);
  return (
    <header style={vars(preset)} className="sticky top-0 z-50 border-b border-stone-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="#top" className="flex items-center gap-2.5" aria-label={`${preset.business} — home`}>
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-[15px] font-extrabold text-white"
            style={{ background: preset.theme.accent }}
            aria-hidden
          >
            {preset.shortName.trim()[0]?.toUpperCase() ?? "B"}
          </span>
          <span className="leading-tight">
            <span className="block text-[16.5px] font-bold text-stone-900">{preset.shortName}</span>
            <span className="block text-[11px] tracking-wide text-stone-500">{preset.category}</span>
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((l) => (
            <a key={l.href} href={l.href} className="rounded-md px-3 py-2 text-[14.5px] font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <a href={preset.phoneHref} className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-[14.5px] font-semibold text-stone-800 hover:bg-stone-100 sm:inline-flex" aria-label={`Call ${preset.phoneDisplay}`}>
            <Phone className="h-4 w-4" aria-hidden /> {preset.phoneDisplay}
          </a>
          <BookDialog preset={preset} triggerLabel="Book Now" triggerClassName="hidden sm:inline-flex" />
          <button className="rounded-md p-2 text-stone-800 hover:bg-stone-100 lg:hidden" aria-expanded={open} aria-controls="site-mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="site-mobile-nav" className="border-t border-stone-200/70 bg-white px-4 pb-4 pt-2 lg:hidden" aria-label="Mobile">
          {NAV.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-2 py-2.5 text-[15px] font-medium text-stone-700 hover:bg-stone-100">
              {l.label}
            </a>
          ))}
          <div className="mt-2 grid gap-2">
            <BookDialog preset={preset} triggerLabel="Book Now" triggerClassName="w-full" />
            <a href={whatsappFor(preset, preset.chatMessage)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-3 text-[15px] font-semibold">
              <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteHero({ preset }: { preset: SitePreset }) {
  return (
    <section style={vars(preset)} className="overflow-hidden" aria-labelledby="site-hero">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20 lg:pt-16" style={{ background: preset.theme.soft }}>
        <Reveal>
          <Badge>{preset.category} · {preset.area}</Badge>
          <h1 id="site-hero" className="mt-3 font-display text-[36px] font-bold leading-[1.08] text-stone-900 sm:text-[48px]">
            {preset.tagline}
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-stone-600">{preset.intro}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <BookDialog preset={preset} triggerLabel="Book Now" />
            <a
              href={whatsappFor(preset, preset.chatMessage)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-stone-300 bg-white px-6 py-3.5 text-[15px] font-semibold text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden /> Chat on WhatsApp
            </a>
          </div>
          <p className="mt-5 text-[14px] text-stone-500">
            Prefer to talk? Call <a href={preset.phoneHref} className="font-semibold underline underline-offset-4" style={{ color: preset.theme.accent }}>{preset.phoneDisplay}</a>
          </p>
        </Reveal>
        <Reveal delay={120}>
          <figure className="m-0">
            <div className="overflow-hidden rounded-2xl border border-stone-900/10 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]">
              <img src={preset.image.src} alt={preset.image.alt} className="aspect-[4/3] w-full object-cover" loading="eager" fetchPriority="high" />
            </div>
            <figcaption className="mt-3 flex items-center gap-2 text-[13.5px] text-stone-500">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden style={{ color: preset.theme.accent }} />
              {preset.business} · {preset.area}, {preset.city}
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

export function SiteServices({ preset }: { preset: SitePreset }) {
  const featured = preset.services.filter((s) => s.featured);
  const rest = preset.services.filter((s) => !s.featured);
  return (
    <section id="services" style={vars(preset)} className="scroll-mt-20 bg-white" aria-labelledby="site-services-h">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <Badge>Services</Badge>
          <h2 id="site-services-h" className="mt-2 font-display text-[28px] font-bold text-stone-900 sm:text-[34px]">What we offer</h2>
          <p className="mt-3 max-w-2xl text-[16px] text-stone-600">Fixed scope where possible. Everything else quoted before anything begins.</p>
        </Reveal>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {featured.map((s, i) => (
            <Reveal key={s.name} delay={i * 90}>
              <Card className="flex h-full flex-col border-0 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]" >
                <div style={{ background: preset.theme.dark }} className="flex h-full flex-col rounded-2xl p-7">
                  <CardTitle className="text-white">{s.name}</CardTitle>
                  <CardDescription className="text-white/80">{s.desc}</CardDescription>
                  <CardContent className="px-0">
                    <ul className="space-y-2">
                      {s.points.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-[14.5px] text-white/90">
                          <Check className="mt-1 h-4 w-4 shrink-0" aria-hidden /> {p}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="px-0">
                    <a href={whatsappFor(preset, `Hi ${preset.business}, I'd like to enquire about ${s.name}.`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                      Enquire about {s.name} <ArrowRightIcon />
                    </a>
                  </CardFooter>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {rest.map((s, i) => (
            <Reveal key={s.name} delay={i * 90}>
              <Card className="flex h-full flex-col transition-shadow hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle>{s.name}</CardTitle>
                  <CardDescription>{s.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {s.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-[14.5px] text-stone-600">
                        <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: preset.theme.accent }} aria-hidden /> {p}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <a href={whatsappFor(preset, `Hi ${preset.business}, I'd like to enquire about ${s.name}.`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold underline underline-offset-4" style={{ color: preset.theme.accent }}>
                    Enquire <ArrowRightIcon />
                  </a>
                </CardFooter>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function SiteWhy({ preset }: { preset: SitePreset }) {
  return (
    <section id="why-us" style={vars(preset)} className="scroll-mt-20" aria-labelledby="site-why-h">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20" style={{ background: preset.theme.soft }}>
        <Reveal>
          <Badge>Why us</Badge>
          <h2 id="site-why-h" className="mt-2 font-display text-[28px] font-bold text-stone-900 sm:text-[34px]">Built for decisions, not pressure</h2>
        </Reveal>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {preset.whyPoints.map((w, i) => (
            <Reveal key={w.title} delay={i * 70}>
              <li className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-[17px]">{w.title}</CardTitle>
                    <CardDescription>{w.text}</CardDescription>
                  </CardHeader>
                </Card>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function SiteSteps({ preset }: { preset: SitePreset }) {
  return (
    <section className="bg-white" aria-labelledby="site-steps-h">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <Badge>How it works</Badge>
          <h2 id="site-steps-h" className="mt-2 font-display text-[28px] font-bold text-stone-900 sm:text-[34px]">Four steps, no surprises</h2>
        </Reveal>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {preset.steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <li className="h-full rounded-2xl border border-stone-900/10 p-6" style={{ background: preset.theme.soft }}>
                <span className="font-display text-[34px] font-bold leading-none text-stone-900/15" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-2 text-[16px] font-bold text-stone-900">{s.title}</p>
                <p className="mt-1 text-[14.5px] leading-relaxed text-stone-600">{s.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal>
          <div className="mt-8"><BookDialog preset={preset} triggerLabel="Start with step one" /></div>
        </Reveal>
      </div>
    </section>
  );
}

export function SiteFaq({ preset }: { preset: SitePreset }) {
  return (
    <section id="faq" className="scroll-mt-20 bg-white" aria-labelledby="site-faq-h">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <Badge>Questions</Badge>
          <h2 id="site-faq-h" className="mt-2 font-display text-[28px] font-bold text-stone-900 sm:text-[34px]">Asked before every first visit</h2>
        </Reveal>
        <Reveal>
          <Accordion type="single" collapsible className="mt-6 rounded-2xl border border-stone-900/10 px-6" style={{ background: preset.theme.soft }}>
            {preset.faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`} className={cn(i === preset.faqs.length - 1 && "border-b-0")}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

export function SiteContact({ preset }: { preset: SitePreset }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${preset.business} ${preset.area} ${preset.city}`)}`;
  return (
    <section id="contact" className="scroll-mt-20" aria-labelledby="site-contact-h" style={{ background: preset.theme.soft }}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <Badge>Visit or call</Badge>
          <h2 id="site-contact-h" className="mt-2 font-display text-[28px] font-bold text-stone-900 sm:text-[34px]">Find us in {preset.area}</h2>
          <p className="mt-3 max-w-2xl text-[16px] text-stone-600">One address, one phone number{preset.email ? ", one email" : ""} — answered by the team.</p>
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Reveal>
            <Card className="h-full">
              <CardHeader>
                <MapPin className="h-6 w-6" style={{ color: preset.theme.accent }} aria-hidden />
                <CardTitle className="text-[16px]">Address</CardTitle>
                <CardDescription>{preset.address}</CardDescription>
              </CardHeader>
              <CardFooter>
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-[14.5px] font-semibold underline underline-offset-4" style={{ color: preset.theme.accent }}>
                  Get Directions
                </a>
              </CardFooter>
            </Card>
          </Reveal>
          <Reveal delay={70}>
            <Card className="h-full">
              <CardHeader>
                <Phone className="h-6 w-6" style={{ color: preset.theme.accent }} aria-hidden />
                <CardTitle className="text-[16px]">Phone{preset.email ? " & Email" : ""}</CardTitle>
                <CardDescription>
                  <a href={preset.phoneHref} className="font-bold text-stone-900">{preset.phoneDisplay}</a>
                  {preset.email && (<><br /><a href={`mailto:${preset.email}`} className="break-all">{preset.email}</a></>)}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <BookDialog preset={preset} triggerLabel="Book Now" />
              </CardFooter>
            </Card>
          </Reveal>
          <Reveal delay={140}>
            <Card className="h-full">
              <CardHeader>
                <Clock className="h-6 w-6" style={{ color: preset.theme.accent }} aria-hidden />
                <CardTitle className="text-[16px]">Hours</CardTitle>
                <CardDescription>{preset.hoursNote}</CardDescription>
              </CardHeader>
              <CardFooter>
                <a href={preset.phoneHref} className="text-[14.5px] font-semibold underline underline-offset-4" style={{ color: preset.theme.accent }}>
                  Confirm timings
                </a>
              </CardFooter>
            </Card>
          </Reveal>
        </div>
        <Reveal>
          <div className="mt-6 overflow-hidden rounded-2xl border border-stone-900/10">
            <iframe
              title={`Map showing ${preset.business}, ${preset.area}, ${preset.city}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(`${preset.business} ${preset.area} ${preset.city}`)}&output=embed`}
              className="h-[320px] w-full border-0"
              loading="lazy"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function SiteFinal({ preset }: { preset: SitePreset }) {
  return (
    <section style={{ background: preset.theme.dark }} aria-labelledby="site-final-h">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
        <Reveal>
          <h2 id="site-final-h" className="font-display text-[30px] font-bold leading-tight text-white sm:text-[38px]">
            Have questions? Talk to us directly.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[16.5px] leading-relaxed text-white/85">
            Message {preset.shortName} on WhatsApp with your question and get a clear next step.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={whatsappFor(preset, preset.chatMessage)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-white px-7 py-4 text-[16px] font-semibold text-stone-900 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
            >
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden /> Chat on WhatsApp
            </a>
            <div className="w-full sm:w-auto">
              <BookDialog preset={preset} triggerLabel="Book Now" triggerClassName="w-full border border-white/30 bg-transparent text-white hover:bg-white/10 sm:w-auto" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function SiteFooter({ preset }: { preset: SitePreset }) {
  return (
    <footer className="text-[14px]" style={{ background: preset.theme.dark, color: "rgba(255,255,255,0.75)" }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-[18px] font-bold text-white">{preset.business}</p>
          <p className="mt-2">{preset.address}</p>
          <p className="mt-3">
            <a href={preset.phoneHref} className="block hover:text-white">{preset.phoneDisplay}</a>
            {preset.email && <a href={`mailto:${preset.email}`} className="block hover:text-white">{preset.email}</a>}
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="font-semibold text-white">Visit</p>
          <ul className="mt-3 space-y-2">
            {["Services", "Why Us", "FAQ", "Contact"].map((l, i) => (
              <li key={l}><a href={["#services", "#why-us", "#faq", "#contact"][i]} className="hover:text-white">{l}</a></li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="font-semibold text-white">Book</p>
          <ul className="mt-3 space-y-2">
            <li><BookDialog preset={preset} triggerLabel="Book Now" triggerClassName="border-0 bg-transparent p-0 text-[14px] font-normal text-white/75 underline hover:text-white" /></li>
            <li><a href={whatsappFor(preset, preset.chatMessage)} target="_blank" rel="noreferrer" className="hover:text-white">Chat on WhatsApp</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 text-[12.5px] sm:px-6" style={{ color: "rgba(255,255,255,0.55)" }}>
          {preset.sample ? "Sample template — replace every name, number and word with real business information before showing a client." : `Demonstration website prepared for ${preset.business}.`} {preset.image.credit ? `Photo: ${preset.image.credit}.` : ""}
        </div>
      </div>
    </footer>
  );
}

export function SiteMobileBar({ preset }: { preset: SitePreset }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-stone-900/10 bg-white/95 backdrop-blur md:hidden">
      <a href={preset.phoneHref} className="inline-flex items-center justify-center gap-2 py-3.5 text-[15px] font-bold text-white" style={{ background: preset.theme.accent }} aria-label={`Call ${preset.phoneDisplay} now`}>
        <Phone className="h-4 w-4" aria-hidden /> Call Now
      </a>
      <a href={whatsappFor(preset, preset.chatMessage)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 bg-[#1FA855] py-3.5 text-[15px] font-bold text-white">
        <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
      </a>
    </div>
  );
}

export function SiteSampleRibbon() {
  return (
    <div className="bg-amber-400 px-4 py-1.5 text-center text-[12.5px] font-bold tracking-wide text-amber-950" role="note">
      SAMPLE TEMPLATE — fictional business, replace all content before showing a client
    </div>
  );
}
