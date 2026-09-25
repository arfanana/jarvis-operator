"use client";

import {
  Activity,
  ArrowRight,
  Baby,
  CalendarCheck,
  Check,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  PenTool,
  Phone,
  Smile,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./chrome";
import {
  CLINIC,
  FAQS,
  IMAGES,
  JOURNEY,
  TREATMENTS,
  WA_BOOKING,
  WA_CHAT,
  treatmentBookingLink,
  type Treatment,
} from "@/lib/tooth-medic-content";

const TREATMENT_ICONS: Record<string, LucideIcon> = {
  implants: Zap,
  invisalign: Smile,
  "smile-design": PenTool,
  kids: Baby,
  airway: Wind,
  myofunctional: Activity,
};

export function Hero() {
  return (
    <section className="overflow-hidden bg-cream" aria-labelledby="hero-heading">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20 lg:pt-16">
        <Reveal>
          <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-pine-700">
            Family dental care · {CLINIC.area}, {CLINIC.city}
          </p>
          <h1
            id="hero-heading"
            className="mt-3 font-display text-[36px] font-bold leading-[1.08] text-pine-950 sm:text-[48px]"
          >
            Modern dental care, designed around your smile.
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-stone-600">
            From clear aligners and implants to gentle first visits for children, Tooth Medic covers the
            treatments families in {CLINIC.area} actually ask for — explained plainly, priced before anything
            begins.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href={WA_BOOKING}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-pine-900 px-6 py-3.5 text-[15.5px] font-semibold text-white transition-colors hover:bg-pine-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-700"
            >
              <CalendarCheck className="h-[18px] w-[18px]" aria-hidden />
              Book a Consultation
            </a>
            <a
              href={WA_CHAT}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-pine-900/25 bg-white px-6 py-3.5 text-[15.5px] font-semibold text-pine-900 transition-colors hover:bg-pine-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-700"
            >
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden />
              Chat on WhatsApp
            </a>
          </div>
          <p className="mt-5 text-[14px] text-stone-500">
            Prefer to talk? Call <a href={`tel:${CLINIC.phoneIntl}`} className="font-semibold text-pine-900 underline decoration-pine-700/30 underline-offset-4 hover:decoration-pine-700">{CLINIC.phoneDisplay}</a>
          </p>
        </Reveal>
        <Reveal delay={120}>
          <figure className="m-0">
            <div className="overflow-hidden rounded-2xl border border-pine-950/10 shadow-[0_24px_60px_-24px_rgba(4,47,45,0.35)]">
              {/* Representative clinic photography; replace with the clinic's own photos before publishing. */}
              <img
                src={IMAGES.hero.src}
                alt={IMAGES.hero.alt}
                className="aspect-[4/3] w-full object-cover"
                loading="eager"
                fetchPriority="high"
              />
            </div>
            <figcaption className="mt-3 flex items-center gap-2 text-[13.5px] text-stone-500">
              <MapPin className="h-4 w-4 shrink-0 text-pine-700" aria-hidden />
              {CLINIC.name} · {CLINIC.area}, {CLINIC.city}
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

const TRUST_ITEMS = [
  { icon: MapPin, title: "Neighbourhood clinic", text: `Based in ${CLINIC.area}, serving families across ${CLINIC.city}.` },
  { icon: Baby, title: "Adults and children", text: "From a child's first check-up to adult restorative care." },
  { icon: MessageCircle, title: "Direct WhatsApp booking", text: "Message the clinic directly — no portals, no waiting on hold." },
];

export function TrustBar() {
  return (
    <section className="border-b border-pine-950/10 bg-white" aria-label="About the clinic">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
        {TRUST_ITEMS.map((t, i) => (
          <Reveal key={t.title} delay={i * 80}>
            <div className="flex gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pine-50 text-pine-800">
                <t.icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-[15.5px] font-bold text-pine-950">{t.title}</span>
                <span className="mt-1 block text-[14.5px] leading-relaxed text-stone-600">{t.text}</span>
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function TreatmentCard({ t, featured }: { t: Treatment; featured?: boolean }) {
  const Icon = TREATMENT_ICONS[t.slug] ?? Check;
  return (
    <article
      className={
        featured
          ? "flex flex-col rounded-2xl border border-pine-900/15 bg-pine-950 p-7 text-white shadow-[0_20px_50px_-20px_rgba(4,47,45,0.5)]"
          : "flex flex-col rounded-2xl border border-pine-950/10 bg-white p-6 transition-shadow hover:shadow-[0_16px_40px_-20px_rgba(4,47,45,0.35)]"
      }
    >
      <span
        className={
          featured
            ? "grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-teal-100"
            : "grid h-12 w-12 place-items-center rounded-xl bg-pine-50 text-pine-800"
        }
      >
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h3 className={`mt-4 font-display text-[21px] font-bold ${featured ? "text-white" : "text-pine-950"}`}>
        {t.name}
      </h3>
      <p className={`mt-1.5 text-[15px] leading-relaxed ${featured ? "text-teal-50/85" : "text-stone-600"}`}>{t.tagline}</p>
      <ul className="mt-4 space-y-2">
        {t.points.map((p) => (
          <li key={p} className={`flex items-start gap-2 text-[14.5px] ${featured ? "text-teal-50/90" : "text-stone-600"}`}>
            <Check className={`mt-1 h-4 w-4 shrink-0 ${featured ? "text-teal-200" : "text-pine-700"}`} aria-hidden />
            {p}
          </li>
        ))}
      </ul>
      <a
        href={treatmentBookingLink(t.name)}
        target="_blank"
        rel="noreferrer"
        className={
          featured
            ? "mt-6 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
            : "mt-6 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-pine-800 underline decoration-pine-700/25 underline-offset-4 hover:decoration-pine-700"
        }
        aria-label={`Enquire about ${t.name} on WhatsApp`}
      >
        Enquire about {t.name} <ArrowRight className="h-4 w-4" aria-hidden />
      </a>
    </article>
  );
}

export function Treatments() {
  const featured = TREATMENTS.filter((t) => t.featured);
  const rest = TREATMENTS.filter((t) => !t.featured);
  return (
    <section id="treatments" className="scroll-mt-20 bg-white" aria-labelledby="treatments-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <div id="treatments-heading">
            <SectionHeading
              eyebrow="Treatments"
              title="Care for the treatments people travel for"
              lede="Three signature treatments, each with its own assessment and plan — plus everyday family dentistry under the same roof."
            />
          </div>
        </Reveal>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {featured.map((t, i) => (
            <Reveal key={t.slug} delay={i * 90}>
              <TreatmentCard t={t} featured />
            </Reveal>
          ))}
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {rest.map((t, i) => (
            <Reveal key={t.slug} delay={i * 90}>
              <TreatmentCard t={t} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const WHY_POINTS = [
  { title: "One clinic for the whole family", text: "Children's first visits and adult treatments in a single practice, so the family shares one dentist, one record, one phone number." },
  { title: "Specialised treatments, explained plainly", text: "Airway dentistry and myofunctional therapy sit alongside implants and aligners — each discussed in plain language before anything is scheduled." },
  { title: "Plans before procedures", text: "Options, steps and pricing are agreed up front. Treatment starts only when you say so." },
  { title: "Reachable on WhatsApp", text: "Questions, follow-ups and appointment changes go through a direct message, not a call queue." },
];

export function WhyUs() {
  return (
    <section id="why-us" className="scroll-mt-20 bg-cream" aria-labelledby="why-heading">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
        <Reveal>
          <figure className="m-0">
            <div className="overflow-hidden rounded-2xl border border-pine-950/10">
              <img
                src={IMAGES.clinic.src}
                alt={IMAGES.clinic.alt}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
            </div>
            <figcaption className="mt-2 text-[12.5px] text-stone-500">
              Representative clinic photography{IMAGES.clinic.credit ? ` — photo: ${IMAGES.clinic.credit}` : ""}. Replace with the clinic's own photos before publishing.
            </figcaption>
          </figure>
        </Reveal>
        <div>
          <Reveal>
            <div id="why-heading">
              <SectionHeading
                eyebrow="Why Tooth Medic"
                title="A clinic built for decisions, not pressure"
                lede="Everything about how the practice works is designed so you understand your options."
              />
            </div>
          </Reveal>
          <ul className="mt-7 space-y-5">
            {WHY_POINTS.map((w, i) => (
              <Reveal key={w.title} delay={i * 70}>
                <li className="flex gap-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pine-900 text-[14px] font-bold text-white" aria-hidden>
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-[15.5px] font-bold text-pine-950">{w.title}</span>
                    <span className="mt-1 block text-[15px] leading-relaxed text-stone-600">{w.text}</span>
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Journey() {
  return (
    <section className="bg-white" aria-labelledby="journey-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <div id="journey-heading">
            <SectionHeading
              eyebrow="Your first visit"
              title="From first message to treatment, in four steps"
            />
          </div>
        </Reveal>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {JOURNEY.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <li className="relative h-full rounded-2xl border border-pine-950/10 bg-cream p-6">
                <span className="font-display text-[34px] font-bold leading-none text-pine-900/20" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-2 text-[16px] font-bold text-pine-950">{s.title}</p>
                <p className="mt-1 text-[14.5px] leading-relaxed text-stone-600">{s.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal>
          <div className="mt-8">
            <a
              href={WA_BOOKING}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-pine-900 px-6 py-3.5 text-[15.5px] font-semibold text-white transition-colors hover:bg-pine-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-700"
            >
              Start with step one <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function About() {
  return (
    <section id="about" className="scroll-mt-20 border-y border-pine-950/10 bg-pine-950 text-white" aria-labelledby="about-heading">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
        <Reveal>
          <div id="about-heading">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-teal-200">About the clinic</p>
            <h2 className="mt-2 font-display text-[28px] font-bold leading-tight sm:text-[34px]">
              Family dental care in {CLINIC.area}
            </h2>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-teal-50/85">
              Tooth Medic Family Dental Care is a neighbourhood practice in {CLINIC.area}, {CLINIC.city} —
              set up so children, parents and grandparents can all be seen in one place, from routine check-ups
              to specialised treatments like aligners, implants and myofunctional therapy.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={WA_BOOKING}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 text-[15.5px] font-semibold text-pine-950 transition-colors hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Book a Consultation
              </a>
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-6 py-3.5 text-[15.5px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Visit or call
              </a>
            </div>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <figure className="m-0">
            <div className="overflow-hidden rounded-2xl border border-white/15">
              <img
                src={IMAGES.chair.src}
                alt={IMAGES.chair.alt}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
            </div>
            {IMAGES.chair.credit && (
              <figcaption className="mt-2 text-[12.5px] text-teal-50/60">
                Representative photo — {IMAGES.chair.credit}. Replace with the clinic's own photos before publishing.
              </figcaption>
            )}
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-white" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <div id="faq-heading">
            <SectionHeading
              eyebrow="Questions"
              title="Asked before every first visit"
              lede="Straight answers. Anything else — message the clinic and ask."
            />
          </div>
        </Reveal>
        <Reveal>
          <Accordion type="single" collapsible className="mt-6 rounded-2xl border border-pine-950/10 bg-cream px-6">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`} className={i === FAQS.length - 1 ? "border-b-0" : undefined}>
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

export function Contact() {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${CLINIC.name} ${CLINIC.area} ${CLINIC.city}`)}`;
  return (
    <section id="contact" className="scroll-mt-20 bg-cream" aria-labelledby="contact-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <div id="contact-heading">
            <SectionHeading
              eyebrow="Visit or call"
              title="Find us in Musheerabad"
              lede="One address, one phone number, one email — answered by the clinic team."
            />
          </div>
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Reveal>
            <div className="h-full rounded-2xl border border-pine-950/10 bg-white p-6">
              <MapPin className="h-6 w-6 text-pine-700" aria-hidden />
              <h3 className="mt-3 text-[16px] font-bold text-pine-950">Address</h3>
              <p className="mt-1 text-[14.5px] leading-relaxed text-stone-600">
                {CLINIC.name}
                <br />
                {CLINIC.area}, {CLINIC.city}, {CLINIC.region}
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-pine-800 underline decoration-pine-700/25 underline-offset-4 hover:decoration-pine-700"
              >
                Get Directions <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </Reveal>
          <Reveal delay={70}>
            <div className="h-full rounded-2xl border border-pine-950/10 bg-white p-6">
              <Phone className="h-6 w-6 text-pine-700" aria-hidden />
              <h3 className="mt-3 text-[16px] font-bold text-pine-950">Phone</h3>
              <p className="mt-1 text-[14.5px] text-stone-600">Call for appointments and queries.</p>
              <a
                href={`tel:${CLINIC.phoneIntl}`}
                className="mt-3 inline-block text-[17px] font-bold text-pine-900 underline decoration-pine-700/25 underline-offset-4 hover:decoration-pine-700"
              >
                {CLINIC.phoneDisplay}
              </a>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="h-full rounded-2xl border border-pine-950/10 bg-white p-6">
              <Mail className="h-6 w-6 text-pine-700" aria-hidden />
              <h3 className="mt-3 text-[16px] font-bold text-pine-950">Email</h3>
              <p className="mt-1 text-[14.5px] text-stone-600">For reports, records and non-urgent queries.</p>
              <a
                href={`mailto:${CLINIC.email}`}
                className="mt-3 inline-block break-all text-[15px] font-semibold text-pine-900 underline decoration-pine-700/25 underline-offset-4 hover:decoration-pine-700"
              >
                {CLINIC.email}
              </a>
            </div>
          </Reveal>
          <Reveal delay={210}>
            <div className="h-full rounded-2xl border border-pine-950/10 bg-white p-6">
              <Clock className="h-6 w-6 text-pine-700" aria-hidden />
              <h3 className="mt-3 text-[16px] font-bold text-pine-950">Hours</h3>
              <p className="mt-1 text-[14.5px] leading-relaxed text-stone-600">
                Timings vary by day — call ahead to confirm today's hours and avoid waiting.
              </p>
              <a
                href={`tel:${CLINIC.phoneIntl}`}
                className="mt-3 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-pine-800 underline decoration-pine-700/25 underline-offset-4 hover:decoration-pine-700"
              >
                Confirm timings <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </Reveal>
        </div>
        <Reveal>
          <div className="mt-6 overflow-hidden rounded-2xl border border-pine-950/10">
            <iframe
              title={`Map showing ${CLINIC.name}, ${CLINIC.area}, ${CLINIC.city}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(`${CLINIC.name} ${CLINIC.area} ${CLINIC.city}`)}&output=embed`}
              className="h-[320px] w-full border-0"
              loading="lazy"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-pine-950" aria-labelledby="wa-heading">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
        <Reveal>
          <h2 id="wa-heading" className="font-display text-[30px] font-bold leading-tight text-white sm:text-[38px]">
            Have questions about your treatment?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[16.5px] leading-relaxed text-teal-50/85">
            Talk to the Tooth Medic team on WhatsApp. Describe your concern and get a clear next step —
            usually within clinic hours.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={WA_CHAT}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-7 py-3.5 text-[15.5px] font-semibold text-pine-950 transition-colors hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
            >
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden />
              Chat on WhatsApp
            </a>
            <a
              href={WA_BOOKING}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/30 px-7 py-3.5 text-[15.5px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
            >
              <CalendarCheck className="h-[18px] w-[18px]" aria-hidden />
              Book a Consultation
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
